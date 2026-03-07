'use client';

import { useMutation, useQuery } from '@tanstack/react-query';

interface GenerateTokenResponse {
  token: string;
  url: string;
  expiresAt: string;
}

interface TokenStatusResponse {
  status: 'pending' | 'used' | 'expired' | 'not_found';
}

/**
 * Mutation hook to generate a new link token for cross-browser account linking.
 */
export function useGenerateLinkToken() {
  return useMutation<GenerateTokenResponse, Error>({
    mutationFn: async () => {
      const res = await fetch('/api/auth/link-token', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to generate link token');
      }
      return res.json();
    },
  });
}

/**
 * Query hook that polls the link token status every 3 seconds.
 * Enabled only when a token is provided. Stops polling once the token
 * is consumed (status === 'used') or expired.
 */
export function useLinkTokenStatus(token: string | null) {
  return useQuery<TokenStatusResponse>({
    queryKey: ['link-token-status', token],
    queryFn: async () => {
      const res = await fetch(`/api/auth/link-token?token=${token}`);
      if (!res.ok) {
        throw new Error('Failed to check token status');
      }
      return res.json();
    },
    enabled: !!token,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Stop polling once consumed or expired
      if (status === 'used' || status === 'expired') return false;
      return 3000;
    },
  });
}
