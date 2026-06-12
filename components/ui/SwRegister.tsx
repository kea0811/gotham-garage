'use client';

import { useEffect } from 'react';

/** Registers the hand-rolled service worker (public/sw.js) in production. */
export function SwRegister() {
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      process.env.NODE_ENV !== 'production'
    ) {
      return;
    }
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // PWA features degrade gracefully; the app still works online.
    });
  }, []);
  return null;
}
