'use client';

import { memo, useCallback, useState } from 'react';
import {
  Check,
  Columns2,
  Copy,
  FileCode2,
  FilePlus2,
  FileMinus2,
  ArrowRight,
  Rows2,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useReviewStore } from '@/stores/review-store';

import type { DiffViewMode, FileDiff } from '../types';

interface DiffHeaderProps {
  fileDiff: FileDiff;
}

type FileStatus = 'added' | 'modified' | 'deleted' | 'renamed';

function getFileStatus(diff: FileDiff): FileStatus {
  if (diff.isRenamed) return 'renamed';

  const hasAdditions = diff.hunks.some((h) =>
    h.lines.some((l) => l.type === 'add'),
  );
  const hasDeletions = diff.hunks.some((h) =>
    h.lines.some((l) => l.type === 'delete'),
  );

  if (hasAdditions && !hasDeletions) return 'added';
  if (!hasAdditions && hasDeletions) return 'deleted';
  return 'modified';
}

function getChangeStats(diff: FileDiff): { additions: number; deletions: number } {
  let additions = 0;
  let deletions = 0;

  for (const hunk of diff.hunks) {
    for (const line of hunk.lines) {
      if (line.type === 'add') additions++;
      else if (line.type === 'delete') deletions++;
    }
  }

  return { additions, deletions };
}

const STATUS_CONFIG: Record<
  FileStatus,
  { label: string; className: string; icon: typeof FileCode2 }
> = {
  added: {
    label: 'Added',
    className: 'bg-green-500/15 text-green-400',
    icon: FilePlus2,
  },
  modified: {
    label: 'Modified',
    className: 'bg-yellow-500/15 text-yellow-400',
    icon: FileCode2,
  },
  deleted: {
    label: 'Deleted',
    className: 'bg-red-500/15 text-red-400',
    icon: FileMinus2,
  },
  renamed: {
    label: 'Renamed',
    className: 'bg-blue-500/15 text-blue-400',
    icon: ArrowRight,
  },
};

/**
 * Sticky header bar for a file diff.
 * Shows filename, status badge, change stats, and view mode toggle.
 */
export const DiffHeader = memo(function DiffHeader({
  fileDiff,
}: DiffHeaderProps) {
  const { viewMode, setViewMode } = useReviewStore();
  const [copied, setCopied] = useState(false);

  const status = getFileStatus(fileDiff);
  const stats = getChangeStats(fileDiff);
  const statusConfig = STATUS_CONFIG[status];

  // Split filename into directory and basename for display
  const parts = fileDiff.filename.split('/');
  const basename = parts.pop() ?? fileDiff.filename;
  const directory = parts.length > 0 ? parts.join('/') + '/' : '';

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(fileDiff.filename);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API may not be available
    }
  }, [fileDiff.filename]);

  return (
    <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-zinc-700/50 bg-zinc-900/95 px-4 py-2 backdrop-blur-sm">
      {/* Status icon */}
      <statusConfig.icon className="h-4 w-4 shrink-0 text-zinc-400" />

      {/* Filename */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 truncate font-mono text-sm">
          {fileDiff.isRenamed && fileDiff.oldFilename && (
            <>
              <span className="text-zinc-500">{fileDiff.oldFilename}</span>
              <ArrowRight className="h-3 w-3 shrink-0 text-zinc-500" />
            </>
          )}
          <span className="text-zinc-500">{directory}</span>
          <span className="text-zinc-200">{basename}</span>
        </div>
      </div>

      {/* Status badge */}
      <span
        className={cn(
          'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
          statusConfig.className,
        )}
      >
        {statusConfig.label}
      </span>

      {/* Change stats */}
      <div className="flex shrink-0 items-center gap-1.5 font-mono text-xs">
        {stats.additions > 0 && (
          <span className="text-green-400">+{stats.additions}</span>
        )}
        {stats.deletions > 0 && (
          <span className="text-red-400">-{stats.deletions}</span>
        )}
      </div>

      {/* Copy filename */}
      <button
        type="button"
        className="shrink-0 rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
        onClick={handleCopy}
        title="Copy filename"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-400" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>

      {/* View mode toggle */}
      <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
    </div>
  );
});

function ViewModeToggle({
  viewMode,
  onChange,
}: {
  viewMode: DiffViewMode;
  onChange: (mode: DiffViewMode) => void;
}) {
  return (
    <div className="flex shrink-0 items-center rounded-md border border-zinc-700/50 bg-zinc-800/50">
      <button
        type="button"
        className={cn(
          'flex items-center gap-1 rounded-l-md px-2 py-1 text-xs transition-colors',
          viewMode === 'unified'
            ? 'bg-zinc-700/50 text-zinc-200'
            : 'text-zinc-500 hover:text-zinc-300',
        )}
        onClick={() => onChange('unified')}
        title="Unified view"
      >
        <Rows2 className="h-3 w-3" />
        <span>Unified</span>
      </button>
      <button
        type="button"
        className={cn(
          'flex items-center gap-1 rounded-r-md px-2 py-1 text-xs transition-colors',
          viewMode === 'split'
            ? 'bg-zinc-700/50 text-zinc-200'
            : 'text-zinc-500 hover:text-zinc-300',
        )}
        onClick={() => onChange('split')}
        title="Split view"
      >
        <Columns2 className="h-3 w-3" />
        <span>Split</span>
      </button>
    </div>
  );
}
