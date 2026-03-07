'use client';

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { cn } from '@/lib/utils';
import { useShortcutsModal, useCurrentScope } from './keyboard-provider';
import { getShortcutsByScope, type Shortcut } from './shortcuts';

// ---------------------------------------------------------------------------
// Group shortcuts by category for display
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<Shortcut['category'], string> = {
  navigation: 'Navigation',
  view: 'View',
  help: 'Help',
};

const CATEGORY_ORDER: Shortcut['category'][] = ['navigation', 'view', 'help'];

function groupByCategory(shortcuts: Shortcut[]) {
  const groups: { category: Shortcut['category']; items: Shortcut[] }[] = [];

  for (const cat of CATEGORY_ORDER) {
    const items = shortcuts.filter((s) => s.category === cat);
    if (items.length > 0) {
      groups.push({ category: cat, items });
    }
  }

  return groups;
}

// ---------------------------------------------------------------------------
// Shortcuts Modal
// ---------------------------------------------------------------------------

export function ShortcutsModal() {
  const { isShortcutsModalOpen, setShortcutsModalOpen } = useShortcutsModal();
  const scope = useCurrentScope();

  const activeShortcuts = getShortcutsByScope(scope);
  const groups = groupByCategory(activeShortcuts);

  return (
    <DialogPrimitive.Root
      open={isShortcutsModalOpen}
      onOpenChange={setShortcutsModalOpen}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className={cn(
            'fixed inset-0 z-50 bg-black/50',
            'data-open:animate-in data-open:fade-in-0 data-open:duration-100',
            'data-closed:animate-out data-closed:fade-out-0 data-closed:duration-75',
          )}
        />
        <DialogPrimitive.Popup
          className={cn(
            'fixed top-1/2 left-1/2 z-50 w-full max-w-[420px] -translate-x-1/2 -translate-y-1/2',
            'rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/50',
            'outline-none overflow-hidden',
            'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-open:duration-150',
            'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-closed:duration-100',
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-700/80 px-5 py-4">
            <DialogPrimitive.Title className="text-sm font-semibold text-zinc-100">
              Keyboard Shortcuts
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className={cn(
                'rounded-md p-1 text-zinc-500 transition-colors',
                'hover:bg-zinc-800 hover:text-zinc-300',
              )}
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="size-4"
              >
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          <DialogPrimitive.Description className="sr-only">
            A list of all keyboard shortcuts available on this page.
          </DialogPrimitive.Description>

          {/* Shortcut groups */}
          <div className="max-h-[400px] overflow-y-auto px-5 py-3">
            {groups.map((group) => (
              <div key={group.category} className="mb-4 last:mb-0">
                <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  {CATEGORY_LABELS[group.category]}
                </h3>
                <div className="space-y-0.5">
                  {group.items.map((shortcut) => (
                    <div
                      key={shortcut.id}
                      className="flex items-center justify-between rounded-md px-2 py-1.5"
                    >
                      <div>
                        <span className="text-sm text-zinc-200">
                          {shortcut.label}
                        </span>
                        <span className="ml-2 text-xs text-zinc-500">
                          {shortcut.description}
                        </span>
                      </div>
                      <ShortcutBadge display={shortcut.display} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-zinc-700/80 px-5 py-3">
            <p className="text-[11px] text-zinc-500">
              Press{' '}
              <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 text-[10px] font-medium">
                ?
              </kbd>{' '}
              to toggle this dialog
            </p>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ---------------------------------------------------------------------------
// Shortcut badge (reusable)
// ---------------------------------------------------------------------------

export function ShortcutBadge({
  display,
  className,
}: {
  display: string;
  className?: string;
}) {
  // Split display like "⌘P" into individual keys
  const keys = display.match(/[⌘⇧⌥⌃]|[A-Za-z0-9?]/g) ?? [display];

  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {keys.map((key, i) => (
        <kbd
          key={i}
          className={cn(
            'inline-flex items-center justify-center rounded border border-zinc-700 bg-zinc-800',
            'px-1.5 py-0.5 text-[11px] font-medium leading-none text-zinc-400',
            'min-w-[20px] text-center',
          )}
        >
          {key}
        </kbd>
      ))}
    </span>
  );
}
