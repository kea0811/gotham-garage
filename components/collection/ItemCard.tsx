'use client';

import Link from 'next/link';
import type { CollectionItemDTO } from '@/models/CollectionItem';

export function ItemCard({ item }: { item: CollectionItemDTO }) {
  const photo = item.photos[0];
  return (
    <li className="list-none">
      <Link
        href={`/collection/${item.id}`}
        className="block overflow-hidden rounded-2xl border border-white/10 bg-panel transition-colors hover:border-accent/50"
      >
        <div className="aspect-square w-full bg-bg">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo.url}
              alt={item.name}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              aria-hidden
              className="flex h-full w-full items-center justify-center text-3xl text-ink-muted"
            >
              🚗
            </div>
          )}
        </div>
        <div className="p-3">
          <p className="truncate text-sm font-semibold text-ink">{item.name}</p>
          <p className="mt-0.5 truncate font-mono text-xs text-ink-muted">
            {[item.year, item.series].filter(Boolean).join(' · ') || item.status}
          </p>
        </div>
      </Link>
    </li>
  );
}
