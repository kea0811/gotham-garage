import Link from 'next/link';
import { ArrowLeftIcon } from '@/components/ui/icons';
import { CatalogSearch } from '@/components/wishlist/CatalogSearch';

export const metadata = { title: 'Search the catalog' };

export default function CatalogSearchPage() {
  return (
    <main className="min-h-screen px-4 pb-16 pt-safe">
      <nav className="mb-4">
        <Link href="/add" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
          <ArrowLeftIcon className="h-4 w-4" /> Add a car
        </Link>
      </nav>
      <h1 className="mb-2 text-2xl font-bold text-ink">Search the catalog</h1>
      <p className="mb-6 text-sm text-ink-muted">Find a car you want and add it to your wishlist.</p>
      <CatalogSearch />
    </main>
  );
}
