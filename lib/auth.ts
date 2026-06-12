import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/server';

/**
 * Session helpers on top of Supabase Auth (email + password). The Supabase
 * user UUID is the `userId` written to every MongoDB document — there is no
 * local `users` collection.
 */

export interface SessionUser {
  /** Supabase auth UUID — stored as a string on Mongo documents. */
  id: string;
  email: string;
}

/** Resolve the signed-in user server-side; null when unauthenticated. */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? '' };
}
