'use client';

import Link from 'next/link';
import { CameraIcon } from '@/components/ui/icons';

/**
 * Persistent camera FAB — the home action (PRD §12). Fixed in the thumb zone,
 * always one tap from adding a car.
 */
export function CameraFab() {
  return (
    <Link
      href="/add"
      aria-label="Add a car"
      className="fixed bottom-6 right-5 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-accent text-bg shadow-[0_8px_30px_rgba(255,212,0,0.35)] transition-transform active:scale-95"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
    >
      <CameraIcon className="h-7 w-7" />
    </Link>
  );
}
