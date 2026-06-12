/* eslint-disable @next/next/no-img-element */

/**
 * The Vault emblem — a gold bat-in-ring badge (generated artwork in
 * /public/logo.png). Decorative; hidden from assistive tech since the wordmark
 * beside it carries the name.
 */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <img
      src="/logo.png"
      alt=""
      aria-hidden
      className={`rounded-full object-cover ${className}`}
    />
  );
}
