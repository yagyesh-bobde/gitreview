'use client';

import { useQuery } from '@tanstack/react-query';
import type { PullRequest } from '@/types/pr';

async function fetchPR(org: string, repo: string, id: string): Promise<PullRequest> {
  const res = await fetch(`/api/github/${org}/${repo}/pull/${id}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch PR: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return data.pr;
}

export function usePR(org: string, repo: string, id: string) {
  return useQuery({
    queryKey: ['pr', org, repo, id],
    queryFn: () => fetchPR(org, repo, id),
    enabled: Boolean(org && repo && id),
    retry: 2,
    staleTime: 30_000,
  });
}
