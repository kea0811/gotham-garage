import Link from 'next/link';
import { CollectionBrowser } from '@/components/collection/CollectionBrowser';

export const metadata = { title: 'Collection' };
export const dynamic = 'force-dynamic';

export default function CollectionPage() {
  return (
    <main className="min-h-screen px-4 pb-32 pt-6">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="font-mono text-lg font-bold uppercase tracking-[0.2em] text-ink">
          Pit<span className="text-accent">stop</span>
        </h1>
        <Link
          href="/settings"
          aria-label="Settings"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-panel text-ink-muted hover:text-ink"
        >
          ⚙
        </Link>
      </header>
      <CollectionBrowser />
    </main>
  );
}
