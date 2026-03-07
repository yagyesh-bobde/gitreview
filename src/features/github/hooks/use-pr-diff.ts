'use client';

import { useQuery } from '@tanstack/react-query';
import type { FileDiff } from '@/types/diff';
import { CACHE_TTL_SECONDS } from '@/config/constants';

interface DiffResponse {
  diff: FileDiff;
  error?: string;
}

async function fetchPRDiff(
  org: string,
  repo: string,
  id: number,
  filename: string,
): Promise<FileDiff> {
  const params = new URLSearchParams({ file: filename });
  const res = await fetch(`/api/github/${org}/${repo}/pull/${id}/diff?${params}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Failed to fetch diff: ${res.status}`);
  }
  const data: DiffResponse = await res.json();
  return data.diff;
}

/**
 * Fetch the parsed diff for a single file in a PR.
 * Only runs when a filename is provided (pass null/undefined to disable).
 */
export function usePRDiff(
  org: string,
  repo: string,
  id: number,
  filename: string | null | undefined,
) {
  return useQuery({
    queryKey: ['pr-diff', org, repo, id, filename],
    queryFn: () => fetchPRDiff(org, repo, id, filename!),
    staleTime: CACHE_TTL_SECONDS.prDiff * 1000,
    enabled: !!org && !!repo && id > 0 && !!filename,
    retry: (failureCount, error) => {
      if (error.message.includes('401') || error.message.includes('404')) {
        return false;
      }
      return failureCount < 2;
    },
  });
}
