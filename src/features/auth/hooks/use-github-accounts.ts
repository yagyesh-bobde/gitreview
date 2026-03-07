'use client';

import { useQuery } from '@tanstack/react-query';
import type { GitHubAccountInfo } from '@/features/auth/types';

interface AccountsResponse {
  accounts: GitHubAccountInfo[];
  activeAccountId: string | null;
}

/**
 * Fetch all linked GitHub accounts for the current user.
 */
export function useGitHubAccounts() {
  return useQuery<AccountsResponse>({
    queryKey: ['github-accounts'],
    queryFn: async () => {
      const res = await fetch('/api/auth/accounts');
      if (!res.ok) {
        throw new Error('Failed to fetch accounts');
      }
      return res.json();
    },
  });
}
