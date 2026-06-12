import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSessionUser } from '@/lib/auth';
import { DEMO_COOKIE } from '@/lib/demo/constants';
import { DemoRuntime } from '@/components/demo/DemoRuntime';

export const dynamic = 'force-dynamic';

/** Everything under (app) requires a Supabase session — OR an active demo. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  const isDemo = (await cookies()).get(DEMO_COOKIE)?.value === '1';
  if (!user && !isDemo) redirect('/login');

  return (
    <div className="mx-auto w-full max-w-2xl">
      {children}
      {isDemo ? <DemoRuntime /> : null}
    </div>
  );
}
