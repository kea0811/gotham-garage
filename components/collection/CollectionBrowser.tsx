'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { fetchWithIdbFallback } from '@/lib/idb-cache';
import { Spinner } from '@/components/ui/Spinner';
import { Logo } from '@/components/ui/Logo';
import { GearIcon } from '@/components/ui/icons';
import { ItemCard } from '@/components/collection/ItemCard';
import { CameraFab } from '@/components/collection/CameraFab';
import type { CollectionItemDTO } from '@/models/CollectionItem';

interface ListResponse {
  items: CollectionItemDTO[];
  total: number;
  hasMore: boolean;
  error?: string;
}

type StatusTab = 'all' | 'owned' | 'wanted';

export function CollectionBrowser() {
  const [items, setItems] = useState<CollectionItemDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [query, setQuery] = useState('');
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
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

  const ownedCount = useMemo(
    () => (items ?? []).filter((i) => i.status === 'owned').length,
    [items],
  );
  const wantedCount = useMemo(
    () => (items ?? []).filter((i) => i.status === 'wanted').length,
    [items],
  );

  const seriesList = useMemo(
    () => [...new Set((items ?? []).map((i) => i.series).filter((s): s is string => Boolean(s)))].sort(),
    [items],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items ?? []).filter((item) => {
      if (statusTab !== 'all' && item.status !== statusTab) return false;
      if (seriesFilter && item.series !== seriesFilter) return false;
      if (!q) return true;
      return [item.name, item.series, item.notes, String(item.year ?? '')]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q));
    });
  }, [items, query, statusTab, seriesFilter]);

  return (
    <>
      <Masthead ownedCount={ownedCount} wantedCount={wantedCount} />

      <div className="px-4 pt-5">
        {error ? (
          <div className="rounded-2xl border border-white/10 bg-panel p-6 text-center">
            <p className="text-base text-ink">{error}</p>
            <button
              onClick={() => {
                setError(null);
                void load();
              }}
              className="mt-4 min-h-12 rounded-xl bg-accent px-6 font-semibold text-bg"
            >
              Retry
            </button>
          </div>
        ) : items === null ? (
          <Spinner label="Opening the garage…" />
        ) : items.length === 0 ? (
          <EmptyVault />
        ) : (
          <>
            {fromCache ? (
              <p className="mb-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-2 text-xs text-ink">
                You&apos;re offline — showing your last synced collection.
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="search"
                placeholder="Search by name, series, model…"
                aria-label="Search collection"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="min-h-12 flex-1 rounded-full border border-white/10 bg-panel px-5 text-base text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
              />
              <div className="flex gap-2" role="group" aria-label="Status filter">
                <StatusChip active={statusTab === 'all'} onClick={() => setStatusTab('all')}>
                  All
                </StatusChip>
                <StatusChip active={statusTab === 'owned'} onClick={() => setStatusTab('owned')}>
                  Owned
                </StatusChip>
                <StatusChip active={statusTab === 'wanted'} onClick={() => setStatusTab('wanted')}>
                  Wishlist
                </StatusChip>
              </div>
            </div>

            {seriesList.length > 0 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Series filter">
                {seriesList.map((s) => (
                  <FilterChip
                    key={s}
                    active={seriesFilter === s}
                    onClick={() => setSeriesFilter(seriesFilter === s ? null : s)}
                  >
                    {s}
                  </FilterChip>
                ))}
              </div>
            )}

            <p className="mb-3 mt-4 text-xs uppercase tracking-wider text-ink-muted">
              {visible.length} of {items.length} cars
            </p>

            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {visible.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </ul>

            <CameraFab />
          </>
        )}
      </div>
    </>
  );
}

function Masthead({ ownedCount, wantedCount }: { ownedCount: number; wantedCount: number }) {
  return (
    <header className="pt-safe-bar sticky top-0 z-20 border-b border-white/10 bg-bg/90 backdrop-blur">
      <div className="flex items-center justify-between gap-3 px-4 pb-3">
        <Link href="/collection" className="flex min-w-0 items-center gap-3">
          <Logo className="h-11 w-11 shrink-0" />
          <span className="min-w-0">
            <span className="block truncate text-xl font-extrabold uppercase leading-none tracking-tight text-ink">
              Pit<span className="text-accent">stop</span>
            </span>
            <span className="mt-0.5 block truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
              Diecast Collection
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Stat value={ownedCount} label="Owned" />
          <Stat value={wantedCount} label="Wishlist" />
          <Link
            href="/add"
            className="flex min-h-11 shrink-0 items-center rounded-full bg-accent px-4 text-sm font-bold text-bg transition-transform active:scale-95"
          >
            + Add Car
          </Link>
          <Link
            href="/settings"
            aria-label="Settings"
            className="hidden h-11 w-11 items-center justify-center rounded-full text-ink-muted hover:text-ink sm:flex"
          >
            <GearIcon className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="hidden text-center sm:block">
      <div className="text-xl font-extrabold leading-none text-accent">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-ink-muted">{label}</div>
    </div>
  );
}

function EmptyVault() {
  return (
    <div className="flex flex-col items-center gap-5 px-6 py-20 text-center">
      <Logo className="h-24 w-24 opacity-90" />
      <div>
        <h2 className="text-2xl font-extrabold text-ink">Your garage is empty</h2>
        <p className="mt-2 text-base text-ink-muted">Start adding your diecast collection</p>
      </div>
      <Link
        href="/add"
        className="flex min-h-12 items-center justify-center rounded-full bg-accent px-6 text-base font-bold text-bg transition-transform active:scale-95"
      >
        + Add First Car
      </Link>
    </div>
  );
}

function StatusChip({
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
      className={`min-h-12 shrink-0 rounded-full px-5 text-sm font-semibold transition-colors ${
        active ? 'bg-accent text-bg' : 'bg-panel text-ink-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
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
