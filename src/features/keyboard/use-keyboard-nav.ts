'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseKeyboardNavOptions {
  /** Total number of items in the list */
  itemCount: number;
  /** Called when Enter is pressed on the selected item */
  onSelect: (index: number) => void;
  /** Called when Escape is pressed */
  onClose: () => void;
  /** Whether the list is currently visible/active */
  enabled?: boolean;
}

/**
 * Hook for keyboard navigation within a list (command palette, menus, etc.).
 * Handles arrow up/down, enter, escape, and keeps the selected index in bounds.
 *
 * The consumer is responsible for calling `setSelectedIndex(0)` when the list
 * contents change (e.g. on query change) to reset navigation.
 */
export function useKeyboardNav({
  itemCount,
  onSelect,
  onClose,
  enabled = true,
}: UseKeyboardNavOptions) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Clamp the index if items shrink below the current selection
  const clampedIndex =
    itemCount === 0 ? 0 : Math.min(selectedIndex, itemCount - 1);

  // Scroll selected item into view
  useEffect(() => {
    if (!enabled || !listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-palette-item]');
    const selected = items[clampedIndex];
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }, [clampedIndex, enabled]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!enabled || itemCount === 0) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex((prev) => {
            const clamped = Math.min(prev, itemCount - 1);
            return clamped < itemCount - 1 ? clamped + 1 : 0;
          });
          break;

        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex((prev) => {
            const clamped = Math.min(prev, itemCount - 1);
            return clamped > 0 ? clamped - 1 : itemCount - 1;
          });
          break;

        case 'Enter':
          event.preventDefault();
          onSelect(clampedIndex);
          break;

        case 'Escape':
          event.preventDefault();
          onClose();
          break;

        case 'Tab':
          // Prevent focus from leaving the palette
          event.preventDefault();
          break;
      }
    },
    [enabled, itemCount, onSelect, onClose, clampedIndex],
  );

  return {
    selectedIndex: clampedIndex,
    setSelectedIndex,
    handleKeyDown,
    listRef,
  };
}
