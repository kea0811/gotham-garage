'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { fetchWithIdbFallback } from '@/lib/idb-cache';
import { Spinner } from '@/components/ui/Spinner';
import { ItemCard } from '@/components/collection/ItemCard';
import { CameraFab } from '@/components/collection/CameraFab';
import type { CollectionItemDTO } from '@/models/CollectionItem';

interface ListResponse {
  items: CollectionItemDTO[];
  total: number;
  hasMore: boolean;
  error?: string;
}

export function CollectionBrowser() {
  const [items, setItems] = useState<CollectionItemDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [query, setQuery] = useState('');
  const [yearFilter, setYearFilter] = useState<number | null>(null);
  const [seriesFilter, setSeriesFilter] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await fetchWithIdbFallback<ListResponse>('/api/collection?limit=200');
    if (!result) {
      setError("Couldn't load your collection. Check your connection and try again.");
      return;
    }
    if (result.data.error) {
      setError(result.data.error);
      return;
    }
    setItems(result.data.items);
    setFromCache(result.fromCache);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const years = useMemo(
    () => [...new Set((items ?? []).map((i) => i.year).filter((y): y is number => Boolean(y)))].sort((a, b) => b - a),
    [items],
  );
  const seriesList = useMemo(
    () => [...new Set((items ?? []).map((i) => i.series).filter((s): s is string => Boolean(s)))].sort(),
    [items],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items ?? []).filter((item) => {
      if (yearFilter && item.year !== yearFilter) return false;
      if (seriesFilter && item.series !== seriesFilter) return false;
      if (!q) return true;
      return [item.name, item.series, item.notes, String(item.year ?? '')]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q));
    });
  }, [items, query, yearFilter, seriesFilter]);

  if (error) {
    return (
      <div className="rounded-2xl border border-white/10 bg-panel p-6 text-center">
        <p className="text-base text-ink">{error}</p>
        <button onClick={() => { setError(null); void load(); }} className="mt-4 min-h-12 rounded-xl bg-accent px-6 font-semibold text-bg">
          Retry
        </button>
      </div>
    );
  }

  if (items === null) return <Spinner label="Opening the garage…" />;

  // First-run: never an empty state without a CTA (PRD §12).
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 rounded-2xl border border-dashed border-accent/40 bg-panel px-6 py-16 text-center">
        <p className="text-5xl" aria-hidden>🏎️</p>
        <div>
          <h2 className="text-xl font-bold text-ink">Your garage is empty</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Scan the barcode on a carded car, or snap a photo of a loose one.
          </p>
        </div>
        <Link
          href="/add/scan"
          className="flex min-h-14 w-full max-w-xs items-center justify-center rounded-2xl bg-accent px-6 text-lg font-bold text-bg"
        >
          Scan your first car
        </Link>
        <Link href="/add" className="text-sm text-accent underline-offset-4 hover:underline">
          Other ways to add
        </Link>
      </div>
    );
  }

  return (
    <div>
      {fromCache ? (
        <p className="mb-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-2 text-xs text-ink">
          You&apos;re offline — showing your last synced collection.
        </p>
      ) : null}

      <input
        type="search"
        placeholder="Search name, series, notes…"
        aria-label="Search collection"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-3 w-full min-h-12 rounded-xl border border-white/10 bg-panel px-4 text-base text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
      />

      {(years.length > 0 || seriesList.length > 0) && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filters">
          {years.map((y) => (
            <FilterChip key={y} active={yearFilter === y} onClick={() => setYearFilter(yearFilter === y ? null : y)}>
              {y}
            </FilterChip>
          ))}
          {seriesList.map((s) => (
            <FilterChip key={s} active={seriesFilter === s} onClick={() => setSeriesFilter(seriesFilter === s ? null : s)}>
              {s}
            </FilterChip>
          ))}
        </div>
      )}

      <p className="mb-3 text-xs text-ink-muted">
        {visible.length} of {items.length} cars
      </p>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {visible.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </ul>

      <CameraFab />
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full border px-4 py-2 text-sm transition-colors ${
        active
          ? 'border-accent bg-accent/20 text-accent'
          : 'border-white/10 bg-panel text-ink-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}
