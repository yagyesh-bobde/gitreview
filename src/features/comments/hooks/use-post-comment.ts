'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { PRComment, PRReview, PRCommentSide } from '@/types/pr';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

/** Shape returned by the comments API route on POST */
interface CommentMutationResponse {
  comment: PRComment;
}

interface ReviewMutationResponse {
  review: PRReview;
}

/** Cached query data shape (matches the GET response) */
interface CommentsCache {
  reviewComments: PRComment[];
  issueComments: PRComment[];
  reviews: PRReview[];
}

function commentsQueryKey(org: string, repo: string, prNumber: number) {
  return ['pr-comments', org, repo, prNumber] as const;
}

// ---------------------------------------------------------------------------
// usePostIssueComment
// ---------------------------------------------------------------------------

/**
 * Post a top-level PR conversation comment.
 */
export function usePostIssueComment(
  org: string,
  repo: string,
  prNumber: number,
) {
  const queryClient = useQueryClient();
  const key = commentsQueryKey(org, repo, prNumber);

  return useMutation({
    mutationFn: async (body: string): Promise<PRComment> => {
      const res = await fetch(
        `/api/github/${org}/${repo}/pull/${prNumber}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? 'Failed to post comment');
      }
      const data: CommentMutationResponse = await res.json();
      return data.comment;
    },
    onSuccess: (newComment) => {
      queryClient.setQueryData<CommentsCache>(key, (old) => {
        if (!old) return old;
        return {
          ...old,
          issueComments: [...old.issueComments, newComment],
        };
      });
    },
  });
}

// ---------------------------------------------------------------------------
// usePostReviewComment
// ---------------------------------------------------------------------------

interface PostReviewCommentParams {
  body: string;
  commitId: string;
  path: string;
  line: number;
  side?: PRCommentSide;
}

/**
 * Post a new inline review comment on a specific diff line.
 */
export function usePostReviewComment(
  org: string,
  repo: string,
  prNumber: number,
) {
  const queryClient = useQueryClient();
  const key = commentsQueryKey(org, repo, prNumber);

  return useMutation({
    mutationFn: async (params: PostReviewCommentParams): Promise<PRComment> => {
      const res = await fetch(
        `/api/github/${org}/${repo}/pull/${prNumber}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? 'Failed to post review comment');
      }
      const data: CommentMutationResponse = await res.json();
      return data.comment;
    },
    onSuccess: (newComment) => {
      queryClient.setQueryData<CommentsCache>(key, (old) => {
        if (!old) return old;
        return {
          ...old,
          reviewComments: [...old.reviewComments, newComment],
        };
      });
    },
  });
}

// ---------------------------------------------------------------------------
// useReplyToComment
// ---------------------------------------------------------------------------

interface ReplyToCommentParams {
  commentId: number;
  body: string;
}

/**
 * Reply to an existing review comment thread.
 */
export function useReplyToComment(
  org: string,
  repo: string,
  prNumber: number,
) {
  const queryClient = useQueryClient();
  const key = commentsQueryKey(org, repo, prNumber);

  return useMutation({
    mutationFn: async (params: ReplyToCommentParams): Promise<PRComment> => {
      const res = await fetch(
        `/api/github/${org}/${repo}/pull/${prNumber}/comments/${params.commentId}/replies`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: params.body }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? 'Failed to reply to comment');
      }
      const data: CommentMutationResponse = await res.json();
      return data.comment;
    },
    onSuccess: (newComment) => {
      queryClient.setQueryData<CommentsCache>(key, (old) => {
        if (!old) return old;
        return {
          ...old,
          reviewComments: [...old.reviewComments, newComment],
        };
      });
    },
  });
}

// ---------------------------------------------------------------------------
// useSubmitReview
// ---------------------------------------------------------------------------

interface SubmitReviewParams {
  event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
  body?: string;
}

/**
 * Submit a PR review (approve, request changes, or comment).
 */
export function useSubmitReview(
  org: string,
  repo: string,
  prNumber: number,
) {
  const queryClient = useQueryClient();
  const key = commentsQueryKey(org, repo, prNumber);

  return useMutation({
    mutationFn: async (params: SubmitReviewParams): Promise<PRReview> => {
      const res = await fetch(
        `/api/github/${org}/${repo}/pull/${prNumber}/reviews`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? 'Failed to submit review');
      }
      const data: ReviewMutationResponse = await res.json();
      return data.review;
    },
    onSuccess: (newReview) => {
      queryClient.setQueryData<CommentsCache>(key, (old) => {
        if (!old) return old;
        return {
          ...old,
          reviews: [...old.reviews, newReview],
        };
      });
    },
  });
}
