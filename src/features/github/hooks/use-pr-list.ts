'use client';

import { useQuery } from '@tanstack/react-query';
import type { PullRequest } from '@/types/pr';

interface PRListResponse {
  prs: PullRequest[];
  error?: string;
}

async function fetchPRList(): Promise<PullRequest[]> {
  const res = await fetch('/api/github/prs');
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Failed to fetch PRs: ${res.status}`);
  }
  const data: PRListResponse = await res.json();
  return data.prs;
}

/**
 * Fetch the authenticated user's open PRs (authored + review-requested).
 * Polls every 2 minutes to keep the list fresh.
 */
export function usePRList() {
  return useQuery({
    queryKey: ['pr-list'],
    queryFn: fetchPRList,
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: (failureCount, error) => {
      if (error.message.includes('401')) return false;
      return failureCount < 2;
    },
  });
}
