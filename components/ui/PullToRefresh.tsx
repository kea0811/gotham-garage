'use client';

import { useEffect, useRef, useState } from 'react';

const THRESHOLD = 70; // px the user must pull before a release triggers refresh
const MAX_PULL = 110; // visual cap on how far the indicator travels

/**
 * Custom pull-to-refresh for standalone (home-screen) mode, where iOS's native
 * pull-to-refresh is unreliable or absent. Engages only when the page is
 * scrolled to the top and the user drags downward. On release past the
 * threshold it runs `onRefresh` (default: a full reload, which also picks up a
 * new deploy via the network-first service worker).
 */
export function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh?: () => void | Promise<void>;
  children: React.ReactNode;
}) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const active = useRef(false);

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      // Only arm the gesture when we're at the very top of the page.
      if (window.scrollY <= 0 && !refreshing && e.touches[0]) {
        startY.current = e.touches[0].clientY;
        active.current = true;
      } else {
        active.current = false;
      }
    }
    function onTouchMove(e: TouchEvent) {
      if (!active.current || startY.current === null || !e.touches[0]) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) {
        setPull(0);
        return;
      }
      // Rubber-band: ease the pull so it feels resistant past the threshold.
      const eased = Math.min(MAX_PULL, delta * 0.5);
      setPull(eased);
      if (eased > 4) e.preventDefault(); // suppress native scroll/bounce while pulling
    }
    async function onTouchEnd() {
      if (!active.current) return;
      active.current = false;
      startY.current = null;
      if (pull >= THRESHOLD && !refreshing) {
        setRefreshing(true);
        setPull(THRESHOLD);
        try {
          if (onRefresh) {
            await onRefresh();
            setRefreshing(false);
            setPull(0);
          } else {
            window.location.reload(); // default: reload (refetches data + new deploy)
          }
        } catch {
          setRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [pull, refreshing, onRefresh]);

  const ready = pull >= THRESHOLD;

  return (
    <>
      {/* Pull indicator — sits below the status bar, follows the finger. */}
      <div
        aria-hidden
        className="pointer-events-none fixed left-0 right-0 z-30 flex justify-center"
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + 4px)',
          opacity: pull > 2 || refreshing ? 1 : 0,
          transform: `translateY(${(refreshing ? THRESHOLD : pull) - 28}px)`,
          transition: active.current ? 'none' : 'transform 0.2s ease, opacity 0.2s ease',
        }}
      >
        <div className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-panel shadow">
          <svg
            viewBox="0 0 24 24"
            className={`h-5 w-5 text-accent ${refreshing ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transform: refreshing ? undefined : `rotate(${ready ? 180 : Math.min(180, pull * 2.5)}deg)` }}
          >
            {refreshing ? (
              <path d="M21 12a9 9 0 1 1-6.2-8.5" />
            ) : (
              <path d="M12 5v14M19 12l-7 7-7-7" />
            )}
          </svg>
        </div>
      </div>

      <div
        style={{
          transform: pull > 0 || refreshing ? `translateY(${refreshing ? 0 : pull * 0.4}px)` : undefined,
          transition: active.current ? 'none' : 'transform 0.2s ease',
        }}
      >
        {children}
      </div>
    </>
  );
}
