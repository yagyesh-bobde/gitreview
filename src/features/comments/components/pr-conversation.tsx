'use client';

import { useMemo, useCallback } from 'react';
import Image from 'next/image';
import {
  MessageSquare,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { PRComment, PRReview, ReviewState } from '@/types/pr';
import { useComments } from '../hooks/use-comments';
import { CommentBody } from './comment-body';
import { CommentForm } from './comment-form';
import { StandaloneComment } from './comment-thread';

// ---------------------------------------------------------------------------
// Timeline entry types
// ---------------------------------------------------------------------------

type TimelineEntry =
  | { type: 'comment'; data: PRComment; sortDate: number }
  | { type: 'review'; data: PRReview; sortDate: number };

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
    className: 'text-green-400 bg-green-500/10 border-green-500/20',
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
    <div className="px-3 py-3">
      <div className="flex items-start gap-2.5">
        {/* Avatar */}
        <div className="shrink-0 pt-0.5">
          {review.author.avatarUrl ? (
            <Image
              src={review.author.avatarUrl}
              alt={review.author.login}
              width={24}
              height={24}
              className="size-6 rounded-full"
            />
          ) : (
            <div className="flex size-6 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-medium text-zinc-400">
              {review.author.login[0]?.toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-300">
              {review.author.login}
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                meta.className,
              )}
            >
              <Icon className="size-3" />
              {meta.label}
            </span>
            {review.submittedAt && (
              <time
                dateTime={review.submittedAt}
                className="text-[11px] text-zinc-600"
                title={new Date(review.submittedAt).toLocaleString()}
              >
                {timeAgo(review.submittedAt)}
              </time>
            )}
          </div>

          {/* Review body */}
          {review.body && (
            <div className="mt-1">
              <CommentBody body={review.body} />
            </div>
          )}

          {/* Inline comment count indicator */}
          {review.comments.length > 0 && (
            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-zinc-500">
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
 * Renders issue comments and review events in chronological order
 * with a new comment form at the bottom.
 */
export function PRConversation({
  org,
  repo,
  prNumber,
  className,
}: PRConversationProps) {
  const { issueComments, reviews, isLoading, error } = useComments(
    org,
    repo,
    prNumber,
  );

  // Build chronological timeline from issue comments + reviews
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
      // Skip pending reviews and reviews with no body and no comments
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

    entries.sort((a, b) => a.sortDate - b.sortDate);
    return entries;
  }, [issueComments, reviews]);

  const handleNewComment = useCallback(
    async (_body: string) => {
      // TODO: Wire to usePostComment hook when available
      // For now this is a placeholder -- the mutation hook is being built in parallel
      console.warn('Comment submission not yet wired:', _body);
    },
    [],
  );

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-12',
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
          'flex flex-col items-center justify-center gap-2 py-12',
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
    <div className={cn('flex flex-col', className)}>
      {/* Timeline */}
      {timeline.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <MessageSquare className="size-6 text-zinc-700" />
          <p className="mt-2 text-xs text-zinc-500">
            No comments yet. Start the conversation.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/50">
          {timeline.map((entry) => {
            if (entry.type === 'comment') {
              return (
                <StandaloneComment
                  key={`c-${entry.data.id}`}
                  comment={entry.data}
                />
              );
            }
            return (
              <ReviewCard key={`r-${entry.data.id}`} review={entry.data} />
            );
          })}
        </div>
      )}

      {/* New comment form */}
      <div className="border-t border-zinc-800 p-3">
        <CommentForm
          onSubmit={handleNewComment}
          placeholder="Leave a comment..."
        />
      </div>
    </div>
  );
}
