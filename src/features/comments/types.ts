import type { PRComment, PRCommentSide } from '@/types/pr';

// ---------------------------------------------------------------------------
// Thread grouping
// ---------------------------------------------------------------------------

/**
 * A thread groups review comments that share the same anchor (path + line + side).
 * The first comment is the root; subsequent ones are replies (via inReplyToId).
 *
 * For PR-level (issue) comments, path/line/side are null -- those are not
 * grouped into threads but returned separately by useComments.
 */
export interface CommentThread {
  /** ID of the root comment (first comment in the thread) */
  id: number;
  /** File path this thread is anchored to (null = PR-level) */
  path: string | null;
  /** Line number in the diff */
  line: number | null;
  /** Which side of the diff */
  side: PRCommentSide | null;
  /** The diff hunk context from the root comment (for code snippet preview) */
  diffHunk: string | null;
  /** All comments in this thread, ordered chronologically */
  comments: PRComment[];
}

// ---------------------------------------------------------------------------
// Pending (unsaved) comment state
// ---------------------------------------------------------------------------

/**
 * Represents a comment the user is composing but hasn't submitted yet.
 * Used to anchor the comment form to a specific diff location.
 */
export interface PendingComment {
  path: string;
  line: number;
  side: PRCommentSide;
  body: string;
}

// ---------------------------------------------------------------------------
// Thread key helpers
// ---------------------------------------------------------------------------

/** Unique string key for a comment thread anchor: "path:line:side" */
export type CommentThreadKey = string;

/** Build a deterministic key for a thread anchor. */
export function threadKey(
  path: string,
  line: number,
  side: PRCommentSide,
): CommentThreadKey {
  return `${path}:${line}:${side}`;
}
