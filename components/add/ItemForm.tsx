'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Field, TextAreaField } from '@/components/ui/Field';
import { compressImage } from '@/lib/image-compress';
import { uploadItemPhoto } from '@/lib/photos';
import type { CollectionItemDTO, ItemSource } from '@/models/CollectionItem';

export interface ItemFormInitial {
  name?: string;
  year?: number;
  series?: string;
  castingName?: string;
  color?: string;
  baseCode?: string;
  upc?: string;
  notes?: string;
  /** Pre-supplied remote photo (e.g. upcitemdb product shot). */
  remotePhotoUrl?: string;
}

interface DuplicateHit {
  item: CollectionItemDTO;
  score: number;
  reason: 'upc' | 'visual';
}

interface Props {
  source: ItemSource;
  initial?: ItemFormInitial;
  /** Normalized 384-dim embedding from the visual flow. */
  embedding?: number[];
  /** Already-processed photo from camera/visual flow. */
  photoBlob?: Blob | null;
  submitLabel?: string;
}

export function ItemForm({ source, initial = {}, embedding, photoBlob, submitLabel }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial.name ?? '');
  const [year, setYear] = useState(initial.year?.toString() ?? '');
  const [series, setSeries] = useState(initial.series ?? '');
  const [color, setColor] = useState(initial.color ?? '');
  const [baseCode, setBaseCode] = useState(initial.baseCode ?? '');
  const [notes, setNotes] = useState(initial.notes ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateHit[] | null>(null);
  /** Set when the item saved but the photo upload failed (e.g. no bucket). */
  const [savedItemId, setSavedItemId] = useState<string | null>(null);

  async function checkDuplicates(): Promise<boolean> {
    if (!initial.upc && !embedding) return false;
    try {
      const res = await fetch('/api/duplicate-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upc: initial.upc, embedding }),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { duplicates?: DuplicateHit[] };
      if (data.duplicates && data.duplicates.length > 0) {
        setDuplicates(data.duplicates);
        return true;
      }
    } catch {
      // Offline / transient — don't block the add.
    }
    return false;
  }

  async function save(skipDuplicateCheck: boolean) {
    setError(null);
    if (!name.trim()) {
      setError('Give the car a name.');
      return;
    }
    setBusy('Checking…');
    try {
      if (!skipDuplicateCheck && (await checkDuplicates())) {
        setBusy(null);
        return; // Duplicate prompt is showing.
      }

      // 1. Save the item first — photo paths need its id
      //    ({userId}/{itemId}/{timestamp}.jpg in Supabase Storage).
      setBusy('Saving…');
      const remotePhotos = initial.remotePhotoUrl
        ? [{ url: initial.remotePhotoUrl, width: 0, height: 0 }]
        : [];
      const res = await fetch('/api/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          year: year ? Number.parseInt(year, 10) : undefined,
          series: series || undefined,
          color: color || undefined,
          baseCode: baseCode || undefined,
          upc: initial.upc,
          notes: notes || undefined,
          photos: remotePhotos,
          embedding,
          source,
        }),
      });
      const data = (await res.json()) as { item?: CollectionItemDTO; error?: string };
      if (!res.ok || !data.item) throw new Error(data.error ?? 'Save failed.');
      const itemId = data.item.id;

      // 2. Upload the photo client-direct to Supabase Storage, then attach it.
      const blob = file ?? photoBlob;
      if (blob) {
        try {
          setBusy('Compressing photo…');
          const compressed = await compressImage(blob);
          setBusy('Uploading photo…');
          const uploaded = await uploadItemPhoto(itemId, compressed.blob);
          setBusy('Attaching photo…');
          const patchRes = await fetch(`/api/collection/${itemId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              photos: [
                { url: uploaded.url, width: compressed.width, height: compressed.height },
                ...remotePhotos,
              ],
            }),
          });
          if (!patchRes.ok) throw new Error('Could not attach the photo to the car.');
        } catch (uploadErr) {
          // The car is saved; surface the storage problem without losing it.
          setSavedItemId(itemId);
          setError(uploadErr instanceof Error ? uploadErr.message : 'Photo upload failed.');
          setBusy(null);
          return;
        }
      }

      router.push(`/collection/${itemId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(null);
    }
  }

  if (savedItemId) {
    return (
      <div className="rounded-2xl border border-accent/40 bg-panel p-5">
        <h2 className="text-lg font-bold text-ink">Car saved — photo didn&apos;t upload</h2>
        <p className="mt-2 text-sm text-danger">{error}</p>
        <p className="mt-2 text-sm text-ink-muted">
          The car is in your garage without the photo. Fix storage (see the README) and add the
          photo later from the car&apos;s page.
        </p>
        <Button className="mt-5 w-full" onClick={() => router.push(`/collection/${savedItemId}`)}>
          View saved car
        </Button>
      </div>
    );
  }

  if (duplicates) {
    return (
      <div className="rounded-2xl border border-accent/40 bg-panel p-5">
        <h2 className="text-lg font-bold text-ink">You may already own this</h2>
        <p className="mt-1 text-sm text-ink-muted">
          {duplicates[0]?.reason === 'upc'
            ? 'A car with this exact barcode is already in your garage.'
            : 'This looks a lot like a car already in your garage.'}
        </p>
        <ul className="mt-4 flex flex-col gap-3">
          {duplicates.slice(0, 3).map((d) => (
            <li key={d.item.id}>
              <Link
                href={`/collection/${d.item.id}`}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-bg p-3 hover:border-accent/50"
              >
                {d.item.photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={d.item.photos[0].url}
                    alt={d.item.name}
                    className="h-14 w-14 rounded-lg object-cover"
                  />
                ) : (
                  <span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-lg bg-panel text-xl">🚗</span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink">{d.item.name}</span>
                  <span className="block font-mono text-xs text-ink-muted">
                    {d.reason === 'upc' ? 'Same barcode' : `${Math.round(d.score * 100)}% visual match`}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-col gap-3">
          <Button variant="panel" onClick={() => void save(true)} disabled={Boolean(busy)}>
            {busy ?? 'Add it anyway'}
          </Button>
          <Button variant="ghost" onClick={() => setDuplicates(null)}>
            Go back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void save(false);
      }}
    >
      {error ? (
        <p className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</p>
      ) : null}

      {initial.upc ? (
        <p className="rounded-xl bg-panel px-4 py-2 font-mono text-xs text-ink-muted">
          UPC <span className="text-accent">{initial.upc}</span>
        </p>
      ) : null}

      {initial.remotePhotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={initial.remotePhotoUrl}
          alt="Product preview"
          className="h-40 w-full rounded-2xl border border-white/10 bg-panel object-contain"
        />
      ) : null}

      <Field label="Name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 2024 Showroom Camaro Concept" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Year" type="number" inputMode="numeric" min={1900} max={2100} value={year} onChange={(e) => setYear(e.target.value)} placeholder="2024" />
        <Field label="Color" value={color} onChange={(e) => setColor(e.target.value)} placeholder="Red" />
      </div>
      <Field label="Series" value={series} onChange={(e) => setSeries(e.target.value)} placeholder="e.g. Showroom" />
      <Field label="Base code" value={baseCode} onChange={(e) => setBaseCode(e.target.value)} placeholder="Stamped under the car" />
      <TextAreaField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. birthday gift from Sam" />

      {photoBlob ? (
        <p className="text-sm text-ink-muted">Using your captured photo.</p>
      ) : (
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink-muted">Photo</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-ink-muted file:mr-3 file:rounded-xl file:border-0 file:bg-panel file:px-4 file:py-3 file:text-sm file:font-semibold file:text-accent"
          />
        </label>
      )}

      {/* Thumb zone: submit pinned visually at the bottom of the form */}
      <Button type="submit" disabled={Boolean(busy)} className="mt-2">
        {busy ?? (submitLabel ?? 'Add to collection')}
      </Button>
    </form>
  );
}
