'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ItemForm } from '@/components/add/ItemForm';
import { removeImageBackground } from '@/lib/bg-removal';
import { embedImage } from '@/lib/embedding';
import { topK, DUPLICATE_THRESHOLD, type EmbeddedItem } from '@/lib/similarity';
import type { CollectionItemDTO } from '@/models/CollectionItem';

type Step =
  | { kind: 'capture' }
  | { kind: 'processing'; label: string }
  | {
      kind: 'results';
      matches: { item: CollectionItemDTO; score: number }[];
      embedding: number[];
      photo: Blob;
    }
  | { kind: 'add-new'; embedding: number[]; photo: Blob }
  | { kind: 'error'; message: string };

export function VisualSearch() {
  const [step, setStep] = useState<Step>({ kind: 'capture' });
  const photoUrl = useMemo(
    () =>
      step.kind === 'results' || step.kind === 'add-new'
        ? URL.createObjectURL(step.photo)
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step.kind === 'results' || step.kind === 'add-new' ? step.photo : null],
  );

  async function process(file: File) {
    try {
      setStep({ kind: 'processing', label: 'Removing the background…' });
      let subject: Blob = file;
      try {
        subject = await removeImageBackground(file);
      } catch {
        // Background removal is an enhancer — match on the raw photo if the
        // model fails to load (e.g. low-memory devices).
      }

      setStep({
        kind: 'processing',
        label: 'Loading the match engine… first time downloads ~30 MB.',
      });
      const objectUrl = URL.createObjectURL(subject);
      let embedding: number[];
      try {
        embedding = await embedImage(objectUrl);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }

      setStep({ kind: 'processing', label: 'Comparing against your garage…' });
      const [embRes, listRes] = await Promise.all([
        fetch('/api/collection/embeddings'),
        fetch('/api/collection?limit=200'),
      ]);
      if (!embRes.ok || !listRes.ok) {
        throw new Error('Could not load your library. Are you online?');
      }
      const { embeddings } = (await embRes.json()) as { embeddings: EmbeddedItem[] };
      const { items } = (await listRes.json()) as { items: CollectionItemDTO[] };
      const byId = new Map(items.map((i) => [i.id, i]));

      const matches = topK(embedding, embeddings)
        .map((s) => {
          const item = byId.get(s.id);
          return item ? { item, score: s.score } : null;
        })
        .filter((m): m is { item: CollectionItemDTO; score: number } => m !== null);

      setStep({ kind: 'results', matches, embedding, photo: subject });
    } catch (err) {
      setStep({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Visual search failed. Try again.',
      });
    }
  }

  if (step.kind === 'capture') {
    return (
      <div className="flex flex-col gap-5">
        <p className="text-sm text-ink-muted">
          Take a top-down photo of the loose car on any background. Pitstop trims the background
          and finds the closest matches in your garage — all on your phone.
        </p>
        <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-accent/50 bg-panel p-6 text-center">
          <span aria-hidden className="text-4xl">📸</span>
          <span className="text-base font-semibold text-ink">Take or choose a photo</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void process(f);
            }}
          />
        </label>
      </div>
    );
  }

  if (step.kind === 'processing') {
    return <Spinner label={step.label} />;
  }

  if (step.kind === 'error') {
    return (
      <div className="rounded-2xl border border-white/10 bg-panel p-5">
        <p className="text-base text-ink">{step.message}</p>
        <div className="mt-4 flex flex-col gap-3">
          <Button onClick={() => setStep({ kind: 'capture' })}>Try another photo</Button>
          <Link href="/add/manual" className="text-center text-sm text-accent underline-offset-4 hover:underline">
            Add manually instead
          </Link>
        </div>
      </div>
    );
  }

  if (step.kind === 'add-new') {
    return (
      <div>
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="Your captured car" className="mb-4 h-44 w-full rounded-2xl border border-white/10 bg-panel object-contain" />
        ) : null}
        <ItemForm source="visual" embedding={step.embedding} photoBlob={step.photo} submitLabel="Add as new car" />
      </div>
    );
  }

  const likelyDuplicate = step.matches[0] && step.matches[0].score >= DUPLICATE_THRESHOLD;

  return (
    <div>
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="Your captured car" className="mb-4 h-36 w-full rounded-2xl border border-white/10 bg-panel object-contain" />
      ) : null}

      {likelyDuplicate ? (
        <p className="mb-3 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-ink">
          <strong className="text-accent">You may already own this.</strong> The top match is{' '}
          {Math.round((step.matches[0]?.score ?? 0) * 100)}% similar.
        </p>
      ) : null}

      {step.matches.length === 0 ? (
        <p className="mb-4 rounded-xl border border-white/10 bg-panel px-4 py-3 text-sm text-ink-muted">
          No cars with photos to match against yet — this one will be your first.
        </p>
      ) : (
        <>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-muted">
            Closest matches — tap yours
          </h2>
          <ul className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {step.matches.map(({ item, score }) => (
              <li key={item.id} className="list-none">
                <Link
                  href={`/collection/${item.id}`}
                  className="block overflow-hidden rounded-2xl border border-white/10 bg-panel hover:border-accent/60"
                >
                  <div className="aspect-square w-full bg-bg">
                    {item.photos[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.photos[0].url} alt={item.name} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div aria-hidden className="flex h-full w-full items-center justify-center text-3xl text-ink-muted">🚗</div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm font-semibold text-ink">{item.name}</p>
                    <p className="mt-0.5 font-mono text-xs text-accent">{Math.round(score * 100)}% match</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="flex flex-col gap-3">
        <Button onClick={() => setStep({ kind: 'add-new', embedding: step.embedding, photo: step.photo })}>
          None of these — add as new car
        </Button>
        <Button variant="panel" onClick={() => setStep({ kind: 'capture' })}>
          Retake photo
        </Button>
      </div>
    </div>
  );
}
