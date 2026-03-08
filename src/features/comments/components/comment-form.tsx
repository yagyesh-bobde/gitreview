'use client';

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type KeyboardEvent,
  type ChangeEvent,
} from 'react';
import { Send, Eye, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { CommentBody } from './comment-body';

type Tab = 'write' | 'preview';

interface CommentFormProps {
  onSubmit: (body: string) => void | Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  /** Initial value for editing existing comments */
  initialValue?: string;
  /** Compact mode for inline diff comment forms */
  compact?: boolean;
  /** Button label override (default: "Comment") */
  submitLabel?: string;
}

/**
 * Markdown comment editor with write/preview tabs,
 * auto-resizing textarea, and Cmd+Enter submit.
 */
export function CommentForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
  placeholder = 'Leave a comment...',
  autoFocus = false,
  initialValue = '',
  compact = false,
  submitLabel = 'Comment',
}: CommentFormProps) {
  const [body, setBody] = useState(initialValue);
  const [activeTab, setActiveTab] = useState<Tab>('write');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea to fit content
  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(compact ? 60 : 80, Math.min(el.scrollHeight, 400))}px`;
  }, [compact]);

  useEffect(() => {
    resizeTextarea();
  }, [body, resizeTextarea]);

  // Focus textarea on mount if autoFocus
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      setBody(e.target.value);
    },
    [],
  );

  const handleSubmit = useCallback(async () => {
    const trimmed = body.trim();
    if (!trimmed || isSubmitting) return;
    await onSubmit(trimmed);
    setBody('');
    setActiveTab('write');
  }, [body, isSubmitting, onSubmit]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Cmd+Enter or Ctrl+Enter to submit
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const isEmpty = body.trim().length === 0;

  return (
    <div
      className={cn(
        'rounded-lg border border-zinc-700/50 bg-zinc-900/80 transition-colors focus-within:border-zinc-600',
        compact && 'rounded-md',
      )}
    >
      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-zinc-700/40">
        <button
          type="button"
          onClick={() => setActiveTab('write')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
            activeTab === 'write'
              ? 'border-b-2 border-emerald-500 text-zinc-200'
              : 'text-zinc-500 hover:text-zinc-300',
          )}
        >
          <Pencil className="size-3" />
          Write
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
            activeTab === 'preview'
              ? 'border-b-2 border-emerald-500 text-zinc-200'
              : 'text-zinc-500 hover:text-zinc-300',
          )}
        >
          <Eye className="size-3" />
          Preview
        </button>
      </div>

      {/* Content area */}
      <div className={cn('p-2', compact && 'p-1.5')}>
        {activeTab === 'write' ? (
          <textarea
            ref={textareaRef}
            value={body}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isSubmitting}
            className={cn(
              'w-full resize-none bg-transparent text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none',
              compact ? 'min-h-[60px] p-1.5' : 'min-h-[64px] p-2',
            )}
            aria-label="Comment body"
          />
        ) : (
          <div
            className={cn(
              compact ? 'min-h-[60px] p-1.5' : 'min-h-[64px] p-2',
            )}
          >
            {isEmpty ? (
              <p className="text-sm italic text-zinc-500">
                Nothing to preview
              </p>
            ) : (
              <CommentBody body={body} compact={compact} />
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className={cn(
          'flex items-center justify-between border-t border-zinc-700/40 px-2.5 py-1.5',
          compact && 'px-1.5 py-1',
        )}
      >
        <span className="text-[11px] text-zinc-500">
          <kbd className="rounded bg-zinc-800/80 px-1 py-0.5 font-mono text-[10px] text-zinc-400">
            {typeof navigator !== 'undefined' &&
            navigator.platform?.includes('Mac')
              ? '\u2318'
              : 'Ctrl'}
            +Enter
          </kbd>
        </span>

        <div className="flex items-center gap-1.5">
          {onCancel && (
            <Button
              variant="ghost"
              size="xs"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button
            size="xs"
            onClick={handleSubmit}
            disabled={isEmpty}
            loading={isSubmitting}
          >
            <Send className="size-3" data-icon="inline-start" />
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
