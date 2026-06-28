'use client';

import { useQueryClient, useIsFetching } from '@tanstack/react-query';
import { useCallback } from 'react';
import { usePrFreshness } from './use-pr-freshness';

/**
 * Ties the freshness probe to the displayed PR content and exposes a refresh
 * action for the Refresh banner.
 *
 * Flow:
 *  1. The probe (usePrFreshness) periodically reads the PR's latest updatedAt.
 *  2. If that differs from the displayed copy's updatedAt, `hasUpdate` is true
 *     and the UI can show a "PR changed -- Refresh" banner.
 *  3. The user clicks refresh -> we invalidate the frozen content queries.
 *     They refetch and swap in place; because cached data already exists there
 *     is no loading skeleton.
 *  4. Refetched content carries the new updatedAt, so `displayedUpdatedAt`
 *     updates -> `hasUpdate` flips back to false and the banner clears.
 */
export function usePrRefresh(
  org: string,
  repo: string,
  id: number,
  displayedUpdatedAt: string | undefined,
): { hasUpdate: boolean; isRefreshing: boolean; refresh: () => void } {
  const queryClient = useQueryClient();
  const freshness = usePrFreshness(org, repo, id, {
    enabled: !!displayedUpdatedAt,
  });

  const latest = freshness.data?.updatedAt;
  const hasUpdate =
    !!displayedUpdatedAt && !!latest && latest !== displayedUpdatedAt;

  const refetchingPr = useIsFetching({ queryKey: ['pr', org, repo, id] });
  const refetchingFiles = useIsFetching({
    queryKey: ['pr-files', org, repo, id],
  });
  const refetchingComments = useIsFetching({
    queryKey: ['pr-comments', org, repo, id],
  });
  const refetchingDiff = useIsFetching({
    queryKey: ['pr-diff', org, repo, id],
  });
  const isRefreshing =
    refetchingPr + refetchingFiles + refetchingComments + refetchingDiff > 0;

  const refresh = useCallback(() => {
    // Invalidate the frozen content queries so they refetch and swap in place.
    // ['pr-diff', org, repo, id] is a PREFIX match in v5, covering all
    // per-file diff queries.
    queryClient.invalidateQueries({ queryKey: ['pr', org, repo, id] });
    queryClient.invalidateQueries({ queryKey: ['pr-files', org, repo, id] });
    queryClient.invalidateQueries({ queryKey: ['pr-comments', org, repo, id] });
    queryClient.invalidateQueries({ queryKey: ['pr-diff', org, repo, id] });
    // Re-sync the probe so the banner clears once the new copy lands.
    freshness.refetch();
  }, [queryClient, org, repo, id, freshness]);

  return { hasUpdate, isRefreshing, refresh };
}
