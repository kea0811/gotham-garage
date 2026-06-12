'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react';
import { Logo } from '@/components/ui/Logo';

/**
 * Gotham Garage is phone-first — the barcode scanner and photo-match need a phone
 * camera. On a desktop/laptop we lead with a QR code so the visitor can open the
 * app on their phone. There is no desktop browser fallback (the app needs a
 * camera), so the QR is the only desktop surface.
 *
 * `initialDesktop` and `qr` are computed at SSR (User-Agent + server-side QR), so
 * the correct surface renders on the FIRST paint — no client swap, no layout
 * shift. The client only refines `isDesktop` with matchMedia for edge cases
 * (touch laptops, narrow windows, iPadOS spoofing macOS).
 *
 * `children` is the normal auth UI (the sign-in form), shown on phones.
 */
export function PhoneFirstAuth({
  children,
  initialDesktop,
  qr,
}: {
  children: React.ReactNode;
  initialDesktop: boolean;
  qr: string | null;
}) {
  const [isDesktop, setIsDesktop] = useState(initialDesktop);

  useEffect(() => {
    // "Desktop" = a wide screen with a precise pointer (mouse) and no touch.
    const mq = window.matchMedia('(min-width: 1024px) and (pointer: fine)');
    const update = () => setIsDesktop(mq.matches && !('ontouchstart' in window));
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  if (!isDesktop) {
    return <>{children}</>;
  }

  // Desktop: full-screen centered QR (covers the page's thumb-zone layout).
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg px-6">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-panel p-8 text-center">
        <div className="mx-auto mb-5 flex flex-col items-center gap-2">
          <Logo className="h-14 w-14" />
          <h2 className="text-xl font-bold text-ink">Gotham Garage is best on your phone</h2>
          <p className="max-w-xs text-sm text-ink-muted">
            The barcode scanner and photo-match use your phone camera. Scan to open Gotham Garage
            there.
          </p>
        </div>

        {qr ? (
          <img
            src={qr}
            alt="QR code — open Gotham Garage on your phone"
            width={224}
            height={224}
            className="mx-auto h-56 w-56 rounded-xl"
          />
        ) : (
          <div className="mx-auto h-56 w-56 animate-pulse rounded-xl bg-white/5" />
        )}

        <p className="mt-6 text-xs uppercase tracking-[0.15em] text-ink-muted">
          Point your phone camera at the code
        </p>
      </div>
    </div>
  );
}
