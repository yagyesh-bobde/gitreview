'use client';

import { DashboardPalette } from './dashboard-palette';
import { ShortcutBadge } from '@/features/keyboard';
import { useCommandPalette } from '@/features/keyboard';

/**
 * Client-side keyboard integration for the dashboard page.
 * Renders the command palette and a subtle hint badge.
 */
export function DashboardKeyboard() {
  return (
    <>
      <DashboardPalette />
      <PaletteHint />
    </>
  );
}

function PaletteHint() {
  const { setPaletteOpen } = useCommandPalette();

  return (
    <button
      onClick={() => setPaletteOpen(true)}
      className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:border-zinc-700 hover:text-zinc-400"
    >
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className="size-3.5"
      >
        <path
          fillRule="evenodd"
          d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
          clipRule="evenodd"
        />
      </svg>
      <span>Search PRs</span>
      <ShortcutBadge display="⌘P" />
    </button>
  );
}
