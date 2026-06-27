'use client';

import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';

/**
 * Appearance / review preferences panel for the settings page.
 * Currently exposes the scroll-to-top button toggle.
 */
export function AppearanceSettings() {
  const scrollToTopEnabled = useUIStore((s) => s.scrollToTopEnabled);
  const setScrollToTopEnabled = useUIStore((s) => s.setScrollToTopEnabled);

  return (
    <section>
      <div>
        <h2 className="text-lg font-semibold">Appearance</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Customize how the review experience looks and behaves.
        </p>
      </div>

      <div className="mt-4 divide-y divide-border rounded-lg border">
        <div className="flex items-center gap-4 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Scroll-to-top button</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Show a floating button on the review page to quickly return to the top.
            </p>
          </div>
          <Toggle
            checked={scrollToTopEnabled}
            onChange={setScrollToTopEnabled}
            label="Scroll-to-top button"
          />
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Toggle — minimal accessible switch
// ---------------------------------------------------------------------------

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
        checked ? 'bg-green-500' : 'bg-zinc-700',
      )}
    >
      <span
        className={cn(
          'inline-block size-4 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}
