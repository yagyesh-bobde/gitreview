"use client";

import { useQuery } from "@tanstack/react-query";

interface UseAssetSizeArgs {
  org: string;
  repo: string;
  /** Path to fetch (current filename, or previous filename for removed files). */
  path: string;
  /** Git ref (commit sha) holding this version of the asset. */
  ref: string | undefined;
  /** Only fire the request for actual asset files with a resolvable ref. */
  enabled: boolean;
}

/**
 * Resolve the byte size of an asset file by issuing a lightweight HEAD request
 * to our authenticated raw-file proxy and reading its Content-Length header.
 *
 * The raw route serves a fixed-size body, so the response carries an accurate
 * Content-Length without transferring the bytes to the client. Results are
 * cached (and deduped) by react-query keyed on the immutable ref, so each asset
 * is measured at most once per session.
 */
export function useAssetSize({ org, repo, path, ref, enabled }: UseAssetSizeArgs) {
  return useQuery({
    queryKey: ["asset-size", org, repo, ref, path],
    queryFn: async (): Promise<number | null> => {
      const params = new URLSearchParams({ path, ref: ref! });
      const url = `/api/github/${encodeURIComponent(org)}/${encodeURIComponent(
        repo,
      )}/raw?${params.toString()}`;

      const res = await fetch(url, { method: "HEAD" });
      if (!res.ok) return null;

      const length = res.headers.get("content-length");
      if (!length) return null;
      const bytes = Number(length);
      return Number.isFinite(bytes) ? bytes : null;
    },
    enabled: enabled && !!org && !!repo && !!ref && !!path,
    // A blob at a fixed sha is immutable -- never refetch once measured.
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
