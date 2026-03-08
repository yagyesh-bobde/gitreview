'use client';

import { useEffect, useMemo, useCallback } from 'react';

import type {
  DiffHunk,
  DiffLine as DiffLineType,
  FileDiff,
  SplitDiffRow,
  ThemedToken,
} from '../types';
import type { CommentThread as CommentThreadType } from '@/features/comments/types';
import { threadKey } from '@/features/comments/types';
import type { PRCommentSide } from '@/types/pr';
import { useDiffScroll } from '../hooks/use-diff-scroll';
import { useLineSelection } from '../hooks/use-line-selection';
import { useSyntaxHighlighter } from '../hooks/use-syntax-highlighter';
import { useReviewStore } from '@/stores/review-store';
import { DiffLine, EmptyDiffLine } from './diff-line';
import { SplitDiffHunkHeader } from './diff-hunk';
import { DiffVirtualScroller } from './diff-virtual-scroller';
import { InlineCommentThread } from './inline-comment-thread';
import { InlineCommentForm } from './inline-comment-form';

export interface SplitDiffProps {
  fileDiff: FileDiff;
  threadsByAnchor?: Map<string, CommentThreadType[]>;
  org?: string;
  repo?: string;
  prNumber?: number;
  commitId?: string;
}

/**
 * Split (side-by-side) diff view.
 * Left panel shows old code, right panel shows new code.
 * Context lines appear on both sides. Additions on right only, deletions on left only.
 * Integrates inline comment threads and comment forms between diff lines.
 */
export function SplitDiff({
  fileDiff,
  threadsByAnchor,
  org,
  repo,
  prNumber,
  commitId,
}: SplitDiffProps) {
  const { isLoading, tokens, highlightLines } = useSyntaxHighlighter();
  const { handleLineClick, isSelected } = useLineSelection();
  const pendingAnchor = useReviewStore((s) => s.pendingCommentAnchor);
  const setPendingAnchor = useReviewStore((s) => s.setPendingCommentAnchor);

  const commentsEnabled = !!(org && repo && prNumber && commitId);

  const rows = useMemo(
    () =>
      flattenToSplitRows(
        fileDiff,
        threadsByAnchor ?? new Map(),
        pendingAnchor,
      ),
    [fileDiff, threadsByAnchor, pendingAnchor],
  );

  // All lines for highlighting (we highlight the full file content once)
  const allLines = useMemo(
    () => fileDiff.hunks.flatMap((h) => h.lines),
    [fileDiff],
  );

  useEffect(() => {
    if (!isLoading && allLines.length > 0) {
      highlightLines(allLines, fileDiff.language ?? 'text');
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

  // Build a map from thread ID to thread for rendering
  const threadById = useMemo(() => {
    if (!threadsByAnchor) return new Map<number, CommentThreadType>();
    const map = new Map<number, CommentThreadType>();
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
          return <SplitDiffHunkHeader header={row.header} />;
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

        const { left, right, absoluteIndex } = row.row;

        // Determine comment click handlers for each side
        const leftLine = left?.oldLineNumber ?? left?.newLineNumber;
        const rightLine = right?.newLineNumber ?? right?.oldLineNumber;

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
                  onCommentClick={
                    commentsEnabled && leftLine
                      ? () =>
                          handleCommentClick(
                            fileDiff.filename,
                            leftLine,
                            'LEFT',
                          )
                      : undefined
                  }
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
                  onCommentClick={
                    commentsEnabled && rightLine
                      ? () =>
                          handleCommentClick(
                            fileDiff.filename,
                            rightLine,
                            'RIGHT',
                          )
                      : undefined
                  }
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

/**
 * Pair diff lines into side-by-side rows, interleaving comment rows.
 * Comment threads and forms span the full width in split view.
 */
function flattenToSplitRows(
  fileDiff: FileDiff,
  threadsByAnchor: Map<string, CommentThreadType[]>,
  pendingAnchor: { path: string; line: number; side: PRCommentSide } | null,
): SplitDiffRow[] {
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

      // After each paired row, check both sides for comment threads/form
      const anchorsToCheck: { line: number; side: PRCommentSide }[] = [];

      if (pair.left) {
        const ln = pair.left.oldLineNumber ?? pair.left.newLineNumber;
        if (ln) anchorsToCheck.push({ line: ln, side: 'LEFT' });
      }
      if (pair.right) {
        const ln = pair.right.newLineNumber ?? pair.right.oldLineNumber;
        if (ln) anchorsToCheck.push({ line: ln, side: 'RIGHT' });
      }

      for (const anchor of anchorsToCheck) {
        const key = threadKey(fileDiff.filename, anchor.line, anchor.side);

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

        if (
          pendingAnchor &&
          pendingAnchor.path === fileDiff.filename &&
          pendingAnchor.line === anchor.line &&
          pendingAnchor.side === anchor.side
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
