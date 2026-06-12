'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UpcScanner } from '@/components/scanner/UpcScanner';
import { ItemForm } from '@/components/add/ItemForm';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import type { UpcProductData } from '@/models/UpcCache';

type Step =
  | { kind: 'scanning' }
  | { kind: 'looking-up'; upc: string }
  | { kind: 'confirm'; upc: string; data: UpcProductData | null }
  | { kind: 'failed'; upc: string; message: string; manualFallback: boolean };

/** Try to pull a model year out of a product title like "… 2024 Showroom …". */
function guessYear(title: string): number | undefined {
  const match = title.match(/\b(19[5-9]\d|20[0-4]\d)\b/);
  return match ? Number.parseInt(match[0], 10) : undefined;
}

export function ScanFlow() {
  const [step, setStep] = useState<Step>({ kind: 'scanning' });

  async function lookup(upc: string) {
    setStep({ kind: 'looking-up', upc });
    try {
      const res = await fetch(`/api/upc/${upc}`);
      const body = (await res.json()) as { data?: UpcProductData; error?: string };
      if (res.ok && body.data) {
        setStep({ kind: 'confirm', upc, data: body.data });
      } else if (res.status === 404) {
        // Unknown barcode → manual entry with the UPC carried over.
        setStep({ kind: 'confirm', upc, data: null });
      } else {
        setStep({
          kind: 'failed',
          upc,
          message: body.error ?? 'Lookup failed.',
          manualFallback: res.status === 429,
        });
      }
    } catch {
      setStep({
        kind: 'failed',
        upc,
        message: "You're offline — lookups need a connection.",
        manualFallback: true,
      });
    }
  }

  if (step.kind === 'scanning') {
    return <UpcScanner onDecoded={(upc) => void lookup(upc)} />;
  }

  if (step.kind === 'looking-up') {
    return <Spinner label={`Looking up ${step.upc}…`} />;
  }

  if (step.kind === 'failed') {
    return (
      <div className="rounded-2xl border border-white/10 bg-panel p-5">
        <p className="text-base text-ink">{step.message}</p>
        <div className="mt-5 flex flex-col gap-3">
          {step.manualFallback ? (
            <Button onClick={() => setStep({ kind: 'confirm', upc: step.upc, data: null })}>
              Enter details manually
            </Button>
          ) : null}
          <Button variant="panel" onClick={() => setStep({ kind: 'scanning' })}>
            Scan again
          </Button>
          <Link href="/add" className="text-center text-sm text-ink-muted hover:text-ink">
            Back to add menu
          </Link>
        </div>
      </div>
    );
  }

  // Confirm/edit metadata, then save.
  return (
    <div>
      {step.data ? (
        <p className="mb-4 rounded-xl border border-ok/30 bg-ok/10 px-4 py-2 text-sm text-ink">
          Found it — check the details and add it to your garage.
        </p>
      ) : (
        <p className="mb-4 rounded-xl border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-ink">
          No catalog match for that barcode. Fill in the details — the UPC is saved with it.
        </p>
      )}
      <ItemForm
        source="upc"
        initial={{
          name: step.data?.title ?? '',
          year: step.data ? guessYear(step.data.title) : undefined,
          upc: step.upc,
          remotePhotoUrl: step.data?.images[0],
        }}
        submitLabel="Add to collection"
      />
    </div>
  );
}
