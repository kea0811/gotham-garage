import type { ObjectId } from 'mongodb';

/** Normalized subset of a upcitemdb item we keep forever. */
export interface UpcProductData {
  title: string;
  brand?: string;
  description?: string;
  images: string[];
  category?: string;
}

/**
 * `upc_cache` collection — global, shared across users. A UPC's metadata is
 * immutable, so entries never expire (`expiresAt: null`).
 */
export interface UpcCacheDoc {
  _id: ObjectId;
  upc: string;
  source: 'upcitemdb' | 'manual';
  data: UpcProductData;
  fetchedAt: Date;
  expiresAt: Date | null;
}
