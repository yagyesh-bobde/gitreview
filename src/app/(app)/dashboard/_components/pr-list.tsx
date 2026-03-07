'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePRList } from '@/features/github/hooks/use-pr-list';
import { Button } from '@/components/ui/button';
import type { PullRequest, PullRequestState } from '@/types/pr';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Relative time formatter
// ---------------------------------------------------------------------------

const UNITS: [string, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
  ['second', 1],
];

function relativeTime(dateStr: string): string {
  const elapsed = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (elapsed < 5) return 'just now';

  for (const [unit, seconds] of UNITS) {
    const count = Math.floor(elapsed / seconds);
    if (count >= 1) {
      return `${count} ${unit}${count > 1 ? 's' : ''} ago`;
    }
  }
  return 'just now';
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const STATE_CONFIG: Record<
  PullRequestState | 'draft',
  { label: string; className: string; icon: React.ReactNode }
> = {
  draft: {
    label: 'Draft',
    className: 'bg-zinc-700/50 text-zinc-300',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5">
        <path d="M4.75 7.25a.75.75 0 0 1 .75.75v4.25a.75.75 0 0 1-1.5 0V8a.75.75 0 0 1 .75-.75Zm3.25-2.5a.75.75 0 0 1 .75.75v6.75a.75.75 0 0 1-1.5 0V5.5a.75.75 0 0 1 .75-.75Zm4 5a.75.75 0 0 1 .75.75v1.75a.75.75 0 0 1-1.5 0v-1.75a.75.75 0 0 1 .75-.75Z" />
      </svg>
    ),
  },
  open: {
    label: 'Open',
    className: 'bg-emerald-500/15 text-emerald-400',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5">
        <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
        <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
      </svg>
    ),
  },
  merged: {
    label: 'Merged',
    className: 'bg-purple-500/15 text-purple-400',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5">
        <path d="M5.45 5.154A4.25 4.25 0 0 0 9.25 7.5h1.378a2.251 2.251 0 1 1 0 1.5H9.25A5.734 5.734 0 0 1 5 5.846v4.308a2.25 2.25 0 1 1-1.5 0V5.846A2.25 2.25 0 1 1 5.45 5.154ZM4.25 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0-8.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm8.25 5.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" />
      </svg>
    ),
  },
  closed: {
    label: 'Closed',
    className: 'bg-red-500/15 text-red-400',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5">
        <path d="M11.28 6.78a.75.75 0 0 0-1.06-1.06L8 7.94 5.78 5.72a.75.75 0 0 0-1.06 1.06L6.94 9l-2.22 2.22a.75.75 0 1 0 1.06 1.06L8 10.06l2.22 2.22a.75.75 0 1 0 1.06-1.06L9.06 9l2.22-2.22Z" />
      </svg>
    ),
  },
};

function StatusBadge({ pr }: { pr: PullRequest }) {
  const key = pr.draft ? 'draft' : pr.state;
  const { label, className, icon } = STATE_CONFIG[key];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        className,
      )}
    >
      {icon}
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Stat formatting
// ---------------------------------------------------------------------------

function DiffStats({
  additions,
  deletions,
  changedFiles,
}: {
  additions: number;
  deletions: number;
  changedFiles: number;
}) {
  // Search API often returns 0 for these -- don't render noise
  if (additions === 0 && deletions === 0 && changedFiles === 0) return null;

  return (
    <div className="flex items-center gap-3 text-xs text-zinc-500">
      {changedFiles > 0 && (
        <span className="flex items-center gap-1">
          <svg
            viewBox="0 0 16 16"
            fill="currentColor"
            className="size-3.5 text-zinc-500"
          >
            <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z" />
          </svg>
          {changedFiles}
        </span>
      )}
      {additions > 0 && (
        <span className="text-emerald-500">+{additions.toLocaleString()}</span>
      )}
      {deletions > 0 && (
        <span className="text-red-400">-{deletions.toLocaleString()}</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PR Card
// ---------------------------------------------------------------------------

function PRCard({ pr }: { pr: PullRequest }) {
  const owner = pr.base.repo.owner;
  const repo = pr.base.repo.name;
  const repoFullName = pr.base.repo.fullName || `${owner}/${repo}`;
  const href = `/${owner}/${repo}/pull/${pr.number}`;

  return (
    <Link
      href={href}
      className="group block rounded-lg border border-zinc-800 bg-zinc-900/70 p-4 transition-all hover:border-zinc-700 hover:bg-zinc-900"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {/* Title row */}
          <div className="flex items-center gap-2">
            <StatusBadge pr={pr} />
            <span className="truncate text-sm font-medium text-zinc-100 group-hover:text-white">
              {pr.title}
            </span>
            <span className="shrink-0 text-xs text-zinc-500">
              #{pr.number}
            </span>
          </div>

          {/* Repo + meta row */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
            <span className="font-mono text-zinc-400">{repoFullName}</span>
            <span>opened {relativeTime(pr.createdAt)}</span>
            {pr.updatedAt !== pr.createdAt && (
              <span>updated {relativeTime(pr.updatedAt)}</span>
            )}
          </div>

          {/* Diff stats */}
          <div className="mt-2">
            <DiffStats
              additions={pr.additions}
              deletions={pr.deletions}
              changedFiles={pr.changedFiles}
            />
          </div>
        </div>

        {/* Author avatar */}
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-zinc-500">{pr.author.login}</span>
          <Image
            src={pr.author.avatarUrl}
            alt={pr.author.login}
            width={28}
            height={28}
            className="rounded-full ring-1 ring-zinc-700"
          />
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function PRCardSkeleton() {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-5 w-14 animate-pulse rounded-full bg-zinc-800" />
            <div className="h-4 w-64 animate-pulse rounded bg-zinc-800" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-3 w-32 animate-pulse rounded bg-zinc-800" />
            <div className="h-3 w-24 animate-pulse rounded bg-zinc-800" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-16 animate-pulse rounded bg-zinc-800" />
          <div className="size-7 animate-pulse rounded-full bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <PRCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-800 py-16">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="size-12 text-zinc-600"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
        />
      </svg>
      <h3 className="mt-4 text-sm font-medium text-zinc-300">
        No pull requests
      </h3>
      <p className="mt-1 text-sm text-zinc-500">
        Open PRs you authored or are requested to review will appear here.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-red-900/50 bg-red-950/20 py-12">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="size-10 text-red-400"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
        />
      </svg>
      <h3 className="mt-4 text-sm font-medium text-red-300">
        Failed to load pull requests
      </h3>
      <p className="mt-1 text-sm text-zinc-500">{message}</p>
      <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PRList() {
  const { data: prs, isLoading, error, refetch } = usePRList();

  if (isLoading) return <LoadingSkeleton />;

  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'Unknown error'}
        onRetry={() => refetch()}
      />
    );
  }

  if (!prs || prs.length === 0) return <EmptyState />;

  return (
    <div className="space-y-3">
      {prs.map((pr) => (
        <PRCard key={pr.id} pr={pr} />
      ))}
    </div>
  );
}
