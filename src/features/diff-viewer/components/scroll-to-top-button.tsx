'use client';

import { useEffect, useState, type RefObject } from 'react';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Scroll offset (px) past which the button becomes visible. */
const VISIBILITY_THRESHOLD = 300;

interface ScrollToTopButtonProps {
  /** The scroll container to observe and scroll back to top. */
  containerRef: RefObject<HTMLDivElement | null>;
}

/**
 * Floating button anchored to the bottom-right of the review scroll area.
 * Appears once the container is scrolled past VISIBILITY_THRESHOLD and
 * smoothly returns to the top when clicked.
 */
export function ScrollToTopButton({ containerRef }: ScrollToTopButtonProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setVisible(container.scrollTop > VISIBILITY_THRESHOLD);
    };

    // Sync initial state in case the container is already scrolled.
    handleScroll();
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [containerRef]);

  const scrollToTop = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Scroll to top"
      tabIndex={visible ? 0 : -1}
      className={cn(
        'absolute bottom-6 right-6 z-30 flex size-10 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800/90 text-zinc-300 shadow-lg backdrop-blur transition-all duration-200 hover:bg-zinc-700 hover:text-zinc-100',
        visible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-2 opacity-0',
      )}
    >
      <ArrowUp className="size-4" />
    </button>
  );
}
