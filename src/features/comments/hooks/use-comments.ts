'use client';

import { useQuery } from '@tanstack/react-query';
import type { PRComment, PRReview } from '@/types/pr';
import type { CommentThread } from '../types';
import { threadKey } from '../types';
import { CACHE_TTL_SECONDS } from '@/config/constants';

// ---------------------------------------------------------------------------
// API response shape (mirrors PRCommentsResult from the server)
// ---------------------------------------------------------------------------

interface CommentsResponse {
  reviewComments: PRComment[];
  issueComments: PRComment[];
  reviews: PRReview[];
}

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

async function fetchComments(
  org: string,
  repo: string,
  prNumber: number,
): Promise<CommentsResponse> {
  const res = await fetch(
    `/api/github/${org}/${repo}/pull/${prNumber}/comments`,
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Failed to fetch comments: ${res.status}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Thread grouping logic
// ---------------------------------------------------------------------------

/**
 * Groups inline review comments into threads.
 *
 * Strategy:
 * 1. Find root comments (those without inReplyToId).
 * 2. Attach replies to their root's thread via inReplyToId lookup.
 * 3. Sort comments within each thread chronologically.
 *
 * This handles GitHub's model where replies reference the root comment's id
 * via inReplyToId and share the same (path, line, side) anchor.
 */
function groupIntoThreads(reviewComments: PRComment[]): CommentThread[] {
  // Map from root comment ID -> thread
  const threadById = new Map<number, CommentThread>();
  // Comments that are replies, to be attached after roots are indexed
  const replies: PRComment[] = [];

  for (const comment of reviewComments) {
    if (comment.inReplyToId === null) {
      // Root comment -- start a new thread
      threadById.set(comment.id, {
        id: comment.id,
        path: comment.path,
        line: comment.line,
        side: comment.side,
        comments: [comment],
      });
    } else {
      replies.push(comment);
    }
  }

  // Attach replies to their root thread
  for (const reply of replies) {
    const thread = threadById.get(reply.inReplyToId!);
    if (thread) {
      thread.comments.push(reply);
    } else {
      // Orphan reply (root not in this page/batch) -- create a standalone thread
      threadById.set(reply.id, {
        id: reply.id,
        path: reply.path,
        line: reply.line,
        side: reply.side,
        comments: [reply],
      });
    }
  }

  // Sort comments within each thread by creation time
  for (const thread of threadById.values()) {
    thread.comments.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }

  // Return threads sorted by first comment's creation time
  return Array.from(threadById.values()).sort(
    (a, b) =>
      new Date(a.comments[0].createdAt).getTime() -
      new Date(b.comments[0].createdAt).getTime(),
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseCommentsResult {
  /** Inline review comment threads, grouped by anchor */
  threads: CommentThread[];
  /** Map from thread key ("path:line:side") to threads at that anchor */
  threadsByAnchor: Map<string, CommentThread[]>;
  /** Top-level PR conversation comments */
  issueComments: PRComment[];
  /** Reviews (approvals, change requests, etc.) */
  reviews: PRReview[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Fetch and structure all comments for a PR.
 *
 * - Groups review comments into threads by (path, line, side) + inReplyToId
 * - Provides a threadsByAnchor map for O(1) lookup by diff position
 * - Separates issue comments and reviews for the conversation view
 */
export function useComments(
  org: string,
  repo: string,
  prNumber: number,
): UseCommentsResult {
  const query = useQuery({
    queryKey: ['pr-comments', org, repo, prNumber],
    queryFn: () => fetchComments(org, repo, prNumber),
    staleTime: CACHE_TTL_SECONDS.prComments * 1000,
    enabled: !!org && !!repo && prNumber > 0,
    retry: (failureCount, error) => {
      if (error.message.includes('401') || error.message.includes('404')) {
        return false;
      }
      return failureCount < 2;
    },
    select: (data) => {
      const threads = groupIntoThreads(data.reviewComments);

      // Build anchor lookup map
      const threadsByAnchor = new Map<string, CommentThread[]>();
      for (const thread of threads) {
        if (thread.path && thread.line && thread.side) {
          const key = threadKey(thread.path, thread.line, thread.side);
          const existing = threadsByAnchor.get(key);
          if (existing) {
            existing.push(thread);
          } else {
            threadsByAnchor.set(key, [thread]);
          }
        }
      }

      return {
        threads,
        threadsByAnchor,
        issueComments: data.issueComments,
        reviews: data.reviews,
      };
    },
  });

  return {
    threads: query.data?.threads ?? [],
    threadsByAnchor: query.data?.threadsByAnchor ?? new Map(),
    issueComments: query.data?.issueComments ?? [],
    reviews: query.data?.reviews ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
