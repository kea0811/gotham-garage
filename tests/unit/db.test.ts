import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const createIndex = vi.fn(async () => 'ok');
  const collection = vi.fn(() => ({ createIndex }));
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
  isDbConfigured,
  resetDbStateForTests,
} from '@/lib/db';
import type { Db } from 'mongodb';

const URI = 'mongodb://mongo:secret@localhost:27017/pitstop?authSource=admin';

beforeEach(() => {
  resetDbStateForTests();
  mocks.createIndex.mockClear();
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

  it('retries index creation after a failure instead of caching it', async () => {
    mocks.createIndex.mockRejectedValueOnce(new Error('transient index failure'));
    await expect(getDb()).rejects.toThrow('transient index failure');

    const db = await getDb(); // succeeds on retry
    expect(db).toBe(mocks.dbObj);
    // First attempt fired all 5 (one rejected), retry fired 5 more.
    expect(mocks.createIndex).toHaveBeenCalledTimes(10);
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

describe('resetDbStateForTests', () => {
  it('clears the memoized client so a new one is constructed', async () => {
    await getDb();
    expect(mocks.constructedUris).toHaveLength(1);
    resetDbStateForTests();
    await getDb();
    expect(mocks.constructedUris).toHaveLength(2);
  });
});
