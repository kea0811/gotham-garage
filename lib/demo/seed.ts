'use client';

import { listDemoItems, putDemoItem } from './store';
import type { CollectionItemDTO, ItemStatus, ItemSource } from '@/models/CollectionItem';

type SeedCar = {
  name: string;
  year: number;
  series: string;
  castingName: string;
  color: string;
  baseCode?: string;
  status: ItemStatus;
  source: ItemSource;
  photo?: string; // path under /public
};

/** A small, varied example collection so the demo isn't empty on first open. */
const SEED: SeedCar[] = [
  { name: '1969 Apex GT Fastback', year: 1969, series: 'Street Kings', castingName: 'Apex GT', color: 'Crimson', baseCode: 'AK·69', status: 'owned', source: 'manual', photo: '/demo/cars/red.webp' },
  { name: 'Rally Sprint RS', year: 2023, series: 'Track Day', castingName: 'Sprint RS', color: 'Electric Blue', baseCode: 'TD·23', status: 'owned', source: 'manual', photo: '/demo/cars/blue.webp' },
  { name: 'Velocità V12 Spyder', year: 2024, series: 'Euro Exotics', castingName: 'V12 Spyder', color: 'Silver', baseCode: 'EX·24', status: 'owned', source: 'manual', photo: '/demo/cars/silver.webp' },
  { name: 'Dune Runner 4x4', year: 2022, series: 'Off-Road Legends', castingName: 'Dune Runner', color: 'Sunset Orange', baseCode: 'OR·22', status: 'wanted', source: 'manual', photo: '/demo/cars/orange.webp' },
  { name: '1956 Coastline Cruiser', year: 1956, series: 'Classic Cruisers', castingName: 'Coastline', color: 'Seafoam', baseCode: 'CC·56', status: 'owned', source: 'manual', photo: '/demo/cars/teal.webp' },
  { name: 'Nightfall GT Coupe', year: 2024, series: 'Midnight Run', castingName: 'Nightfall GT', color: 'Matte Black', baseCode: 'MR·24', status: 'wanted', source: 'manual', photo: '/demo/cars/black.webp' },
  { name: 'Micro Cooper Rally', year: 2021, series: 'Track Day', castingName: 'Micro Rally', color: 'White', status: 'owned', source: 'manual' },
  { name: 'Phantom Roadster', year: 2024, series: 'Luxury Line', castingName: 'Phantom', color: 'Champagne', status: 'owned', source: 'manual' },
];

/**
 * Populate the demo store with the example collection if it's empty. Called
 * when a guest enters demo mode (and again after an exit/re-enter, so the demo
 * always resets to this starting point).
 */
export async function seedDemoIfEmpty(): Promise<void> {
  try {
    const existing = await listDemoItems();
    if (existing.length > 0) return;
    // Stagger createdAt so the grid order is stable (newest first).
    const base = Date.now();
    for (let i = 0; i < SEED.length; i++) {
      const s = SEED[i]!;
      const ts = new Date(base - i * 60_000).toISOString();
      const item: CollectionItemDTO = {
        id: crypto.randomUUID?.() ?? `seed-${i}-${base}`,
        name: s.name,
        year: s.year,
        series: s.series,
        castingName: s.castingName,
        color: s.color,
        baseCode: s.baseCode,
        photos: s.photo ? [{ url: s.photo, width: 500, height: 500, uploadedAt: ts }] : [],
        status: s.status,
        source: s.source,
        createdAt: ts,
        updatedAt: ts,
      };
      await putDemoItem(item);
    }
  } catch {
    // Seeding is best-effort — an empty demo is still usable.
  }
}
