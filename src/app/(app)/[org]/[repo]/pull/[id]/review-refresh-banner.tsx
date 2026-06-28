'use client';

import { RefreshCw } from 'lucide-react';
import { usePR } from '@/features/github/hooks/use-pr';
import { usePrRefresh } from '@/features/github/hooks/use-pr-refresh';
import { cn } from '@/lib/utils/cn';

/**
 * Slim notification bar that surfaces when the background probe detects that
 * the PR has changed upstream (new commits, edited metadata, etc.) since what
 * the user is currently viewing. It renders nothing in the common case — only
 * when `hasUpdate` is true. Clicking "Refresh" swaps fresh content in place
 * without a full navigation.
 */
export function ReviewRefreshBanner({
  org,
  repo,
  prNumber,
}: {
  org: string;
  repo: string;
  prNumber: number;
}) {
  const pr = usePR(org, repo, prNumber);
  const { hasUpdate, isRefreshing, refresh } = usePrRefresh(
    org,
    repo,
    prNumber,
    pr.data?.updatedAt,
  );

  if (!hasUpdate) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-9 shrink-0 items-center justify-center gap-3 border-b border-blue-500/30 bg-blue-500/10 px-4 text-xs text-blue-300"
    >
      <RefreshCw className={cn('size-3.5', isRefreshing && 'animate-spin')} />
      <span>This pull request has been updated.</span>
      <button
        onClick={refresh}
        disabled={isRefreshing}
        className="rounded bg-blue-500/20 px-2.5 py-1 font-medium text-blue-200 transition-colors hover:bg-blue-500/30 disabled:opacity-50"
      >
        {isRefreshing ? 'Refreshing…' : 'Refresh'}
      </button>
    </div>
  );
}
