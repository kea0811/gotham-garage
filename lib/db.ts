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
    globals._pitstopIndexesEnsured = ensureIndexes(db).catch((err) => {
      // Allow a retry on the next call rather than caching the failure forever.
      globals._pitstopIndexesEnsured = undefined;
      throw err;
    });
  }
  await globals._pitstopIndexesEnsured;
  return db;
}

/** Create the indexes from PRD §9. Idempotent — safe to call repeatedly. */
export async function ensureIndexes(db: Db): Promise<void> {
  await Promise.all([
    db.collection('collection_items').createIndex({ userId: 1, createdAt: -1 }),
    db.collection('collection_items').createIndex({ userId: 1, upc: 1 }),
    db
      .collection('collection_items')
      .createIndex({ name: 'text', notes: 'text' }, { name: 'item_text_search' }),
    db.collection('upc_cache').createIndex({ upc: 1 }, { unique: true }),
    db.collection('upc_misses').createIndex({ upc: 1 }, { unique: true }),
  ]);
}

/** Test-only: reset memoized state so each test starts clean. */
export function resetDbStateForTests(): void {
  globals._pitstopClientPromise = undefined;
  globals._pitstopIndexesEnsured = undefined;
}
