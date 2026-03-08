'use client';

import { memo, useCallback } from 'react';
import { Plus } from 'lucide-react';

import type { LineType } from '../types';

interface DiffGutterProps {
  oldLineNumber?: number | null;
  newLineNumber?: number | null;
  type: LineType;
  onClick?: () => void;
  onCommentClick?: () => void;
}

const INDICATOR: Record<LineType, string> = {
  add: '+',
  delete: '-',
  context: ' ',
};

const INDICATOR_COLOR: Record<LineType, string> = {
  add: 'rgba(46, 160, 67, 0.4)',
  delete: 'rgba(248, 81, 73, 0.4)',
  context: 'transparent',
};

/**
 * Line number gutter for unified diff view.
 * Shows old line number, new line number, +/- indicator, and a "+" comment button on hover.
 */
export const DiffGutter = memo(function DiffGutter({
  oldLineNumber,
  newLineNumber,
  type,
  onClick,
  onCommentClick,
}: DiffGutterProps) {
  const handleCommentClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onCommentClick?.();
    },
    [onCommentClick],
  );

  return (
    <div className="flex shrink-0 select-none" role="presentation">
      {/* Old line number */}
      <button
        type="button"
        className="w-[52px] shrink-0 cursor-pointer border-r border-zinc-700/50 px-2 text-right font-mono text-xs leading-5 text-zinc-500 hover:text-zinc-300"
        onClick={onClick}
        tabIndex={-1}
        aria-label={
          oldLineNumber ? `Old line ${oldLineNumber}` : undefined
        }
      >
        {oldLineNumber ?? ''}
      </button>

      {/* New line number */}
      <button
        type="button"
        className="w-[52px] shrink-0 cursor-pointer border-r border-zinc-700/50 px-2 text-right font-mono text-xs leading-5 text-zinc-500 hover:text-zinc-300"
        onClick={onClick}
        tabIndex={-1}
        aria-label={
          newLineNumber ? `New line ${newLineNumber}` : undefined
        }
      >
        {newLineNumber ?? ''}
      </button>

      {/* +/- indicator with comment button overlay on hover */}
      <div className="relative w-5 shrink-0">
        <div
          className="text-center font-mono text-xs leading-5 group-hover:invisible"
          style={{ color: INDICATOR_COLOR[type] }}
        >
          {INDICATOR[type]}
        </div>
        {onCommentClick && (
          <button
            type="button"
            onClick={handleCommentClick}
            className="absolute inset-0 hidden items-center justify-center group-hover:flex"
            aria-label="Add comment"
            tabIndex={-1}
          >
            <Plus className="size-3.5 text-blue-400" />
          </button>
        )}
      </div>
    </div>
  );
});

/** Gutter for a single side in split view */
export const SplitGutter = memo(function SplitGutter({
  lineNumber,
  type,
  onClick,
  onCommentClick,
}: {
  lineNumber?: number | null;
  type: LineType;
  onClick?: () => void;
  onCommentClick?: () => void;
}) {
  const handleCommentClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onCommentClick?.();
    },
    [onCommentClick],
  );

  return (
    <div className="flex shrink-0 select-none" role="presentation">
      <button
        type="button"
        className="w-[52px] shrink-0 cursor-pointer border-r border-zinc-700/50 px-2 text-right font-mono text-xs leading-5 text-zinc-500 hover:text-zinc-300"
        onClick={onClick}
        tabIndex={-1}
        aria-label={lineNumber ? `Line ${lineNumber}` : undefined}
      >
        {lineNumber ?? ''}
      </button>

      <div className="relative w-5 shrink-0">
        <div
          className="text-center font-mono text-xs leading-5 group-hover:invisible"
          style={{ color: INDICATOR_COLOR[type] }}
        >
          {type !== 'context' ? INDICATOR[type] : ''}
        </div>
        {onCommentClick && (
          <button
            type="button"
            onClick={handleCommentClick}
            className="absolute inset-0 hidden items-center justify-center group-hover:flex"
            aria-label="Add comment"
            tabIndex={-1}
          >
            <Plus className="size-3.5 text-blue-400" />
          </button>
        )}
      </div>
    </div>
  );
});
