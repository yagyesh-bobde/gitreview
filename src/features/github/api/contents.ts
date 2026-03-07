/**
 * GitHub Contents API functions.
 *
 * Used to fetch raw file content for AI context windows
 * and for displaying full file views alongside diffs.
 */

import { githubRequest } from './client';
import { getCached, setCached, fileContentKey } from '@/lib/cache/github-cache';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GitHubContentResponse {
  name: string;
  path: string;
  sha: string;
  size: number;
  encoding: 'base64' | 'none';
  content: string;
  type: 'file' | 'dir' | 'symlink' | 'submodule';
}

export interface FileContent {
  path: string;
  content: string;
  sha: string;
  size: number;
  /** True if the file was too large to fetch content for */
  truncated: boolean;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/** Max file size we'll attempt to fetch (1 MB). Larger files are skipped. */
const MAX_CONTENT_SIZE = 1_000_000;

/**
 * Fetch the raw content of a file at a specific ref (branch/commit SHA).
 *
 * @param token - GitHub access token
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param ref - Git ref (branch name, tag, or commit SHA)
 * @param path - File path within the repository
 */
export async function fetchFileContent(
  token: string,
  owner: string,
  repo: string,
  ref: string,
  path: string,
): Promise<FileContent> {
  const cacheKeyStr = fileContentKey(owner, repo, ref, path);
  const cached = await getCached<FileContent>(cacheKeyStr);
  if (cached) return cached;

  const { data } = await githubRequest<GitHubContentResponse>(
    `/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(ref)}`,
    { token },
  );

  if (data.type !== 'file') {
    throw new Error(`Expected file but got ${data.type}: ${path}`);
  }

  if (data.size > MAX_CONTENT_SIZE) {
    const result: FileContent = {
      path: data.path,
      content: '',
      sha: data.sha,
      size: data.size,
      truncated: true,
    };
    // Still cache truncated markers so we don't retry
    await setCached(cacheKeyStr, result, 'prDiff');
    return result;
  }

  // GitHub returns base64-encoded content
  let content: string;
  if (data.encoding === 'base64') {
    content = Buffer.from(data.content, 'base64').toString('utf-8');
  } else {
    content = data.content;
  }

  const result: FileContent = {
    path: data.path,
    content,
    sha: data.sha,
    size: data.size,
    truncated: false,
  };

  await setCached(cacheKeyStr, result, 'prDiff');
  return result;
}

/**
 * Fetch content for multiple files in parallel.
 * Skips files that fail (e.g. deleted files, binary files).
 */
export async function fetchMultipleFileContents(
  token: string,
  owner: string,
  repo: string,
  ref: string,
  paths: string[],
): Promise<Map<string, FileContent>> {
  const results = new Map<string, FileContent>();

  const settled = await Promise.allSettled(
    paths.map((path) => fetchFileContent(token, owner, repo, ref, path)),
  );

  for (let i = 0; i < paths.length; i++) {
    const result = settled[i];
    if (result.status === 'fulfilled') {
      results.set(paths[i], result.value);
    }
    // Silently skip failures -- the file might be deleted or binary
  }

  return results;
}
