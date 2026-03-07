'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { DiffLine, ThemedToken } from '../types';
import { highlightDiffLines, preloadHighlighter } from '../lib/syntax-highlight';

interface UseSyntaxHighlighterResult {
  /** Whether the Shiki highlighter is still loading */
  isLoading: boolean;
  /** Highlighted tokens indexed by line position. Empty array = not yet highlighted. */
  tokens: ThemedToken[][];
  /** Trigger highlighting for a set of diff lines */
  highlightLines: (lines: DiffLine[], language: string) => void;
}

/**
 * Hook that manages Shiki highlighting state for a set of diff lines.
 * Preloads the highlighter on mount, then highlights lines on demand.
 */
export function useSyntaxHighlighter(): UseSyntaxHighlighterResult {
  const [isLoading, setIsLoading] = useState(true);
  const [tokens, setTokens] = useState<ThemedToken[][]>([]);
  const requestIdRef = useRef(0);

  // Pre-warm Shiki on mount
  useEffect(() => {
    let cancelled = false;
    preloadHighlighter().then(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const highlightLines = useCallback(
    (lines: DiffLine[], language: string) => {
      // Increment request ID to ignore stale responses
      const requestId = ++requestIdRef.current;

      highlightDiffLines(lines, language).then((result) => {
        // Only apply if this is still the most recent request
        if (requestIdRef.current === requestId) {
          setTokens(result);
        }
      });
    },
    [],
  );

  return { isLoading, tokens, highlightLines };
}
