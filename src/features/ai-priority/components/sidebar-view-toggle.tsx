'use client';

import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FilePriorityState } from '../hooks/use-file-priority';

export type SidebarView = 'priority' | 'files';

const OPTIONS: { value: SidebarView; label: string }[] = [
  { value: 'priority', label: 'Priority' },
  { value: 'files', label: 'Files' },
];

/**
 * Priority is the default whenever AI prioritization is running or has run
 * (including a failed run, so its error is visible); otherwise the plain
 * directory tree.
 */
export function defaultSidebarView(state: FilePriorityState): SidebarView {
  return state.kind === 'loading' || state.kind === 'ready' || state.kind === 'error'
    ? 'priority'
    : 'files';
}

interface SidebarViewToggleProps {
  value: SidebarView;
  onChange: (view: SidebarView) => void;
  /** Pulse the Priority icon while AI results are on the way. */
  isPrioritizing?: boolean;
}

/** Compact segmented "Priority | Files" switch for the review sidebar header. */
export function SidebarViewToggle({ value, onChange, isPrioritizing }: SidebarViewToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Sidebar view"
      className="inline-flex h-6 items-center rounded-md bg-zinc-800/70 p-0.5"
    >
      {OPTIONS.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex h-5 items-center gap-1 rounded px-2 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ui-accent',
              isActive
                ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                : 'text-ui-muted hover:text-zinc-300',
            )}
          >
            {option.value === 'priority' && (
              <Sparkles
                className={cn(
                  'size-3',
                  isActive && 'text-ui-accent-text',
                  isPrioritizing && 'animate-pulse',
                )}
              />
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
