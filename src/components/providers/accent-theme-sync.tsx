'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/stores/ui-store';

/** Mirrors the persisted accent theme onto <html data-accent>. */
export function AccentThemeSync() {
  const accentTheme = useUIStore((s) => s.accentTheme);

  useEffect(() => {
    document.documentElement.dataset.accent = accentTheme;
  }, [accentTheme]);

  return null;
}
