import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export const metadata = { title: 'Reset password' };
export const dynamic = 'force-dynamic';

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <p className="font-mono text-sm uppercase tracking-[0.3em] text-accent">Pitstop</p>
      <h1 className="mt-3 text-2xl font-bold text-ink">Choose a new password</h1>
      <p className="mt-2 text-sm text-ink-muted">
        You got here from a password-reset email — set a new password below.
      </p>
      <div className="mt-8">
        <ResetPasswordForm />
      </div>
    </main>
  );
}
