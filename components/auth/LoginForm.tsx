'use client';

import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';

type Mode = 'signin' | 'signup' | 'forgot';

const HEADINGS: Record<Mode, string> = {
  signin: 'Sign in',
  signup: 'Create account',
  forgot: 'Reset password',
};

/** Email + password auth via Supabase, with a forgot-password flow. */
export function LoginForm() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setMessage(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError('Supabase is not configured — see the README.');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) {
          setError(
            err.message === 'Invalid login credentials'
              ? 'Wrong email or password.'
              : err.message,
          );
          return;
        }
        // Full navigation so middleware sees the fresh session cookies.
        window.location.assign('/collection');
        return;
      }

      if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
        });
        if (err) {
          setError(err.message);
          return;
        }
        if (data.session) {
          window.location.assign('/collection');
          return;
        }
        setMessage(`Almost there — confirm your email via the link we sent to ${email}.`);
        return;
      }

      // forgot
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
      });
      if (err) {
        setError(err.message);
        return;
      }
      setMessage(`Password reset link sent to ${email}. Check your inbox.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {message ? (
        <p className="rounded-xl border border-accent/30 bg-accent/10 p-4 text-sm text-ink">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field
          label="Email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {mode !== 'forgot' ? (
          <Field
            label="Password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        ) : null}

        <Button type="submit" disabled={busy || !email || (mode !== 'forgot' && !password)}>
          {busy ? 'One sec…' : HEADINGS[mode]}
        </Button>
      </form>

      <div className="flex items-center justify-between text-sm">
        {mode === 'signin' ? (
          <>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className="text-accent underline-offset-4 hover:underline"
            >
              Create account
            </button>
            <button
              type="button"
              onClick={() => switchMode('forgot')}
              className="text-ink-muted hover:text-ink"
            >
              Forgot password?
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => switchMode('signin')}
            className="text-accent underline-offset-4 hover:underline"
          >
            ← Back to sign in
          </button>
        )}
      </div>
    </div>
  );
}
