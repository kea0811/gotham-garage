import { NextResponse } from 'next/server';
import { getSessionUser, type SessionUser } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { DbNotConfiguredError } from '@/lib/db';

/**
 * 401 unless a Supabase session exists (middleware already guards these
 * routes; this is defense in depth). 503 when auth itself is unconfigured.
 */
export async function requireUser(): Promise<SessionUser | NextResponse> {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error:
          'Auth not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
      },
      { status: 503 },
    );
  }
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to use Pitstop.' }, { status: 401 });
  }
  return user;
}

export function isErrorResponse(value: SessionUser | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}

/** Map known infrastructure failures to friendly JSON errors. */
export function handleRouteError(err: unknown): NextResponse {
  if (err instanceof DbNotConfiguredError) {
    return NextResponse.json(
      { error: 'Database not configured. Set MONGODB_URI to enable your collection.' },
      { status: 503 },
    );
  }
  console.error('[pitstop] route error:', err);
  return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 });
}
