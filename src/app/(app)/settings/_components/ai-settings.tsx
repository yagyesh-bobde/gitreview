'use client';

import { useState, type FormEvent } from 'react';
import { Check, ExternalLink, Eye, EyeOff, KeyRound, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import { useTypesafeKey } from '@/features/ai-priority/hooks/use-typesafe-key';
import { usePriorityStatus } from '@/features/ai-priority/hooks/use-file-priority';
import { BucketMarker } from '@/features/ai-priority/components/priority-file-list';
import {
  PRIORITY_BUCKETS,
  PRIORITY_BUCKET_META,
  PRIORITY_MIN_FILES,
} from '@/features/ai-priority/lib/priority';

const TYPESAFE_CONSOLE_URL = 'https://console.typesafe.ai';

/**
 * AI panel for the settings page: explains AI file priority, shows whether
 * the free demo run is still available, and manages the user's own TypeSafe
 * key (kept only in this browser's localStorage).
 */
export function AISettings() {
  return (
    <section>
      <div>
        <h2 className="text-lg font-semibold">AI</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Let TypeSafe AI sort big pull requests by review risk.
        </p>
      </div>

      <div className="mt-4 divide-y divide-border rounded-lg border">
        <div className="px-4 py-3">
          <p className="text-sm font-medium">AI file priority</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pull requests with {PRIORITY_MIN_FILES}+ changed files open in a Priority view that
            groups files by how carefully they need reviewing, with tests and docs set aside. Switch
            to Files anytime for the full tree.
          </p>
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Priority buckets">
            {PRIORITY_BUCKETS.map((bucket) => (
              <li
                key={bucket}
                title={PRIORITY_BUCKET_META[bucket].hint}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-300"
              >
                <BucketMarker bucket={bucket} />
                {PRIORITY_BUCKET_META[bucket].label}
              </li>
            ))}
          </ul>
        </div>

        <AutoRunRow />
        <DemoStatusRow />
        <ApiKeyRow />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// AutoRunRow
// ---------------------------------------------------------------------------

function AutoRunRow() {
  const autoRun = useUIStore((s) => s.aiPriorityAutoRun);
  const setAutoRun = useUIStore((s) => s.setAiPriorityAutoRun);

  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Run automatically</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Prioritize eligible pull requests as soon as you open them. When off, start a run from
          the Priority tab with Prioritize with AI.
        </p>
      </div>
      <Toggle checked={autoRun} onChange={setAutoRun} label="Run AI priority automatically" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// DemoStatusRow
// ---------------------------------------------------------------------------

function DemoStatusRow() {
  const status = usePriorityStatus();

  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Free demo</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          One AI prioritization on us, used on the first eligible PR prioritized without your own
          key.
        </p>
      </div>
      {status.isPending ? (
        <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Loading" />
      ) : status.data ? (
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
            status.data.demoAvailable
              ? 'bg-green-500/10 text-green-500'
              : 'bg-zinc-800 text-muted-foreground',
          )}
        >
          {status.data.demoAvailable && <Check className="size-3" />}
          {status.data.demoAvailable ? 'Available' : 'Used'}
        </span>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ApiKeyRow — save / replace / remove the browser-stored key
// ---------------------------------------------------------------------------

function ApiKeyRow() {
  const { apiKey, saveKey, removeKey } = useTypesafeKey();
  const [isReplacing, setIsReplacing] = useState(false);
  const [draft, setDraft] = useState('');
  const [revealed, setRevealed] = useState(false);

  const showForm = !apiKey || isReplacing;

  const resetForm = () => {
    setDraft('');
    setRevealed(false);
    setIsReplacing(false);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    saveKey(draft);
    resetForm();
  };

  return (
    <div className="px-4 py-3">
      <p className="text-sm font-medium">TypeSafe API key</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Keeps AI priority on after the demo. Get a key from{' '}
        <a
          href={TYPESAFE_CONSOLE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-foreground underline-offset-2 hover:underline"
        >
          console.typesafe.ai
          <ExternalLink className="size-3" />
        </a>
        .
      </p>

      {showForm ? (
        <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Input
              type={revealed ? 'text' : 'password'}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Paste your TypeSafe API key"
              aria-label="TypeSafe API key"
              autoComplete="off"
              spellCheck={false}
              autoFocus={isReplacing}
              className="pr-8 font-mono"
            />
            <button
              type="button"
              onClick={() => setRevealed((r) => !r)}
              aria-label={revealed ? 'Hide key' : 'Show key'}
              className="absolute right-1 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </button>
          </div>
          <Button type="submit" size="sm" disabled={!draft.trim()}>
            Save
          </Button>
          {isReplacing && (
            <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </form>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg border border-input px-2.5 dark:bg-input/30">
            <KeyRound className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="font-mono text-sm tracking-wider">••••{apiKey.slice(-4)}</span>
            <span className="ml-auto inline-flex items-center gap-1 text-xs text-green-500">
              <Check className="size-3" />
              Saved
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsReplacing(true)}>
            Replace
          </Button>
          <Button variant="destructive" size="sm" onClick={removeKey}>
            Remove
          </Button>
        </div>
      )}

      <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
        <Lock className="mt-0.5 size-3 shrink-0" />
        <span>
          Stored only in this browser. It’s sent with each prioritization request through
          GitReview’s server to TypeSafe, and is never stored or logged by GitReview.
        </span>
      </p>
    </div>
  );
}
