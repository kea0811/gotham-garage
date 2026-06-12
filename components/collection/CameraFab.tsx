'use client';

import Link from 'next/link';

/**
 * Persistent camera FAB — the home action (PRD §12). Fixed in the thumb zone,
 * always one tap from adding a car.
 */
export function CameraFab() {
  return (
    <Link
      href="/add"
      aria-label="Add a car"
      className="fixed bottom-6 right-5 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-accent text-3xl text-bg shadow-[0_8px_30px_rgba(167,139,250,0.45)] transition-transform active:scale-95"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
    >
      <span aria-hidden>📷</span>
    </Link>
  );
}
