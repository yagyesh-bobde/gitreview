'use client';

import { useQuery } from '@tanstack/react-query';
import type { PRComment, PRReview } from '@/types/pr';
import { CACHE_TTL_SECONDS } from '@/config/constants';

interface CommentsResponse {
  reviewComments: PRComment[];
  issueComments: PRComment[];
  reviews: PRReview[];
  error?: string;
}

/**
 * We need a separate API route for comments eventually.
 * For now, we'll call the PR comments endpoint directly
 * via an internal API route pattern. This is wired to a
 * route that doesn't exist yet -- we'll add it below.
 *
 * Alternative: call the server function directly if using
 * server actions, but that breaks the API route pattern.
 */
async function fetchPRComments(
  org: string,
  repo: string,
  id: number,
): Promise<CommentsResponse> {
  const res = await fetch(`/api/github/${org}/${repo}/pull/${id}/comments`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Failed to fetch comments: ${res.status}`);
  }
  return res.json();
}

/**
 * Fetch all comments for a PR (review comments, issue comments, reviews).
 */
export function usePRComments(org: string, repo: string, id: number) {
  return useQuery({
    queryKey: ['pr-comments', org, repo, id],
    queryFn: () => fetchPRComments(org, repo, id),
    staleTime: CACHE_TTL_SECONDS.prComments * 1000,
    enabled: !!org && !!repo && id > 0,
    retry: (failureCount, error) => {
      if (error.message.includes('401') || error.message.includes('404')) {
        return false;
      }
      return failureCount < 2;
    },
  });
}
