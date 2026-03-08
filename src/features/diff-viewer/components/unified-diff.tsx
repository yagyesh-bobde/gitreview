'use client';

import { useEffect, useMemo, useCallback } from 'react';

import type { DiffRow, FileDiff, ThemedToken } from '../types';
import type { CommentThread as CommentThreadType } from '@/features/comments/types';
import { threadKey } from '@/features/comments/types';
import type { PRCommentSide } from '@/types/pr';
import { useDiffScroll } from '../hooks/use-diff-scroll';
import { useLineSelection } from '../hooks/use-line-selection';
import { useSyntaxHighlighter } from '../hooks/use-syntax-highlighter';
import { useReviewStore } from '@/stores/review-store';
import { DiffHunkHeader } from './diff-hunk';
import { DiffLine } from './diff-line';
import { DiffVirtualScroller } from './diff-virtual-scroller';
import { InlineCommentThread } from './inline-comment-thread';
import { InlineCommentForm } from './inline-comment-form';

export interface UnifiedDiffProps {
  fileDiff: FileDiff;
  /** Comment threads grouped by anchor key */
  threadsByAnchor?: Map<string, CommentThreadType[]>;
  org?: string;
  repo?: string;
  prNumber?: number;
  commitId?: string;
}

/**
 * Unified diff view -- single column with additions and deletions interleaved.
 * Uses TanStack Virtual for efficient rendering of large diffs.
 * Integrates inline comment threads and comment forms between diff lines.
 */
export function UnifiedDiff({
  fileDiff,
  threadsByAnchor,
  org,
  repo,
  prNumber,
  commitId,
}: UnifiedDiffProps) {
  const { isLoading, tokens, highlightLines } = useSyntaxHighlighter();
  const { handleLineClick, isSelected } = useLineSelection();
  const pendingAnchor = useReviewStore((s) => s.pendingCommentAnchor);
  const setPendingAnchor = useReviewStore((s) => s.setPendingCommentAnchor);

  const commentsEnabled = !!(org && repo && prNumber && commitId);

  // Flatten hunks into a single row array, interleaving comment rows
  const rows = useMemo(
    () =>
      flattenHunksToRows(
        fileDiff,
        threadsByAnchor ?? new Map(),
        pendingAnchor,
      ),
    [fileDiff, threadsByAnchor, pendingAnchor],
  );

  // All lines across hunks for syntax highlighting
  const allLines = useMemo(
    () => fileDiff.hunks.flatMap((h) => h.lines),
    [fileDiff],
  );

  // Trigger highlighting when file changes
  useEffect(() => {
    if (!isLoading && allLines.length > 0) {
      highlightLines(allLines, fileDiff.language ?? 'text');
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
      }
    }
    return map;
  }, [rows]);

  // Build a map from thread ID to thread for individual lookup during render
  const threadById = useMemo(() => {
    const map = new Map<number, CommentThreadType>();
    if (!threadsByAnchor) return map;
    for (const threads of threadsByAnchor.values()) {
      for (const thread of threads) {
        map.set(thread.id, thread);
      }
    }
    return map;
  }, [threadsByAnchor]);

  const handleCommentClick = useCallback(
    (path: string, line: number, side: PRCommentSide) => {
      if (!commentsEnabled) return;
      setPendingAnchor({ path, line, side });
    },
    [commentsEnabled, setPendingAnchor],
  );

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

        if (row.kind === 'comment-thread') {
          const thread = threadById.get(row.threadId);
          if (!thread || !org || !repo || !prNumber) return null;
          return (
            <InlineCommentThread
              thread={thread}
              org={org}
              repo={repo}
              prNumber={prNumber}
            />
          );
        }

        if (row.kind === 'comment-form') {
          if (!org || !repo || !prNumber || !commitId) return null;
          return (
            <InlineCommentForm
              path={row.path}
              line={row.line}
              side={row.side}
              commitId={commitId}
              org={org}
              repo={repo}
              prNumber={prNumber}
            />
          );
        }

        const globalLineIdx = rowToGlobalLineIndex.get(index);
        const lineTokens =
          globalLineIdx !== undefined
            ? tokensByGlobalIndex.get(globalLineIdx)
            : undefined;

        // Determine the line number and side for commenting
        const line = row.line;
        const commentLine = line.newLineNumber ?? line.oldLineNumber;
        const commentSide: PRCommentSide =
          line.type === 'delete' ? 'LEFT' : 'RIGHT';

        return (
          <DiffLine
            line={line}
            tokens={lineTokens}
            isSelected={isSelected(row.absoluteIndex)}
            onClick={(shiftKey) =>
              handleLineClick(row.absoluteIndex, shiftKey)
            }
            variant="unified"
            onCommentClick={
              commentsEnabled && commentLine
                ? () =>
                    handleCommentClick(
                      fileDiff.filename,
                      commentLine,
                      commentSide,
                    )
                : undefined
            }
          />
        );
      }}
    </DiffVirtualScroller>
  );
}

/**
 * Flatten all hunks into a single flat array of renderable rows,
 * interleaving comment thread rows and pending comment form rows after their anchor lines.
 */
function flattenHunksToRows(
  fileDiff: FileDiff,
  threadsByAnchor: Map<string, CommentThreadType[]>,
  pendingAnchor: { path: string; line: number; side: PRCommentSide } | null,
): DiffRow[] {
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
      const line = hunk.lines[lineIdx];
      rows.push({
        kind: 'line',
        hunkIndex: hunkIdx,
        lineIndex: lineIdx,
        line,
        absoluteIndex: absoluteIndex++,
      });

      // After each line, check for comment threads and pending form
      const lineNum = line.newLineNumber ?? line.oldLineNumber;
      const side: PRCommentSide = line.type === 'delete' ? 'LEFT' : 'RIGHT';

      if (lineNum) {
        const key = threadKey(fileDiff.filename, lineNum, side);

        // Existing threads at this anchor
        const threads = threadsByAnchor.get(key);
        if (threads) {
          for (const thread of threads) {
            rows.push({
              kind: 'comment-thread',
              threadId: thread.id,
              anchorKey: key,
            });
          }
        }

        // Pending comment form at this anchor
        if (
          pendingAnchor &&
          pendingAnchor.path === fileDiff.filename &&
          pendingAnchor.line === lineNum &&
          pendingAnchor.side === side
        ) {
          rows.push({
            kind: 'comment-form',
            anchorKey: key,
            path: pendingAnchor.path,
            line: pendingAnchor.line,
            side: pendingAnchor.side,
          });
        }
      }
    }
  }

  return rows;
}
