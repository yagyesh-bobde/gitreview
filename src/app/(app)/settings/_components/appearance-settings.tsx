'use client';

import { Folder } from 'lucide-react';
import { useUIStore, ACCENT_THEMES, type AccentTheme } from '@/stores/ui-store';
import { cn } from '@/lib/utils';

const ACCENT_LABELS: Record<AccentTheme, { name: string; description: string }> = {
  green: { name: 'Brand green', description: 'Matches the GitReview logo' },
  neutral: { name: 'Neutral', description: 'Untinted greys, white highlight' },
  blue: { name: 'Editor blue', description: 'Familiar VS Code / GitHub feel' },
};

/**
 * Appearance / review preferences panel for the settings page.
 * Exposes the accent theme picker and the scroll-to-top button toggle.
 */
export function AppearanceSettings() {
  const scrollToTopEnabled = useUIStore((s) => s.scrollToTopEnabled);
  const setScrollToTopEnabled = useUIStore((s) => s.setScrollToTopEnabled);
  const accentTheme = useUIStore((s) => s.accentTheme);
  const setAccentTheme = useUIStore((s) => s.setAccentTheme);

  return (
    <section>
      <div>
        <h2 className="text-lg font-semibold">Appearance</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Customize how the review experience looks and behaves.
        </p>
      </div>

      <div className="mt-4 divide-y divide-border rounded-lg border">
        <div className="px-4 py-3">
          <p className="text-sm font-medium">Accent theme</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Colors muted text, folder icons and hovered or selected rows.
          </p>
          <div role="radiogroup" aria-label="Accent theme" className="mt-3 grid gap-2 sm:grid-cols-3">
            {ACCENT_THEMES.map((theme) => (
              <AccentOption
                key={theme}
                theme={theme}
                selected={accentTheme === theme}
                onSelect={() => setAccentTheme(theme)}
              />
            ))}
          </div>
        </div>
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
// AccentOption — radio card with a live preview of the theme's tokens
// ---------------------------------------------------------------------------

interface AccentOptionProps {
  theme: AccentTheme;
  selected: boolean;
  onSelect: () => void;
}

function AccentOption({ theme, selected, onSelect }: AccentOptionProps) {
  const { name, description } = ACCENT_LABELS[theme];

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-accent={theme}
      onClick={onSelect}
      className={cn(
        'rounded-lg border p-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent',
        selected ? 'border-ui-accent' : 'border-zinc-800 hover:border-zinc-700',
      )}
    >
      {/* Mini file-tree preview rendered with this theme's tokens */}
      <div className="space-y-0.5 rounded-md bg-zinc-900 p-1.5 font-mono text-[11px]" aria-hidden="true">
        <div className="flex items-center gap-1.5 px-1.5 py-0.5 text-ui-dir">
          <Folder className="size-3 text-ui-icon" />
          src
          <span className="ml-auto text-ui-muted">±41</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-sm border-l-2 border-ui-accent bg-ui-selected px-1.5 py-0.5 text-white">
          index.ts
        </div>
        <div className="flex items-center gap-1.5 rounded-sm bg-ui-hover px-1.5 py-0.5 text-ui-dir">
          utils.ts
        </div>
      </div>
      <p className="mt-2 text-sm font-medium">{name}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </button>
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
