'use client';

import { memo } from 'react';

import type { LineType } from '../types';

interface DiffGutterProps {
  oldLineNumber?: number | null;
  newLineNumber?: number | null;
  type: LineType;
  onClick?: () => void;
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
 * Shows old line number, new line number, and +/- indicator.
 */
export const DiffGutter = memo(function DiffGutter({
  oldLineNumber,
  newLineNumber,
  type,
  onClick,
}: DiffGutterProps) {
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

      {/* +/- indicator */}
      <div
        className="w-5 shrink-0 text-center font-mono text-xs leading-5"
        style={{ color: INDICATOR_COLOR[type] }}
      >
        {INDICATOR[type]}
      </div>
    </div>
  );
});

/** Gutter for a single side in split view */
export const SplitGutter = memo(function SplitGutter({
  lineNumber,
  type,
  onClick,
}: {
  lineNumber?: number | null;
  type: LineType;
  onClick?: () => void;
}) {
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

      <div
        className="w-5 shrink-0 text-center font-mono text-xs leading-5"
        style={{ color: INDICATOR_COLOR[type] }}
      >
        {type !== 'context' ? INDICATOR[type] : ''}
      </div>
    </div>
  );
});
