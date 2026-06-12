import Link from 'next/link';
import { ArrowLeftIcon } from '@/components/ui/icons';
import { VisualSearch } from '@/components/match/VisualSearch';

export const metadata = { title: 'Match a photo' };

export default function MatchPage() {
  return (
    <main className="min-h-screen px-4 pb-16 pt-safe">
      <nav className="mb-4">
        <Link href="/add" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
          <ArrowLeftIcon className="h-4 w-4" /> Add a car
        </Link>
      </nav>
      <h1 className="mb-6 text-2xl font-bold text-ink">Match a loose car</h1>
      <VisualSearch />
    </main>
  );
}
