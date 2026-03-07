'use client';

import { memo } from 'react';

interface DiffHunkHeaderProps {
  header: string;
}

/**
 * Hunk header row: displays the @@ -x,y +a,b @@ line with optional function context.
 * Visually distinct from code lines — slightly taller with muted background.
 */
export const DiffHunkHeader = memo(function DiffHunkHeader({
  header,
}: DiffHunkHeaderProps) {
  // Parse the header to extract the function/context name after the @@ markers
  const match = header.match(
    /^@@\s+-\d+(?:,\d+)?\s+\+\d+(?:,\d+)?\s+@@\s*(.*)/,
  );
  const context = match?.[1] ?? '';

  return (
    <div
      className="flex h-8 w-full items-center bg-zinc-800/50 font-mono text-xs leading-8"
      role="row"
    >
      {/* Empty gutter space to align with line numbers */}
      <div className="flex shrink-0 select-none">
        <div className="w-[52px] shrink-0 border-r border-zinc-700/50" />
        <div className="w-[52px] shrink-0 border-r border-zinc-700/50" />
        <div className="w-5 shrink-0" />
      </div>

      {/* Header content */}
      <div className="min-w-0 flex-1 truncate px-3 text-zinc-400">
        <span className="text-blue-400/70">
          {header.match(/@@ .+? @@/)?.[0] ?? header}
        </span>
        {context && (
          <span className="ml-2 text-zinc-500">{context}</span>
        )}
      </div>
    </div>
  );
});

/** Hunk header for split view — no double gutter columns */
export const SplitDiffHunkHeader = memo(function SplitDiffHunkHeader({
  header,
}: DiffHunkHeaderProps) {
  const match = header.match(
    /^@@\s+-\d+(?:,\d+)?\s+\+\d+(?:,\d+)?\s+@@\s*(.*)/,
  );
  const context = match?.[1] ?? '';

  return (
    <div
      className="flex h-8 w-full items-center bg-zinc-800/50 font-mono text-xs leading-8"
      role="row"
    >
      <div className="min-w-0 flex-1 truncate px-3 text-zinc-400">
        <span className="text-blue-400/70">
          {header.match(/@@ .+? @@/)?.[0] ?? header}
        </span>
        {context && (
          <span className="ml-2 text-zinc-500">{context}</span>
        )}
      </div>
    </div>
  );
});
