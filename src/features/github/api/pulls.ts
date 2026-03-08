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
 *
 * Strategy (two complementary paths that run in parallel):
 *
 * 1. **Personal search queries** — `author:@me`, `review-requested:@me`,
 *    `involves:@me` via the Search API. Catches PRs where the user is
 *    directly involved regardless of repo visibility.
 *
 * 2. **Repo-level PR fetch** — Discover ALL repos the user can access
 *    (personal + org) via `/user/repos` with explicit affiliation, then
 *    supplement by discovering orgs and fetching their repos directly.
 *    For each discovered repo, fetch open PRs via the REST pulls endpoint
 *    (`GET /repos/{owner}/{repo}/pulls`). This catches team PRs in org
 *    repos where the user is NOT personally involved.
 *
 * Results are deduplicated by PR id.
 */
export async function listUserPRs(token: string): Promise<PullRequest[]> {
  const TAG = '[listUserPRs]';

  // -------------------------------------------------------------------------
  // Step 1: Discover repos the user has access to
  // -------------------------------------------------------------------------
  type RepoInfo = { full_name: string; owner: { login: string }; open_issues_count: number };

  // Fetch repos with explicit affiliation to maximize coverage.
  // owner = user's own repos, collaborator = repos user was added to,
  // organization_member = repos in orgs the user belongs to.
  let userRepos: RepoInfo[] = [];
  try {
    const reposResponse = await githubPaginatedRequest<RepoInfo>(
      '/user/repos?affiliation=owner,collaborator,organization_member&sort=pushed&direction=desc&per_page=100',
      { token },
      3, // up to 300 repos
    );
    userRepos = reposResponse.data;
    console.log(`${TAG} /user/repos returned ${userRepos.length} repos`);
  } catch (err) {
    console.warn(`${TAG} Failed to fetch /user/repos:`, err);
  }

  // Discover orgs via two methods:
  // 1. Extract unique owner names from fetched repos
  // 2. Directly call /user/orgs (requires read:org scope for private orgs,
  //    but works without it for public orgs)
  const userRepoFullNames = new Set(userRepos.map((r) => r.full_name));
  const orgNames = new Set<string>();
  for (const repo of userRepos) {
    orgNames.add(repo.owner.login);
  }

  // Also discover orgs directly via the /user/orgs endpoint.
  // This is critical for finding orgs whose repos didn't appear in /user/repos.
  try {
    const orgsResponse = await githubRequest<Array<{ login: string }>>(
      '/user/orgs?per_page=100',
      { token },
    );
    for (const org of orgsResponse.data) {
      orgNames.add(org.login);
    }
    console.log(`${TAG} /user/orgs returned ${orgsResponse.data.length} orgs: [${orgsResponse.data.map((o) => o.login).join(', ')}]`);
  } catch (err) {
    console.warn(`${TAG} /user/orgs failed (may need read:org scope):`, err instanceof Error ? err.message : err);
  }

  // For each discovered org, try fetching their repos via /orgs/{org}/repos.
  // This endpoint works with the `repo` scope and catches repos that
  // /user/repos might miss (e.g. repos accessible via team-level permissions).
  // We skip orgs that are clearly the user's personal account by checking
  // if we already have enough repos from them (heuristic, not perfect).
  const orgRepoPromises: Array<Promise<{ org: string; repos: RepoInfo[] }>> = [];
  for (const org of orgNames) {
    orgRepoPromises.push(
      githubPaginatedRequest<RepoInfo>(
        `/orgs/${org}/repos?type=all&sort=pushed&direction=desc&per_page=100`,
        { token },
        2, // up to 200 repos per org
      )
        .then((res) => ({ org, repos: res.data }))
        .catch(() => {
          // 404 = personal account (not an org), which is expected.
          // Other errors are non-fatal; we already have /user/repos data.
          return { org, repos: [] as RepoInfo[] };
        }),
    );
  }

  const orgResults = await Promise.allSettled(orgRepoPromises);
  let orgReposDiscovered = 0;
  for (const result of orgResults) {
    if (result.status === 'fulfilled') {
      for (const repo of result.value.repos) {
        if (!userRepoFullNames.has(repo.full_name)) {
          userRepos.push(repo);
          userRepoFullNames.add(repo.full_name);
          orgReposDiscovered++;
        }
      }
      if (result.value.repos.length > 0) {
        console.log(`${TAG} /orgs/${result.value.org}/repos returned ${result.value.repos.length} repos (${orgReposDiscovered} new)`);
      }
    }
  }

  console.log(`${TAG} Total unique repos discovered: ${userRepoFullNames.size}`);

  // -------------------------------------------------------------------------
  // Step 2: Fetch PRs from two parallel paths
  // -------------------------------------------------------------------------

  // Path A: Personal search queries (catches PRs in repos we might not discover)
  const searchPromises: Array<Promise<{ data: { total_count: number; items: GitHubPullRequest[] } }>> = [
    githubRequest<{ total_count: number; items: GitHubPullRequest[] }>(
      '/search/issues?q=type:pr+state:open+author:@me&sort=updated&order=desc&per_page=100',
      { token },
    ),
    githubRequest<{ total_count: number; items: GitHubPullRequest[] }>(
      '/search/issues?q=type:pr+state:open+review-requested:@me&sort=updated&order=desc&per_page=100',
      { token },
    ),
    githubRequest<{ total_count: number; items: GitHubPullRequest[] }>(
      '/search/issues?q=type:pr+state:open+involves:@me&sort=updated&order=desc&per_page=100',
      { token },
    ),
  ];

  // Path B: Direct REST pulls endpoint for repos that might have open PRs.
  // We use GET /repos/{owner}/{repo}/pulls (core rate limit: 5000/hr) instead
  // of the search API (30/min) for reliability and speed.
  //
  // We do NOT filter by open_issues_count because:
  // - GitHub's count can be stale / cached
  // - Repos with Issues disabled may report 0 even with open PRs
  // - The cost of a 404 or empty response is negligible vs missing PRs
  // The repos are already sorted by pushed_at desc, so the cap below
  // naturally prioritizes active repos.
  const reposToQuery = userRepos;

  // Cap at 50 repos to avoid excessive API calls. Prioritize recently pushed.
  // (The repos are already sorted by pushed desc from the API.)
  const MAX_REPO_QUERIES = 50;
  const cappedRepos = reposToQuery.slice(0, MAX_REPO_QUERIES);
  console.log(`${TAG} Querying ${cappedRepos.length} repos for open PRs (of ${reposToQuery.length} candidates)`);

  const repoPRPromises = cappedRepos.map((repo) =>
    githubPaginatedRequest<GitHubPullRequest>(
      `/repos/${repo.full_name}/pulls?state=open&sort=updated&direction=desc&per_page=100`,
      { token },
      1, // only first page -- if a repo has 100+ open PRs, tough luck
    )
      .then((res) => {
        if (res.data.length > 0) {
          console.log(`${TAG}   ${repo.full_name}: ${res.data.length} open PRs`);
        }
        return res.data;
      })
      .catch((err) => {
        // Non-fatal: might be a repo we lost access to
        console.warn(`${TAG}   ${repo.full_name}: failed to fetch PRs:`, err instanceof Error ? err.message : err);
        return [] as GitHubPullRequest[];
      }),
  );

  // Run both paths in parallel
  const [searchResults, ...repoPRResults] = await Promise.all([
    Promise.allSettled(searchPromises),
    ...repoPRPromises,
  ]);

  // -------------------------------------------------------------------------
  // Step 3: Collect and deduplicate
  // -------------------------------------------------------------------------
  const seen = new Set<number>();
  const prs: PullRequest[] = [];

  // Helper to add a PR from the search API (partial fields)
  function addSearchItem(item: GitHubPullRequest): void {
    if (seen.has(item.id)) return;
    seen.add(item.id);

    let repoOwner = '';
    let repoName = '';
    let repoFullName = '';

    if (item.base?.repo) {
      repoOwner = item.base.repo.owner.login;
      repoName = item.base.repo.name;
      repoFullName = item.base.repo.full_name;
    } else if (item.repository_url) {
      const parts = item.repository_url.split('/');
      repoOwner = parts[parts.length - 2] ?? '';
      repoName = parts[parts.length - 1] ?? '';
      repoFullName = `${repoOwner}/${repoName}`;
    } else if (item.html_url) {
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

  // Helper to add a PR from the REST pulls endpoint (full fields)
  function addRestPR(item: GitHubPullRequest): void {
    if (seen.has(item.id)) return;
    seen.add(item.id);
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
      base: {
        ref: item.base.ref,
        sha: item.base.sha,
        repo: {
          owner: item.base.repo.owner.login,
          name: item.base.repo.name,
          fullName: item.base.repo.full_name,
        },
      },
      head: {
        ref: item.head.ref,
        sha: item.head.sha,
        repo: {
          owner: item.head.repo.owner.login,
          name: item.head.repo.name,
          fullName: item.head.repo.full_name,
        },
      },
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

  // Process search results
  let searchPRCount = 0;
  for (const result of searchResults as PromiseSettledResult<{ data: { total_count: number; items: GitHubPullRequest[] } }>[]) {
    if (result.status === 'fulfilled') {
      for (const item of result.value.data.items) {
        addSearchItem(item);
        searchPRCount++;
      }
    } else {
      console.warn(`${TAG} Search query failed:`, result.reason);
    }
  }
  console.log(`${TAG} Search API returned ${searchPRCount} items (${prs.length} unique so far)`);

  // Process REST pulls results
  let restPRCount = 0;
  const beforeRest = prs.length;
  for (const prList of repoPRResults as GitHubPullRequest[][]) {
    for (const item of prList) {
      addRestPR(item);
      restPRCount++;
    }
  }
  console.log(`${TAG} REST pulls returned ${restPRCount} items (${prs.length - beforeRest} new, ${prs.length} total unique)`);

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
