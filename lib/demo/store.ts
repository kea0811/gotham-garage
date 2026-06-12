'use client';

import type { CollectionItemDTO } from '@/models/CollectionItem';

/**
 * IndexedDB-backed store for demo mode. Holds DTO-shaped collection items
 * exactly as the API would return them, so the fetch interceptor can serve
 * them without translation. Photos are stored inline as data URLs.
 */
const DB_NAME = 'pitstop-demo';
const STORE = 'items';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB unavailable'));
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const req = fn(t.objectStore(STORE));
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error ?? new Error('IndexedDB op failed'));
    });
  } finally {
    db.close();
  }
}

export async function listDemoItems(): Promise<CollectionItemDTO[]> {
  const all = (await tx<CollectionItemDTO[]>('readonly', (s) => s.getAll())) ?? [];
  // Newest first, matching the API's createdAt-desc default.
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getDemoItem(id: string): Promise<CollectionItemDTO | null> {
  const item = await tx<CollectionItemDTO | undefined>('readonly', (s) => s.get(id));
  return item ?? null;
}

export async function putDemoItem(item: CollectionItemDTO): Promise<void> {
  await tx('readwrite', (s) => s.put(item));
}

export async function deleteDemoItem(id: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(id));
}

export async function clearDemoItems(): Promise<void> {
  try {
    await tx('readwrite', (s) => s.clear());
  } catch {
    // best-effort
  }
}
