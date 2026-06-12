'use client';

/**
 * Tiny IndexedDB key-value cache for API responses so /collection and detail
 * views browse fully offline (PRD §13). The service worker covers the app
 * shell; this covers data.
 */

const DB_NAME = 'pitstop-cache';
const STORE = 'responses';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB unavailable'));
  });
}

export async function idbSet<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ value, cachedAt: Date.now() }, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'));
    });
    db.close();
  } catch {
    // Cache writes are best-effort; never break the online path.
  }
}

export async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openDb();
    const result = await new Promise<{ value: T } | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result as { value: T } | undefined);
      req.onerror = () => reject(req.error ?? new Error('IndexedDB read failed'));
    });
    db.close();
    return result ? result.value : null;
  } catch {
    return null;
  }
}

/**
 * Network-first fetch with IndexedDB fallback. Successful responses refresh
 * the cache; failures (offline) fall back to the last cached copy.
 */
export async function fetchWithIdbFallback<T>(
  url: string,
): Promise<{ data: T; fromCache: boolean } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as T;
    void idbSet(url, data);
    return { data, fromCache: false };
  } catch {
    const cached = await idbGet<T>(url);
    return cached !== null ? { data: cached, fromCache: true } : null;
  }
}
