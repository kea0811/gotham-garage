import Link from 'next/link';

export const metadata = { title: 'Add a car' };

const options = [
  {
    href: '/add/scan',
    emoji: '📦',
    title: 'Scan UPC',
    body: 'Carded car? Scan the barcode on the back.',
  },
  {
    href: '/add/match',
    emoji: '📸',
    title: 'Match photo',
    body: 'Loose car? Snap a photo and find it visually.',
  },
  {
    href: '/add/manual',
    emoji: '✍️',
    title: 'Add manually',
    body: 'Type the details yourself.',
  },
];

export default function AddPage() {
  return (
    <main className="flex min-h-screen flex-col px-4 pb-10 pt-6">
      <nav>
        <Link href="/collection" className="text-sm text-ink-muted hover:text-ink">
          ← Collection
        </Link>
      </nav>
      <h1 className="mt-4 text-2xl font-bold text-ink">Add a car</h1>

      {/* Big targets stacked toward the thumb zone */}
      <div className="mt-auto flex flex-col gap-4 pt-8">
        {options.map((o) => (
          <Link
            key={o.href}
            href={o.href}
            className="flex items-center gap-4 rounded-2xl border border-white/10 bg-panel p-5 transition-colors hover:border-accent/60 active:scale-[0.99]"
          >
            <span aria-hidden className="text-4xl">{o.emoji}</span>
            <span>
              <span className="block text-lg font-bold text-ink">{o.title}</span>
              <span className="block text-sm text-ink-muted">{o.body}</span>
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
