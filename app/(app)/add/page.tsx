import Link from 'next/link';
import type { ComponentType, SVGProps } from 'react';
import { BarcodeIcon, SparkPhotoIcon, PencilIcon, SearchIcon, ArrowLeftIcon } from '@/components/ui/icons';

export const metadata = { title: 'Add a car' };

const options: Array<{
  href: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  body: string;
}> = [
  {
    href: '/add/scan',
    Icon: BarcodeIcon,
    title: 'Scan UPC',
    body: 'Carded car? Scan the barcode on the back.',
  },
  {
    href: '/add/match',
    Icon: SparkPhotoIcon,
    title: 'Match photo',
    body: 'Loose car? Snap a photo and find it visually.',
  },
  {
    href: '/add/search',
    Icon: SearchIcon,
    title: 'Search the catalog',
    body: "Want one you don't have yet? Find it and add to your wishlist.",
  },
  {
    href: '/add/manual',
    Icon: PencilIcon,
    title: 'Add manually',
    body: 'Type the details yourself.',
  },
];

export default function AddPage() {
  return (
    <main className="px-4 pb-10 pt-safe">
      <nav>
        <Link href="/collection" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
          <ArrowLeftIcon className="h-4 w-4" /> Collection
        </Link>
      </nav>
      <h1 className="mt-4 text-2xl font-bold text-ink">Add a car</h1>
      <p className="mt-2 text-sm text-ink-muted">Pick how you want to add it.</p>

      <div className="mt-6 flex flex-col gap-4">
        {options.map(({ href, Icon, title, body }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 rounded-2xl border border-white/10 bg-panel p-5 transition-colors hover:border-accent/60 active:scale-[0.99]"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
              <Icon className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-lg font-bold text-ink">{title}</span>
              <span className="block text-sm text-ink-muted">{body}</span>
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
