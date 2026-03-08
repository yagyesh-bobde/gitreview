'use client';

import { AnimatePresence, motion } from 'motion/react';

import { useReviewStore } from '@/stores/review-store';
import { useComments } from '@/features/comments/hooks/use-comments';

import type { FileDiff } from '../types';
import { DiffEmptyState } from './diff-empty-state';
import { DiffHeader } from './diff-header';
import { SplitDiff } from './split-diff';
import { UnifiedDiff } from './unified-diff';

interface DiffViewerProps {
  fileDiff: FileDiff | null;
  isLoading: boolean;
  org?: string;
  repo?: string;
  prNumber?: number;
  commitId?: string;
}

/**
 * Top-level diff viewer orchestrator.
 * Renders the appropriate view based on state: loading, empty, binary, or the diff itself.
 * Switches between unified and split view based on the review store.
 * Fetches comment threads and pipes them to the diff views.
 */
export function DiffViewer({
  fileDiff,
  isLoading,
  org,
  repo,
  prNumber,
  commitId,
}: DiffViewerProps) {
  const viewMode = useReviewStore((s) => s.viewMode);

  // Fetch comments when we have the necessary identifiers
  const { threadsByAnchor } = useComments(
    org ?? '',
    repo ?? '',
    prNumber ?? 0,
  );

  if (isLoading) {
    return (
      <div className="flex h-full flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
        <DiffEmptyState variant="loading" />
      </div>
    );
  }

  if (!fileDiff) {
    return (
      <div className="flex h-full flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
        <DiffEmptyState variant="no-file" />
      </div>
    );
  }

  if (fileDiff.isBinary) {
    return (
      <div className="flex h-full flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
        <DiffHeader fileDiff={fileDiff} />
        <DiffEmptyState variant="binary" />
      </div>
    );
  }

  // Shared props for the diff view components
  const commentProps = {
    threadsByAnchor,
    org,
    repo,
    prNumber,
    commitId,
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
      <DiffHeader fileDiff={fileDiff} />

      <AnimatePresence mode="wait">
        <motion.div
          key={`${fileDiff.filename}-${viewMode}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="flex-1 overflow-hidden"
        >
          {viewMode === 'unified' ? (
            <UnifiedDiff fileDiff={fileDiff} {...commentProps} />
          ) : (
            <SplitDiff fileDiff={fileDiff} {...commentProps} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
