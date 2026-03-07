'use client';

import { useQuery } from '@tanstack/react-query';
import type { PullRequest } from '@/types/pr';
import { CACHE_TTL_SECONDS } from '@/config/constants';

interface PRResponse {
  pr: PullRequest;
  error?: string;
}

async function fetchPR(org: string, repo: string, id: number): Promise<PullRequest> {
  const res = await fetch(`/api/github/${org}/${repo}/pull/${id}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Failed to fetch PR: ${res.status}`);
  }
  const data: PRResponse = await res.json();
  return data.pr;
}

/**
 * Fetch PR metadata (title, author, status, reviewers, etc.).
 */
export function usePR(org: string, repo: string, id: number) {
  return useQuery({
    queryKey: ['pr', org, repo, id],
    queryFn: () => fetchPR(org, repo, id),
    staleTime: CACHE_TTL_SECONDS.prMetadata * 1000,
    enabled: !!org && !!repo && id > 0,
    retry: (failureCount, error) => {
      // Don't retry auth errors or not-found
      if (error.message.includes('401') || error.message.includes('404')) {
        return false;
      }
      return failureCount < 2;
    },
  });
}
