/**
 * App-level PR types.
 * These are the shapes consumed by UI components and stores --
 * they may diverge from raw GitHub API responses over time.
 */

// ---------------------------------------------------------------------------
// Pull Request
// ---------------------------------------------------------------------------

export interface PullRequestAuthor {
  login: string;
  avatarUrl: string;
  url: string;
}

export interface PullRequestRef {
  ref: string;
  sha: string;
  repo: {
    owner: string;
    name: string;
    fullName: string;
  };
}

export interface PullRequestLabel {
  id: number;
  name: string;
  color: string;
  description: string | null;
}

export interface PullRequestReviewer {
  login: string;
  avatarUrl: string;
  state?: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'PENDING' | 'DISMISSED';
}

export type PullRequestState = 'open' | 'closed' | 'merged';

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: PullRequestState;
  author: PullRequestAuthor;
  base: PullRequestRef;
  head: PullRequestRef;
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
  additions: number;
  deletions: number;
  changedFiles: number;
  labels: PullRequestLabel[];
  reviewers: PullRequestReviewer[];
  mergeable: boolean | null;
  draft: boolean;
  url: string;
  htmlUrl: string;
  /** Which linked GitHub account fetched this PR (login username). */
  accountLogin?: string;
}

// ---------------------------------------------------------------------------
// PR File
// ---------------------------------------------------------------------------

export type PRFileStatus =
  | 'added'
  | 'removed'
  | 'modified'
  | 'renamed'
  | 'copied'
  | 'changed'
  | 'unchanged';

export interface PRFile {
  sha: string;
  filename: string;
  status: PRFileStatus;
  additions: number;
  deletions: number;
  changes: number;
  patch: string | null;
  contentsUrl: string;
  previousFilename: string | null;
}

// ---------------------------------------------------------------------------
// PR Comment (review comments, issue comments, review threads)
// ---------------------------------------------------------------------------

export type PRCommentSide = 'LEFT' | 'RIGHT';

export interface PRComment {
  id: number;
  body: string;
  author: PullRequestAuthor;
  createdAt: string;
  updatedAt: string;
  /** File path for review (inline) comments, null for issue-level comments */
  path: string | null;
  /** Line in the diff for review comments */
  line: number | null;
  /** Which side of the diff this comment belongs to */
  side: PRCommentSide | null;
  /** For threaded review comments, the ID of the parent */
  inReplyToId: number | null;
  /** GitHub's internal node ID */
  nodeId: string;
}

// ---------------------------------------------------------------------------
// Review
// ---------------------------------------------------------------------------

export type ReviewState = 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'PENDING' | 'DISMISSED';

export interface PRReview {
  id: number;
  author: PullRequestAuthor;
  body: string | null;
  state: ReviewState;
  submittedAt: string | null;
  comments: PRComment[];
}
