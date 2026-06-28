'use client';

import { useQuery } from '@tanstack/react-query';
import type { PullRequest } from '@/types/pr';

/**
 * Cheap "freshness probe" for a PR.
 *
 * This hook intentionally lives separate from the content queries
 * (use-pr / use-pr-files / use-pr-diff / use-pr-comments), which are frozen
 * once displayed. Its only job is to periodically re-read the PR's
 * `updatedAt` + head `sha` so the UI can detect whether the PR changed since
 * the displayed copy and surface a "Refresh" banner -- WITHOUT disturbing the
 * frozen content the user is currently looking at.
 */

interface PRResponse {
  pr: PullRequest;
  error?: string;
}

export interface PrFreshness {
  updatedAt: string;
  headSha: string;
}

async function fetchPrFreshness(
  org: string,
  repo: string,
  id: number,
): Promise<PrFreshness> {
  const res = await fetch(`/api/github/${org}/${repo}/pull/${id}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Failed to fetch PR: ${res.status}`);
  }
  const data: PRResponse = await res.json();
  return { updatedAt: data.pr.updatedAt, headSha: data.pr.head.sha };
}

/**
 * Probe a PR's freshness (updatedAt + head sha).
 *
 * Unlike the content queries this always considers itself stale and refetches
 * on mount, focus, and on an interval so it can promptly notice upstream
 * changes. It does not feed the displayed content -- only change detection.
 */
export function usePrFreshness(
  org: string,
  repo: string,
  id: number,
  opts?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['pr-freshness', org, repo, id],
    queryFn: () => fetchPrFreshness(org, repo, id),
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    enabled: (opts?.enabled ?? true) && !!org && !!repo && id > 0,
    retry: false,
  });
}
