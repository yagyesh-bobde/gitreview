'use client';

import { MessageSquareX } from 'lucide-react';
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
    <aside className="flex w-[380px] shrink-0 flex-col border-l border-zinc-800 bg-zinc-950">
      {/* Panel header */}
      <div className="flex h-10 items-center justify-between border-b border-zinc-800 px-3">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Conversation
        </span>
        <button
          onClick={() => setConversationOpen(false)}
          className="flex size-6 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
          aria-label="Close conversation panel"
        >
          <MessageSquareX className="size-3.5" />
        </button>
      </div>

      {/* Scrollable conversation content */}
      <div className="flex-1 overflow-y-auto">
        <PRConversation org={org} repo={repo} prNumber={prNumber} />
      </div>
    </aside>
  );
}
