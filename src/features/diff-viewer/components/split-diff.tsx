'use client';

import { useEffect, useMemo } from 'react';

import type {
  DiffHunk,
  DiffLine as DiffLineType,
  FileDiff,
  SplitDiffRow,
  ThemedToken,
} from '../types';
import { useDiffScroll } from '../hooks/use-diff-scroll';
import { useLineSelection } from '../hooks/use-line-selection';
import { useSyntaxHighlighter } from '../hooks/use-syntax-highlighter';
import { DiffLine, EmptyDiffLine } from './diff-line';
import { SplitDiffHunkHeader } from './diff-hunk';
import { DiffVirtualScroller } from './diff-virtual-scroller';

interface SplitDiffProps {
  fileDiff: FileDiff;
}

/**
 * Split (side-by-side) diff view.
 * Left panel shows old code, right panel shows new code.
 * Context lines appear on both sides. Additions on right only, deletions on left only.
 */
export function SplitDiff({ fileDiff }: SplitDiffProps) {
  const { isLoading, tokens, highlightLines } = useSyntaxHighlighter();
  const { handleLineClick, isSelected } = useLineSelection();

  const rows = useMemo(() => flattenToSplitRows(fileDiff), [fileDiff]);

  // All lines for highlighting (we highlight the full file content once)
  const allLines = useMemo(
    () => fileDiff.hunks.flatMap((h) => h.lines),
    [fileDiff],
  );

  useEffect(() => {
    if (!isLoading && allLines.length > 0) {
      highlightLines(allLines, fileDiff.language);
    }
  }, [isLoading, allLines, fileDiff.language, highlightLines]);

  // Map original line indices to tokens
  const tokensByOriginalIndex = useMemo(() => {
    const map = new Map<number, ThemedToken[]>();
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i]) {
        map.set(i, tokens[i]);
      }
    }
    return map;
  }, [tokens]);

  const { virtualizer, scrollContainerRef } = useDiffScroll({
    rowCount: rows.length,
    isHunkHeader: (index) => rows[index]?.kind === 'hunk-header',
  });

  return (
    <DiffVirtualScroller
      virtualizer={virtualizer}
      scrollContainerRef={scrollContainerRef}
    >
      {(index) => {
        const row = rows[index];
        if (!row) return null;

        if (row.kind === 'hunk-header') {
          return <SplitDiffHunkHeader header={row.header} />;
        }

        const { left, right, absoluteIndex } = row.row;

        return (
          <div className="flex w-full">
            {/* Left (old) side */}
            <div className="w-1/2 border-r border-zinc-700/30">
              {left ? (
                <DiffLine
                  line={left}
                  tokens={getTokensForLine(left, allLines, tokensByOriginalIndex)}
                  isSelected={isSelected(absoluteIndex)}
                  onClick={(shiftKey) =>
                    handleLineClick(absoluteIndex, shiftKey)
                  }
                  variant="split"
                />
              ) : (
                <EmptyDiffLine />
              )}
            </div>

            {/* Right (new) side */}
            <div className="w-1/2">
              {right ? (
                <DiffLine
                  line={right}
                  tokens={getTokensForLine(right, allLines, tokensByOriginalIndex)}
                  isSelected={isSelected(absoluteIndex)}
                  onClick={(shiftKey) =>
                    handleLineClick(absoluteIndex, shiftKey)
                  }
                  variant="split"
                />
              ) : (
                <EmptyDiffLine />
              )}
            </div>
          </div>
        );
      }}
    </DiffVirtualScroller>
  );
}

/** Get tokens for a specific line by finding its index in the flat allLines array */
function getTokensForLine(
  line: DiffLineType,
  allLines: DiffLineType[],
  tokensByIndex: Map<number, ThemedToken[]>,
): ThemedToken[] | undefined {
  const idx = allLines.indexOf(line);
  if (idx === -1) return undefined;
  return tokensByIndex.get(idx);
}

/** Pair diff lines into side-by-side rows */
function flattenToSplitRows(fileDiff: FileDiff): SplitDiffRow[] {
  const rows: SplitDiffRow[] = [];
  let absoluteIndex = 0;

  for (let hunkIdx = 0; hunkIdx < fileDiff.hunks.length; hunkIdx++) {
    const hunk = fileDiff.hunks[hunkIdx];

    rows.push({
      kind: 'hunk-header',
      hunkIndex: hunkIdx,
      header: hunk.header,
    });

    const paired = pairHunkLines(hunk);
    for (const pair of paired) {
      rows.push({
        kind: 'line',
        hunkIndex: hunkIdx,
        row: { ...pair, absoluteIndex: absoluteIndex++ },
      });
    }
  }

  return rows;
}

/**
 * Pair lines within a hunk for split view display.
 *
 * Strategy:
 * - Context lines appear on both sides
 * - Consecutive deletions followed by consecutive additions are paired 1:1
 * - Unpaired deletions go left only (right is null)
 * - Unpaired additions go right only (left is null)
 */
function pairHunkLines(
  hunk: DiffHunk,
): { left: DiffLineType | null; right: DiffLineType | null }[] {
  const result: { left: DiffLineType | null; right: DiffLineType | null }[] = [];
  const lines = hunk.lines;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.type === 'context') {
      result.push({ left: line, right: line });
      i++;
      continue;
    }

    // Collect consecutive deletions
    const deletions: DiffLineType[] = [];
    while (i < lines.length && lines[i].type === 'delete') {
      deletions.push(lines[i]);
      i++;
    }

    // Collect consecutive additions
    const additions: DiffLineType[] = [];
    while (i < lines.length && lines[i].type === 'add') {
      additions.push(lines[i]);
      i++;
    }

    // Pair deletions with additions
    const maxLen = Math.max(deletions.length, additions.length);
    for (let j = 0; j < maxLen; j++) {
      result.push({
        left: j < deletions.length ? deletions[j] : null,
        right: j < additions.length ? additions[j] : null,
      });
    }
  }

  return result;
}
