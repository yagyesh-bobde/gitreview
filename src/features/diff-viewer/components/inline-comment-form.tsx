'use client';

import { useCallback, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { CommentForm } from '@/features/comments/components/comment-form';
import { usePostReviewComment } from '@/features/comments/hooks/use-post-comment';
import { useReviewStore } from '@/stores/review-store';
import type { PRCommentSide } from '@/types/pr';

interface InlineCommentFormProps {
  path: string;
  line: number;
  side: PRCommentSide;
  commitId: string;
  org: string;
  repo: string;
  prNumber: number;
}

/**
 * Inline comment form rendered between diff lines.
 * Appears when the user clicks "+" on a gutter line.
 * Posts a new review comment and clears the pending anchor on success.
 */
export function InlineCommentForm({
  path,
  line,
  side,
  commitId,
  org,
  repo,
  prNumber,
}: InlineCommentFormProps) {
  const clearPendingCommentAnchor = useReviewStore(
    (s) => s.clearPendingCommentAnchor,
  );
  const postReviewComment = usePostReviewComment(org, repo, prNumber);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (body: string) => {
      setError(null);
      try {
        await postReviewComment.mutateAsync({
          body,
          commitId,
          path,
          line,
          side,
        });
        clearPendingCommentAnchor();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to post comment',
        );
      }
    },
    [postReviewComment, commitId, path, line, side, clearPendingCommentAnchor],
  );

  const handleCancel = useCallback(() => {
    clearPendingCommentAnchor();
  }, [clearPendingCommentAnchor]);

  return (
    <div className="border-y border-blue-500/30 bg-zinc-900/80 px-3 py-2">
      {error && (
        <div className="mb-2 flex items-center gap-1.5 rounded-md bg-red-500/10 px-2.5 py-1.5 text-xs text-red-400">
          <AlertCircle className="size-3 shrink-0" />
          {error}
        </div>
      )}
      <CommentForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={postReviewComment.isPending}
        placeholder="Add a review comment..."
        autoFocus
        compact
        submitLabel="Comment"
      />
    </div>
  );
}
