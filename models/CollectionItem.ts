import type { ObjectId } from 'mongodb';

export type ItemStatus = 'owned' | 'wanted' | 'sold' | 'duplicate';
export type ItemSource = 'upc' | 'visual' | 'manual';

export interface ItemPhoto {
  url: string;
  width: number;
  height: number;
  uploadedAt: Date;
}

/** `collection_items` collection — one document per owned car. */
export interface CollectionItemDoc {
  _id: ObjectId;
  /** Supabase auth UUID (string) — Supabase owns identity, not Mongo. */
  userId: string;
  name: string;
  year?: number;
  series?: string;
  castingName?: string;
  color?: string;
  baseCode?: string;
  upc?: string;
  photos: ItemPhoto[];
  /** 384-dim DINOv2-small embedding of the primary photo. */
  embedding?: number[];
  notes?: string;
  status: ItemStatus;
  acquiredAt?: Date;
  source: ItemSource;
  createdAt: Date;
  updatedAt: Date;
}

/** Shape sent over the wire to the client (ObjectIds stringified). */
export interface CollectionItemDTO {
  id: string;
  name: string;
  year?: number;
  series?: string;
  castingName?: string;
  color?: string;
  baseCode?: string;
  upc?: string;
  photos: { url: string; width: number; height: number; uploadedAt: string }[];
  notes?: string;
  status: ItemStatus;
  source: ItemSource;
  createdAt: string;
  updatedAt: string;
}

export const ITEM_STATUSES: ItemStatus[] = ['owned', 'wanted', 'sold', 'duplicate'];
export const ITEM_SOURCES: ItemSource[] = ['upc', 'visual', 'manual'];
