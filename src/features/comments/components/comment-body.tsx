'use client';

import { memo } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils/cn';

interface CommentBodyProps {
  body: string;
  className?: string;
  /** Compact mode for inline diff comments (tighter spacing) */
  compact?: boolean;
}

/**
 * Renders a GitHub-flavored markdown comment body with dark theme styling.
 *
 * Supports code blocks, inline code, links, task lists, tables, blockquotes,
 * images, and all standard GFM features.
 */
export const CommentBody = memo(function CommentBody({
  body,
  className,
  compact = false,
}: CommentBodyProps) {
  if (!body.trim()) {
    return (
      <p className={cn('text-sm italic text-zinc-500', className)}>
        No description provided.
      </p>
    );
  }

  return (
    <div
      className={cn(
        'comment-body text-sm text-zinc-200',
        compact ? 'comment-body--compact' : '',
        className,
      )}
    >
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="mb-3 mt-4 border-b border-zinc-800 pb-1.5 text-xl font-semibold text-zinc-100 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-3 mt-4 border-b border-zinc-800 pb-1.5 text-lg font-semibold text-zinc-100 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-3 text-base font-semibold text-zinc-100 first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="mb-2 mt-3 text-sm font-semibold text-zinc-100 first:mt-0">
              {children}
            </h4>
          ),

          // Paragraphs
          p: ({ children }) => (
            <p className="mb-2.5 leading-relaxed last:mb-0">{children}</p>
          ),

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-blue-400 underline underline-offset-2 transition-colors hover:text-blue-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),

          // Code blocks
          pre: ({ children }) => (
            <pre className="my-2.5 overflow-x-auto rounded-md border border-zinc-800 bg-zinc-900 p-3 text-[13px] leading-relaxed">
              {children}
            </pre>
          ),
          code: ({ className: codeClassName, children, ...props }) => {
            // Detect if this is inline code (no language class) vs fenced block
            const isBlock = codeClassName?.startsWith('language-');
            if (isBlock) {
              return (
                <code className={cn('font-mono text-zinc-200', codeClassName)} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code
                className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[13px] text-zinc-300"
                {...props}
              >
                {children}
              </code>
            );
          },

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="my-2.5 border-l-2 border-zinc-700 pl-3 text-zinc-400">
              {children}
            </blockquote>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="mb-2.5 list-disc space-y-1 pl-5 last:mb-0">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2.5 list-decimal space-y-1 pl-5 last:mb-0">
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => {
            // Task list items have a checkbox input
            const className = props.className;
            if (className === 'task-list-item') {
              return (
                <li className="flex list-none items-start gap-2 -ml-5">
                  {children}
                </li>
              );
            }
            return <li className="leading-relaxed">{children}</li>;
          },

          // Task list checkboxes
          input: ({ type, checked, ...props }) => {
            if (type === 'checkbox') {
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                  className="mt-1 size-3.5 rounded border-zinc-600 bg-zinc-800 accent-blue-500"
                  {...props}
                />
              );
            }
            return <input type={type} {...props} />;
          },

          // Tables
          table: ({ children }) => (
            <div className="my-2.5 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-zinc-700 bg-zinc-900/50">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-3 py-1.5 text-left text-xs font-medium text-zinc-400">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-zinc-800/50 px-3 py-1.5 text-zinc-300">
              {children}
            </td>
          ),

          // Horizontal rule
          hr: () => <hr className="my-4 border-zinc-800" />,

          // Images
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={alt ?? ''}
              className="my-2 max-w-full rounded-md border border-zinc-800"
              loading="lazy"
            />
          ),

          // Strikethrough
          del: ({ children }) => (
            <del className="text-zinc-500 line-through">{children}</del>
          ),

          // Strong / em
          strong: ({ children }) => (
            <strong className="font-semibold text-zinc-100">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-zinc-300">{children}</em>,
        }}
      >
        {body}
      </Markdown>
    </div>
  );
});
