'use client';

import { AnimatePresence, motion } from 'motion/react';

import { useReviewStore } from '@/stores/review-store';

import type { FileDiff } from '../types';
import { DiffEmptyState } from './diff-empty-state';
import { DiffHeader } from './diff-header';
import { SplitDiff } from './split-diff';
import { UnifiedDiff } from './unified-diff';

interface DiffViewerProps {
  fileDiff: FileDiff | null;
  isLoading: boolean;
}

/**
 * Top-level diff viewer orchestrator.
 * Renders the appropriate view based on state: loading, empty, binary, or the diff itself.
 * Switches between unified and split view based on the review store.
 */
export function DiffViewer({ fileDiff, isLoading }: DiffViewerProps) {
  const viewMode = useReviewStore((s) => s.viewMode);

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
            <UnifiedDiff fileDiff={fileDiff} />
          ) : (
            <SplitDiff fileDiff={fileDiff} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
