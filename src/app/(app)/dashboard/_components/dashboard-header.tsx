'use client';

import Link from 'next/link';
import { List, Columns3 } from 'lucide-react';
import { UserMenu } from '@/features/auth/components/user-menu';
import { useUIStore, type DashboardView } from '@/stores/ui-store';
import { useCommandPalette, ShortcutBadge } from '@/features/keyboard';
import { cn } from '@/lib/utils';

function ViewToggle() {
  const dashboardView = useUIStore((s) => s.dashboardView);
  const setDashboardView = useUIStore((s) => s.setDashboardView);

  const views: { key: DashboardView; icon: typeof List; label: string }[] = [
    { key: 'list', icon: List, label: 'List view' },
    { key: 'ide', icon: Columns3, label: 'IDE view' },
  ];

  return (
    <div className="hidden sm:flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
      {views.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          title={label}
          onClick={() => setDashboardView(key)}
          className={cn(
            'p-1.5 rounded-md transition-colors',
            dashboardView === key
              ? 'bg-zinc-800 text-zinc-100'
              : 'text-zinc-500 hover:text-zinc-300',
          )}
        >
          <Icon className="size-3.5" />
        </button>
      ))}
    </div>
  );
}

function SearchTrigger() {
  const { setPaletteOpen } = useCommandPalette();

  return (
    <button
      onClick={() => setPaletteOpen(true)}
      className="flex items-center gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-1.5 text-xs text-zinc-500 transition-colors hover:border-zinc-700 hover:text-zinc-400 group"
    >
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className="size-3.5 shrink-0"
      >
        <path
          fillRule="evenodd"
          d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
          clipRule="evenodd"
        />
      </svg>
      <span className="hidden sm:inline">Search PRs</span>
      <ShortcutBadge display="⌘P" />
    </button>
  );
}

function LogoMark() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <rect width="28" height="28" rx="6" fill="#f97316" />
      <path
        d="M8 8h5l3 4-3 4H8v-3h3.5l1.5-1-1.5-1H8V8z"
        fill="white"
      />
      <path
        d="M20 14c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z"
        fill="white"
      />
    </svg>
  );
}

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        {/* Left: Logo */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 shrink-0 text-zinc-200 transition-colors hover:text-white"
        >
          <LogoMark />
          <span className="font-semibold text-sm tracking-tight">
            GitReview
          </span>
        </Link>

        {/* Center: Search + View Toggle */}
        <div className="flex items-center gap-3">
          <SearchTrigger />
          <ViewToggle />
        </div>

        {/* Right: User menu */}
        <div className="flex items-center shrink-0">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
