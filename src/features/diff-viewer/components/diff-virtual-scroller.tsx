'use client';

import type { ReactNode } from 'react';
import type { Virtualizer } from '@tanstack/react-virtual';

interface DiffVirtualScrollerProps {
  virtualizer: Virtualizer<HTMLDivElement, Element>;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  children: (virtualItemIndex: number, style: React.CSSProperties) => ReactNode;
}

/**
 * TanStack Virtual wrapper for the diff viewer.
 * Provides virtualized scrolling for large diffs with variable row heights.
 */
export function DiffVirtualScroller({
  virtualizer,
  scrollContainerRef,
  children,
}: DiffVirtualScrollerProps) {
  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 overflow-auto"
      role="table"
      aria-label="Diff content"
    >
      <div
        className="relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualItems.map((virtualItem) => (
          <div
            key={virtualItem.key}
            data-index={virtualItem.index}
            ref={virtualizer.measureElement}
            className="absolute left-0 top-0 w-full"
            style={{
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {children(virtualItem.index, {})}
          </div>
        ))}
      </div>
    </div>
  );
}
