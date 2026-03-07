'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { cn } from '@/lib/utils';
import { useCommandPalette } from './keyboard-provider';
import { useKeyboardNav } from './use-keyboard-nav';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PaletteItem {
  /** Unique id */
  id: string;
  /** Primary display name (filename, PR title) */
  name: string;
  /** Secondary text (file path, repo name) */
  description: string;
  /** Optional icon element */
  icon?: ReactNode;
  /** Optional category label for grouping (e.g. "Recent") */
  group?: string;
}

interface CommandPaletteProps {
  /** Items to search through */
  items: PaletteItem[];
  /** Placeholder text for the search input */
  placeholder?: string;
  /** Called when an item is selected */
  onSelect: (item: PaletteItem) => void;
  /** Optional: IDs of recently viewed items (shown at top when no query) */
  recentIds?: string[];
  /** Optional: empty state message */
  emptyMessage?: string;
}

// ---------------------------------------------------------------------------
// Fuzzy matching
// ---------------------------------------------------------------------------

interface FuzzyMatch {
  item: PaletteItem;
  score: number;
  /** Indices of matched characters in item.name */
  nameIndices: number[];
  /** Indices of matched characters in item.description */
  descIndices: number[];
}

/**
 * Simple fuzzy match that scores based on:
 * - Consecutive character matches (bonus)
 * - Matches at word boundaries (bonus)
 * - Match at start of string (bonus)
 * - Total matched characters
 *
 * Returns null if the query doesn't match.
 */
function fuzzyMatch(
  query: string,
  text: string,
): { score: number; indices: number[] } | null {
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();
  const indices: number[] = [];

  let score = 0;
  let queryIdx = 0;
  let lastMatchIdx = -2;

  for (let i = 0; i < lowerText.length && queryIdx < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIdx]) {
      indices.push(i);

      // Consecutive match bonus
      if (i === lastMatchIdx + 1) {
        score += 5;
      }

      // Word boundary bonus (start of string, after separator)
      if (i === 0 || /[\s\-_./\\]/.test(text[i - 1])) {
        score += 10;
      }

      // Exact case match bonus
      if (text[i] === query[queryIdx]) {
        score += 1;
      }

      score += 1;
      lastMatchIdx = i;
      queryIdx++;
    }
  }

  // All query characters must be found
  if (queryIdx < lowerQuery.length) return null;

  // Penalise long strings slightly (prefer shorter, more precise matches)
  score -= text.length * 0.1;

  return { score, indices };
}

