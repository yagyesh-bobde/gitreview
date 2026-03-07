'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

interface SwitchAccountResponse {
  success: boolean;
  activeAccountId: string;
  login: string;
}

/**
 * Mutation hook to switch the active GitHub account.
 * Invalidates all GitHub-related queries after switching so
 * the UI refetches data with the new account's token.
 */
export function useSwitchAccount() {
  const queryClient = useQueryClient();
  const { update: updateSession } = useSession();

  return useMutation<SwitchAccountResponse, Error, string>({
    mutationFn: async (accountId: string) => {
      const res = await fetch('/api/auth/switch-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to switch account');
      }
      return res.json();
    },
    onSuccess: async (data) => {
      // Refresh the NextAuth session so JWT picks up the new activeAccountId.
      // Passing activeAccountId lets the jwt callback skip a DB roundtrip.
      await updateSession({ activeAccountId: data.activeAccountId });

      // Invalidate all queries that depend on the GitHub token.
      // This covers PRs, diffs, comments, file trees, etc.
      await queryClient.invalidateQueries();
    },
  });
}
