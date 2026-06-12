import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import QRCode from 'qrcode';
import { getSessionUser } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { isDesktopUserAgent } from '@/lib/device';
import { LoginForm } from '@/components/auth/LoginForm';
import { PhoneFirstAuth } from '@/components/auth/PhoneFirstAuth';
import { TryDemoButton } from '@/components/demo/TryDemoButton';

export const metadata = { title: 'Sign in' };
export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const configured = isSupabaseConfigured();
  if (configured) {
    const user = await getSessionUser();
    if (user) redirect('/collection');
  }
  const { error } = await searchParams;

  // Phone-first detection at SSR so the right surface paints first (no flash).
  const h = await headers();
  const isDesktop = isDesktopUserAgent(h.get('user-agent'));
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? '';
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const qr =
    isDesktop && host
      ? await QRCode.toDataURL(`${proto}://${host}/login`, {
          width: 320,
          margin: 1,
          color: { dark: '#0a0a0a', light: '#fff113' }, // bat-gold QR on the brand accent
          errorCorrectionLevel: 'M',
        }).catch(() => null)
      : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-end px-6 pb-16 pt-safe">
      <div className="mb-auto pt-10">
        <p className="text-sm font-extrabold uppercase tracking-[0.3em] text-accent">Gotham Garage</p>
        <h1 className="mt-3 text-3xl font-bold leading-tight text-ink">
          Every car in your collection, one scan away.
        </h1>
        <p className="mt-3 text-base text-ink-muted">
          Scan barcodes on carded cars, photo-match loose ones, and browse your diecast garage
          anywhere — even offline.
        </p>
      </div>

      {/* Thumb zone: auth actions live in the bottom third. */}
      <div className="mt-10">
        {error === 'link' ? (
          <p className="mb-4 rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
            That email link is invalid or has expired. Request a fresh one below.
          </p>
        ) : null}
        {configured ? (
          <PhoneFirstAuth initialDesktop={isDesktop} qr={qr}>
            <LoginForm />
            <TryDemoButton />
          </PhoneFirstAuth>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-panel p-5">
            <h2 className="text-base font-semibold text-ink">Sign-in not configured</h2>
            <p className="mt-2 text-sm text-ink-muted">
              Set <code className="font-mono text-accent">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
              <code className="font-mono text-accent">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to
              enable email + password sign-in. See the README for Supabase setup.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
