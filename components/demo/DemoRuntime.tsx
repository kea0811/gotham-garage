'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { installDemoInterceptor } from '@/lib/demo/interceptor';
import { exitDemoMode } from '@/lib/demo/mode';
import { seedDemoIfEmpty } from '@/lib/demo/seed';

/**
 * Rendered inside the (app) layout only when the demo cookie is present.
 * Installs the fetch interceptor (routes data calls to the local store) and
 * shows a persistent bottom banner so the guest knows nothing is saved.
 *
 * Bottom-fixed (not top) so it never collides with the sticky masthead; the
 * camera FAB floats clear on the right.
 */
export function DemoRuntime() {
  const router = useRouter();
  const [exiting, setExiting] = useState(false);

  // Install synchronously on first render so the very first data fetch is
  // intercepted (a useEffect would run after children mount + fetch).
  if (typeof window !== 'undefined') installDemoInterceptor();
  useEffect(() => {
    installDemoInterceptor();
    // Safety net: seed example cars if a demo session somehow has an empty store.
    void seedDemoIfEmpty();
  }, []);

  async function exit() {
    setExiting(true);
    await exitDemoMode();
    router.replace('/login');
    router.refresh();
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-accent/30 bg-accent/10 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
    >
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-2.5">
        <p className="text-xs leading-tight text-ink">
          <span className="font-bold text-accent">Demo mode</span> — nothing is saved; it resets
          when you exit.
        </p>
        <button
          type="button"
          onClick={() => void exit()}
          disabled={exiting}
          className="ml-auto shrink-0 rounded-full border border-white/20 bg-black/30 px-3 py-1 text-xs font-semibold text-ink hover:border-accent/60 disabled:opacity-50"
        >
          {exiting ? 'Exiting…' : 'Exit demo'}
        </button>
      </div>
    </div>
  );
}
