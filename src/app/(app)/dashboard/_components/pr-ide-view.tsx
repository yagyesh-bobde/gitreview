'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChevronDown,
  Filter,
  RefreshCw,
  Settings,
  User,
  Eye,
  AlignLeft,
} from 'lucide-react';
import type { PullRequest, PullRequestState } from '@/types/pr';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Relative time (short format for IDE view)
// ---------------------------------------------------------------------------

const UNITS: [string, number][] = [
  ['yr', 31_536_000],
  ['mo', 2_592_000],
  ['wk', 604_800],
  ['d', 86_400],
  ['hr', 3_600],
  ['min', 60],
  ['sec', 1],
];

function shortRelativeTime(dateStr: string): string {
  const elapsed = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (elapsed < 5) return 'now';
  for (const [unit, seconds] of UNITS) {
    const count = Math.floor(elapsed / seconds);
    if (count >= 1) return `${count}${unit} ago`;
  }
  return 'now';
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SidebarFilter = 'created' | 'review' | 'all';
type SortKey = 'updated' | 'created' | 'title';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Check if a PR was updated within the last 7 days */
function isRecentlyUpdated(dateStr: string): boolean {
  const diff = Date.now() - new Date(dateStr).getTime();
  return diff < 7 * 24 * 60 * 60 * 1000;
}

/** Group PRs by org, returning { org, repos: { name, prs[] }[] }[] */
function groupByOrg(prs: PullRequest[]) {
  const orgMap = new Map<string, Map<string, PullRequest[]>>();
  for (const pr of prs) {
    const org = pr.base.repo.owner;
    const repo = pr.base.repo.name;
    if (!orgMap.has(org)) orgMap.set(org, new Map());
    const repoMap = orgMap.get(org)!;
    if (!repoMap.has(repo)) repoMap.set(repo, []);
    repoMap.get(repo)!.push(pr);
  }
  return Array.from(orgMap.entries()).map(([org, repoMap]) => ({
    org,
    repos: Array.from(repoMap.entries()).map(([name, repoPrs]) => ({ name, prs: repoPrs })),
    prCount: Array.from(repoMap.values()).reduce((acc, r) => acc + r.length, 0),
    hasRecent: Array.from(repoMap.values()).some((repoPrs) =>
      repoPrs.some((pr) => isRecentlyUpdated(pr.updatedAt)),
    ),
  }));
}

function sortPRs(prs: PullRequest[], sort: SortKey): PullRequest[] {
  const sorted = [...prs];
  switch (sort) {
    case 'updated':
      return sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    case 'created':
      return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    case 'title':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    default:
      return sorted;
  }
}

// ---------------------------------------------------------------------------
// Status badge (compact, IDE style)
// ---------------------------------------------------------------------------

const STATE_STYLES: Record<string, string> = {
  draft: 'bg-zinc-700/40 text-zinc-400 border-zinc-600/30',
  open: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  merged: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  closed: 'bg-red-500/10 text-red-400 border-red-500/20',
};

function CompactBadge({ state, draft }: { state: PullRequestState; draft: boolean }) {
  const key = draft ? 'draft' : state;
  const label = draft ? 'draft' : state;
  return (
    <span
      className={cn(
        'text-[10px] px-1.5 py-0.5 rounded font-mono font-medium border shrink-0',
        STATE_STYLES[key],
      )}
    >
      {label}
    </span>
  );
}

function ReviewBadge() {
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium border shrink-0 bg-blue-500/10 text-blue-400 border-blue-500/20">
      review
    </span>
  );
}

// ---------------------------------------------------------------------------
// Activity dot
// ---------------------------------------------------------------------------

