import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /auth/confirm — lands Supabase email links (sign-up confirmation and
 * password recovery). Supports both the token_hash (verifyOtp) and PKCE
 * `?code=` (exchangeCodeForSession) shapes, then redirects to `next`.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  const code = url.searchParams.get('code');
  const nextParam = url.searchParams.get('next') ?? '/collection';
  // Only allow same-origin relative redirects.
  const next = nextParam.startsWith('/') ? nextParam : '/collection';

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
      if (!error) {
        const dest = type === 'recovery' ? '/reset-password' : next;
        return NextResponse.redirect(new URL(dest, url.origin));
      }
    } else if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  return NextResponse.redirect(new URL('/login?error=link', url.origin));
}
