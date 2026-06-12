'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchWithIdbFallback } from '@/lib/idb-cache';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { TextAreaField } from '@/components/ui/Field';
import { ArrowLeftIcon, CarIcon } from '@/components/ui/icons';
import { ITEM_STATUSES, type CollectionItemDTO, type ItemStatus } from '@/models/CollectionItem';

interface DetailResponse {
  item?: CollectionItemDTO;
  error?: string;
}

export function ItemDetail({ id }: { id: string }) {
  const router = useRouter();
  const [item, setItem] = useState<CollectionItemDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    const result = await fetchWithIdbFallback<DetailResponse>(`/api/collection/${id}`);
    if (!result || result.data.error || !result.data.item) {
      setError(result?.data.error ?? "Couldn't load this car.");
      return;
    }
    setItem(result.data.item);
    setNotes(result.data.item.notes ?? '');
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/collection/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as DetailResponse;
      if (res.ok && data.item) setItem(data.item);
      else setError(data.error ?? 'Save failed.');
    } catch {
      setError("You're offline — changes can't be saved right now.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    try {
      const res = await fetch(`/api/collection/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/collection');
        return;
      }
      setError('Delete failed.');
    } catch {
      setError("You're offline — try deleting once you're back online.");
    } finally {
      setSaving(false);
    }
  }

  if (error && !item) {
    return (
      <div className="rounded-2xl border border-white/10 bg-panel p-6 text-center">
        <p className="text-base text-ink">{error}</p>
        <Link href="/collection" className="mt-4 inline-block text-accent underline-offset-4 hover:underline">
          Back to collection
        </Link>
      </div>
    );
  }
  if (!item) return <Spinner label="Loading car…" />;

  const meta: [string, string | undefined][] = [
    ['Year', item.year?.toString()],
    ['Series', item.series],
    ['Casting', item.castingName],
    ['Color', item.color],
    ['Base code', item.baseCode],
    ['UPC', item.upc],
    ['Added via', item.source],
    ['Added on', new Date(item.createdAt).toLocaleDateString()],
  ];

  return (
    <div>
      <nav className="mb-4">
        <Link href="/collection" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
          <ArrowLeftIcon className="h-4 w-4" /> Collection
        </Link>
      </nav>

      {error ? (
        <p className="mb-4 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</p>
      ) : null}

      {item.photos.length === 1 && item.photos[0] ? (
        // Single photo: full-width, so it reads as centered in the column.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.photos[0].url}
          alt={item.name}
          className="mb-5 h-72 w-full rounded-2xl border border-white/10 object-cover"
        />
      ) : item.photos.length > 1 ? (
        // Multiple photos: peek-carousel (85% width shows the next one).
        <div className="snap-carousel -mx-4 mb-5 flex gap-3 overflow-x-auto px-4">
          {item.photos.map((photo, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={photo.url}
              src={photo.url}
              alt={`${item.name} — photo ${i + 1}`}
              className="h-72 w-[85%] shrink-0 rounded-2xl border border-white/10 object-cover"
            />
          ))}
        </div>
      ) : (
        <div aria-hidden className="mb-5 flex h-48 items-center justify-center rounded-2xl bg-panel text-ink-muted/50">
          <CarIcon className="h-14 w-14" />
        </div>
      )}

      <h1 className="text-2xl font-bold text-ink">{item.name}</h1>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Status">
        {ITEM_STATUSES.map((s) => (
          <button
            key={s}
            disabled={saving}
            onClick={() => patch({ status: s satisfies ItemStatus })}
            aria-pressed={item.status === s}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm capitalize transition-colors ${
              item.status === s
                ? 'border-accent bg-accent/20 text-accent'
                : 'border-white/10 bg-panel text-ink-muted hover:text-ink'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <dl className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-panel">
        {meta
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 border-b border-white/5 px-4 py-3 last:border-0">
              <dt className="text-sm text-ink-muted">{k}</dt>
              <dd className="truncate font-mono text-sm text-ink">{v}</dd>
            </div>
          ))}
      </dl>

      <div className="mt-5">
        <TextAreaField
          label="Notes"
          placeholder="e.g. birthday gift from Sam"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <Button
          className="mt-3 w-full"
          disabled={saving || notes === (item.notes ?? '')}
          onClick={() => patch({ notes })}
        >
          {saving ? 'Saving…' : 'Save notes'}
        </Button>
      </div>

      <div className="mt-8">
        {confirmDelete ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-danger/40 bg-danger/10 p-4">
            <p className="text-sm text-ink">Remove “{item.name}” from your collection?</p>
            <div className="flex gap-3">
              <Button variant="danger" className="flex-1" disabled={saving} onClick={remove}>
                Yes, delete
              </Button>
              <Button variant="panel" className="flex-1" onClick={() => setConfirmDelete(false)}>
                Keep it
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="danger" className="w-full" onClick={() => setConfirmDelete(true)}>
            Delete this car
          </Button>
        )}
      </div>
    </div>
  );
}
