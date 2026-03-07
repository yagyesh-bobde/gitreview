/**
 * GitHub PR Comments API functions.
 *
 * Handles both:
 * - Review comments (inline, attached to diff lines)
 * - Issue comments (top-level, on the PR conversation)
 */

import type {
  GitHubReviewComment,
  GitHubIssueComment,
  GitHubReview,
} from './types';
import type { PRComment, PRReview } from '@/types/pr';
import {
  githubPaginatedRequest,
  githubPost,
} from './client';
import {
  getCached,
  setCached,
  prCommentsKey,
  invalidatePR,
} from '@/lib/cache/github-cache';

// ---------------------------------------------------------------------------
// Transformers
// ---------------------------------------------------------------------------

function transformReviewComment(gh: GitHubReviewComment): PRComment {
  return {
    id: gh.id,
    nodeId: gh.node_id,
    body: gh.body,
    author: {
      login: gh.user.login,
      avatarUrl: gh.user.avatar_url,
      url: gh.user.html_url,
    },
    createdAt: gh.created_at,
    updatedAt: gh.updated_at,
    path: gh.path,
    line: gh.line,
    side: gh.side,
    inReplyToId: gh.in_reply_to_id ?? null,
  };
}

function transformIssueComment(gh: GitHubIssueComment): PRComment {
  return {
    id: gh.id,
    nodeId: gh.node_id,
    body: gh.body,
    author: {
      login: gh.user.login,
      avatarUrl: gh.user.avatar_url,
      url: gh.user.html_url,
    },
    createdAt: gh.created_at,
    updatedAt: gh.updated_at,
    path: null,
    line: null,
    side: null,
    inReplyToId: null,
  };
}

function transformReview(gh: GitHubReview): PRReview {
  return {
    id: gh.id,
    author: {
      login: gh.user.login,
      avatarUrl: gh.user.avatar_url,
      url: gh.user.html_url,
    },
    body: gh.body,
    state: gh.state,
    submittedAt: gh.submitted_at,
    comments: [],
  };
}

// ---------------------------------------------------------------------------
// Fetch functions
// ---------------------------------------------------------------------------

export interface PRCommentsResult {
  /** Inline review comments (attached to specific lines) */
  reviewComments: PRComment[];
  /** Top-level issue comments (PR conversation) */
  issueComments: PRComment[];
  /** Reviews (approval, request changes, etc.) */
  reviews: PRReview[];
}

/**
 * Fetch all comments for a PR (review comments + issue comments + reviews).
 */
export async function fetchPRComments(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<PRCommentsResult> {
  const cacheKeyStr = prCommentsKey(owner, repo, prNumber);
  const cached = await getCached<PRCommentsResult>(cacheKeyStr);
  if (cached) return cached;

  const [reviewCommentsResult, issueCommentsResult, reviewsResult] = await Promise.all([
    githubPaginatedRequest<GitHubReviewComment>(
      `/repos/${owner}/${repo}/pulls/${prNumber}/comments`,
      { token },
      10,
    ),
    githubPaginatedRequest<GitHubIssueComment>(
      `/repos/${owner}/${repo}/issues/${prNumber}/comments`,
      { token },
      10,
    ),
    githubPaginatedRequest<GitHubReview>(
      `/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
      { token },
      5,
    ),
  ]);

  const result: PRCommentsResult = {
    reviewComments: reviewCommentsResult.data.map(transformReviewComment),
    issueComments: issueCommentsResult.data.map(transformIssueComment),
    reviews: reviewsResult.data.map(transformReview),
  };

  await setCached(cacheKeyStr, result, 'prComments');
  return result;
}

// ---------------------------------------------------------------------------
// Write functions
// ---------------------------------------------------------------------------

interface CreateReviewCommentBody {
  body: string;
  commit_id: string;
  path: string;
  line: number;
  side?: 'LEFT' | 'RIGHT';
}

interface ReplyToCommentBody {
  body: string;
}

/**
 * Post a new inline review comment on a specific line.
 */
export async function postReviewComment(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
  params: {
    body: string;
    commitId: string;
    path: string;
    line: number;
    side?: 'LEFT' | 'RIGHT';
  },
): Promise<PRComment> {
  const requestBody: CreateReviewCommentBody = {
    body: params.body,
    commit_id: params.commitId,
    path: params.path,
    line: params.line,
    side: params.side,
  };

  const { data } = await githubPost<CreateReviewCommentBody, GitHubReviewComment>(
    `/repos/${owner}/${repo}/pulls/${prNumber}/comments`,
    requestBody,
    { token },
  );

  // Invalidate cache so fresh data is fetched on next read
  await invalidatePR(owner, repo, prNumber);

  return transformReviewComment(data);
}

/**
 * Reply to an existing review comment thread.
 */
export async function replyToReviewComment(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
  commentId: number,
  body: string,
): Promise<PRComment> {
  const { data } = await githubPost<ReplyToCommentBody, GitHubReviewComment>(
    `/repos/${owner}/${repo}/pulls/${prNumber}/comments/${commentId}/replies`,
    { body },
    { token },
  );

  await invalidatePR(owner, repo, prNumber);
  return transformReviewComment(data);
}

/**
 * Post a top-level issue comment on the PR conversation.
 */
export async function postIssueComment(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
  body: string,
): Promise<PRComment> {
  const { data } = await githubPost<{ body: string }, GitHubIssueComment>(
    `/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    { body },
    { token },
  );

  await invalidatePR(owner, repo, prNumber);
  return transformIssueComment(data);
}

/**
 * Submit a PR review (approve, request changes, or comment).
 */
export async function submitReview(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
  params: {
    body?: string;
    event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
  },
): Promise<PRReview> {
  const { data } = await githubPost<
    { body?: string; event: string },
    GitHubReview
  >(
    `/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
    { body: params.body, event: params.event },
    { token },
  );

  await invalidatePR(owner, repo, prNumber);
  return transformReview(data);
}
