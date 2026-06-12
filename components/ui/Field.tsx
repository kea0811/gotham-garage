'use client';

import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

const inputClass =
  'w-full min-h-12 rounded-xl bg-panel border border-white/10 px-4 text-base text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none';

export function Field({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-muted">{label}</span>
      <input className={inputClass} {...props} />
    </label>
  );
}

export function TextAreaField({
  label,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-muted">{label}</span>
      <textarea className={`${inputClass} min-h-24 py-3`} {...props} />
    </label>
  );
}
