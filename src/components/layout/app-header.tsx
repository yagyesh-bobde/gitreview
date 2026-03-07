'use client';

import Link from 'next/link';
import { GitPullRequest } from 'lucide-react';
import { UserMenu } from '@/features/auth/components/user-menu';
import { cn } from '@/lib/utils/cn';

interface PRHeaderInfo {
  title: string;
  number: number;
  state: 'open' | 'closed' | 'merged';
  draft?: boolean;
}

interface AppHeaderProps {
  pr?: PRHeaderInfo | null;
  org?: string;
  repo?: string;
  isLoading?: boolean;
}

const stateColors: Record<string, string> = {
  open: 'bg-green-900/50 text-green-400 border-green-800',
  closed: 'bg-red-900/50 text-red-400 border-red-800',
  merged: 'bg-purple-900/50 text-purple-400 border-purple-800',
  draft: 'bg-zinc-800 text-zinc-400 border-zinc-700',
};

function StateBadge({ state, draft }: { state: string; draft?: boolean }) {
  const key = draft ? 'draft' : state;
  const label = draft ? 'Draft' : state.charAt(0).toUpperCase() + state.slice(1);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        stateColors[key] ?? stateColors.open,
      )}
    >
      <GitPullRequest className="size-3" />
      {label}
    </span>
  );
}

export function AppHeader({ pr, org, repo, isLoading }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-50 flex h-12 shrink-0 items-center border-b border-zinc-800 bg-zinc-950 px-4">
      {/* Left: Logo */}
      <Link
        href="/dashboard"
        className="flex items-center gap-2 text-sm font-semibold text-zinc-200 transition-colors hover:text-white"
      >
        <GitPullRequest className="size-4" />
        <span className="hidden sm:inline">GitReview</span>
      </Link>

      {/* Breadcrumb separator */}
      {org && repo && (
        <div className="ml-3 flex items-center gap-1.5 text-xs text-zinc-500">
          <span>/</span>
          <span className="text-zinc-400">
            {org}/{repo}
          </span>
        </div>
      )}

      {/* Center: PR title */}
      <div className="mx-4 flex min-w-0 flex-1 items-center justify-center gap-2">
        {isLoading ? (
          <div className="h-4 w-48 animate-pulse rounded bg-zinc-800" />
        ) : pr ? (
          <>
            <StateBadge state={pr.state} draft={pr.draft} />
            <h1 className="truncate text-sm font-medium text-zinc-200">{pr.title}</h1>
            <span className="shrink-0 text-sm text-zinc-500">#{pr.number}</span>
          </>
        ) : null}
      </div>

      {/* Right: UserMenu */}
      <UserMenu />
    </header>
  );
}