function ActivityDot({ active }: { active: boolean }) {
  return (
    <div
      className={cn(
        'size-1.5 rounded-full shrink-0',
        active ? 'bg-emerald-500 shadow-[0_0_6px_rgba(34,197,94,0.7)]' : 'bg-zinc-700',
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

interface SidebarProps {
  prs: PullRequest[];
  currentUser?: string;
  activeFilter: SidebarFilter;
  setActiveFilter: (f: SidebarFilter) => void;
  selectedRepo: string | null;
  setSelectedRepo: (r: string | null) => void;
  createdCount: number;
  reviewCount: number;
}

function Sidebar({
  prs,
  activeFilter,
  setActiveFilter,
  selectedRepo,
  setSelectedRepo,
  createdCount,
  reviewCount,
}: SidebarProps) {
  const orgGroups = useMemo(() => groupByOrg(prs), [prs]);

  const filters: { key: SidebarFilter; label: string; count: number; icon: typeof User }[] = [
    { key: 'created', label: 'Created by me', count: createdCount, icon: User },
    { key: 'review', label: 'Review requested', count: reviewCount, icon: Eye },
    { key: 'all', label: 'All open', count: prs.length, icon: AlignLeft },
  ];

  return (
    <aside className="w-56 shrink-0 border-r border-zinc-800/60 bg-zinc-950 flex-col overflow-hidden hidden sm:flex">
      {/* Filters section */}
      <div className="px-3 pt-3 pb-1">
        <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest px-1 mb-1.5 font-mono">
          Filters
        </p>
        {filters.map((f) => {
          const Icon = f.icon;
          const isActive = activeFilter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => {
                setActiveFilter(f.key);
                setSelectedRepo(null);
              }}
              className={cn(
                'w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-xs font-mono transition-colors',
                isActive
                  ? 'bg-orange-500/10 text-orange-400'
                  : 'text-zinc-500 hover:bg-white/[0.04]',
              )}
            >
              <Icon
                className={cn('size-3.5 shrink-0', isActive ? 'text-orange-400' : 'text-zinc-600')}
              />
              <span className={isActive ? 'text-orange-400' : ''}>{f.label}</span>
              <span className="ml-auto text-[10px] bg-zinc-800 text-zinc-500 rounded px-1.5 py-0.5 font-mono">
                {f.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mx-3 my-2 border-t border-zinc-800/50" />

      {/* Repositories section */}
      <div className="px-3 pb-2 flex-1 overflow-y-auto">
        <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest px-1 mb-1.5 font-mono">
          Repositories
        </p>

        {orgGroups.map((group) => (
          <div key={group.org} className="mb-1">
            <button
              onClick={() => setSelectedRepo(null)}
              className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-white/[0.04] transition-colors"
            >
              <ActivityDot active={group.hasRecent} />
              <span className="text-zinc-400 font-mono truncate flex-1">{group.org}</span>
              <span className="text-[10px] text-zinc-600 font-mono">{group.prCount}</span>
            </button>
            <div className="pl-5 space-y-0.5">
              {group.repos.map((repo) => {
                const fullName = `${group.org}/${repo.name}`;
                const isSelected = selectedRepo === fullName;
                return (
                  <button
                    key={fullName}
                    onClick={() => setSelectedRepo(isSelected ? null : fullName)}
                    className={cn(
                      'w-full text-left flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono transition-colors',
                      isSelected
                        ? 'bg-orange-500/10 text-orange-400'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900',
                    )}
                  >
                    <svg
                      className="size-3 text-zinc-700 shrink-0"
                      fill="currentColor"
                      viewBox="0 0 16 16"
                    >
                      <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 010-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9z" />
                    </svg>
                    {repo.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom sidebar */}
      <div className="border-t border-zinc-800/50 px-3 py-2">
        <button className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-xs font-mono text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.04] transition-colors">
          <Settings className="size-3.5 shrink-0" />
          Settings
        </button>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// PR Row (IDE style)
// ---------------------------------------------------------------------------

interface IDERowProps {
  pr: PullRequest;
  isSelected: boolean;
  onClick: () => void;
  showReviewBadge: boolean;
}

function IDERow({ pr, isSelected, onClick, showReviewBadge }: IDERowProps) {
  const owner = pr.base.repo.owner;
  const repo = pr.base.repo.name;
  const href = `/${owner}/${repo}/pull/${pr.number}`;
  const isRecent = isRecentlyUpdated(pr.updatedAt);

  return (
    <Link
      href={href}
      onClick={(e) => {
        // Allow ctrl/cmd click to open in new tab
        if (e.metaKey || e.ctrlKey) return;
        onClick();
      }}
      className={cn(
        'flex items-center gap-4 px-4 py-3 cursor-pointer transition-[background,border-color] duration-100 border-l-2 border-b border-b-zinc-800/30',
        isSelected
          ? 'bg-orange-500/[0.08] border-l-orange-500'
          : 'border-l-transparent hover:bg-white/[0.035] hover:border-l-zinc-700',
      )}
    >
      {/* Activity dot */}
      <div className="shrink-0">
        <ActivityDot active={isRecent} />
      </div>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span
            className={cn(
              'text-sm font-medium truncate',
              isSelected ? 'text-zinc-100' : 'text-zinc-300',
            )}
          >
            {pr.title}
          </span>
          <CompactBadge state={pr.state} draft={pr.draft} />
          {showReviewBadge && <ReviewBadge />}
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-600">
          <span className={isSelected ? 'text-orange-400/70' : 'text-zinc-500'}>
            #{pr.number}
          </span>
          <span className="text-zinc-700">·</span>
          <span className="truncate">
            {owner}/{repo}
          </span>
        </div>
      </div>

      {/* Repository column */}
      <div className="w-36 hidden md:block shrink-0">
        <span className="text-xs font-mono text-zinc-500 truncate block">{repo}</span>
      </div>

      {/* Author */}
      <div className="w-20 hidden lg:block shrink-0">
        <div className="flex items-center gap-1.5">
          <Image
            src={pr.author.avatarUrl}
            alt={pr.author.login}
            width={16}
            height={16}
            className="rounded-full shrink-0"
          />
          <span className="text-xs font-mono text-zinc-500 truncate">
            {pr.author.login.length > 9 ? pr.author.login.slice(0, 9) : pr.author.login}
          </span>
        </div>
      </div>

      {/* Updated */}
      <div className="w-24 shrink-0 text-right">
        <span className={cn('text-xs font-mono', isRecent ? 'text-zinc-500' : 'text-zinc-600')}>
          {shortRelativeTime(pr.updatedAt)}
        </span>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Section divider
// ---------------------------------------------------------------------------

function SectionDivider({ label, count }: { label: string; count: number }) {
  return (
    <div className="px-4 py-2 bg-zinc-900/40 border-t border-b border-zinc-800/50 flex items-center gap-2">
      <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{label}</span>
      <span className="text-[10px] font-mono text-zinc-700 bg-zinc-800 rounded px-1.5">{count}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status bar
// ---------------------------------------------------------------------------

interface StatusBarProps {
  openCount: number;
  repoCount: number;
  userName?: string;
}

function StatusBar({ openCount, repoCount, userName }: StatusBarProps) {
  return (
    <footer
      className="shrink-0 bg-[#0d0d0f] border-t border-zinc-800/70 h-6 flex items-center px-3 gap-4 select-none"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="flex items-center gap-1 text-[11px] font-mono text-zinc-600 px-1.5">
          <div className="size-1.5 bg-emerald-500 rounded-full" />
          Connected
        </span>
        <span className="text-[11px] font-mono text-zinc-600 px-1.5 hidden sm:block">
          {openCount} open PR{openCount !== 1 ? 's' : ''}
        </span>
        <span className="text-[11px] font-mono text-zinc-600 px-1.5 hidden md:block">
          {repoCount} repo{repoCount !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-[11px] font-mono text-zinc-600 px-1.5 hidden lg:block">
          Last synced: just now
        </span>
        {userName && (
          <span className="text-[11px] font-mono text-zinc-600 px-1.5">{userName}</span>
        )}
      </div>
    </footer>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

export function IDEViewSkeleton() {
  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar skeleton */}
        <aside className="w-56 shrink-0 border-r border-zinc-800/60 bg-zinc-950 hidden sm:flex flex-col p-3 space-y-3">
          <div className="h-3 w-12 animate-pulse rounded bg-zinc-800" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-7 animate-pulse rounded bg-zinc-800/60" />
          ))}
          <div className="border-t border-zinc-800/50 pt-3">
            <div className="h-3 w-20 animate-pulse rounded bg-zinc-800 mb-2" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-6 animate-pulse rounded bg-zinc-800/40 mb-1" />
            ))}
          </div>
        </aside>

        {/* Main panel skeleton */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b border-zinc-800/70 px-4 py-2.5 flex items-center gap-3">
            <div className="h-4 w-28 animate-pulse rounded bg-zinc-800" />
            <div className="h-5 w-16 animate-pulse rounded bg-zinc-800/60" />
            <div className="flex-1" />
            <div className="h-6 w-20 animate-pulse rounded bg-zinc-800/40" />
          </div>
          <div className="border-b border-zinc-800/50 px-4 py-1.5 flex items-center gap-4">
            {[16, 80, 128, 80, 96].map((w, i) => (
              <div key={i} className="h-3 animate-pulse rounded bg-zinc-800/40" style={{ width: w }} />
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-4 border-b border-zinc-800/30">
                <div className="size-1.5 animate-pulse rounded-full bg-zinc-800" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-48 animate-pulse rounded bg-zinc-800" />
                  <div className="h-3 w-36 animate-pulse rounded bg-zinc-800/60" />
                </div>
                <div className="hidden md:block h-3 w-28 animate-pulse rounded bg-zinc-800/40" />
                <div className="hidden lg:block h-3 w-16 animate-pulse rounded bg-zinc-800/40" />
                <div className="h-3 w-16 animate-pulse rounded bg-zinc-800/40" />
              </div>
            ))}
          </div>
        </main>
      </div>
      {/* Status bar skeleton */}
      <div className="h-6 bg-[#0d0d0f] border-t border-zinc-800/70" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface PRIDEViewProps {
  prs: PullRequest[];
  currentUser?: string;
}

export function PRIDEView({ prs, currentUser }: PRIDEViewProps) {
  const [activeFilter, setActiveFilter] = useState<SidebarFilter>('all');
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [selectedPR, setSelectedPR] = useState<number | null>(null);
  const [sort, setSort] = useState<SortKey>('updated');

  // Derived data
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
    switch (activeFilter) {
      case 'created':
        base = createdByMe;
        break;
      case 'review':
        base = reviewRequested;
        break;
      default:
        base = prs;
    }
    if (selectedRepo) {
      base = base.filter(
        (pr) => `${pr.base.repo.owner}/${pr.base.repo.name}` === selectedRepo,
      );
    }
    return sortPRs(base, sort);
  }, [prs, createdByMe, reviewRequested, activeFilter, selectedRepo, sort]);

  // For "All" view, split into created + review sections
  const showSections = activeFilter === 'all' && !selectedRepo;
  const createdSection = showSections ? filteredPRs.filter((pr) => currentUser && pr.author.login === currentUser) : [];
  const reviewSection = showSections
    ? filteredPRs.filter(
        (pr) => !currentUser || pr.author.login !== currentUser,
      )
    : [];

  const openCount = prs.filter((pr) => pr.state === 'open').length;
  const uniqueRepos = new Set(prs.map((pr) => `${pr.base.repo.owner}/${pr.base.repo.name}`));

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'updated', label: 'sort: updated' },
    { key: 'created', label: 'sort: created' },
    { key: 'title', label: 'sort: title' },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          prs={prs}
          currentUser={currentUser}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          selectedRepo={selectedRepo}
          setSelectedRepo={setSelectedRepo}
          createdCount={createdByMe.length}
          reviewCount={reviewRequested.length}
        />

        {/* Main panel */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Panel toolbar */}
          <div className="bg-[#111113] border-b border-zinc-800/70 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-zinc-200 font-mono">pull-requests</h2>
              <span className="text-xs font-mono text-zinc-600 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                {filteredPRs.length} open
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="appearance-none bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-mono rounded pl-2.5 pr-6 py-1 hover:border-zinc-700 focus:outline-none cursor-pointer transition-colors"
                >
                  {sortOptions.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 size-2.5 text-zinc-600 pointer-events-none" />
              </div>
              <button className="flex items-center gap-1.5 text-xs font-mono text-zinc-500 hover:text-zinc-300 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded px-2.5 py-1 transition-colors">
                <Filter className="size-3" />
                filter
              </button>
              <button className="text-xs font-mono text-zinc-500 hover:text-zinc-300 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded px-2.5 py-1 transition-colors flex items-center gap-1.5">
                <RefreshCw className="size-3" />
                sync
              </button>
            </div>
          </div>

          {/* Column headers */}
          <div className="bg-zinc-950 border-b border-zinc-800/50 px-4 py-1.5 flex items-center gap-4 shrink-0">
            <div className="w-4 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-mono font-semibold text-zinc-600 uppercase tracking-wider">
                Title
              </span>
            </div>
            <div className="w-36 hidden md:block shrink-0">
              <span className="text-[10px] font-mono font-semibold text-zinc-600 uppercase tracking-wider">
                Repository
              </span>
            </div>
            <div className="w-20 hidden lg:block shrink-0">
              <span className="text-[10px] font-mono font-semibold text-zinc-600 uppercase tracking-wider">
                Author
              </span>
            </div>
            <div className="w-24 shrink-0 text-right">
              <span className="text-[10px] font-mono font-semibold text-zinc-600 uppercase tracking-wider">
                Updated
              </span>
            </div>
          </div>

          {/* PR table */}
          <div className="flex-1 overflow-y-auto">
            {filteredPRs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500">
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
                <p className="text-sm font-mono">No matching pull requests</p>
              </div>
            ) : showSections ? (
              <>
                {createdSection.length > 0 && (
                  <>
                    <SectionDivider label="created by me" count={createdSection.length} />
                    {createdSection.map((pr) => (
                      <IDERow
                        key={pr.id}
                        pr={pr}
                        isSelected={selectedPR === pr.id}
                        onClick={() => setSelectedPR(pr.id)}
                        showReviewBadge={false}
                      />
                    ))}
                  </>
                )}
                {reviewSection.length > 0 && (
                  <>
                    <SectionDivider label="review requested" count={reviewSection.length} />
                    {reviewSection.map((pr) => (
                      <IDERow
                        key={pr.id}
                        pr={pr}
                        isSelected={selectedPR === pr.id}
                        onClick={() => setSelectedPR(pr.id)}
                        showReviewBadge
                      />
                    ))}
                  </>
                )}
              </>
            ) : (
              filteredPRs.map((pr) => (
                <IDERow
                  key={pr.id}
                  pr={pr}
                  isSelected={selectedPR === pr.id}
                  onClick={() => setSelectedPR(pr.id)}
                  showReviewBadge={pr.reviewers.length > 0}
                />
              ))
            )}
          </div>
        </main>
      </div>

      {/* Status bar */}
      <StatusBar
        openCount={openCount}
        repoCount={uniqueRepos.size}
        userName={currentUser}
      />
    </div>
  );
}
