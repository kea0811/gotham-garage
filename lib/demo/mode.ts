'use client';

/**
 * Demo (guest) mode. Everything behaves like the real app, but all data lives
 * only in the browser (IndexedDB) — nothing hits the server. Signing out clears
 * it, so the next visit starts fresh.
 *
 * A cookie is the source of truth so the server (middleware + the (app) layout)
 * can let a guest through without a Supabase session. The client reads the same
 * cookie to route data calls to the local store.
 */
import { DEMO_COOKIE } from './constants';

export { DEMO_COOKIE };

export function isDemoMode(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split('; ').some((c) => c === `${DEMO_COOKIE}=1`);
}

export function enterDemoMode(): void {
  // Session-ish: 1 day. Cleared explicitly on exit.
  document.cookie = `${DEMO_COOKIE}=1; path=/; max-age=${60 * 60 * 24}; samesite=lax`;
}

export async function exitDemoMode(): Promise<void> {
  document.cookie = `${DEMO_COOKIE}=; path=/; max-age=0; samesite=lax`;
  const { clearDemoItems } = await import('./store');
  await clearDemoItems();
}
