/**
 * GitHub Pull Request API functions.
 *
 * These are server-side functions that call the GitHub REST API
 * and transform responses into app-level types.
 */

import type {
  GitHubPullRequest,
  GitHubPRFile,
  GitHubReview,
} from './types';
import type {
  PullRequest,
  PullRequestState,
  PRFile,
  PullRequestReviewer,
} from '@/types/pr';
import type { FileDiff } from '@/types/diff';
import { githubRequest, githubPaginatedRequest, githubRawDiff } from './client';
import { buildFileDiff } from '@/features/diff-viewer/lib/parse-diff';
import {
  getCached,
  setCached,
  prKey,
  prFilesKey,
  prDiffKey,
} from '@/lib/cache/github-cache';

// ---------------------------------------------------------------------------
// Transformers (GitHub API shape -> app shape)
// ---------------------------------------------------------------------------

function transformPR(gh: GitHubPullRequest): PullRequest {
  const state: PullRequestState =
    gh.merged_at ? 'merged' : gh.state === 'closed' ? 'closed' : 'open';

  return {
    id: gh.id,
    number: gh.number,
    title: gh.title,
    body: gh.body,
    state,
    author: {
      login: gh.user.login,
      avatarUrl: gh.user.avatar_url,
      url: gh.user.html_url,
    },
    base: {
      ref: gh.base.ref,
      sha: gh.base.sha,
      repo: {
        owner: gh.base.repo.owner.login,
        name: gh.base.repo.name,
        fullName: gh.base.repo.full_name,
      },
    },
    head: {
      ref: gh.head.ref,
      sha: gh.head.sha,
      repo: {
        owner: gh.head.repo.owner.login,
        name: gh.head.repo.name,
        fullName: gh.head.repo.full_name,
      },
    },
    createdAt: gh.created_at,
    updatedAt: gh.updated_at,
    mergedAt: gh.merged_at,
    additions: gh.additions,
    deletions: gh.deletions,
    changedFiles: gh.changed_files,
    labels: gh.labels.map((l) => ({
      id: l.id,
      name: l.name,
      color: l.color,
      description: l.description,
    })),
    reviewers: gh.requested_reviewers.map((r) => ({
      login: r.login,
      avatarUrl: r.avatar_url,
    })),
    mergeable: gh.mergeable,
    draft: gh.draft,
    url: gh.url,
    htmlUrl: gh.html_url,
  };
}

function transformFile(gh: GitHubPRFile): PRFile {
  return {
    sha: gh.sha,
    filename: gh.filename,
    status: gh.status,
    additions: gh.additions,
    deletions: gh.deletions,
    changes: gh.changes,
    patch: gh.patch ?? null,
    contentsUrl: gh.contents_url,
    previousFilename: gh.previous_filename ?? null,
  };
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * List PRs relevant to the authenticated user.
 * Fetches PRs where the user is author or requested reviewer.
 */
export async function listUserPRs(token: string): Promise<PullRequest[]> {
  // Use the search API to find PRs involving the user.
  // Two queries: authored PRs and review-requested PRs.
  // Search API returns { total_count, items }, not a flat array.
  const [authorSearch, reviewSearch] = await Promise.all([
    githubRequest<{ total_count: number; items: GitHubPullRequest[] }>(
      '/search/issues?q=type:pr+state:open+author:@me&sort=updated&order=desc&per_page=50',
      { token },
    ),
    githubRequest<{ total_count: number; items: GitHubPullRequest[] }>(
      '/search/issues?q=type:pr+state:open+review-requested:@me&sort=updated&order=desc&per_page=50',
      { token },
    ),
  ]);

  // Deduplicate by PR id
  const seen = new Set<number>();
  const prs: PullRequest[] = [];

  for (const item of [...authorSearch.data.items, ...reviewSearch.data.items]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);

    // Search API returns minimal fields. Parse org/repo from repository_url
    // or html_url since base/head may not be present.
    let repoOwner = '';
    let repoName = '';
    let repoFullName = '';

    if (item.base?.repo) {
      repoOwner = item.base.repo.owner.login;
      repoName = item.base.repo.name;
      repoFullName = item.base.repo.full_name;
    } else if (item.repository_url) {
      // repository_url is like "https://api.github.com/repos/owner/repo"
      const parts = item.repository_url.split('/');
      repoOwner = parts[parts.length - 2] ?? '';
      repoName = parts[parts.length - 1] ?? '';
      repoFullName = `${repoOwner}/${repoName}`;
    } else if (item.html_url) {
      // html_url is like "https://github.com/owner/repo/pull/123"
      const match = item.html_url.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (match) {
        repoOwner = match[1];
        repoName = match[2];
        repoFullName = `${repoOwner}/${repoName}`;
      }
    }

    const repoInfo = { owner: repoOwner, name: repoName, fullName: repoFullName };

    prs.push({
      id: item.id,
      number: item.number,
      title: item.title,
      body: item.body,
      state: item.merged_at ? 'merged' : item.state === 'closed' ? 'closed' : 'open',
      author: {
        login: item.user.login,
        avatarUrl: item.user.avatar_url,
        url: item.user.html_url,
      },
      base: item.base
        ? {
            ref: item.base.ref,
            sha: item.base.sha,
            repo: {
              owner: item.base.repo.owner.login,
              name: item.base.repo.name,
              fullName: item.base.repo.full_name,
            },
          }
        : { ref: '', sha: '', repo: repoInfo },
      head: item.head
        ? {
            ref: item.head.ref,
            sha: item.head.sha,
            repo: {
              owner: item.head.repo.owner.login,
              name: item.head.repo.name,
              fullName: item.head.repo.full_name,
            },
          }
        : { ref: '', sha: '', repo: repoInfo },
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      mergedAt: item.merged_at ?? null,
      additions: item.additions ?? 0,
      deletions: item.deletions ?? 0,
      changedFiles: item.changed_files ?? 0,
      labels: (item.labels ?? []).map((l) => ({
        id: l.id,
        name: l.name,
        color: l.color,
        description: l.description,
      })),
      reviewers: (item.requested_reviewers ?? []).map((r) => ({
        login: r.login,
        avatarUrl: r.avatar_url,
      })),
      mergeable: item.mergeable ?? null,
      draft: item.draft ?? false,
      url: item.url ?? '',
      htmlUrl: item.html_url ?? '',
    });
  }

  return prs;
}

