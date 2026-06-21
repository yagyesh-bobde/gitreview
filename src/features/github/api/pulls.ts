/**
 * GitHub Pull Request API functions.
 *
 * These are server-side functions that call the GitHub API and transform
 * responses into app-level types. The PR list uses GraphQL (one request);
 * single-PR detail/files/diff use REST + Redis caching.
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
import { graphqlRequest } from './graphql-client';
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
// GraphQL PR list
// ---------------------------------------------------------------------------

interface GqlActor {
  login: string;
  avatarUrl: string;
  url: string;
}

interface GqlRepo {
  name: string;
  owner: { login: string };
  nameWithOwner: string;
}

interface GqlLabel {
  name: string;
  color: string;
  description: string | null;
}

interface GqlReviewRequestNode {
  requestedReviewer: {
    __typename: string;
    login?: string;
    avatarUrl?: string;
    name?: string;
  } | null;
}

interface GqlPullRequest {
  __typename: string;
  databaseId: number | null;
  number: number;
  title: string;
  body: string | null;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  isDraft: boolean;
  merged: boolean;
  mergedAt: string | null;
  createdAt: string;
  updatedAt: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  mergeable: 'MERGEABLE' | 'CONFLICTING' | 'UNKNOWN';
  url: string;
  author: GqlActor | null;
  baseRefName: string;
  baseRefOid: string;
  baseRepository: GqlRepo | null;
  headRefName: string;
  headRefOid: string;
  headRepository: GqlRepo | null;
  labels: { nodes: GqlLabel[] } | null;
  reviewRequests: { nodes: GqlReviewRequestNode[] } | null;
}

interface SearchBlock {
  nodes: Array<Partial<GqlPullRequest>>;
}

interface ListUserPRsResponse {
  authored: SearchBlock;
  reviewRequested: SearchBlock;
  involved: SearchBlock;
}

const PR_FRAGMENT = /* GraphQL */ `
  fragment PrFields on PullRequest {
    __typename
    databaseId
    number
    title
    body
    state
    isDraft
    merged
    mergedAt
    createdAt
    updatedAt
    additions
    deletions
    changedFiles
    mergeable
    url
    author { login avatarUrl url }
    baseRefName
    baseRefOid
    baseRepository { name owner { login } nameWithOwner }
    headRefName
    headRefOid
    headRepository { name owner { login } nameWithOwner }
    labels(first: 20) { nodes { name color description } }
    reviewRequests(first: 20) {
      nodes {
        requestedReviewer {
          __typename
          ... on User { login avatarUrl }
          ... on Team { name avatarUrl }
        }
      }
    }
  }
`;

const LIST_USER_PRS_QUERY = /* GraphQL */ `
  query ListUserPRs($first: Int!) {
    authored: search(query: "is:pr is:open author:@me sort:updated-desc", type: ISSUE, first: $first) {
      nodes { ...PrFields }
    }
    reviewRequested: search(query: "is:pr is:open review-requested:@me sort:updated-desc", type: ISSUE, first: $first) {
      nodes { ...PrFields }
    }
    involved: search(query: "is:pr is:open involves:@me sort:updated-desc", type: ISSUE, first: $first) {
      nodes { ...PrFields }
    }
  }
  ${PR_FRAGMENT}
`;

