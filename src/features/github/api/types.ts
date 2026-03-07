/**
 * Raw GitHub REST API response types.
 * These mirror the JSON shapes returned by api.github.com.
 * We transform these into app-level types (src/types/pr.ts) before
 * handing data to the UI layer.
 */

// ---------------------------------------------------------------------------
// Common fragments
// ---------------------------------------------------------------------------

export interface GitHubUser {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  html_url: string;
}

export interface GitHubLabel {
  id: number;
  node_id: string;
  name: string;
  color: string;
  description: string | null;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: GitHubUser;
  html_url: string;
  private: boolean;
}

export interface GitHubRef {
  label: string;
  ref: string;
  sha: string;
  repo: GitHubRepo;
}

// ---------------------------------------------------------------------------
// Pull Request (GET /repos/{owner}/{repo}/pulls/{pull_number})
// ---------------------------------------------------------------------------

export interface GitHubPullRequest {
  id: number;
  number: number;
  node_id: string;
  state: 'open' | 'closed';
  title: string;
  body: string | null;
  user: GitHubUser;
  labels: GitHubLabel[];
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  merge_commit_sha: string | null;
  draft: boolean;
  head: GitHubRef;
  base: GitHubRef;
  html_url: string;
  url: string;
  additions: number;
  deletions: number;
  changed_files: number;
  mergeable: boolean | null;
  mergeable_state: string;
  requested_reviewers: GitHubUser[];
  /** Present on search API results */
  repository_url?: string;
}

// ---------------------------------------------------------------------------
// PR File (GET /repos/{owner}/{repo}/pulls/{pull_number}/files)
// ---------------------------------------------------------------------------

export interface GitHubPRFile {
  sha: string;
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  blob_url: string;
  raw_url: string;
  contents_url: string;
  previous_filename?: string;
}

// ---------------------------------------------------------------------------
// Review Comment (GET /repos/{owner}/{repo}/pulls/{pull_number}/comments)
// ---------------------------------------------------------------------------

export interface GitHubReviewComment {
  id: number;
  node_id: string;
  body: string;
  user: GitHubUser;
  created_at: string;
  updated_at: string;
  path: string;
  line: number | null;
  side: 'LEFT' | 'RIGHT';
  in_reply_to_id?: number;
  pull_request_review_id: number | null;
}

// ---------------------------------------------------------------------------
// Issue Comment (GET /repos/{owner}/{repo}/issues/{issue_number}/comments)
// ---------------------------------------------------------------------------

export interface GitHubIssueComment {
  id: number;
  node_id: string;
  body: string;
  user: GitHubUser;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Review (GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews)
// ---------------------------------------------------------------------------

export interface GitHubReview {
  id: number;
  node_id: string;
  user: GitHubUser;
  body: string | null;
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'PENDING' | 'DISMISSED';
  submitted_at: string | null;
  html_url: string;
}

// ---------------------------------------------------------------------------
// Search Results (GET /search/issues)
// ---------------------------------------------------------------------------

export interface GitHubSearchResult<T> {
  total_count: number;
  incomplete_results: boolean;
  items: T[];
}

// ---------------------------------------------------------------------------
// Rate Limit (response headers & GET /rate_limit)
// ---------------------------------------------------------------------------

export interface GitHubRateLimit {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
}

export interface GitHubRateLimitResponse {
  resources: {
    core: GitHubRateLimit;
    search: GitHubRateLimit;
    graphql: GitHubRateLimit;
  };
  rate: GitHubRateLimit;
}

// ---------------------------------------------------------------------------
// API Client types
// ---------------------------------------------------------------------------

export interface GitHubApiOptions {
  token: string;
  /** If-None-Match header value for conditional requests */
  etag?: string;
  /** AbortSignal for request cancellation */
  signal?: AbortSignal;
}

export interface GitHubApiResponse<T> {
  data: T;
  etag: string | null;
  rateLimit: GitHubRateLimit;
  /** True when the server returned 304 Not Modified */
  notModified: boolean;
}

export interface GitHubApiError {
  status: number;
  message: string;
  documentationUrl?: string;
}