function searchItems(
  items: PaletteItem[],
  query: string,
): FuzzyMatch[] {
  if (!query.trim()) return [];

  const results: FuzzyMatch[] = [];

  for (const item of items) {
    const nameMatch = fuzzyMatch(query, item.name);
    const descMatch = fuzzyMatch(query, item.description);

    if (nameMatch || descMatch) {
      results.push({
        item,
        // Weight name matches more heavily
        score: (nameMatch?.score ?? 0) * 2 + (descMatch?.score ?? 0),
        nameIndices: nameMatch?.indices ?? [],
        descIndices: descMatch?.indices ?? [],
      });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

// ---------------------------------------------------------------------------
// Highlighted text renderer
// ---------------------------------------------------------------------------

function HighlightedText({
  text,
  indices,
  className,
}: {
  text: string;
  indices: number[];
  className?: string;
}) {
  if (indices.length === 0) {
    return <span className={className}>{text}</span>;
  }

  const indexSet = new Set(indices);
  const parts: ReactNode[] = [];
  let currentRun = '';
  let currentIsHighlighted = false;

  for (let i = 0; i <= text.length; i++) {
    const isHighlighted = indexSet.has(i);

    if (i === text.length || isHighlighted !== currentIsHighlighted) {
      if (currentRun) {
        parts.push(
          currentIsHighlighted ? (
            <span key={i} className="text-blue-400 font-medium">
              {currentRun}
            </span>
          ) : (
            <span key={i}>{currentRun}</span>
          ),
        );
      }
      currentRun = '';
      currentIsHighlighted = isHighlighted;
    }

    if (i < text.length) {
      currentRun += text[i];
    }
  }

  return <span className={className}>{parts}</span>;
}

// ---------------------------------------------------------------------------
// Command Palette
// ---------------------------------------------------------------------------

export function CommandPalette({
  items,
  placeholder = 'Search...',
  onSelect,
  recentIds = [],
  emptyMessage = 'No results found.',
}: CommandPaletteProps) {
  const { isPaletteOpen, setPaletteOpen } = useCommandPalette();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Build the displayed list: fuzzy results when there's a query,
  // recent items + all items when empty
  const displayItems = useMemo(() => {
    if (query.trim()) {
      return searchItems(items, query);
    }

    // No query -- show recent items first, then everything else
    const recentSet = new Set(recentIds);
    const recent: FuzzyMatch[] = [];
    const rest: FuzzyMatch[] = [];

    for (const item of items) {
      const match: FuzzyMatch = {
        item,
        score: 0,
        nameIndices: [],
        descIndices: [],
      };

      if (recentSet.has(item.id)) {
        recent.push(match);
      } else {
        rest.push(match);
      }
    }

    // Preserve the order of recentIds
    recent.sort(
      (a, b) => recentIds.indexOf(a.item.id) - recentIds.indexOf(b.item.id),
    );

    return [...recent, ...rest];
  }, [items, query, recentIds]);

  const handleSelect = useCallback(
    (index: number) => {
      const match = displayItems[index];
      if (match) {
        onSelect(match.item);
        setPaletteOpen(false);
      }
    },
    [displayItems, onSelect, setPaletteOpen],
  );

  const handleClose = useCallback(() => {
    setPaletteOpen(false);
  }, [setPaletteOpen]);

  const { selectedIndex, setSelectedIndex, handleKeyDown, listRef } =
    useKeyboardNav({
      itemCount: displayItems.length,
      onSelect: handleSelect,
      onClose: handleClose,
      enabled: isPaletteOpen,
    });

  // Wrap setQuery to also reset selection to top
  const updateQuery = useCallback(
    (value: string) => {
      setQuery(value);
      setSelectedIndex(0);
    },
    [setSelectedIndex],
  );

  // Handle dialog open/close -- reset query and focus input
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        setQuery('');
        setSelectedIndex(0);
      }
      setPaletteOpen(open);
    },
    [setPaletteOpen, setSelectedIndex],
  );

  // Focus input and reset query when palette opens (DOM side effect)
  useEffect(() => {
    if (!isPaletteOpen) return;

    // Small delay to let the dialog mount, then focus and clear
    const t = setTimeout(() => {
      inputRef.current?.focus();
    }, 16);
    return () => clearTimeout(t);
  }, [isPaletteOpen]);

  // Figure out if the first item is "recent" for the section label
  const firstNonRecentIndex = useMemo(() => {
    if (query.trim() || recentIds.length === 0) return -1;
    const recentSet = new Set(recentIds);
    return displayItems.findIndex((m) => !recentSet.has(m.item.id));
  }, [displayItems, recentIds, query]);

  return (
    <DialogPrimitive.Root
      open={isPaletteOpen}
      onOpenChange={handleOpenChange}
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
            'fixed top-[20%] left-1/2 z-50 w-full max-w-[600px] -translate-x-1/2',
            'rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/50',
            'outline-none overflow-hidden',
            'data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-top-2 data-open:duration-150',
            'data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-top-2 data-closed:duration-100',
          )}
          onKeyDown={handleKeyDown}
        >
          <DialogPrimitive.Title className="sr-only">
            Command Palette
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Search and navigate to files or pull requests using the command palette.
          </DialogPrimitive.Description>

          {/* Search input */}
          <div className="flex items-center border-b border-zinc-700/80 px-4">
            <SearchIcon className="mr-3 size-4 shrink-0 text-zinc-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => updateQuery(e.target.value)}
              placeholder={placeholder}
              className={cn(
                'flex-1 bg-transparent py-3.5 text-sm text-zinc-100',
                'placeholder:text-zinc-500 outline-none',
              )}
              spellCheck={false}
              autoComplete="off"
            />
            {query && (
              <button
                onClick={() => updateQuery('')}
                className="ml-2 rounded p-0.5 text-zinc-500 hover:text-zinc-300"
                tabIndex={-1}
              >
                <XIcon className="size-3.5" />
              </button>
            )}
            <kbd className="ml-3 hidden rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 sm:inline-block">
              ESC
            </kbd>
          </div>

          {/* Results list */}
          <div
            ref={listRef}
            className="max-h-[340px] overflow-y-auto overscroll-contain py-1"
          >
            {displayItems.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-zinc-500">
                {query.trim() ? emptyMessage : 'No items available.'}
              </div>
            ) : (
              displayItems.map((match, index) => {
                // Section labels
                const showRecentLabel =
                  !query.trim() &&
                  index === 0 &&
                  recentIds.length > 0 &&
                  new Set(recentIds).has(match.item.id);
                const showAllLabel =
                  !query.trim() && index === firstNonRecentIndex;

                return (
                  <div key={match.item.id}>
                    {showRecentLabel && (
                      <SectionLabel>Recent</SectionLabel>
                    )}
                    {showAllLabel && <SectionLabel>All</SectionLabel>}
                    <button
                      data-palette-item
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-2 text-left transition-colors',
                        index === selectedIndex
                          ? 'bg-zinc-800 text-zinc-100'
                          : 'text-zinc-300 hover:bg-zinc-800/60',
                      )}
                      onClick={() => handleSelect(index)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      {/* Icon */}
                      {match.item.icon && (
                        <span className="flex size-5 shrink-0 items-center justify-center text-zinc-500">
                          {match.item.icon}
                        </span>
                      )}

                      {/* Name + description */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <HighlightedText
                            text={match.item.name}
                            indices={match.nameIndices}
                            className="truncate text-sm font-medium"
                          />
                          <HighlightedText
                            text={match.item.description}
                            indices={match.descIndices}
                            className="truncate text-xs text-zinc-500"
                          />
                        </div>
                      </div>

                      {/* Selection indicator */}
                      {index === selectedIndex && (
                        <kbd className="shrink-0 rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 text-[10px] text-zinc-500">
                          Enter
                        </kbd>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer hint */}
          <div className="flex items-center gap-4 border-t border-zinc-700/80 px-4 py-2 text-[11px] text-zinc-500">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 text-[10px]">
                ↑↓
              </kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 text-[10px]">
                ↵
              </kbd>
              open
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 text-[10px]">
                esc
              </kbd>
              close
            </span>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ---------------------------------------------------------------------------
// Internal components
// ---------------------------------------------------------------------------

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
      {children}
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  );
}
