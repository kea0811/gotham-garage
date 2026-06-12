import { CollectionBrowser } from '@/components/collection/CollectionBrowser';
import { PullToRefresh } from '@/components/ui/PullToRefresh';

export const metadata = { title: 'Pitstop' };
export const dynamic = 'force-dynamic';

export default function CollectionPage() {
  // The masthead (logo, counts, Add Car) lives inside CollectionBrowser since
  // it needs the live item counts.
  return (
    <main className="min-h-screen pb-32">
      <PullToRefresh>
        <CollectionBrowser />
      </PullToRefresh>
    </main>
  );
}
