'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  SHORTCUTS,
  matchesShortcut,
  type ShortcutScope,
} from './shortcuts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionHandler = () => void;

interface KeyboardContextValue {
  /** Current active scope (determines which shortcuts fire) */
  scope: ShortcutScope;
  /** Set the active scope -- called by page-level components */
  setScope: (scope: ShortcutScope) => void;
  /** Register an action handler for a shortcut id. Returns unregister fn. */
  registerAction: (shortcutId: string, handler: ActionHandler) => () => void;
  /** Whether the command palette is open */
  isPaletteOpen: boolean;
  /** Toggle command palette visibility */
  setPaletteOpen: (open: boolean) => void;
  /** Whether the shortcuts modal is open */
  isShortcutsModalOpen: boolean;
  /** Toggle shortcuts modal visibility */
  setShortcutsModalOpen: (open: boolean) => void;
}

const KeyboardContext = createContext<KeyboardContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function KeyboardProvider({ children }: { children: ReactNode }) {
  const [scope, setScope] = useState<ShortcutScope>('global');
  const [isPaletteOpen, setPaletteOpen] = useState(false);
  const [isShortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  // Map of shortcut id -> action handler. Using a ref so the keydown
  // listener doesn't need to be re-attached when handlers change.
  const actionsRef = useRef(new Map<string, ActionHandler>());

  const registerAction = useCallback(
    (shortcutId: string, handler: ActionHandler) => {
      actionsRef.current.set(shortcutId, handler);
      return () => {
        actionsRef.current.delete(shortcutId);
      };
    },
    [],
  );

  // Sync state to refs inside effects (React 19 linter requirement)
  const scopeRef = useRef(scope);
  const paletteRef = useRef(isPaletteOpen);
  const shortcutsModalRef = useRef(isShortcutsModalOpen);

  useEffect(() => {
    scopeRef.current = scope;
  }, [scope]);

  useEffect(() => {
    paletteRef.current = isPaletteOpen;
  }, [isPaletteOpen]);

  useEffect(() => {
    shortcutsModalRef.current = isShortcutsModalOpen;
  }, [isShortcutsModalOpen]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Don't intercept when user is typing in an input/textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Exception: still handle Escape to close modals
        if (event.key === 'Escape') {
          if (paletteRef.current) {
            setPaletteOpen(false);
            event.preventDefault();
            return;
          }
          if (shortcutsModalRef.current) {
            setShortcutsModalOpen(false);
            event.preventDefault();
            return;
          }
        }
        // Exception: allow Cmd+P even in inputs (VS Code behavior)
        const isCmdP =
          (event.metaKey || event.ctrlKey) &&
          event.key.toLowerCase() === 'p';
        if (!isCmdP) return;
      }

      const currentScope = scopeRef.current;

      // Find matching shortcut that's active in current scope
      for (const shortcut of SHORTCUTS) {
        if (
          shortcut.scope !== 'global' &&
          shortcut.scope !== currentScope
        ) {
          continue;
        }

        if (matchesShortcut(event, shortcut)) {
          event.preventDefault();
          event.stopPropagation();

          // Built-in actions
          if (shortcut.id === 'command-palette') {
            setPaletteOpen((prev) => !prev);
            return;
          }
          if (shortcut.id === 'show-shortcuts') {
            // Don't open shortcuts modal when palette is open
            if (paletteRef.current) return;
            setShortcutsModalOpen((prev) => !prev);
            return;
          }

          // Delegate to registered handler
          const handler = actionsRef.current.get(shortcut.id);
          if (handler) handler();
          return;
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []); // Intentionally empty -- everything uses refs

  const value = useMemo<KeyboardContextValue>(
    () => ({
      scope,
      setScope,
      registerAction,
      isPaletteOpen,
      setPaletteOpen,
      isShortcutsModalOpen,
      setShortcutsModalOpen,
    }),
    [scope, registerAction, isPaletteOpen, isShortcutsModalOpen],
  );

  return (
    <KeyboardContext.Provider value={value}>
      {children}
    </KeyboardContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

function useKeyboardContext() {
  const ctx = useContext(KeyboardContext);
  if (!ctx) {
    throw new Error('useKeyboardContext must be used within KeyboardProvider');
  }
  return ctx;
}

/**
 * Set the keyboard scope for the current page.
 * Call this in page-level components to activate scope-specific shortcuts.
 */
export function useKeyboardScope(scope: ShortcutScope) {
  const { setScope } = useKeyboardContext();

  useEffect(() => {
    setScope(scope);
    return () => setScope('global');
  }, [scope, setScope]);
}

/**
 * Register an action handler for a specific shortcut.
 * The handler is automatically cleaned up on unmount.
 */
export function useRegisterShortcut(
  shortcutId: string,
  handler: ActionHandler,
) {
  const { registerAction } = useKeyboardContext();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    return registerAction(shortcutId, () => handlerRef.current());
  }, [shortcutId, registerAction]);
}

/** Access command palette state */
export function useCommandPalette() {
  const { isPaletteOpen, setPaletteOpen } = useKeyboardContext();
  return { isPaletteOpen, setPaletteOpen };
}

/** Access shortcuts modal state */
export function useShortcutsModal() {
  const { isShortcutsModalOpen, setShortcutsModalOpen } =
    useKeyboardContext();
  return { isShortcutsModalOpen, setShortcutsModalOpen };
}

/** Get current keyboard scope */
export function useCurrentScope() {
  const { scope } = useKeyboardContext();
  return scope;
}
