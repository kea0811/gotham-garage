import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Server-side Supabase client for Server Components and Route Handlers,
 * following the @supabase/ssr cookie conventions. Supabase owns identity;
 * its `user.id` (UUID string) is the `userId` stored on MongoDB documents.
 */

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super(
      'Supabase is not configured — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
    this.name = 'SupabaseNotConfiguredError';
  }
}

export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

/** Read the public Supabase env vars; null when either is missing. */
export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseEnv() !== null;
}

/** Cookie-bound server client. Throws SupabaseNotConfiguredError without env. */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const env = getSupabaseEnv();
  if (!env) throw new SupabaseNotConfiguredError();

  const cookieStore = await cookies();
  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — middleware refreshes sessions,
          // so dropping the write here is safe per @supabase/ssr docs.
        }
      },
    },
  });
}
