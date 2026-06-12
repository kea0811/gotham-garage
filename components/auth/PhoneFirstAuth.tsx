'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Logo } from '@/components/ui/Logo';

/**
 * Gotham Garage is phone-first — the barcode scanner and photo-match need a phone
 * camera. On a desktop/laptop we lead with a QR code so the visitor can open
 * the app on their phone, with an escape hatch to sign in on desktop anyway
 * (browsing the collection works fine without a camera).
 *
 * `children` is the normal auth UI (the sign-in form), shown directly on phones.
 */
export function PhoneFirstAuth({ children }: { children: React.ReactNode }) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    // "Desktop" = a wide screen with a precise pointer (mouse) and no touch.
    const mq = window.matchMedia('(min-width: 1024px) and (pointer: fine)');
    const update = () => setIsDesktop(mq.matches && !('ontouchstart' in window));
    update();
    mq.addEventListener('change', update);

    QRCode.toDataURL(window.location.origin + '/login', {
      width: 320,
      margin: 1,
      color: { dark: '#0a0a0a', light: '#fff113' }, // bat-gold QR on the brand accent
      errorCorrectionLevel: 'M',
    })
      .then(setQr)
      .catch(() => setQr(null));

    return () => mq.removeEventListener('change', update);
  }, []);

  // Until mounted, render the form (mobile-first assumption — avoids a desktop
  // visitor seeing nothing). On desktop we then swap to the QR.
  if (!mounted || !isDesktop || showForm) {
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

        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="mt-6 text-sm font-semibold text-accent underline-offset-4 hover:underline"
        >
          Continue in this browser instead
        </button>
      </div>
    </div>
  );
}
