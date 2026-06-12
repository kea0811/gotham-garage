import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const createIndex = vi.fn(async () => 'ok');
  const indexes = vi.fn(async () => [{ name: '_id_' }, { name: 'item_text_search' }]);
  const collection = vi.fn(() => ({ createIndex, indexes }));
  const dbObj = { collection };
  const constructedUris: string[] = [];
  let connectCalls = 0;

  class MongoClient {
    constructor(uri: string) {
      constructedUris.push(uri);
    }
    async connect() {
      connectCalls += 1;
      return this;
    }
    db() {
      return dbObj;
    }
  }

  return {
    createIndex,
    indexes,
    collection,
    dbObj,
    constructedUris,
    MongoClient,
    getConnectCalls: () => connectCalls,
  };
});

vi.mock('mongodb', () => ({ MongoClient: mocks.MongoClient }));

import {
  DbNotConfiguredError,
  ensureIndexes,
  getClientPromise,
  getDb,
  hasTextIndex,
  isDbConfigured,
  resetDbStateForTests,
} from '@/lib/db';
import type { Db } from 'mongodb';

const URI = 'mongodb://mongo:secret@localhost:27017/pitstop?authSource=admin';

beforeEach(() => {
  resetDbStateForTests();
  mocks.createIndex.mockClear();
  mocks.indexes.mockClear();
  mocks.indexes.mockResolvedValue([{ name: '_id_' }, { name: 'item_text_search' }]);
  mocks.collection.mockClear();
  mocks.constructedUris.length = 0;
  vi.stubEnv('MONGODB_URI', URI);
});

afterEach(() => {
  vi.unstubAllEnvs();
  resetDbStateForTests();
});

describe('isDbConfigured', () => {
  it('reflects MONGODB_URI presence', () => {
    expect(isDbConfigured()).toBe(true);
    vi.stubEnv('MONGODB_URI', '');
    expect(isDbConfigured()).toBe(false);
  });
});

describe('getClientPromise', () => {
  it('throws DbNotConfiguredError without a URI', () => {
    vi.stubEnv('MONGODB_URI', '');
    expect(() => getClientPromise()).toThrow(DbNotConfiguredError);
    expect(() => getClientPromise()).toThrow(/MONGODB_URI is not set/);
  });

  it('memoizes a single client across calls', async () => {
    const first = await getClientPromise();
    const second = await getClientPromise();
    expect(first).toBe(second);
    expect(mocks.constructedUris).toEqual([URI]);
  });
});

describe('getDb', () => {
  it('returns the db and ensures PRD §9 indexes exactly once', async () => {
    const db = await getDb();
    expect(db).toBe(mocks.dbObj);
    // 5 indexes: 3 on collection_items, 1 on upc_cache, 1 on upc_misses.
    expect(mocks.createIndex).toHaveBeenCalledTimes(5);
    expect(mocks.collection).toHaveBeenCalledWith('collection_items');
    expect(mocks.collection).toHaveBeenCalledWith('upc_cache');
    expect(mocks.collection).toHaveBeenCalledWith('upc_misses');
    // No users collection — Supabase owns identity.
    expect(mocks.collection).not.toHaveBeenCalledWith('users');

    await getDb();
    expect(mocks.createIndex).toHaveBeenCalledTimes(5); // not re-ensured
  });

  it('propagates DbNotConfiguredError when unconfigured', async () => {
    vi.stubEnv('MONGODB_URI', '');
    await expect(getDb()).rejects.toBeInstanceOf(DbNotConfiguredError);
  });

  it('does not throw when an index fails to build (disk pressure)', async () => {
    // A single index failing (e.g. Mongo refuses an index build under disk
    // pressure) must not take down reads/writes. getDb still resolves the db.
    mocks.createIndex.mockRejectedValueOnce(new Error('OutOfDiskSpace'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const db = await getDb();
    expect(db).toBe(mocks.dbObj);
    // All 5 still attempted; the rejected one is swallowed + logged.
    expect(mocks.createIndex).toHaveBeenCalledTimes(5);
    expect(warn).toHaveBeenCalled();

    // Result is cached — a second call does not re-attempt index creation.
    await getDb();
    expect(mocks.createIndex).toHaveBeenCalledTimes(5);

    warn.mockRestore();
  });
});

describe('ensureIndexes', () => {
  it('is callable directly and idempotent', async () => {
    await ensureIndexes(mocks.dbObj as unknown as Db);
    await ensureIndexes(mocks.dbObj as unknown as Db);
    expect(mocks.createIndex).toHaveBeenCalledTimes(10);
    expect(mocks.createIndex).toHaveBeenCalledWith({ upc: 1 }, { unique: true });
    expect(mocks.createIndex).toHaveBeenCalledWith(
      { name: 'text', notes: 'text' },
      { name: 'item_text_search' },
    );
  });
});

describe('hasTextIndex', () => {
  it('returns true when the text index is present, and caches the result', async () => {
    expect(await hasTextIndex(mocks.dbObj as unknown as Db)).toBe(true);
    expect(mocks.indexes).toHaveBeenCalledTimes(1);
    // Cached — second call doesn't re-query indexes.
    expect(await hasTextIndex(mocks.dbObj as unknown as Db)).toBe(true);
    expect(mocks.indexes).toHaveBeenCalledTimes(1);
  });

  it('returns false when the text index is absent', async () => {
    mocks.indexes.mockResolvedValueOnce([{ name: '_id_' }]);
    expect(await hasTextIndex(mocks.dbObj as unknown as Db)).toBe(false);
  });

  it('returns false (does not throw) when listing indexes fails', async () => {
    mocks.indexes.mockRejectedValueOnce(new Error('connection lost'));
    expect(await hasTextIndex(mocks.dbObj as unknown as Db)).toBe(false);
  });
});

describe('resetDbStateForTests', () => {
  it('clears the memoized client so a new one is constructed', async () => {
    await getDb();
    expect(mocks.constructedUris).toHaveLength(1);
    resetDbStateForTests();
    await getDb();
    expect(mocks.constructedUris).toHaveLength(2);
  });
});
