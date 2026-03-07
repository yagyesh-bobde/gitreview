'use client';

import Link from 'next/link';
import { Bell, List, AlignJustify, LayoutGrid } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useUIStore, type DashboardView } from '@/stores/ui-store';
import { useCommandPalette } from '@/features/keyboard';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Logo
// ---------------------------------------------------------------------------

function LogoMark() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <rect width="28" height="28" rx="6" fill="#f97316" />
      <path d="M8 8h5l3 4-3 4H8v-3h3.5l1.5-1-1.5-1H8V8z" fill="white" />
      <path
        d="M20 14c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z"
        fill="white"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Search trigger — fake input that opens the command palette
// ---------------------------------------------------------------------------

function SearchTrigger() {
  const { setPaletteOpen } = useCommandPalette();

  return (
    <button
      onClick={() => setPaletteOpen(true)}
      aria-label="Search pull requests"
      className="flex flex-1 max-w-xs items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors text-left group"
    >
      <svg
        className="size-3.5 text-zinc-500 shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <span className="text-zinc-500 text-sm flex-1 group-hover:text-zinc-400 transition-colors">
        Search pull requests...
      </span>
      <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-white/[0.12] bg-white/[0.08] px-1.5 py-0.5 text-[11px] font-mono text-zinc-400 leading-none border-b-[2px]">
        <span>⌘</span>
        <span>P</span>
      </kbd>
    </button>
  );
}

// ---------------------------------------------------------------------------
// View toggle — list / compact / grid, wired to dashboardView store
// ---------------------------------------------------------------------------

type ViewEntry = {
  key: DashboardView | 'compact';
  icon: typeof List;
  label: string;
};

function ViewToggle() {
  const dashboardView = useUIStore((s) => s.dashboardView);
  const setDashboardView = useUIStore((s) => s.setDashboardView);

  const views: ViewEntry[] = [
    { key: 'list', icon: List, label: 'List view' },
    { key: 'compact', icon: AlignJustify, label: 'Compact view' },
    { key: 'ide', icon: LayoutGrid, label: 'Grid view' },
  ];

  return (
    <div className="hidden sm:flex items-center bg-zinc-900 border border-zinc-800 rounded-md p-0.5">
      {views.map(({ key, icon: Icon, label }) => {
        // "compact" is not a real store view — treat it as unselected unless
        // neither 'list' nor 'ide' is active (it never will be, so it's always
        // inactive, matching the mockup's decorative third button).
        const isActive = dashboardView === key;
        return (
          <button
            key={key}
            title={label}
            onClick={() => {
              if (key !== 'compact') {
                setDashboardView(key as DashboardView);
              }
            }}
            className={cn(
              'p-1.5 rounded transition-colors',
              isActive
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300',
            )}
          >
            <Icon className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notification bell
// ---------------------------------------------------------------------------

function NotificationBell() {
  return (
    <button
      aria-label="Notifications"
      className="relative p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
    >
      <Bell className="size-5" />
      <span className="absolute top-1 right-1 size-1.5 rounded-full bg-orange-500" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// User avatar — initials in an orange gradient circle, dropdown on click
// ---------------------------------------------------------------------------

function UserAvatar() {
  const { data: session } = useSession();

  const initials = (() => {
    const name = session?.user?.name ?? '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length >= 2) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (parts.length === 1) {
      return parts[0][0].toUpperCase();
    }
    return 'YB';
  })();

  return (
    <div
      title={session?.user?.name ?? 'User'}
      className="size-7 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-xs font-semibold select-none cursor-pointer ring-2 ring-transparent hover:ring-zinc-600 transition-all"
    >
      {initials}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Left: Logo */}
        <Link
          href="/dashboard"
          className="flex items-center gap-3 shrink-0 text-zinc-100 transition-colors hover:text-white"
        >
          <LogoMark />
          <span className="font-semibold text-base tracking-tight">GitReview</span>
        </Link>

        {/* Center: Search */}
        <SearchTrigger />

        {/* Right: View toggles + bell + avatar */}
        <div className="flex items-center gap-2 shrink-0">
          <ViewToggle />
          <NotificationBell />
          <UserAvatar />
        </div>
      </div>
    </header>
  );
}
