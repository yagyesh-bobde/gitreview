'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import type { PRFile } from '@/types/pr';
import type {
  CategorizationFileInput,
  CategorizationResult,
} from '@/types/ai';

/** Cap patch size sent over the wire; the server truncates further per file. */
const CLIENT_PATCH_CHARS = 4000;

function toInput(file: PRFile): CategorizationFileInput {
  return {
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    patch: file.patch ? file.patch.slice(0, CLIENT_PATCH_CHARS) : null,
    sha: file.sha,
  };
}

async function fetchCategorization(
  files: CategorizationFileInput[],
): Promise<CategorizationResult> {
  const res = await fetch('/api/ai/categorize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Categorization failed: ${res.status}`);
  }
  return (await res.json()) as CategorizationResult;
}

/**
 * Fetch AI category assignments for a PR's files. Only runs when `enabled`
 * (i.e. the user switched to category view), so we never pay for the model
 * call in the default file view.
 *
 * The query key is stable across renders for the same PR state — it's keyed by
 * each file's sha, so a refetch/new-commit invalidates the categorization.
 */
export function useFileCategorization(
  org: string,
  repo: string,
  prNumber: number,
  files: PRFile[],
  enabled: boolean,
) {
  const inputs = useMemo(() => files.map(toInput), [files]);
  const fingerprint = useMemo(
    () =>
      inputs
        .map((f) => `${f.filename}:${f.sha}`)
        .sort()
        .join('|'),
    [inputs],
  );

  return useQuery({
    queryKey: ['ai-categorize', org, repo, prNumber, fingerprint],
    queryFn: () => fetchCategorization(inputs),
    enabled: enabled && inputs.length > 0,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
