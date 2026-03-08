'use client';

import { useQuery } from '@tanstack/react-query';
import type { PullRequest } from '@/types/pr';

export interface AccountStatus {
  login: string;
  status: 'ok' | 'error';
  error?: string;
}

interface PRListResponse {
  prs: PullRequest[];
  githubLogins: string[];
  accountStatuses?: AccountStatus[];
  error?: string;
}

interface PRListData {
  prs: PullRequest[];
  githubLogins: string[];
  accountStatuses: AccountStatus[];
}

async function fetchPRList(): Promise<PRListData> {
  const res = await fetch('/api/github/prs');
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Failed to fetch PRs: ${res.status}`);
  }
  const data: PRListResponse = await res.json();
  return { prs: data.prs, githubLogins: data.githubLogins, accountStatuses: data.accountStatuses ?? [] };
}

/**
 * Fetch open PRs across all linked GitHub accounts.
 * Returns both the PR list and the array of GitHub logins for filtering.
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
