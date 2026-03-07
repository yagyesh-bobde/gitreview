'use client';

import { useEffect, useMemo } from 'react';

import type { DiffRow, FileDiff, ThemedToken } from '../types';
import { useDiffScroll } from '../hooks/use-diff-scroll';
import { useLineSelection } from '../hooks/use-line-selection';
import { useSyntaxHighlighter } from '../hooks/use-syntax-highlighter';
import { DiffHunkHeader } from './diff-hunk';
import { DiffLine } from './diff-line';
import { DiffVirtualScroller } from './diff-virtual-scroller';

interface UnifiedDiffProps {
  fileDiff: FileDiff;
}

/**
 * Unified diff view — single column with additions and deletions interleaved.
 * Uses TanStack Virtual for efficient rendering of large diffs.
 */
export function UnifiedDiff({ fileDiff }: UnifiedDiffProps) {
  const { isLoading, tokens, highlightLines } = useSyntaxHighlighter();
  const { handleLineClick, isSelected } = useLineSelection();

  // Flatten hunks into a single row array for the virtualizer
  const rows = useMemo(() => flattenHunksToRows(fileDiff), [fileDiff]);

  // All lines across hunks for syntax highlighting
  const allLines = useMemo(
    () => fileDiff.hunks.flatMap((h) => h.lines),
    [fileDiff],
  );

  // Trigger highlighting when file changes
  useEffect(() => {
    if (!isLoading && allLines.length > 0) {
      highlightLines(allLines, fileDiff.language);
    }
  }, [isLoading, allLines, fileDiff.language, highlightLines]);

  // Build a map from global line index to tokens for O(1) lookup during render
  const tokensByGlobalIndex = useMemo(() => {
    const map = new Map<number, ThemedToken[]>();
    let globalIdx = 0;
    for (const hunk of fileDiff.hunks) {
      for (let i = 0; i < hunk.lines.length; i++) {
        if (tokens[globalIdx]) {
          map.set(globalIdx, tokens[globalIdx]);
        }
        globalIdx++;
      }
    }
    return map;
  }, [fileDiff, tokens]);

  const { virtualizer, scrollContainerRef } = useDiffScroll({
    rowCount: rows.length,
    isHunkHeader: (index) => rows[index]?.kind === 'hunk-header',
  });

  // Track global line index per row for token lookup
  const rowToGlobalLineIndex = useMemo(() => {
    const map = new Map<number, number>();
    let globalIdx = 0;
    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx];
      if (row.kind === 'line') {
        map.set(rowIdx, globalIdx);
        globalIdx++;
      } else {
        // hunk header — skip the lines in previous hunks are already counted
        // nothing to do, globalIdx advances only for lines
      }
    }
    return map;
  }, [rows]);

  return (
    <DiffVirtualScroller
      virtualizer={virtualizer}
      scrollContainerRef={scrollContainerRef}
    >
      {(index) => {
        const row = rows[index];
        if (!row) return null;

        if (row.kind === 'hunk-header') {
          return <DiffHunkHeader header={row.header} />;
        }

        const globalLineIdx = rowToGlobalLineIndex.get(index);
        const lineTokens =
          globalLineIdx !== undefined
            ? tokensByGlobalIndex.get(globalLineIdx)
            : undefined;

        return (
          <DiffLine
            line={row.line}
            tokens={lineTokens}
            isSelected={isSelected(row.absoluteIndex)}
            onClick={(shiftKey) =>
              handleLineClick(row.absoluteIndex, shiftKey)
            }
            variant="unified"
          />
        );
      }}
    </DiffVirtualScroller>
  );
}

/** Flatten all hunks into a single flat array of renderable rows */
function flattenHunksToRows(fileDiff: FileDiff): DiffRow[] {
  const rows: DiffRow[] = [];
  let absoluteIndex = 0;

  for (let hunkIdx = 0; hunkIdx < fileDiff.hunks.length; hunkIdx++) {
    const hunk = fileDiff.hunks[hunkIdx];

    rows.push({
      kind: 'hunk-header',
      hunkIndex: hunkIdx,
      header: hunk.header,
    });

    for (let lineIdx = 0; lineIdx < hunk.lines.length; lineIdx++) {
      rows.push({
        kind: 'line',
        hunkIndex: hunkIdx,
        lineIndex: lineIdx,
        line: hunk.lines[lineIdx],
        absoluteIndex: absoluteIndex++,
      });
    }
  }

  return rows;
}
