'use client';

/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';
import { ItemForm } from '@/components/add/ItemForm';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { CarIcon, SearchIcon } from '@/components/ui/icons';
import { parseDiecastTitle } from '@/lib/parse-title';
import type { UpcProductData } from '@/models/UpcCache';

interface CatalogHit {
  upc: string;
  data: UpcProductData;
}

/**
 * Keyword-search the catalog and add a result straight to your wishlist
 * (status = wanted), without owning the car. Results come from upcitemdb, so
 * each one carries a barcode and is deduped against your garage on save.
 */
export function CatalogSearch() {
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<CatalogHit[] | null>(null);
  const [picked, setPicked] = useState<CatalogHit | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setBusy(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch(`/api/upc/search?q=${encodeURIComponent(q)}`);
      const body = (await res.json()) as { results?: CatalogHit[]; error?: string };
      if (!res.ok) {
        setError(body.error ?? 'Search failed. Try again.');
        return;
      }
      setResults(body.results ?? []);
    } catch {
      setError("You're offline — catalog search needs a connection.");
    } finally {
      setBusy(false);
    }
  }

  if (picked) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setPicked(null)}
          className="mb-4 text-sm text-ink-muted hover:text-ink"
        >
          ← Back to results
        </button>
        <p className="mb-4 rounded-xl border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-ink">
          Adding to your wishlist — tweak the details, then save.
        </p>
        <ItemForm
          source="upc"
          initialStatus="wanted"
          initial={{
            name: picked.data.title,
            ...parseDiecastTitle(picked.data.title),
            upc: picked.upc,
            remotePhotoUrl: picked.data.images[0],
          }}
          submitLabel="Add to wishlist"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={search} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. mustang 1:64, charger, datsun 510"
          aria-label="Search the catalog"
          className="min-h-12 flex-1 rounded-xl border border-white/10 bg-panel px-4 text-base text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !query.trim()}
          aria-label="Search"
          className="grid min-h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent text-bg disabled:opacity-40"
        >
          <SearchIcon className="h-5 w-5" />
        </button>
      </form>

      {error ? (
        <p className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</p>
      ) : null}

      {busy ? <Spinner label="Searching the catalog…" /> : null}

      {!busy && results !== null && results.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-panel p-5 text-sm text-ink-muted">
          No catalog matches with a barcode. Try different words, or{' '}
          <a href="/add/manual" className="text-accent hover:underline">add it manually</a>.
        </p>
      ) : null}

      {!busy && results && results.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {results.map((hit) => (
            <li key={hit.upc}>
              <button
                type="button"
                onClick={() => setPicked(hit)}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-panel p-3 text-left transition-colors hover:border-accent/50"
              >
                {hit.data.images[0] ? (
                  <img
                    src={hit.data.images[0]}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-lg bg-bg object-contain"
                  />
                ) : (
                  <span aria-hidden className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-bg text-ink-muted/50">
                    <CarIcon className="h-7 w-7" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink line-clamp-2">{hit.data.title}</span>
                  {hit.data.brand ? (
                    <span className="mt-0.5 block text-xs text-ink-muted">{hit.data.brand}</span>
                  ) : null}
                </span>
                <span className="shrink-0 rounded-full border border-accent/40 px-3 py-1 text-xs font-semibold text-accent">
                  Want
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {results === null && !busy && !error ? (
        <p className="rounded-2xl border border-white/10 bg-panel p-5 text-sm text-ink-muted">
          Search a diecast catalog by name and add cars you&apos;re hunting for to your wishlist —
          no need to own them yet. Results that ship with a barcode can be matched later when you
          find the real thing.
        </p>
      ) : null}
    </div>
  );
}
