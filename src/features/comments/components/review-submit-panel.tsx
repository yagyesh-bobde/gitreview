'use client';

import { useState, useCallback } from 'react';
import {
  MessageCircle,
  CheckCircle2,
  XCircle,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { CommentBody } from './comment-body';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ReviewAction = 'COMMENT' | 'APPROVE' | 'REQUEST_CHANGES';

interface ReviewOption {
  value: ReviewAction;
  label: string;
  description: string;
  icon: typeof MessageCircle;
  activeClass: string;
}

const REVIEW_OPTIONS: ReviewOption[] = [
  {
    value: 'COMMENT',
    label: 'Comment',
    description: 'Submit general feedback without explicit approval.',
    icon: MessageCircle,
    activeClass: 'border-blue-500/40 bg-blue-500/5 text-blue-400',
  },
  {
    value: 'APPROVE',
    label: 'Approve',
    description: 'Submit feedback and approve merging these changes.',
    icon: CheckCircle2,
    activeClass: 'border-green-500/40 bg-green-500/5 text-green-400',
  },
  {
    value: 'REQUEST_CHANGES',
    label: 'Request changes',
    description: 'Submit feedback that must be addressed before merging.',
    icon: XCircle,
    activeClass: 'border-orange-500/40 bg-orange-500/5 text-orange-400',
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ReviewSubmitPanelProps {
  onSubmit: (action: ReviewAction, body: string) => void | Promise<void>;
  isSubmitting?: boolean;
  /** Number of pending inline comments in this review */
  pendingCommentCount?: number;
  className?: string;
}

/**
 * Panel for submitting a PR review with action selection
 * (Comment, Approve, Request Changes) and optional review body.
 */
export function ReviewSubmitPanel({
  onSubmit,
  isSubmitting = false,
  pendingCommentCount = 0,
  className,
}: ReviewSubmitPanelProps) {
  const [action, setAction] = useState<ReviewAction>('COMMENT');
  const [body, setBody] = useState('');
  const [previewMode, setPreviewMode] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;
    await onSubmit(action, body.trim());
    setBody('');
    setPreviewMode(false);
  }, [action, body, isSubmitting, onSubmit]);

  return (
    <div
      className={cn(
        'rounded-lg border border-zinc-800 bg-zinc-900/50',
        className,
      )}
    >
      {/* Header */}
      <div className="border-b border-zinc-800 px-3 py-2">
        <h3 className="text-xs font-medium text-zinc-300">Submit review</h3>
        {pendingCommentCount > 0 && (
          <p className="mt-0.5 text-[11px] text-zinc-500">
            {pendingCommentCount} pending inline{' '}
            {pendingCommentCount === 1 ? 'comment' : 'comments'}
          </p>
        )}
      </div>

      {/* Review body (optional) */}
      <div className="border-b border-zinc-800 p-3">
        <div className="mb-1.5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPreviewMode(false)}
            className={cn(
              'text-[11px] font-medium transition-colors',
              !previewMode ? 'text-zinc-200' : 'text-zinc-500 hover:text-zinc-300',
            )}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode(true)}
            className={cn(
              'text-[11px] font-medium transition-colors',
              previewMode ? 'text-zinc-200' : 'text-zinc-500 hover:text-zinc-300',
            )}
          >
            Preview
          </button>
        </div>

        {previewMode ? (
          <div className="min-h-[60px] rounded-md border border-zinc-800 bg-zinc-950/50 p-2">
            {body.trim() ? (
              <CommentBody body={body} compact />
            ) : (
              <p className="text-xs italic text-zinc-600">
                Nothing to preview
              </p>
            )}
          </div>
        ) : (
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Leave a comment on this pull request (optional)"
            className="min-h-[60px] w-full resize-none rounded-md border border-zinc-800 bg-zinc-950/50 p-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none"
            disabled={isSubmitting}
          />
        )}
      </div>

      {/* Action radio options */}
      <div className="space-y-1.5 p-3">
        {REVIEW_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isActive = action === option.value;

          return (
            <label
              key={option.value}
              className={cn(
                'flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2 transition-all',
                isActive
                  ? option.activeClass
                  : 'border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300',
              )}
            >
              <input
                type="radio"
                name="review-action"
                value={option.value}
                checked={isActive}
                onChange={() => setAction(option.value)}
                className="sr-only"
              />
              <Icon
                className={cn(
                  'mt-0.5 size-4 shrink-0',
                  isActive ? '' : 'text-zinc-600',
                )}
              />
              <div className="min-w-0">
                <div className="text-xs font-medium">{option.label}</div>
                <div
                  className={cn(
                    'mt-0.5 text-[11px]',
                    isActive ? 'opacity-70' : 'text-zinc-600',
                  )}
                >
                  {option.description}
                </div>
              </div>
            </label>
          );
        })}
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end border-t border-zinc-800 px-3 py-2">
        <Button
          size="sm"
          onClick={handleSubmit}
          loading={isSubmitting}
          className={cn(
            action === 'APPROVE' && 'bg-green-600 hover:bg-green-700',
            action === 'REQUEST_CHANGES' && 'bg-orange-600 hover:bg-orange-700',
          )}
        >
          <Send className="size-3" data-icon="inline-start" />
          Submit review
        </Button>
      </div>
    </div>
  );
}
