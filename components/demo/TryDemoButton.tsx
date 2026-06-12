'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { enterDemoMode } from '@/lib/demo/mode';
import { seedDemoIfEmpty } from '@/lib/demo/seed';

/** "Try the demo" entry — starts a local-only guest session with example cars. */
export function TryDemoButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    enterDemoMode();
    await seedDemoIfEmpty(); // populate example cars before the grid loads
    router.push('/collection');
    router.refresh();
  }

  return (
    <div className="mt-6 text-center">
      <button
        type="button"
        onClick={() => void start()}
        disabled={busy}
        className="text-sm font-semibold text-ink-muted underline-offset-4 hover:text-ink hover:underline disabled:opacity-50"
      >
        {busy ? 'Starting…' : 'Just looking? Try the demo →'}
      </button>
      <p className="mt-1 text-xs text-ink-muted">No account. Everything stays on this device.</p>
    </div>
  );
}
