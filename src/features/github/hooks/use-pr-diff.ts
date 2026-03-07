'use client';

import { useQuery } from '@tanstack/react-query';
import type { FileDiff } from '@/features/diff-viewer/types';

async function fetchPRDiff(
  org: string,
  repo: string,
  id: string,
  filename: string,
): Promise<FileDiff> {
  const res = await fetch(
    `/api/github/${org}/${repo}/pull/${id}/diff?path=${encodeURIComponent(filename)}`,
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch diff: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return data.diff;
}

export function usePRDiff(org: string, repo: string, id: string, filename: string | null) {
  return useQuery({
    queryKey: ['pr-diff', org, repo, id, filename],
    queryFn: () => fetchPRDiff(org, repo, id, filename!),
    enabled: Boolean(org && repo && id && filename),
    retry: 2,
    staleTime: 60_000,
  });
}
