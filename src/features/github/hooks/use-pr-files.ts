'use client';

import { useQuery } from '@tanstack/react-query';
import type { PRFile } from '@/types/pr';
import { CACHE_TTL_SECONDS } from '@/config/constants';

interface FilesResponse {
  files: PRFile[];
  error?: string;
}

async function fetchPRFiles(org: string, repo: string, id: number): Promise<PRFile[]> {
  const res = await fetch(`/api/github/${org}/${repo}/pull/${id}/files`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Failed to fetch PR files: ${res.status}`);
  }
  const data: FilesResponse = await res.json();
  return data.files;
}

/**
 * Fetch the list of files changed in a PR.
 */
export function usePRFiles(org: string, repo: string, id: number) {
  return useQuery({
    queryKey: ['pr-files', org, repo, id],
    queryFn: () => fetchPRFiles(org, repo, id),
    staleTime: CACHE_TTL_SECONDS.prFiles * 1000,
    enabled: !!org && !!repo && id > 0,
    retry: (failureCount, error) => {
      if (error.message.includes('401') || error.message.includes('404')) {
        return false;
      }
      return failureCount < 2;
    },
  });
}
