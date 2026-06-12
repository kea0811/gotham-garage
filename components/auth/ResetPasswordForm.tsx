'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';

/** Sets a new password for the recovery session created by the email link. */
export function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Those passwords don't match.");
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError('Supabase is not configured — see the README.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) {
      setError(
        /session/i.test(err.message)
          ? 'Your reset link expired. Request a new one from the sign-in page.'
          : err.message,
      );
      return;
    }
    window.location.assign('/collection');
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      {error ? (
        <p className="rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Field
        label="New password"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        placeholder="At least 8 characters"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Field
        label="Confirm new password"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        placeholder="Same again"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />
      <Button type="submit" disabled={busy || !password || !confirm}>
        {busy ? 'Saving…' : 'Save new password'}
      </Button>
      <Link href="/login" className="text-center text-sm text-ink-muted hover:text-ink">
        Back to sign in
      </Link>
    </form>
  );
}
