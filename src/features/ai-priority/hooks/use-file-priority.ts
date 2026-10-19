'use client';

import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { PRFile } from '@/types/pr';
import {
  PRIORITY_MIN_FILES,
  PRIORITY_PATCH_CHARS,
  TYPESAFE_KEY_HEADER,
  type PriorityBucket,
  type PriorityErrorCode,
  type PriorityFileInput,
  type PriorityResult,
  type PrioritySource,
  type PriorityStatus,
} from '../lib/priority';
import { useTypesafeKey } from './use-typesafe-key';

const ENDPOINT = '/api/ai/prioritize';

export const PRIORITY_STATUS_QUERY_KEY = ['ai-priority', 'status'] as const;

/** A failed prioritize request, carrying the route's machine-readable code. */
class PriorityRequestError extends Error {
  constructor(
    readonly code: PriorityErrorCode,
    readonly status: number,
  ) {
    super(`Prioritization failed: ${code}`);
    this.name = 'PriorityRequestError';
  }
}

export type FilePriorityState =
  /** Fewer than PRIORITY_MIN_FILES changed files — the feature doesn't apply. */
  | { kind: 'ineligible' }
  /** No own key; waiting to learn whether the free demo is still available. */
  | { kind: 'checking' }
  /** No own key and the free demo is used up (or not offered). */
  | { kind: 'unavailable' }
  | { kind: 'loading'; viaDemo: boolean }
  | { kind: 'error'; code: PriorityErrorCode; viaDemo: boolean }
  | { kind: 'ready'; source: PrioritySource; buckets: Map<string, PriorityBucket> };

/** Short FNV-1a hash — distinguishes keys in the query cache without holding them. */
function keyFingerprint(key: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function toInput(file: PRFile): PriorityFileInput {
  return {
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    patch: file.patch ? file.patch.slice(0, PRIORITY_PATCH_CHARS) : null,
    sha: file.sha,
  };
}

async function fetchStatus(): Promise<PriorityStatus> {
  const res = await fetch(ENDPOINT);
  if (!res.ok) throw new Error(`Failed to load AI priority status: ${res.status}`);
  return (await res.json()) as PriorityStatus;
}

async function fetchPriority(
  files: PriorityFileInput[],
  apiKey: string | null,
): Promise<PriorityResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers[TYPESAFE_KEY_HEADER] = apiKey;

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({ files }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: PriorityErrorCode } | null;
    throw new PriorityRequestError(body?.error ?? 'prioritization_failed', res.status);
  }
  return (await res.json()) as PriorityResult;
}

/** Whether the signed-in user still has their free demo run. */
export function usePriorityStatus(enabled = true) {
  return useQuery({
    queryKey: PRIORITY_STATUS_QUERY_KEY,
    queryFn: fetchStatus,
    enabled,
  });
}

/**
 * AI priority buckets for a PR's files. Runs automatically for PRs with at
 * least PRIORITY_MIN_FILES files when the user has their own TypeSafe key or
 * an unused free demo. Results are keyed by each file's sha, so new commits
 * re-prioritize. Only a short hash of the user's key enters the query key, so
 * replacing a key (e.g. after an invalid one) gets a fresh attempt.
 */
export function useFilePriority(org: string, repo: string, prNumber: number, files: PRFile[]) {
  const queryClient = useQueryClient();
  const { apiKey } = useTypesafeKey();
  const usingOwnKey = !!apiKey;
  const qualifies = files.length >= PRIORITY_MIN_FILES;

  const status = usePriorityStatus(qualifies && !usingOwnKey);

  const inputs = useMemo(() => files.map(toInput), [files]);
  const fingerprint = useMemo(
    () =>
      inputs
        .map((f) => `${f.filename}:${f.sha}`)
        .sort()
        .join('|'),
    [inputs],
  );

  const priority = useQuery({
    queryKey: [
      'ai-priority',
      org,
      repo,
      prNumber,
      fingerprint,
      apiKey ? `own-key:${keyFingerprint(apiKey)}` : 'demo',
    ],
    queryFn: async () => {
      try {
        return await fetchPriority(inputs, apiKey);
      } finally {
        // A demo attempt may have spent (or been refused) the free run.
        if (!usingOwnKey) queryClient.invalidateQueries({ queryKey: PRIORITY_STATUS_QUERY_KEY });
      }
    },
    enabled: qualifies && (usingOwnKey || status.data?.demoAvailable === true),
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    // Retry transient server failures once; 4xx (bad key, demo used) are final.
    retry: (failureCount, error) =>
      failureCount < 1 && !(error instanceof PriorityRequestError && error.status < 500),
  });

  const buckets = useMemo(
    () =>
      priority.data
        ? new Map(priority.data.files.map((f) => [f.filename, f.bucket] as const))
        : null,
    [priority.data],
  );

  let state: FilePriorityState;
  if (!qualifies) {
    state = { kind: 'ineligible' };
  } else if (priority.data && buckets) {
    state = { kind: 'ready', source: priority.data.source, buckets };
  } else if (!usingOwnKey && status.isPending) {
    state = { kind: 'checking' };
  } else if (!usingOwnKey && !status.data?.demoAvailable && !priority.isFetching) {
    state = { kind: 'unavailable' };
  } else if (priority.error) {
    const code =
      priority.error instanceof PriorityRequestError
        ? priority.error.code
        : 'prioritization_failed';
    state = { kind: 'error', code, viaDemo: !usingOwnKey };
  } else {
    state = { kind: 'loading', viaDemo: !usingOwnKey };
  }

  return { state, retry: () => void priority.refetch() };
}
