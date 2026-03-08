'use client';

import { memo, useCallback } from 'react';

import { cn } from '@/lib/utils';

import type { DiffLine as DiffLineType, LineType, ThemedToken } from '../types';
import { DiffGutter, SplitGutter } from './diff-gutter';

// Background colors per line type — subtle enough to not fight with syntax colors
const BG_COLOR: Record<LineType, string> = {
  add: 'rgba(46, 160, 67, 0.15)',
  delete: 'rgba(248, 81, 73, 0.15)',
  context: 'transparent',
};

const HOVER_BG: Record<LineType, string> = {
  add: 'rgba(46, 160, 67, 0.25)',
  delete: 'rgba(248, 81, 73, 0.25)',
  context: 'rgba(255, 255, 255, 0.04)',
};

interface DiffLineProps {
  line: DiffLineType;
  tokens?: ThemedToken[];
  isSelected: boolean;
  onClick: (shiftKey: boolean) => void;
  /** 'unified' renders both line number columns; 'split' renders one */
  variant: 'unified' | 'split';
  /** Called when the user clicks the "+" comment button in the gutter */
  onCommentClick?: () => void;
}

/**
 * A single line in the diff view.
 * Renders gutter (line numbers + indicator) and syntax-highlighted code content.
 */
export const DiffLine = memo(function DiffLine({
  line,
  tokens,
  isSelected,
  onClick,
  variant,
  onCommentClick,
}: DiffLineProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      onClick(e.shiftKey);
    },
    [onClick],
  );

  // Strip the diff prefix (+/-/space) from content for display
  const displayContent = line.content.length > 0 ? line.content.slice(1) : '';

  return (
    <div
      className={cn(
        'group flex h-5 w-full cursor-pointer items-stretch font-mono text-[13px] leading-5',
        isSelected && 'ring-2 ring-inset ring-blue-500/50',
      )}
      style={{ backgroundColor: BG_COLOR[line.type] }}
      onClick={handleClick}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor =
          HOVER_BG[line.type];
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor =
          BG_COLOR[line.type];
      }}
      role="row"
      aria-selected={isSelected}
    >
      {/* Gutter */}
      {variant === 'unified' ? (
        <DiffGutter
          oldLineNumber={line.oldLineNumber}
          newLineNumber={line.newLineNumber}
          type={line.type}
          onClick={() => onClick(false)}
          onCommentClick={onCommentClick}
        />
      ) : (
        <SplitGutter
          lineNumber={line.oldLineNumber ?? line.newLineNumber}
          type={line.type}
          onClick={() => onClick(false)}
          onCommentClick={onCommentClick}
        />
      )}

      {/* Code content */}
      <div className="min-w-0 flex-1 whitespace-pre px-3 leading-5">
        {tokens && tokens.length > 0 ? (
          <TokenizedContent tokens={tokens} />
        ) : (
          <span className="text-zinc-300">{displayContent}</span>
        )}
      </div>
    </div>
  );
});

/** Render Shiki tokens as colored spans */
const TokenizedContent = memo(function TokenizedContent({
  tokens,
}: {
  tokens: ThemedToken[];
}) {
  return (
    <>
      {tokens.map((token, i) => (
        <span key={i} style={token.color ? { color: token.color } : undefined}>
          {token.content}
        </span>
      ))}
    </>
  );
});

/** Empty line placeholder for split view when one side has no corresponding line */
export const EmptyDiffLine = memo(function EmptyDiffLine() {
  return (
    <div className="flex h-5 w-full items-stretch bg-zinc-900/50 font-mono text-[13px] leading-5">
      <div className="flex shrink-0 select-none">
        <div className="w-[52px] shrink-0 border-r border-zinc-700/50" />
        <div className="w-5 shrink-0" />
      </div>
      <div className="min-w-0 flex-1" />
    </div>
  );
});
