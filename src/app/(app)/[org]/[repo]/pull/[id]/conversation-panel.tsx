'use client';

import { X } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { PRConversation } from '@/features/comments/components/pr-conversation';

interface ConversationPanelProps {
  org: string;
  repo: string;
  prNumber: number;
}

/**
 * Right-side collapsible panel that wraps PRConversation.
 * Positioned alongside the diff viewer in the PR page layout.
 */
export function ConversationPanel({
  org,
  repo,
  prNumber,
}: ConversationPanelProps) {
  const setConversationOpen = useUIStore((s) => s.setConversationOpen);

  return (
    <aside className="flex w-[380px] shrink-0 flex-col border-l border-zinc-800/60 bg-zinc-950">
      {/* Panel header */}
      <div className="flex h-10 items-center justify-between border-b border-zinc-800/60 px-4">
        <span className="text-[13px] font-medium text-zinc-400">
          Conversation
        </span>
        <button
          onClick={() => setConversationOpen(false)}
          className="flex size-6 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
          aria-label="Close conversation panel"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* PRConversation handles its own scroll + sticky form */}
      <PRConversation
        org={org}
        repo={repo}
        prNumber={prNumber}
        className="min-h-0 flex-1"
      />
    </aside>
  );
}
