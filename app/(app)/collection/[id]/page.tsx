import { ItemDetail } from '@/components/collection/ItemDetail';

export const metadata = { title: 'Car details' };
export const dynamic = 'force-dynamic';

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="min-h-screen px-4 pb-24 pt-safe">
      <ItemDetail id={id} />
    </main>
  );
}
