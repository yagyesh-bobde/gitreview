'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils/cn';

/** Marks the scroll container whose scrolling drives the header collapse. */
export const COLLAPSE_SCROLL_REGION = 'review-diff';

/** Ignore tiny scroll jitter (trackpad inertia, sub-pixel scrolls). */
const SCROLL_DELTA = 6;
/** Always show the header within this distance of the top. */
const TOP_OFFSET = 48;
/** Matches the transition duration; layout shifts during it aren't user scrolls. */
const TRANSITION_MS = 250;

interface CollapsibleHeaderProps {
  /** Ancestor containing the `data-scroll-region` scroller (scroll events are captured). */
  scrollRoot: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}

/**
 * Hides its children while the user scrolls down the diff and reveals them on
 * any scroll up. Collapses height via a grid-rows transition so the diff
 * smoothly grows into the freed space.
 */
export function CollapsibleHeader({ scrollRoot, children }: CollapsibleHeaderProps) {
  const [hidden, setHidden] = useState(false);
  const hiddenRef = useRef(false);

  useEffect(() => {
    const root = scrollRoot.current;
    if (!root) return;

    let lastTop = 0;
    let lockedUntil = 0;
    let frame = 0;

    const update = (target: HTMLElement) => {
      frame = 0;
      const top = target.scrollTop;
      const delta = top - lastTop;
      if (performance.now() < lockedUntil || Math.abs(delta) < SCROLL_DELTA) {
        lastTop = top;
        return;
      }
      lastTop = top;

      const next = top > TOP_OFFSET && delta > 0;
      if (next === hiddenRef.current) return;
      hiddenRef.current = next;
      lockedUntil = performance.now() + TRANSITION_MS;
      setHidden(next);
    };

    const onScroll = (e: Event) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.dataset.scrollRegion !== COLLAPSE_SCROLL_REGION) return;
      if (!frame) frame = requestAnimationFrame(() => update(target));
    };

    // Scroll events don't bubble, so listen in the capture phase.
    root.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => {
      root.removeEventListener('scroll', onScroll, { capture: true });
      cancelAnimationFrame(frame);
    };
  }, [scrollRoot]);

  return (
    <div
      className={cn(
        'grid shrink-0 transition-[grid-template-rows,opacity] duration-250 ease-out motion-reduce:transition-none',
        hidden ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100',
      )}
      inert={hidden}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
