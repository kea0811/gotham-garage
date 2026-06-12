'use client';

import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'panel' | 'ghost' | 'danger';

const styles: Record<Variant, string> = {
  primary:
    'bg-accent text-bg font-semibold hover:bg-accent-deep active:scale-[0.98] disabled:opacity-40',
  panel:
    'bg-panel text-ink border border-white/10 hover:border-accent/50 active:scale-[0.98] disabled:opacity-40',
  ghost: 'bg-transparent text-ink-muted hover:text-ink disabled:opacity-40',
  danger:
    'bg-transparent text-danger border border-danger/40 hover:bg-danger/10 disabled:opacity-40',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`min-h-12 rounded-xl px-4 text-base transition-all ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
