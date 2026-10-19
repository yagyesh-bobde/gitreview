'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, X } from 'lucide-react';
import type { FilePriorityState } from '../hooks/use-file-priority';

/**
 * Slim bar shown while — and after — a PR is prioritized with the user's one
 * free demo run, nudging them to add their own TypeSafe key. Renders nothing
 * for own-key or cached results.
 */
export function AIDemoBanner({ state }: { state: FilePriorityState }) {
  const [dismissed, setDismissed] = useState(false);

  const isRunning = state.kind === 'loading' && state.viaDemo;
  const isDone = state.kind === 'ready' && state.source === 'demo';
  if (dismissed || (!isRunning && !isDone)) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative flex min-h-9 shrink-0 items-center justify-center gap-3 border-b border-ui-accent/25 bg-ui-selected py-1.5 pl-4 pr-10 text-xs text-zinc-300"
    >
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-ui-accent/40 bg-ui-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ui-accent-text">
        <Sparkles className={isRunning ? 'size-3 animate-pulse' : 'size-3'} />
        AI Mode Demo
      </span>
      <span className="min-w-0">
        {isRunning
          ? 'Prioritizing this PR’s files with TypeSafe AI using your one free demo run…'
          : 'Files in this PR were prioritized by TypeSafe AI using your one free demo run. Add your own TypeSafe key to keep AI priority on.'}
      </span>
      <Link
        href="/settings?section=ai"
        className="shrink-0 rounded bg-ui-accent/15 px-2.5 py-1 font-medium text-ui-accent-text transition-colors hover:bg-ui-accent/25"
      >
        Add API key
      </Link>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ui-muted transition-colors hover:bg-zinc-800 hover:text-zinc-300"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
