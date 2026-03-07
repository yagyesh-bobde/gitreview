'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronRight, ChevronDown, Filter } from 'lucide-react';
import type { PullRequest, PullRequestState } from '@/types/pr';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Relative time
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
    if (count >= 1) return `${count} ${unit}${count > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FilterTab = 'all' | 'created' | 'review';
type SortKey = 'updated' | 'created' | 'title' | 'repo';

// ---------------------------------------------------------------------------
// Status icon — small green circle with git branch lines (open state)
// ---------------------------------------------------------------------------

function PRStatusIcon({ state, draft }: { state: PullRequestState; draft: boolean }) {
  if (draft) {
    // Draft — grey dashed circle look
    return (
      <svg viewBox="0 0 16 16" fill="currentColor" className="size-4 text-zinc-500">
        <path d="M4.75 7.25a.75.75 0 0 1 .75.75v4.25a.75.75 0 0 1-1.5 0V8a.75.75 0 0 1 .75-.75Zm3.25-2.5a.75.75 0 0 1 .75.75v6.75a.75.75 0 0 1-1.5 0V5.5a.75.75 0 0 1 .75-.75Zm4 5a.75.75 0 0 1 .75.75v1.75a.75.75 0 0 1-1.5 0v-1.75a.75.75 0 0 1 .75-.75Z" />
      </svg>
    );
  }
  if (state === 'merged') {
    return (
      <svg viewBox="0 0 16 16" fill="currentColor" className="size-4 text-purple-400">
        <path d="M5.45 5.154A4.25 4.25 0 0 0 9.25 7.5h1.378a2.251 2.251 0 1 1 0 1.5H9.25A5.734 5.734 0 0 1 5 5.846v4.308a2.25 2.25 0 1 1-1.5 0V5.846A2.25 2.25 0 1 1 5.45 5.154ZM4.25 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0-8.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm8.25 5.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" />
      </svg>
    );
  }
  if (state === 'closed') {
    return (
      <svg viewBox="0 0 16 16" fill="currentColor" className="size-4 text-red-400">
        <path d="M11.28 6.78a.75.75 0 0 0-1.06-1.06L8 7.94 5.78 5.72a.75.75 0 0 0-1.06 1.06L6.94 9l-2.22 2.22a.75.75 0 1 0 1.06 1.06L8 10.06l2.22 2.22a.75.75 0 1 0 1.06-1.06L9.06 9l2.22-2.22Z" />
      </svg>
    );
  }
  // open — the mockup shows a simple git-pr style SVG in emerald
  return (
    <svg
      className="size-4 text-emerald-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const STATE_STYLES: Record<string, string> = {
  draft: 'bg-zinc-700/50 text-zinc-300 border-zinc-600/50',
  open: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  merged: 'bg-purple-500/10 text-purple-400 border-purple-500/25',
  closed: 'bg-red-500/10 text-red-400 border-red-500/25',
};

function StatusBadge({ state, draft }: { state: PullRequestState; draft: boolean }) {
  const key = draft ? 'draft' : state;
  const label = draft ? 'Draft' : state.charAt(0).toUpperCase() + state.slice(1);
  return (
    <span
      className={cn(
        'text-xs px-2 py-0.5 rounded-full font-medium border shrink-0',
        STATE_STYLES[key],
      )}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Sort
// ---------------------------------------------------------------------------

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'updated', label: 'Last updated' },
  { key: 'created', label: 'Date created' },
  { key: 'title', label: 'Title A–Z' },
  { key: 'repo', label: 'Repository' },
];

function sortPRs(prs: PullRequest[], sort: SortKey): PullRequest[] {
  const sorted = [...prs];
  switch (sort) {
    case 'updated':
      return sorted.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    case 'created':
      return sorted.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    case 'title':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case 'repo':
      return sorted.sort((a, b) =>
        a.base.repo.fullName.localeCompare(b.base.repo.fullName),
      );
    default:
      return sorted;
  }
}

// ---------------------------------------------------------------------------
// PR Row
// ---------------------------------------------------------------------------

function PRRow({ pr }: { pr: PullRequest }) {
  const owner = pr.base.repo.owner;
  const repo = pr.base.repo.name;
  const repoFullName = pr.base.repo.fullName || `${owner}/${repo}`;
  const href = `/${owner}/${repo}/pull/${pr.number}`;
  const hasReviewRequested = pr.reviewers.length > 0;

  return (
    <Link
      href={href}
      className="group flex items-center gap-3 sm:gap-4 px-4 py-3.5 cursor-pointer transition-colors hover:bg-white/[0.03] border-b border-white/[0.06] last:border-b-0"
    >
      {/* Status icon */}
      <div className="shrink-0 mt-0.5">
        <PRStatusIcon state={pr.state} draft={pr.draft} />
      </div>

      {/* Title + meta */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-zinc-100 text-sm group-hover:text-orange-400 transition-colors truncate">
            {pr.title}
          </span>
          <StatusBadge state={pr.state} draft={pr.draft} />
          {hasReviewRequested && (
            <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-medium shrink-0">
              Review requested
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs text-zinc-500 font-mono">#{pr.number}</span>
          <span className="text-zinc-700 text-xs">·</span>
          <span className="text-xs text-zinc-500 truncate max-w-xs">
            {repoFullName}
          </span>
          <span className="text-zinc-700 text-xs hidden sm:inline">·</span>
          <span className="text-xs text-zinc-600 hidden sm:inline">
            opened by <span className="text-zinc-500">{pr.author.login}</span>
          </span>
        </div>
      </div>

      {/* Repository column */}
      <div className="w-36 hidden md:flex items-center gap-1.5 shrink-0">
        <svg className="size-3.5 text-zinc-600 shrink-0" fill="currentColor" viewBox="0 0 16 16">
          <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 010-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9z" />
        </svg>
        <span className="text-xs text-zinc-500 font-mono truncate">{repo}</span>
      </div>

      {/* Timestamp */}
      <div className="w-28 shrink-0 text-right hidden lg:block">
        <span className="text-xs text-zinc-500">{relativeTime(pr.updatedAt)}</span>
      </div>

      {/* Chevron */}
      <div className="shrink-0 hidden sm:block w-4">
        <ChevronRight className="size-4 text-zinc-700" />
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

export function ListViewSkeleton() {
  return (
    <div className="mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Heading skeleton */}
      <div className="mb-6">
        <div className="h-6 w-36 animate-pulse rounded bg-zinc-800" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-zinc-800/60" />
      </div>

      {/* Tabs skeleton */}
      <div className="flex items-center gap-4 mb-0">
        {[100, 140, 60].map((w, i) => (
          <div key={i} className="h-9 animate-pulse rounded bg-zinc-800" style={{ width: w }} />
        ))}
      </div>

      {/* List skeleton */}
      <div className="border border-zinc-800 rounded-xl overflow-hidden mt-0">
        <div className="bg-zinc-900/50 border-b border-zinc-800 px-4 py-2.5 flex items-center gap-3 sm:gap-4">
          <div className="w-4 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="h-3 w-24 animate-pulse rounded bg-zinc-800" />
          </div>
          <div className="w-36 hidden md:block shrink-0">
            <div className="h-3 w-16 animate-pulse rounded bg-zinc-800" />
          </div>
          <div className="w-28 shrink-0 text-right hidden lg:block">
            <div className="h-3 w-16 animate-pulse rounded bg-zinc-800 ml-auto" />
          </div>
          <div className="w-4 shrink-0 hidden sm:block" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="px-4 py-3.5 flex items-center gap-3 sm:gap-4 border-b border-white/[0.06] last:border-b-0"
          >
            <div className="size-4 animate-pulse rounded-full bg-zinc-800 shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-4 w-64 animate-pulse rounded bg-zinc-800" />
              <div className="h-3 w-48 animate-pulse rounded bg-zinc-800/60" />
            </div>
            <div className="w-36 hidden md:block shrink-0">
              <div className="h-3 w-20 animate-pulse rounded bg-zinc-800" />
            </div>
            <div className="w-28 shrink-0 text-right hidden lg:block">
              <div className="h-3 w-20 animate-pulse rounded bg-zinc-800 ml-auto" />
            </div>
            <div className="w-4 shrink-0 hidden sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface PRListViewProps {
  prs: PullRequest[];
  /** The username of the currently authenticated user */
  currentUser?: string;
}

export function PRListView({ prs, currentUser }: PRListViewProps) {
  const [filter, setFilter] = useState<FilterTab>('all');
  const [sort, setSort] = useState<SortKey>('updated');

  const createdByMe = useMemo(
    () => prs.filter((pr) => currentUser && pr.author.login === currentUser),
    [prs, currentUser],
  );

  const reviewRequested = useMemo(
    () =>
      prs.filter(
        (pr) =>
          pr.reviewers.some((r) => currentUser && r.login === currentUser) ||
          (currentUser && pr.author.login !== currentUser),
      ),
    [prs, currentUser],
  );

  const filteredPRs = useMemo(() => {
    let base: PullRequest[];
    switch (filter) {
      case 'created':
        base = createdByMe;
        break;
      case 'review':
        base = reviewRequested;
        break;
      default:
        base = prs;
    }
    return sortPRs(base, sort);
  }, [prs, createdByMe, reviewRequested, filter, sort]);

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: prs.length },
    { key: 'created', label: 'Created by me', count: createdByMe.length },
    { key: 'review', label: 'Review requested', count: reviewRequested.length },
  ];

  return (
    <main className="mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Page heading */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-100 mb-1">Pull Requests</h1>
        <p className="text-sm text-zinc-500">
          Track and review open pull requests across your repositories.
        </p>
      </div>

      {/* Controls row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-0">
        {/* Filter tabs */}
        <div className="flex items-center gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                'text-sm font-medium px-4 py-3 transition-colors whitespace-nowrap border-b-2',
                filter === tab.key
                  ? 'text-zinc-100 border-orange-500'
                  : 'text-zinc-500 border-transparent hover:text-zinc-400',
              )}
            >
              {tab.label}
              <span
                className={cn(
                  'ml-1.5 text-xs rounded-full px-2 py-0.5 font-normal bg-zinc-800',
                  filter === tab.key ? 'text-zinc-400' : 'text-zinc-500',
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Sort + Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 hidden sm:inline">Sort by</span>
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="appearance-none bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-md pl-3 pr-8 py-1.5 hover:border-zinc-700 focus:outline-none focus:border-orange-500 cursor-pointer transition-colors"
              style={{ colorScheme: 'dark' }}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key} style={{ backgroundColor: '#18181b' }}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3 text-zinc-500 pointer-events-none" />
          </div>
          <button className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-md px-3 py-1.5 transition-colors">
            <Filter className="size-3.5" />
            Filter
          </button>
        </div>
      </div>

      {/* PR List container */}
      <div className="border border-zinc-800 rounded-xl overflow-hidden">
        {/* Column headers */}
        <div className="bg-zinc-900/50 border-b border-zinc-800 px-4 py-2.5 flex items-center gap-3 sm:gap-4">
          <div className="w-4 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">
              Pull Request
            </span>
          </div>
          <div className="w-36 hidden md:block shrink-0">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Repository</span>
          </div>
          <div className="w-28 shrink-0 text-right hidden lg:block">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Updated</span>
          </div>
          <div className="w-4 shrink-0 hidden sm:block" />
        </div>

        {/* PR rows */}
        {filteredPRs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="size-10 text-zinc-600 mb-3"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
              />
            </svg>
            <p className="text-sm">No pull requests match this filter.</p>
          </div>
        ) : (
          filteredPRs.map((pr) => <PRRow key={pr.id} pr={pr} />)
        )}
      </div>

      {/* Footer meta */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-zinc-600">
          Showing {filteredPRs.length} open pull request{filteredPRs.length !== 1 ? 's' : ''}
        </p>
        <p className="text-xs text-zinc-700">Last synced just now</p>
      </div>
    </main>
  );
}
