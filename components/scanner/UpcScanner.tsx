'use client';

import { useEffect, useRef, useState } from 'react';
import type { IScannerControls } from '@zxing/browser';

/**
 * Live camera UPC/EAN scanner via @zxing/browser. Manual entry stays available
 * as a fallback (PRD §6) for stubborn barcodes or denied camera permissions.
 */
export function UpcScanner({ onDecoded }: { onDecoded: (upc: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualUpc, setManualUpc] = useState('');

  useEffect(() => {
    let controls: IScannerControls | null = null;
    let cancelled = false;

    async function start() {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        if (cancelled || !videoRef.current) return;
        const reader = new BrowserMultiFormatReader();
        controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
          const text = result?.getText();
          if (text && /^\d{12,13}$/.test(text)) {
            controls?.stop();
            onDecoded(text);
          }
        });
      } catch {
        if (!cancelled) {
          setCameraError(
            'Camera unavailable. Allow camera access, or type the barcode digits below.',
          );
        }
      }
    }

    void start();
    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [onDecoded]);

  return (
    <div className="flex flex-col gap-4">
      {cameraError ? (
        <p className="rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          {cameraError}
        </p>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-panel">
          <video ref={videoRef} className="aspect-[3/4] w-full object-cover" muted playsInline />
          <div aria-hidden className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 rounded bg-accent/80 shadow-[0_0_20px_rgba(167,139,250,0.8)]" />
          <p className="absolute inset-x-0 bottom-3 text-center text-xs text-ink-muted">
            Line up the barcode on the back of the card
          </p>
        </div>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (/^\d{12,13}$/.test(manualUpc)) onDecoded(manualUpc);
        }}
      >
        <input
          inputMode="numeric"
          pattern="\d{12,13}"
          placeholder="…or type the 12–13 digits"
          aria-label="UPC digits"
          value={manualUpc}
          onChange={(e) => setManualUpc(e.target.value.replace(/\D/g, '').slice(0, 13))}
          className="min-h-12 flex-1 rounded-xl border border-white/10 bg-panel px-4 font-mono text-base text-ink placeholder:font-sans placeholder:text-ink-muted focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={!/^\d{12,13}$/.test(manualUpc)}
          className="min-h-12 rounded-xl bg-accent px-5 font-semibold text-bg disabled:opacity-40"
        >
          Go
        </button>
      </form>
    </div>
  );
}
