// ---------------------------------------------------------------------------
// Shortcut registry -- single source of truth for all keyboard shortcuts.
// Actions are bound at runtime via KeyboardProvider; this module only
// declares *what* shortcuts exist and *where* they're active.
// ---------------------------------------------------------------------------

export type ShortcutScope = 'global' | 'dashboard' | 'review';

export interface Shortcut {
  /** Unique identifier, e.g. 'command-palette' */
  id: string;
  /**
   * Key combos that trigger this shortcut.
   * Uses the same format as KeyboardEvent.key with modifiers:
   *   Meta+p  (Cmd on Mac)
   *   Control+p  (Ctrl on Windows/Linux)
   * Multiple combos = either can trigger the shortcut.
   */
  keys: string[];
  /** Human-readable label shown in the shortcuts modal */
  label: string;
  /** Brief description of what the shortcut does */
  description: string;
  /** Page scope where the shortcut is active */
  scope: ShortcutScope;
  /** Category for grouping in the help modal */
  category: 'navigation' | 'view' | 'help';
  /** Display string for the key badge, e.g. '⌘P' */
  display: string;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const SHORTCUTS: Shortcut[] = [
  {
    id: 'command-palette',
    keys: ['Meta+p', 'Control+p'],
    label: 'Go to File',
    description: 'Open the command palette to search files or PRs',
    scope: 'global',
    category: 'navigation',
    display: '⌘P',
  },
  {
    id: 'toggle-sidebar',
    keys: ['Meta+b', 'Control+b'],
    label: 'Toggle Sidebar',
    description: 'Show or hide the file tree sidebar',
    scope: 'review',
    category: 'view',
    display: '⌘B',
  },
  {
    id: 'show-shortcuts',
    keys: ['Shift+?'],
    label: 'Keyboard Shortcuts',
    description: 'Show all available keyboard shortcuts',
    scope: 'global',
    category: 'help',
    display: '?',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const shortcutMap = new Map(SHORTCUTS.map((s) => [s.id, s]));

export function getShortcut(id: string): Shortcut | undefined {
  return shortcutMap.get(id);
}

export function getShortcutsByScope(scope: ShortcutScope): Shortcut[] {
  return SHORTCUTS.filter((s) => s.scope === scope || s.scope === 'global');
}

export function getShortcutsByCategory(
  category: Shortcut['category'],
): Shortcut[] {
  return SHORTCUTS.filter((s) => s.category === category);
}

/**
 * Parse a key combo string like "Meta+p" into its components.
 * Returns { meta, ctrl, shift, alt, key } normalised to lowercase key.
 */
export function parseKeyCombo(combo: string) {
  const parts = combo.split('+');
  const key = parts[parts.length - 1].toLowerCase();
  return {
    meta: parts.includes('Meta'),
    ctrl: parts.includes('Control'),
    shift: parts.includes('Shift'),
    alt: parts.includes('Alt'),
    key,
  };
}

/**
 * Check whether a KeyboardEvent matches any of the key combos for a shortcut.
 */
export function matchesShortcut(
  event: KeyboardEvent,
  shortcut: Shortcut,
): boolean {
  return shortcut.keys.some((combo) => {
    const parsed = parseKeyCombo(combo);
    return (
      event.key.toLowerCase() === parsed.key &&
      event.metaKey === parsed.meta &&
      event.ctrlKey === parsed.ctrl &&
      event.shiftKey === parsed.shift &&
      event.altKey === parsed.alt
    );
  });
}
