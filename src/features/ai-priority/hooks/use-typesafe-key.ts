'use client';

import { useCallback, useSyncExternalStore } from 'react';

/** localStorage key for the user's own TypeSafe API key (this browser only). */
const STORAGE_KEY = 'gitreview:typesafe-api-key';
/** Same-tab change signal; `storage` events only fire in *other* tabs. */
const CHANGE_EVENT = 'gitreview:typesafe-key-change';

function subscribe(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) onChange();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function getSnapshot(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY) || null;
  } catch {
    return null; // storage disabled (e.g. strict privacy mode)
  }
}

function getServerSnapshot(): null {
  return null;
}

function write(value: string | null): void {
  try {
    if (value) window.localStorage.setItem(STORAGE_KEY, value);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore — storage unavailable; the key simply won't persist.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * The user's own TypeSafe API key, kept only in this browser's localStorage.
 * Every consumer (Settings, the PR page) stays in sync across components and
 * tabs. Always `null` during SSR and hydration.
 */
export function useTypesafeKey() {
  const apiKey = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const saveKey = useCallback((value: string) => write(value.trim() || null), []);
  const removeKey = useCallback(() => write(null), []);

  return { apiKey, saveKey, removeKey };
}