/**
 * Fetch full PR metadata for a single pull request.
 */
export async function fetchPR(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<PullRequest> {
  const cacheKeyStr = prKey(owner, repo, prNumber);
  const cached = await getCached<PullRequest>(cacheKeyStr);
  if (cached) return cached;

  const { data } = await githubRequest<GitHubPullRequest>(
    `/repos/${owner}/${repo}/pulls/${prNumber}`,
    { token },
  );

  // Fetch reviews to populate reviewer states
  const { data: reviews } = await githubPaginatedRequest<GitHubReview>(
    `/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
    { token },
    5,
  );

  const pr = transformPR(data);

  // Merge review states into reviewers
  const reviewerMap = new Map<string, PullRequestReviewer>();
  for (const reviewer of pr.reviewers) {
    reviewerMap.set(reviewer.login, reviewer);
  }
  for (const review of reviews) {
    const existing = reviewerMap.get(review.user.login);
    if (existing) {
      existing.state = review.state;
    } else {
      reviewerMap.set(review.user.login, {
        login: review.user.login,
        avatarUrl: review.user.avatar_url,
        state: review.state,
      });
    }
  }
  pr.reviewers = Array.from(reviewerMap.values());

  await setCached(cacheKeyStr, pr, 'prMetadata');
  return pr;
}

/**
 * Fetch the list of files changed in a PR.
 */
export async function fetchPRFiles(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<PRFile[]> {
  const cacheKeyStr = prFilesKey(owner, repo, prNumber);
  const cached = await getCached<PRFile[]>(cacheKeyStr);
  if (cached) return cached;

  const { data } = await githubPaginatedRequest<GitHubPRFile>(
    `/repos/${owner}/${repo}/pulls/${prNumber}/files`,
    { token },
    10,
  );

  const files = data.map(transformFile);
  await setCached(cacheKeyStr, files, 'prFiles');
  return files;
}

/**
 * Fetch and parse the diff for a single file in a PR.
 *
 * Strategy: We first check if the file's patch is available from the files
 * endpoint (cached). If not, we fetch the full PR diff and extract the
 * relevant file section.
 */
export async function fetchFileDiff(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
  filename: string,
): Promise<FileDiff> {
  const cacheKeyStr = prDiffKey(owner, repo, prNumber, filename);
  const cached = await getCached<FileDiff>(cacheKeyStr);
  if (cached) return cached;

  // Try to get patch from the files endpoint first (often already cached)
  const files = await fetchPRFiles(token, owner, repo, prNumber);
  const file = files.find((f) => f.filename === filename);

  if (file && file.patch !== null) {
    const diff = buildFileDiff(filename, file.patch, file.previousFilename);
    await setCached(cacheKeyStr, diff, 'prDiff');
    return diff;
  }

  // For large files where patch is null, fetch the full PR diff
  // and extract this file's section
  const rawDiff = await githubRawDiff(
    `/repos/${owner}/${repo}/pulls/${prNumber}`,
    { token },
  );

  const { parseFullDiff } = await import('@/features/diff-viewer/lib/parse-diff');
  const allFileDiffs = parseFullDiff(rawDiff);
  const fileDiff = allFileDiffs.find((d) => d.filename === filename);

  if (fileDiff) {
    await setCached(cacheKeyStr, fileDiff, 'prDiff');
    return fileDiff;
  }

  // File not found in diff -- might be binary or empty change
  const fallback = buildFileDiff(
    filename,
    null,
    file?.previousFilename ?? null,
  );
  await setCached(cacheKeyStr, fallback, 'prDiff');
  return fallback;
}
