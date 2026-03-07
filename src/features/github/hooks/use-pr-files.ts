'use client';

import { useQuery } from '@tanstack/react-query';
import type { PRFile } from '@/types/pr';

async function fetchPRFiles(org: string, repo: string, id: string): Promise<PRFile[]> {
  const res = await fetch(`/api/github/${org}/${repo}/pull/${id}/files`);
  if (!res.ok) {
    throw new Error(`Failed to fetch files: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return data.files;
}

export function usePRFiles(org: string, repo: string, id: string) {
  return useQuery({
    queryKey: ['pr-files', org, repo, id],
    queryFn: () => fetchPRFiles(org, repo, id),
    enabled: Boolean(org && repo && id),
    retry: 2,
    staleTime: 30_000,
  });
}
