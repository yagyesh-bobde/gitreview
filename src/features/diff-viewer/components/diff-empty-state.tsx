'use client';

import { FileCode2, FileWarning } from 'lucide-react';

interface DiffEmptyStateProps {
  variant: 'no-file' | 'binary' | 'loading';
}

/**
 * Empty/placeholder states for the diff viewer.
 */
export function DiffEmptyState({ variant }: DiffEmptyStateProps) {
  if (variant === 'loading') {
    return <DiffSkeleton />;
  }

  const config = {
    'no-file': {
      icon: FileCode2,
      title: 'Select a file to view changes',
      description: 'Choose a file from the file tree to see its diff.',
    },
    binary: {
      icon: FileWarning,
      title: 'Binary file',
      description: 'Cannot display diff for binary files.',
    },
  } as const;

  const { icon: Icon, title, description } = config[variant];

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="rounded-xl bg-zinc-800/50 p-4">
          <Icon className="h-8 w-8 text-zinc-500" strokeWidth={1.5} />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-zinc-300">{title}</p>
          <p className="text-xs text-zinc-500">{description}</p>
        </div>
      </div>
    </div>
  );
}

// Pre-computed widths to avoid impure Math.random during render
const SKELETON_WIDTHS = [
  280, 340, 190, 420, 150, 380, 220, 310, 260, 400,
  170, 350, 230, 290, 360, 200, 330, 250, 410, 180,
];

/** Loading skeleton that mimics diff line structure */
function DiffSkeleton() {
  return (
    <div className="flex h-full w-full flex-col gap-0 p-0">
      {/* Fake hunk header */}
      <div className="flex h-8 w-full items-center bg-zinc-800/30">
        <div className="ml-32 h-3 w-48 animate-pulse rounded bg-zinc-700/40" />
      </div>
      {/* Fake lines */}
      {SKELETON_WIDTHS.map((width, i) => (
        <div
          key={i}
          className="flex h-5 w-full items-center"
          style={{
            backgroundColor:
              i % 7 === 3
                ? 'rgba(46, 160, 67, 0.06)'
                : i % 7 === 4
                  ? 'rgba(248, 81, 73, 0.06)'
                  : 'transparent',
          }}
        >
          <div className="w-[52px] shrink-0" />
          <div className="w-[52px] shrink-0" />
          <div className="w-5 shrink-0" />
          <div
            className="ml-3 h-3 animate-pulse rounded bg-zinc-700/30"
            style={{ width: `${width}px` }}
          />
        </div>
      ))}
    </div>
  );
}
