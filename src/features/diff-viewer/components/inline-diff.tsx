'use client';

import { useEffect, useMemo, useCallback } from 'react';

import type {
  DiffHunk,
  DiffLine as DiffLineType,
  FileDiff,
  ThemedToken,
} from '../types';
import type { CommentThread as CommentThreadType } from '@/features/comments/types';
import { threadKey } from '@/features/comments/types';
import type { PRCommentSide } from '@/types/pr';
import { useLineSelection } from '../hooks/use-line-selection';
import { useSyntaxHighlighter } from '../hooks/use-syntax-highlighter';
import { useComments } from '@/features/comments/hooks/use-comments';
import { useReviewStore } from '@/stores/review-store';
import { DiffHunkHeader, SplitDiffHunkHeader } from './diff-hunk';
import { DiffLine, EmptyDiffLine } from './diff-line';
import { InlineCommentThread } from './inline-comment-thread';
import { InlineCommentForm } from './inline-comment-form';

interface InlineDiffProps {
  fileDiff: FileDiff;
  viewMode: 'unified' | 'split';
  org?: string;
  repo?: string;
  prNumber?: number;
  commitId?: string;
}

/**
 * Non-virtualized diff renderer.
 * Renders all lines directly into the DOM so the parent container's native
 * scroll can flow through multiple file sections seamlessly.
 * Integrates inline comment threads and comment forms between diff lines.
 */
export function InlineDiff({
  fileDiff,
  viewMode,
  org,
  repo,
  prNumber,
  commitId,
}: InlineDiffProps) {
  const { isLoading, tokens, highlightLines } = useSyntaxHighlighter();
  const { handleLineClick, isSelected } = useLineSelection();

  const commentsEnabled = !!(org && repo && prNumber && commitId);

  // Fetch comment threads for this PR
  const { threadsByAnchor } = useComments(
    org ?? '',
    repo ?? '',
    prNumber ?? 0,
  );

  const pendingAnchor = useReviewStore((s) => s.pendingCommentAnchor);
  const setPendingAnchor = useReviewStore((s) => s.setPendingCommentAnchor);

  const allLines = useMemo(
    () => fileDiff.hunks.flatMap((h) => h.lines),
    [fileDiff],
  );

  useEffect(() => {
    if (!isLoading && allLines.length > 0) {
      highlightLines(allLines, fileDiff.language ?? 'text');
    }
  }, [isLoading, allLines, fileDiff.language, highlightLines]);

  const tokensByIndex = useMemo(() => {
    const map = new Map<number, ThemedToken[]>();
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i]) {
        map.set(i, tokens[i]);
      }
    }
    return map;
  }, [tokens]);

  const handleCommentClick = useCallback(
    (path: string, line: number, side: PRCommentSide) => {
      if (!commentsEnabled) return;
      setPendingAnchor({ path, line, side });
    },
    [commentsEnabled, setPendingAnchor],
  );

  if (viewMode === 'split') {
    return (
      <InlineSplitDiff
        fileDiff={fileDiff}
        allLines={allLines}
        tokensByIndex={tokensByIndex}
        isSelected={isSelected}
        onLineClick={handleLineClick}
        threadsByAnchor={threadsByAnchor}
        pendingAnchor={pendingAnchor}
        onCommentClick={commentsEnabled ? handleCommentClick : undefined}
        org={org}
        repo={repo}
        prNumber={prNumber}
        commitId={commitId}
      />
    );
  }

  return (
    <InlineUnifiedDiff
      fileDiff={fileDiff}
      tokensByIndex={tokensByIndex}
      isSelected={isSelected}
      onLineClick={handleLineClick}
      threadsByAnchor={threadsByAnchor}
      pendingAnchor={pendingAnchor}
      onCommentClick={commentsEnabled ? handleCommentClick : undefined}
      org={org}
      repo={repo}
      prNumber={prNumber}
      commitId={commitId}
    />
  );
}

// ---------------------------------------------------------------------------
// Comment rows helper — renders threads and pending form for a given anchor
// ---------------------------------------------------------------------------

