'use client';

import { useMemo, useCallback, useState } from 'react';
import Image from 'next/image';
import {
  MessageSquare,
  CheckCircle2,
  XCircle,
  MessageCircle,
  FileCode2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { PRComment, PRReview, ReviewState } from '@/types/pr';
import type { CommentThread as CommentThreadType } from '../types';
import { useComments } from '../hooks/use-comments';
import { usePostIssueComment } from '../hooks/use-post-comment';
import { CommentBody } from './comment-body';
import { CommentForm } from './comment-form';
import { StandaloneComment } from './comment-thread';

// ---------------------------------------------------------------------------
// Timeline entry types
// ---------------------------------------------------------------------------

type TimelineEntry =
  | { type: 'comment'; data: PRComment; sortDate: number }
  | { type: 'review'; data: PRReview; sortDate: number }
  | { type: 'file-comment'; data: CommentThreadType; sortDate: number };

// ---------------------------------------------------------------------------
// Review state badge
// ---------------------------------------------------------------------------

const REVIEW_META: Record<
  ReviewState,
  { icon: typeof CheckCircle2; label: string; className: string }
> = {
  APPROVED: {
    icon: CheckCircle2,
    label: 'approved',
    className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  CHANGES_REQUESTED: {
    icon: XCircle,
    label: 'requested changes',
    className: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  },
  COMMENTED: {
    icon: MessageCircle,
    label: 'reviewed',
    className: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  },
  PENDING: {
    icon: MessageCircle,
    label: 'pending review',
    className: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  },
  DISMISSED: {
    icon: MessageCircle,
    label: 'dismissed review',
    className: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
  },
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000,
  );
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

// ---------------------------------------------------------------------------
// Review event card
// ---------------------------------------------------------------------------

function ReviewCard({ review }: { review: PRReview }) {
  const meta = REVIEW_META[review.state] ?? REVIEW_META.COMMENTED;
  const Icon = meta.icon;

  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="shrink-0 pt-0.5">
          {review.author.avatarUrl ? (
            <Image
              src={review.author.avatarUrl}
              alt={review.author.login}
              width={28}
              height={28}
              className="size-7 rounded-full ring-1 ring-white/10"
            />
          ) : (
            <div className="flex size-7 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-medium text-zinc-400 ring-1 ring-white/10">
              {review.author.login[0]?.toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[13px] font-medium text-zinc-200">
              {review.author.login}
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                meta.className,
              )}
            >
              <Icon className="size-2.5" />
              {meta.label}
            </span>
            {review.submittedAt && (
              <time
                dateTime={review.submittedAt}
                className="text-[11px] text-zinc-500"
                title={new Date(review.submittedAt).toLocaleString()}
              >
                {timeAgo(review.submittedAt)}
              </time>
            )}
          </div>

          {/* Review body */}
          {review.body && (
            <div className="mt-1.5">
              <CommentBody body={review.body} />
            </div>
          )}

          {/* Inline comment count indicator */}
          {review.comments.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-500">
              <MessageSquare className="size-3" />
              {review.comments.length} inline{' '}
              {review.comments.length === 1 ? 'comment' : 'comments'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Diff hunk snippet (compact code preview for file comments)
// ---------------------------------------------------------------------------

/** Max number of trailing lines from the hunk to show in the snippet. */
const HUNK_SNIPPET_MAX_LINES = 4;

/**
 * Parse a raw diff hunk string into renderable lines.
 * Shows only the last N lines so the snippet stays compact and focused on
 * the commented line (which GitHub places at the end of the hunk).
 */
function parseDiffHunkSnippet(
  rawHunk: string,
): { content: string; type: 'add' | 'delete' | 'context' }[] {
  const allLines = rawHunk.split('\n');

  // Drop the @@ header line if present -- we render our own file header
  const codeLines = allLines.filter((l) => !l.startsWith('@@'));

  // Take only the last N lines to keep the snippet compact
  const tail = codeLines.slice(-HUNK_SNIPPET_MAX_LINES);

  return tail.map((line) => {
    if (line.startsWith('+')) return { content: line, type: 'add' as const };
    if (line.startsWith('-')) return { content: line, type: 'delete' as const };
    return { content: line, type: 'context' as const };
  });
}

function DiffHunkSnippet({ hunk, path }: { hunk: string; path: string }) {
  const lines = parseDiffHunkSnippet(hunk);
  if (lines.length === 0) return null;

  const filename = path.split('/').pop() ?? path;

  return (
    <div className="overflow-hidden rounded-t-lg border border-b-0 border-zinc-800/60">
      {/* File header bar */}
      <div className="flex items-center gap-1.5 border-b border-zinc-800/60 bg-zinc-900/80 px-3 py-1.5">
        <FileCode2 className="size-3 shrink-0 text-zinc-500" />
        <span className="truncate font-mono text-[11px] text-zinc-400">
          {filename}
        </span>
      </div>

      {/* Code lines */}
      <div className="overflow-x-auto bg-zinc-950/80 font-mono text-[11px] leading-[18px]">
        {lines.map((line, i) => (
          <div
            key={i}
            className={cn(
              'flex',
              line.type === 'add' && 'bg-emerald-500/8',
              line.type === 'delete' && 'bg-red-500/8',
            )}
          >
            {/* +/- indicator */}
            <span
              className={cn(
                'w-5 shrink-0 select-none text-center',
                line.type === 'add' && 'text-emerald-500/70',
                line.type === 'delete' && 'text-red-500/70',
                line.type === 'context' && 'text-transparent',
              )}
            >
              {line.type === 'add' ? '+' : line.type === 'delete' ? '-' : ' '}
            </span>

            {/* Code content */}
            <span
              className={cn(
                'flex-1 whitespace-pre px-2',
                line.type === 'add' && 'text-emerald-300/90',
                line.type === 'delete' && 'text-red-300/90',
                line.type === 'context' && 'text-zinc-400',
              )}
            >
              {/* Strip the leading +/- from content since we show the indicator separately */}
              {line.content.length > 0 && (line.content[0] === '+' || line.content[0] === '-')
                ? line.content.slice(1)
                : line.content.startsWith(' ')
                  ? line.content.slice(1)
                  : line.content}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// File comment card (inline review comments shown in conversation)
// ---------------------------------------------------------------------------

function FileCommentCard({ thread }: { thread: CommentThreadType }) {
  const rootComment = thread.comments[0];
  if (!rootComment) return null;

  const hasDiffHunk = !!thread.diffHunk && !!thread.path;

  return (
    <div className="px-4 py-3">
      {/* Diff hunk code preview (when available) */}
      {hasDiffHunk ? (
        <div className="mb-0">
          <DiffHunkSnippet hunk={thread.diffHunk!} path={thread.path!} />
        </div>
      ) : (
        /* Fallback: file context badge (no hunk data) */
        <div className="mb-2 flex items-center gap-1.5">
          <FileCode2 className="size-3 text-zinc-500" />
          <span className="truncate font-mono text-[11px] text-zinc-500">
            {thread.path}
          </span>
          {thread.line && (
            <span className="shrink-0 text-[11px] text-zinc-600">
              :{thread.line}
            </span>
          )}
        </div>
      )}

      {/* Comments in the thread */}
      <div
        className={cn(
          'space-y-2.5 border border-zinc-800/60 bg-zinc-900/40 p-3',
          hasDiffHunk ? 'rounded-b-lg' : 'rounded-lg',
        )}
      >
        {thread.comments.map((comment, i) => (
          <div key={comment.id} className={cn('flex items-start gap-2.5', i > 0 && 'border-t border-zinc-800/40 pt-2.5')}>
            <div className="shrink-0 pt-0.5">
              {comment.author.avatarUrl ? (
                <Image
                  src={comment.author.avatarUrl}
                  alt={comment.author.login}
                  width={24}
                  height={24}
                  className="size-6 rounded-full ring-1 ring-white/10"
                />
              ) : (
                <div className="flex size-6 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-medium text-zinc-400">
                  {comment.author.login[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-zinc-200">
                  {comment.author.login}
                </span>
                <time
                  dateTime={comment.createdAt}
                  className="text-[11px] text-zinc-500"
                  title={new Date(comment.createdAt).toLocaleString()}
                >
                  {timeAgo(comment.createdAt)}
                </time>
              </div>
              <div className="mt-0.5">
                <CommentBody body={comment.body} compact />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PRConversation panel
// ---------------------------------------------------------------------------

interface PRConversationProps {
  org: string;
  repo: string;
  prNumber: number;
  className?: string;
}

/**
 * Full PR conversation timeline.
 * Renders issue comments, review events, and file comments in chronological
 * order with a sticky comment form at the bottom.
 */
export function PRConversation({
  org,
  repo,
  prNumber,
  className,
}: PRConversationProps) {
  const { issueComments, reviews, threads, isLoading, error } = useComments(
    org,
    repo,
    prNumber,
  );

  const postComment = usePostIssueComment(org, repo, prNumber);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Build chronological timeline from issue comments + reviews + file comments
  const timeline = useMemo<TimelineEntry[]>(() => {
    const entries: TimelineEntry[] = [];

    for (const comment of issueComments) {
      entries.push({
        type: 'comment',
        data: comment,
        sortDate: new Date(comment.createdAt).getTime(),
      });
    }

    for (const review of reviews) {
      if (review.state === 'PENDING') continue;
      if (!review.body && review.comments.length === 0) continue;

      entries.push({
        type: 'review',
        data: review,
        sortDate: review.submittedAt
          ? new Date(review.submittedAt).getTime()
          : 0,
      });
    }

    // Include inline file comment threads
    for (const thread of threads) {
      if (thread.comments.length === 0) continue;
      entries.push({
        type: 'file-comment',
        data: thread,
        sortDate: new Date(thread.comments[0].createdAt).getTime(),
      });
    }

    entries.sort((a, b) => a.sortDate - b.sortDate);
    return entries;
  }, [issueComments, reviews, threads]);

  const handleNewComment = useCallback(
    async (body: string) => {
      setSubmitError(null);
      try {
        await postComment.mutateAsync(body);
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : 'Failed to post comment',
        );
      }
    },
    [postComment],
  );

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          'flex flex-1 flex-col items-center justify-center py-12',
          className,
        )}
      >
        <Loader2 className="size-5 animate-spin text-zinc-500" />
        <p className="mt-2 text-xs text-zinc-500">Loading conversation...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={cn(
          'flex flex-1 flex-col items-center justify-center gap-2 py-12',
          className,
        )}
      >
        <AlertCircle className="size-5 text-red-400" />
        <p className="text-xs text-zinc-400">Failed to load comments</p>
        <p className="text-[11px] text-zinc-600">{error.message}</p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-1 flex-col', className)}>
      {/* Scrollable timeline */}
      <div className="flex-1 overflow-y-auto">
        {timeline.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="flex size-10 items-center justify-center rounded-full bg-zinc-800/50">
              <MessageSquare className="size-5 text-zinc-600" />
            </div>
            <p className="mt-3 text-[13px] text-zinc-500">No comments yet</p>
            <p className="mt-0.5 text-[11px] text-zinc-600">
              Start the conversation below
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/40">
            {timeline.map((entry) => {
              if (entry.type === 'comment') {
                return (
                  <StandaloneComment
                    key={`c-${entry.data.id}`}
                    comment={entry.data}
                  />
                );
              }
              if (entry.type === 'file-comment') {
                return (
                  <FileCommentCard
                    key={`fc-${entry.data.id}`}
                    thread={entry.data}
                  />
                );
              }
              return (
                <ReviewCard key={`r-${entry.data.id}`} review={entry.data} />
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky comment form at bottom */}
      <div className="shrink-0 border-t border-zinc-800/60 bg-zinc-950/90 p-3 backdrop-blur-sm">
        {submitError && (
          <div className="mb-2 flex items-center gap-1.5 rounded-md bg-red-500/10 px-2.5 py-1.5 text-xs text-red-400">
            <AlertCircle className="size-3 shrink-0" />
            {submitError}
          </div>
        )}
        <CommentForm
          onSubmit={handleNewComment}
          isSubmitting={postComment.isPending}
          placeholder="Leave a comment..."
        />
      </div>
    </div>
  );
}
