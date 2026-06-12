import Link from 'next/link';
import { VisualSearch } from '@/components/match/VisualSearch';

export const metadata = { title: 'Match a photo' };

export default function MatchPage() {
  return (
    <main className="min-h-screen px-4 pb-16 pt-6">
      <nav className="mb-4">
        <Link href="/add" className="text-sm text-ink-muted hover:text-ink">
          ← Add a car
        </Link>
      </nav>
      <h1 className="mb-6 text-2xl font-bold text-ink">Match a loose car</h1>
      <VisualSearch />
    </main>
  );
}