function CommentRows({
  filePath,
  lineNum,
  side,
  threadsByAnchor,
  pendingAnchor,
  org,
  repo,
  prNumber,
  commitId,
}: {
  filePath: string;
  lineNum: number;
  side: PRCommentSide;
  threadsByAnchor: Map<string, CommentThreadType[]>;
  pendingAnchor: { path: string; line: number; side: PRCommentSide } | null;
  org?: string;
  repo?: string;
  prNumber?: number;
  commitId?: string;
}) {
  const key = threadKey(filePath, lineNum, side);
  const threads = threadsByAnchor.get(key);
  const showForm =
    pendingAnchor &&
    pendingAnchor.path === filePath &&
    pendingAnchor.line === lineNum &&
    pendingAnchor.side === side;

  if (!threads && !showForm) return null;

  return (
    <>
      {threads?.map((thread) =>
        org && repo && prNumber ? (
          <InlineCommentThread
            key={thread.id}
            thread={thread}
            org={org}
            repo={repo}
            prNumber={prNumber}
          />
        ) : null,
      )}
      {showForm && org && repo && prNumber && commitId && (
        <InlineCommentForm
          path={pendingAnchor.path}
          line={pendingAnchor.line}
          side={pendingAnchor.side}
          commitId={commitId}
          org={org}
          repo={repo}
          prNumber={prNumber}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Unified inline diff
// ---------------------------------------------------------------------------

interface InlineUnifiedDiffProps {
  fileDiff: FileDiff;
  tokensByIndex: Map<number, ThemedToken[]>;
  isSelected: (index: number) => boolean;
  onLineClick: (index: number, shiftKey: boolean) => void;
  threadsByAnchor: Map<string, CommentThreadType[]>;
  pendingAnchor: { path: string; line: number; side: PRCommentSide } | null;
  onCommentClick?: (path: string, line: number, side: PRCommentSide) => void;
  org?: string;
  repo?: string;
  prNumber?: number;
  commitId?: string;
}

function InlineUnifiedDiff({
  fileDiff,
  tokensByIndex,
  isSelected,
  onLineClick,
  threadsByAnchor,
  pendingAnchor,
  onCommentClick,
  org,
  repo,
  prNumber,
  commitId,
}: InlineUnifiedDiffProps) {
  let globalLineIdx = 0;
  let absoluteIndex = 0;

  return (
    <div role="table" aria-label="Diff content">
      {fileDiff.hunks.map((hunk, hunkIdx) => {
        const hunkLines = hunk.lines;
        const startGlobal = globalLineIdx;

        const lineElements = hunkLines.map((line, lineIdx) => {
          const gIdx = startGlobal + lineIdx;
          const absIdx = absoluteIndex++;
          const lineTokens = tokensByIndex.get(gIdx);

          const commentLine = line.newLineNumber ?? line.oldLineNumber;
          const commentSide: PRCommentSide =
            line.type === 'delete' ? 'LEFT' : 'RIGHT';

          return (
            <div key={`${hunkIdx}-${lineIdx}`}>
              <DiffLine
                line={line}
                tokens={lineTokens}
                isSelected={isSelected(absIdx)}
                onClick={(shiftKey) => onLineClick(absIdx, shiftKey)}
                variant="unified"
                onCommentClick={
                  onCommentClick && commentLine
                    ? () =>
                        onCommentClick(
                          fileDiff.filename,
                          commentLine,
                          commentSide,
                        )
                    : undefined
                }
              />
              {commentLine && (
                <CommentRows
                  filePath={fileDiff.filename}
                  lineNum={commentLine}
                  side={commentSide}
                  threadsByAnchor={threadsByAnchor}
                  pendingAnchor={pendingAnchor}
                  org={org}
                  repo={repo}
                  prNumber={prNumber}
                  commitId={commitId}
                />
              )}
            </div>
          );
        });

        globalLineIdx += hunkLines.length;

        return (
          <div key={hunkIdx}>
            <DiffHunkHeader header={hunk.header} />
            {lineElements}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Split inline diff
// ---------------------------------------------------------------------------

interface InlineSplitDiffProps {
  fileDiff: FileDiff;
  allLines: DiffLineType[];
  tokensByIndex: Map<number, ThemedToken[]>;
  isSelected: (index: number) => boolean;
  onLineClick: (index: number, shiftKey: boolean) => void;
  threadsByAnchor: Map<string, CommentThreadType[]>;
  pendingAnchor: { path: string; line: number; side: PRCommentSide } | null;
  onCommentClick?: (path: string, line: number, side: PRCommentSide) => void;
  org?: string;
  repo?: string;
  prNumber?: number;
  commitId?: string;
}

function InlineSplitDiff({
  fileDiff,
  allLines,
  tokensByIndex,
  isSelected,
  onLineClick,
  threadsByAnchor,
  pendingAnchor,
  onCommentClick,
  org,
  repo,
  prNumber,
  commitId,
}: InlineSplitDiffProps) {
  let absoluteIndex = 0;

  return (
    <div role="table" aria-label="Diff content">
      {fileDiff.hunks.map((hunk, hunkIdx) => {
        const paired = pairHunkLines(hunk);
        const rows = paired.map((pair, pairIdx) => {
          const absIdx = absoluteIndex++;

          // Determine anchors for comment rows after this paired row
          const anchorsToCheck: { line: number; side: PRCommentSide }[] = [];
          if (pair.left) {
            const ln = pair.left.oldLineNumber ?? pair.left.newLineNumber;
            if (ln) anchorsToCheck.push({ line: ln, side: 'LEFT' });
          }
          if (pair.right) {
            const ln = pair.right.newLineNumber ?? pair.right.oldLineNumber;
            if (ln) anchorsToCheck.push({ line: ln, side: 'RIGHT' });
          }

          const leftLine = pair.left?.oldLineNumber ?? pair.left?.newLineNumber;
          const rightLine = pair.right?.newLineNumber ?? pair.right?.oldLineNumber;

          return (
            <div key={`${hunkIdx}-${pairIdx}`}>
              <div className="flex w-full">
                <div className="w-1/2 border-r border-zinc-700/30">
                  {pair.left ? (
                    <DiffLine
                      line={pair.left}
                      tokens={getTokensForLine(pair.left, allLines, tokensByIndex)}
                      isSelected={isSelected(absIdx)}
                      onClick={(shiftKey) => onLineClick(absIdx, shiftKey)}
                      variant="split"
                      onCommentClick={
                        onCommentClick && leftLine
                          ? () =>
                              onCommentClick(
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
                <div className="w-1/2">
                  {pair.right ? (
                    <DiffLine
                      line={pair.right}
                      tokens={getTokensForLine(pair.right, allLines, tokensByIndex)}
                      isSelected={isSelected(absIdx)}
                      onClick={(shiftKey) => onLineClick(absIdx, shiftKey)}
                      variant="split"
                      onCommentClick={
                        onCommentClick && rightLine
                          ? () =>
                              onCommentClick(
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
              {/* Comment threads/forms for both sides */}
              {anchorsToCheck.map((anchor) => (
                <CommentRows
                  key={`${anchor.line}-${anchor.side}`}
                  filePath={fileDiff.filename}
                  lineNum={anchor.line}
                  side={anchor.side}
                  threadsByAnchor={threadsByAnchor}
                  pendingAnchor={pendingAnchor}
                  org={org}
                  repo={repo}
                  prNumber={prNumber}
                  commitId={commitId}
                />
              ))}
            </div>
          );
        });

        return (
          <div key={hunkIdx}>
            <SplitDiffHunkHeader header={hunk.header} />
            {rows}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers (same logic as split-diff.tsx, duplicated to avoid coupling)
// ---------------------------------------------------------------------------

function getTokensForLine(
  line: DiffLineType,
  allLines: DiffLineType[],
  tokensByIndex: Map<number, ThemedToken[]>,
): ThemedToken[] | undefined {
  const idx = allLines.indexOf(line);
  if (idx === -1) return undefined;
  return tokensByIndex.get(idx);
}

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

    const deletions: DiffLineType[] = [];
    while (i < lines.length && lines[i].type === 'delete') {
      deletions.push(lines[i]);
      i++;
    }

    const additions: DiffLineType[] = [];
    while (i < lines.length && lines[i].type === 'add') {
      additions.push(lines[i]);
      i++;
    }

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
