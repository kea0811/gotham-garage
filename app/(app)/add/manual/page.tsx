import Link from 'next/link';
import { ArrowLeftIcon } from '@/components/ui/icons';
import { ItemForm } from '@/components/add/ItemForm';

export const metadata = { title: 'Add manually' };

export default function ManualAddPage() {
  return (
    <main className="min-h-screen px-4 pb-16 pt-6">
      <nav className="mb-4">
        <Link href="/add" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
          <ArrowLeftIcon className="h-4 w-4" /> Add a car
        </Link>
      </nav>
      <h1 className="mb-6 text-2xl font-bold text-ink">Add manually</h1>
      <ItemForm source="manual" />
    </main>
  );
}
