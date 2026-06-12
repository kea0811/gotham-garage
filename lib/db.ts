import { MongoClient, type Db } from 'mongodb';

/**
 * Raw MongoDB driver access (no Mongoose — PRD Appendix A).
 *
 * The client is created lazily so the app builds and renders with NO env vars
 * present; routes that need the DB return a graceful 503 instead. The promise
 * is memoized on `globalThis` so Next.js dev-mode hot reloads don't leak
 * connections.
 *
 * There is no `users` collection — Supabase owns identity, and `userId`
 * fields hold the Supabase auth UUID as a plain string.
 */

export class DbNotConfiguredError extends Error {
  constructor() {
    super('MONGODB_URI is not set — database features are disabled.');
    this.name = 'DbNotConfiguredError';
  }
}

interface MongoGlobals {
  _pitstopClientPromise?: Promise<MongoClient>;
  _pitstopIndexesEnsured?: Promise<void>;
  _pitstopHasTextIndex?: boolean;
}

const globals = globalThis as typeof globalThis & MongoGlobals;

export function isDbConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI);
}

/** Lazy, memoized MongoClient. Throws DbNotConfiguredError without a URI. */
export function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new DbNotConfiguredError();
  if (!globals._pitstopClientPromise) {
    globals._pitstopClientPromise = new MongoClient(uri).connect();
  }
  return globals._pitstopClientPromise;
}

/**
 * Get the app database with indexes ensured exactly once per process.
 * The db name comes from the connection string path (the Railway URI includes
 * `/pitstop`); the driver default applies otherwise.
 */
export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  const db = client.db();
  if (!globals._pitstopIndexesEnsured) {
    // Index creation is best-effort. A failure here — e.g. the server is under
    // disk pressure and refuses to build an index (Mongo enforces a 500MB
    // free-space floor for index builds) — must NOT take down reads/writes,
    // which work fine without the secondary indexes. We log and continue, and
    // cache the (resolved) promise so we don't retry on every request.
    globals._pitstopIndexesEnsured = ensureIndexes(db);
  }
  await globals._pitstopIndexesEnsured;
  return db;
}

/**
 * Create the indexes from PRD §9. Each is attempted independently so one
 * failure (e.g. the text index under disk pressure) doesn't block the others.
 * Never throws — failures are logged. Idempotent — safe to call repeatedly.
 */
export async function ensureIndexes(db: Db): Promise<void> {
  const items = db.collection('collection_items');
  const specs: Array<readonly [string, () => Promise<unknown>]> = [
    ['items_userId_createdAt', () => items.createIndex({ userId: 1, createdAt: -1 })],
    ['items_userId_upc', () => items.createIndex({ userId: 1, upc: 1 })],
    ['item_text_search', () => items.createIndex({ name: 'text', notes: 'text' }, { name: 'item_text_search' })],
    ['upc_cache_upc', () => db.collection('upc_cache').createIndex({ upc: 1 }, { unique: true })],
    ['upc_misses_upc', () => db.collection('upc_misses').createIndex({ upc: 1 }, { unique: true })],
  ];
  await Promise.all(
    specs.map(([label, create]) =>
      create().catch((err: unknown) => {
        console.warn(`[pitstop] index "${label}" not created:`, err);
      }),
    ),
  );
}

/**
 * Whether the collection_items text index exists. Search uses this to pick
 * between a fast `$text` query and a regex fallback when the text index could
 * not be built (e.g. disk pressure). Cached per process; reset in tests.
 */
export async function hasTextIndex(db: Db): Promise<boolean> {
  if (globals._pitstopHasTextIndex === undefined) {
    try {
      const indexes = await db.collection('collection_items').indexes();
      globals._pitstopHasTextIndex = indexes.some((i) => i.name === 'item_text_search');
    } catch {
      globals._pitstopHasTextIndex = false;
    }
  }
  return globals._pitstopHasTextIndex;
}

/** Test-only: reset memoized state so each test starts clean. */
export function resetDbStateForTests(): void {
  globals._pitstopClientPromise = undefined;
  globals._pitstopIndexesEnsured = undefined;
  globals._pitstopHasTextIndex = undefined;
}
