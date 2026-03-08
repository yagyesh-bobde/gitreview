'use client';

import { useCallback, useState } from 'react';
import Image from 'next/image';
import { MessageSquare, ChevronRight } from 'lucide-react';
import type { CommentThread as CommentThreadType } from '@/features/comments/types';
import { threadKey } from '@/features/comments/types';
import { CommentThread } from '@/features/comments/components/comment-thread';
import { useReplyToComment } from '@/features/comments/hooks/use-post-comment';
import { useReviewStore } from '@/stores/review-store';

interface InlineCommentThreadProps {
  thread: CommentThreadType;
  org: string;
  repo: string;
  prNumber: number;
}

/**
 * Inline thread displayed between diff lines.
 * Collapsed: avatar + "N comments" summary.
 * Expanded: full thread with reply form.
 */
export function InlineCommentThread({
  thread,
  org,
  repo,
  prNumber,
}: InlineCommentThreadProps) {
  const key =
    thread.path && thread.line && thread.side
      ? threadKey(thread.path, thread.line, thread.side)
      : String(thread.id);

  const openThreads = useReviewStore((s) => s.openCommentThreads);
  const toggleThread = useReviewStore((s) => s.toggleCommentThread);
  const isExpanded = openThreads.has(key);

  const replyMutation = useReplyToComment(org, repo, prNumber);
  const [replyError, setReplyError] = useState<string | null>(null);

  const handleReply = useCallback(
    async (threadId: number, body: string) => {
      setReplyError(null);
      try {
        await replyMutation.mutateAsync({ commentId: threadId, body });
      } catch (err) {
        setReplyError(
          err instanceof Error ? err.message : 'Failed to post reply',
        );
      }
    },
    [replyMutation],
  );

  const rootComment = thread.comments[0];
  const commentCount = thread.comments.length;

  if (!isExpanded) {
    // Collapsed summary
    return (
      <button
        type="button"
        onClick={() => toggleThread(key)}
        className="flex w-full items-center gap-2 border-y border-zinc-800/60 bg-zinc-900/60 px-4 py-1.5 text-left transition-colors hover:bg-zinc-800/60"
      >
        {/* Root author avatar */}
        {rootComment.author.avatarUrl ? (
          <Image
            src={rootComment.author.avatarUrl}
            alt={rootComment.author.login}
            width={18}
            height={18}
            className="size-[18px] rounded-full"
          />
        ) : (
          <div className="flex size-[18px] items-center justify-center rounded-full bg-zinc-800 text-[9px] font-medium text-zinc-400">
            {rootComment.author.login[0]?.toUpperCase()}
          </div>
        )}

        <MessageSquare className="size-3 text-zinc-500" />

        <span className="text-[11px] text-zinc-400">
          <span className="font-medium text-zinc-300">
            {rootComment.author.login}
          </span>
          {commentCount > 1
            ? ` + ${commentCount - 1} ${commentCount === 2 ? 'reply' : 'replies'}`
            : ''}
        </span>

        <span className="ml-auto text-[11px] text-zinc-600 line-clamp-1 max-w-[300px]">
          {rootComment.body.slice(0, 80)}
          {rootComment.body.length > 80 ? '...' : ''}
        </span>

        <ChevronRight className="ml-1 size-3 shrink-0 text-zinc-600" />
      </button>
    );
  }

  // Expanded thread
  return (
    <div className="border-y border-zinc-700/50 bg-zinc-900/80">
      {/* Collapse handle */}
      <button
        type="button"
        onClick={() => toggleThread(key)}
        className="flex w-full items-center gap-1.5 border-b border-zinc-800/50 px-3 py-1 text-[11px] text-zinc-500 transition-colors hover:bg-zinc-800/40 hover:text-zinc-300"
      >
        <ChevronRight className="size-3 rotate-90" />
        {thread.path && (
          <span className="font-mono text-zinc-600">
            {thread.path.split('/').pop()}:{thread.line}
          </span>
        )}
        <span>
          {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
        </span>
      </button>

      {replyError && (
        <div className="mx-3 mt-2 flex items-center gap-1.5 rounded-md bg-red-500/10 px-2.5 py-1.5 text-xs text-red-400">
          {replyError}
        </div>
      )}

      <CommentThread
        thread={thread}
        onReply={handleReply}
        isReplying={replyMutation.isPending}
        compact
      />
    </div>
  );
}
