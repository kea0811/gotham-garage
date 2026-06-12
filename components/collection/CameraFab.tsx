'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CameraIcon } from '@/components/ui/icons';
import { isDemoMode } from '@/lib/demo/mode';

/**
 * Persistent camera FAB — the home action (PRD §12). Fixed in the thumb zone,
 * always one tap from adding a car. Raised above the demo banner when active.
 */
export function CameraFab() {
  const [demo, setDemo] = useState(false);
  useEffect(() => setDemo(isDemoMode()), []);

  return (
    <Link
      href="/add"
      aria-label="Add a car"
      className="fixed right-5 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-accent text-bg shadow-[0_8px_30px_rgba(255,212,0,0.35)] transition-transform active:scale-95"
      style={{
        bottom: demo
          ? 'calc(env(safe-area-inset-bottom, 0px) + 4rem)'
          : 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)',
      }}
    >
      <CameraIcon className="h-7 w-7" />
    </Link>
  );
}
