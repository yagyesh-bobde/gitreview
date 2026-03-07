'use client';

import { useCallback, useRef } from 'react';

import { useReviewStore } from '@/stores/review-store';

interface UseLineSelectionResult {
  /** Handle a click on a line at the given absolute index */
  handleLineClick: (absoluteIndex: number, shiftKey: boolean) => void;
  /** Whether a given absolute index is within the current selection */
  isSelected: (absoluteIndex: number) => boolean;
  /** Clear selection */
  clearSelection: () => void;
}

/**
 * Manages line selection state. Supports single-click and shift+click range.
 * Persists selection to the review store for use by comment anchoring.
 */
export function useLineSelection(): UseLineSelectionResult {
  const { selectedLines, setSelectedLines } = useReviewStore();
  const anchorRef = useRef<number | null>(null);

  const handleLineClick = useCallback(
    (absoluteIndex: number, shiftKey: boolean) => {
      if (shiftKey && anchorRef.current !== null) {
        // Shift+click: select range from anchor to clicked line
        const start = Math.min(anchorRef.current, absoluteIndex);
        const end = Math.max(anchorRef.current, absoluteIndex);
        setSelectedLines({ start, end });
      } else {
        // Single click: set anchor and select single line
        anchorRef.current = absoluteIndex;
        setSelectedLines({ start: absoluteIndex, end: absoluteIndex });
      }
    },
    [setSelectedLines],
  );

  const isSelected = useCallback(
    (absoluteIndex: number): boolean => {
      if (!selectedLines) return false;
      return (
        absoluteIndex >= selectedLines.start &&
        absoluteIndex <= selectedLines.end
      );
    },
    [selectedLines],
  );

  const clearSelection = useCallback(() => {
    anchorRef.current = null;
    setSelectedLines(null);
  }, [setSelectedLines]);

  return { handleLineClick, isSelected, clearSelection };
}
