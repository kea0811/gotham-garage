import Link from 'next/link';
import { ArrowLeftIcon } from '@/components/ui/icons';
import { getSessionUser } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { isDbConfigured } from '@/lib/db';
import { SettingsActions } from '@/components/settings/SettingsActions';
import pkg from '@/package.json';

export const metadata = { title: 'Settings' };
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await getSessionUser();

  return (
    <main className="flex min-h-screen flex-col px-4 pb-12 pt-safe">
      <nav className="mb-4">
        <Link href="/collection" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
          <ArrowLeftIcon className="h-4 w-4" /> Collection
        </Link>
      </nav>
      <h1 className="text-2xl font-bold text-ink">Settings</h1>

      <section className="mt-6 rounded-2xl border border-white/10 bg-panel p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-muted">Account</h2>
        <p className="mt-2 text-base text-ink">{user?.email ?? 'Unknown'}</p>
        <p className="mt-1 font-mono text-xs text-ink-muted">{user?.id ?? ''}</p>
      </section>

      <section className="mt-4 rounded-2xl border border-white/10 bg-panel p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-muted">Status</h2>
        <dl className="mt-2 flex flex-col gap-2">
          <div className="flex justify-between">
            <dt className="text-sm text-ink-muted">Auth &amp; photo storage (Supabase)</dt>
            <dd
              className={`font-mono text-sm ${isSupabaseConfigured() ? 'text-ok' : 'text-danger'}`}
            >
              {isSupabaseConfigured() ? 'configured' : 'not configured'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-ink-muted">Database (MongoDB)</dt>
            <dd className={`font-mono text-sm ${isDbConfigured() ? 'text-ok' : 'text-danger'}`}>
              {isDbConfigured() ? 'configured' : 'not configured'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-ink-muted">App version</dt>
            <dd className="font-mono text-sm text-ink">{pkg.version}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-4 rounded-2xl border border-white/10 bg-panel p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-muted">
          Coming soon
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Offline add queue, multi-angle capture, and a shared reference catalog are on the
          roadmap — see the README.
        </p>
      </section>

      {/* Thumb zone: actions live at the bottom. */}
      <SettingsActions />
    </main>
  );
}
