export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8" role="status" aria-live="polite">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-accent" />
      {label ? <p className="text-sm text-ink-muted">{label}</p> : null}
    </div>
  );
}
