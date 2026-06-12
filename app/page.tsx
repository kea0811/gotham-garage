import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Auth wall: signed-in users land on their collection, others on /login. */
export default async function HomePage() {
  const user = await getSessionUser();
  redirect(user ? '/collection' : '/login');
}