/** Stable, small numeric id for a label name (used only as a UI key). */
function labelId(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function mapMergeable(m: GqlPullRequest['mergeable']): boolean | null {
  if (m === 'MERGEABLE') return true;
  if (m === 'CONFLICTING') return false;
  return null;
}

function mapState(pr: GqlPullRequest): PullRequestState {
  if (pr.merged || pr.state === 'MERGED') return 'merged';
  if (pr.state === 'CLOSED') return 'closed';
  return 'open';
}

function transformGqlPR(pr: GqlPullRequest): PullRequest | null {
  if (pr.databaseId == null) return null;

  const repo = pr.baseRepository ?? pr.headRepository;
  const owner = repo?.owner.login ?? '';
  const name = repo?.name ?? '';
  const fullName = repo?.nameWithOwner ?? (owner && name ? `${owner}/${name}` : '');

  const reviewers: PullRequestReviewer[] = (pr.reviewRequests?.nodes ?? [])
    .map((n) => n.requestedReviewer)
    .filter((r): r is NonNullable<GqlReviewRequestNode['requestedReviewer']> => r != null)
    .map((r) => ({
      login: r.login ?? r.name ?? 'unknown',
      avatarUrl: r.avatarUrl ?? '',
    }));

  return {
    id: pr.databaseId,
    number: pr.number,
    title: pr.title,
    body: pr.body,
    state: mapState(pr),
    author: {
      login: pr.author?.login ?? 'ghost',
      avatarUrl: pr.author?.avatarUrl ?? '',
      url: pr.author?.url ?? '',
    },
    base: {
      ref: pr.baseRefName,
      sha: pr.baseRefOid,
      repo: { owner, name, fullName },
    },
    head: {
      ref: pr.headRefName,
      sha: pr.headRefOid,
      repo: {
        owner: pr.headRepository?.owner.login ?? owner,
        name: pr.headRepository?.name ?? name,
        fullName: pr.headRepository?.nameWithOwner ?? fullName,
      },
    },
    createdAt: pr.createdAt,
    updatedAt: pr.updatedAt,
    mergedAt: pr.mergedAt,
    additions: pr.additions ?? 0,
    deletions: pr.deletions ?? 0,
    changedFiles: pr.changedFiles ?? 0,
    labels: (pr.labels?.nodes ?? []).map((l) => ({
      id: labelId(l.name),
      name: l.name,
      color: l.color,
      description: l.description,
    })),
    reviewers,
    mergeable: mapMergeable(pr.mergeable),
    draft: pr.isDraft,
    // GraphQL gives the HTML url; reconstruct the REST api url for parity.
    url: fullName ? `https://api.github.com/repos/${fullName}/pulls/${pr.number}` : '',
    htmlUrl: pr.url,
  };
}

/**
 * List open PRs relevant to the authenticated user via a single GraphQL
 * request: three aliased `search` queries (authored, review-requested,
 * involves) returning the fields the dashboard needs. Results are
 * deduplicated by PR databaseId.
 *
 * This replaces the previous REST fan-out (discover all repos + orgs, then
 * up to ~50 per-repo `/pulls` calls plus 3 Search calls per account), which
 * could cost 50-70 GitHub requests per account and was unusable on Vercel.
 *
 * Org-wide discovery of PRs the user is NOT involved in is intentionally not
 * covered here -- that requires a GitHub App + webhooks (see ARCHITECTURE).
 * A legacy repo-scan path remains available behind GITHUB_ENABLE_REPO_SCAN
 * for environments that still need it.
 */
export async function listUserPRs(token: string): Promise<PullRequest[]> {
  const TAG = '[listUserPRs]';

  let data: ListUserPRsResponse;
  try {
    data = await graphqlRequest<ListUserPRsResponse>(token, LIST_USER_PRS_QUERY, { first: 100 });
  } catch (err) {
    console.error(`${TAG} GraphQL query failed:`, err instanceof Error ? err.message : err);
    throw err;
  }

  const seen = new Set<number>();
  const prs: PullRequest[] = [];

  const blocks: SearchBlock[] = [data.authored, data.reviewRequested, data.involved];
  for (const block of blocks) {
    for (const node of block?.nodes ?? []) {
      // search returns a union; non-PR nodes (or partial results) lack __typename.
      if (node.__typename !== 'PullRequest') continue;
      const transformed = transformGqlPR(node as GqlPullRequest);
      if (!transformed) continue;
      if (seen.has(transformed.id)) continue;
      seen.add(transformed.id);
      prs.push(transformed);
    }
  }

  console.log(`${TAG} GraphQL returned ${prs.length} unique open PRs`);

  // Optional legacy path: enumerate accessible repos and fetch their open PRs.
  // Off by default -- it's the expensive fan-out that motivated the GraphQL
  // rewrite. Enable only if you need org-wide PRs the user isn't involved in.
  if (process.env.GITHUB_ENABLE_REPO_SCAN === 'true') {
    try {
      await supplementWithRepoScan(token, prs, seen);
    } catch (err) {
      console.warn(`${TAG} repo scan failed (non-fatal):`, err instanceof Error ? err.message : err);
    }
  }

  // Most-recently-updated first.
  prs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return prs;
}

/**
 * Legacy REST repo-scan, gated behind GITHUB_ENABLE_REPO_SCAN. Discovers repos
 * via /user/repos (recently pushed) and fetches their open PRs, appending any
 * not already seen. Capped to bound the fan-out.
 */
async function supplementWithRepoScan(
  token: string,
  prs: PullRequest[],
  seen: Set<number>,
): Promise<void> {
  const TAG = '[listUserPRs:repoScan]';
  type RepoInfo = { full_name: string; owner: { login: string } };

  const reposResponse = await githubPaginatedRequest<RepoInfo>(
    '/user/repos?affiliation=owner,collaborator,organization_member&sort=pushed&direction=desc&per_page=100',
    { token },
    1,
  );
  const MAX_REPO_QUERIES = 30;
  const repos = reposResponse.data.slice(0, MAX_REPO_QUERIES);
  console.log(`${TAG} scanning ${repos.length} repos for open PRs`);

  const results = await Promise.allSettled(
    repos.map((repo) =>
      githubPaginatedRequest<GitHubPullRequest>(
        `/repos/${repo.full_name}/pulls?state=open&sort=updated&direction=desc&per_page=100`,
        { token },
        1,
      ).then((res) => res.data),
    ),
  );

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    for (const item of result.value) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      prs.push(transformPR(item));
    }
  }
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

  // Fetch the PR and its reviews concurrently -- they're independent.
  const [{ data }, { data: reviews }] = await Promise.all([
    githubRequest<GitHubPullRequest>(`/repos/${owner}/${repo}/pulls/${prNumber}`, { token }),
    githubPaginatedRequest<GitHubReview>(
      `/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
      { token },
      5,
    ),
  ]);

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
 * Strategy: prefer the per-file `patch` from the files endpoint (often already
 * cached). When that's null (large files), fall back to the full PR diff -- but
 * parse it ONCE and cache EVERY file's diff, so subsequent large-file requests
 * are cache hits instead of re-downloading the entire diff per file.
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

  // For large files where patch is null, fetch the full PR diff ONCE and
  // parse every file, caching each so we never re-download for sibling files.
  const rawDiff = await githubRawDiff(
    `/repos/${owner}/${repo}/pulls/${prNumber}`,
    { token },
  );

  const { parseFullDiff } = await import('@/features/diff-viewer/lib/parse-diff');
  const allFileDiffs = parseFullDiff(rawDiff);

  // Cache all parsed file diffs up front (best-effort, in parallel).
  await Promise.all(
    allFileDiffs.map((d) =>
      setCached(prDiffKey(owner, repo, prNumber, d.filename), d, 'prDiff'),
    ),
  );

  const fileDiff = allFileDiffs.find((d) => d.filename === filename);
  if (fileDiff) return fileDiff;

  // File not found in diff -- might be binary or empty change
  const fallback = buildFileDiff(filename, null, file?.previousFilename ?? null);
  await setCached(cacheKeyStr, fallback, 'prDiff');
  return fallback;
}
