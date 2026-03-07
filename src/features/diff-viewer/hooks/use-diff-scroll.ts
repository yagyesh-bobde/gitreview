'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useVirtualizer, type Virtualizer } from '@tanstack/react-virtual';

const LINE_HEIGHT = 20;
const HUNK_HEADER_HEIGHT = 32;
const OVERSCAN = 20;

interface UseDiffScrollOptions {
  /** Total number of rows (hunk headers + lines) */
  rowCount: number;
  /** Returns true if the row at this index is a hunk header (taller row) */
  isHunkHeader: (index: number) => boolean;
}

interface UseDiffScrollResult {
  virtualizer: Virtualizer<HTMLDivElement, Element>;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  scrollToIndex: (index: number) => void;
}

/**
 * Virtual scroll state for the diff viewer.
 * Wraps TanStack Virtual with diff-specific sizing and keyboard navigation.
 */
export function useDiffScroll({
  rowCount,
  isHunkHeader,
}: UseDiffScrollOptions): UseDiffScrollResult {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: (index) =>
      isHunkHeader(index) ? HUNK_HEADER_HEIGHT : LINE_HEIGHT,
    overscan: OVERSCAN,
  });

  const scrollToIndex = useCallback(
    (index: number) => {
      virtualizer.scrollToIndex(index, { align: 'center', behavior: 'smooth' });
    },
    [virtualizer],
  );

  // Keyboard navigation: j/k to scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (!container) return;
      // Don't capture if user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === 'j') {
        container.scrollBy({ top: LINE_HEIGHT * 3, behavior: 'smooth' });
      } else if (e.key === 'k') {
        container.scrollBy({ top: -LINE_HEIGHT * 3, behavior: 'smooth' });
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { virtualizer, scrollContainerRef, scrollToIndex };
}

export { LINE_HEIGHT, HUNK_HEADER_HEIGHT };
