'use client';

import { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import {
  ChevronDown,
  ChevronUp,
  CornerDownRight,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { CommentThread as CommentThreadType } from '../types';
import type { PRComment } from '@/types/pr';
import { CommentBody } from './comment-body';
import { CommentForm } from './comment-form';

// ---------------------------------------------------------------------------
// Relative time helper (no deps)
// ---------------------------------------------------------------------------

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
// Single comment
// ---------------------------------------------------------------------------

interface CommentItemProps {
  comment: PRComment;
  isReply?: boolean;
  compact?: boolean;
}

function CommentItem({ comment, isReply = false, compact = false }: CommentItemProps) {
  return (
    <div className={cn('flex gap-2.5', isReply && 'pl-4')}>
      {/* Avatar */}
      <div className="shrink-0 pt-0.5">
        {comment.author.avatarUrl ? (
          <Image
            src={comment.author.avatarUrl}
            alt={comment.author.login}
            width={compact ? 20 : 24}
            height={compact ? 20 : 24}
            className={cn(
              'rounded-full',
              compact ? 'size-5' : 'size-6',
            )}
          />
        ) : (
          <div
            className={cn(
              'flex items-center justify-center rounded-full bg-zinc-800 text-[10px] font-medium text-zinc-400',
              compact ? 'size-5' : 'size-6',
            )}
          >
            {comment.author.login[0]?.toUpperCase()}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-300">
            {comment.author.login}
          </span>
          <time
            dateTime={comment.createdAt}
            className="text-[11px] text-zinc-600"
            title={new Date(comment.createdAt).toLocaleString()}
          >
            {timeAgo(comment.createdAt)}
          </time>
        </div>
        <div className="mt-0.5">
          <CommentBody body={comment.body} compact={compact} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Thread component
// ---------------------------------------------------------------------------

/** Number of hidden comments before we show a collapse toggle */
const COLLAPSE_THRESHOLD = 3;

interface CommentThreadProps {
  thread: CommentThreadType;
  /** Called when user submits a reply */
  onReply?: (threadId: number, body: string) => void | Promise<void>;
  isReplying?: boolean;
  /** Compact mode for inline diff threads */
  compact?: boolean;
  className?: string;
}

export function CommentThread({
  thread,
  onReply,
  isReplying = false,
  compact = false,
  className,
}: CommentThreadProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(
    thread.comments.length > COLLAPSE_THRESHOLD,
  );

  const { visibleComments, hiddenCount } = useMemo(() => {
    const total = thread.comments.length;
    if (!isCollapsed || total <= COLLAPSE_THRESHOLD) {
      return { visibleComments: thread.comments, hiddenCount: 0 };
    }
    // Show first and last comment, hide middle ones
    return {
      visibleComments: [
        thread.comments[0],
        thread.comments[total - 1],
      ],
      hiddenCount: total - 2,
    };
  }, [thread.comments, isCollapsed]);

  const handleReply = useCallback(
    async (body: string) => {
      if (!onReply) return;
      await onReply(thread.id, body);
      setShowReplyForm(false);
    },
    [onReply, thread.id],
  );

  return (
    <div
      className={cn(
        'space-y-2.5',
        compact ? 'py-2 px-2.5' : 'py-3 px-3',
        className,
      )}
    >
      {/* First comment (always visible) */}
      <CommentItem comment={visibleComments[0]} compact={compact} />

      {/* Collapsed middle indicator */}
      {isCollapsed && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="ml-8 flex items-center gap-1.5 rounded px-2 py-1 text-[11px] text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
        >
          <ChevronDown className="size-3" />
          Show {hiddenCount} hidden{' '}
          {hiddenCount === 1 ? 'reply' : 'replies'}
        </button>
      )}

      {/* Middle comments (when expanded) */}
      {!isCollapsed &&
        thread.comments.slice(1, -1).map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            isReply
            compact={compact}
          />
        ))}

      {/* Last comment (if more than one, always visible) */}
      {visibleComments.length > 1 && (
        <CommentItem
          comment={visibleComments[visibleComments.length - 1]}
          isReply
          compact={compact}
        />
      )}

      {/* Collapse toggle (when expanded and there are enough comments) */}
      {!isCollapsed && thread.comments.length > COLLAPSE_THRESHOLD && (
        <button
          type="button"
          onClick={() => setIsCollapsed(true)}
          className="ml-8 flex items-center gap-1.5 rounded px-2 py-1 text-[11px] text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
        >
          <ChevronUp className="size-3" />
          Collapse replies
        </button>
      )}

      {/* Reply button / form */}
      {onReply && (
        <div className={cn('ml-8', compact && 'ml-6')}>
          {showReplyForm ? (
            <CommentForm
              onSubmit={handleReply}
              onCancel={() => setShowReplyForm(false)}
              isSubmitting={isReplying}
              placeholder="Write a reply..."
              autoFocus
              compact={compact}
              submitLabel="Reply"
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowReplyForm(true)}
              className="flex items-center gap-1.5 rounded px-2 py-1 text-[11px] text-zinc-500 transition-colors hover:bg-zinc-800/80 hover:text-zinc-300"
            >
              <CornerDownRight className="size-3" />
              Reply
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Standalone single comment (for issue comments, not in a thread)
// ---------------------------------------------------------------------------

interface StandaloneCommentProps {
  comment: PRComment;
  className?: string;
}

export function StandaloneComment({ comment, className }: StandaloneCommentProps) {
  return (
    <div className={cn('py-3 px-3', className)}>
      <CommentItem comment={comment} />
    </div>
  );
}
