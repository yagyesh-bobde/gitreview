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

/** Read a valid, non-negative Content-Length from a response, or null. */
function contentLength(res: Response): number | null {
  const header = res.headers.get("content-length");
  if (!header) return null;
  const bytes = Number(header);
  return Number.isFinite(bytes) && bytes >= 0 ? bytes : null;
}

/**
 * Resolve the byte size of an asset file via our authenticated raw-file proxy
 * (`GET /api/github/[org]/[repo]/raw?path=&ref=`).
 *
 * We first try a cheap HEAD request and read its Content-Length header -- the
 * proxy serves a fixed-size body, so that header is accurate and no bytes are
 * transferred. If HEAD is unavailable or omits the header, we fall back to a
 * GET and measure the returned blob directly, so the size always resolves.
 * Results are cached (and deduped) by react-query keyed on the immutable ref,
 * so each asset is measured at most once per session.
 */
export function useAssetSize({ org, repo, path, ref, enabled }: UseAssetSizeArgs) {
  return useQuery({
    queryKey: ["asset-size", org, repo, ref, path],
    queryFn: async (): Promise<number | null> => {
      const params = new URLSearchParams({ path, ref: ref! });
      const url = `/api/github/${encodeURIComponent(org)}/${encodeURIComponent(
        repo,
      )}/raw?${params.toString()}`;

      // Preferred path: HEAD, read Content-Length without downloading bytes.
      try {
        const head = await fetch(url, { method: "HEAD" });
        if (head.ok) {
          const size = contentLength(head);
          if (size !== null) return size;
        }
      } catch {
        // Fall through to the GET fallback below.
      }

      // Fallback: GET and measure the body. Still correct if HEAD isn't
      // supported or the proxy doesn't set Content-Length on HEAD responses.
      const res = await fetch(url);
      if (!res.ok) return null;
      const size = contentLength(res);
      if (size !== null) return size;
      const blob = await res.blob();
      return blob.size;
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
