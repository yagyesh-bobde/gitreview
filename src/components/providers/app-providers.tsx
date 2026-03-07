'use client';

import { QueryProvider } from '@/components/providers/query-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { AuthSessionProvider } from '@/components/providers/session-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { KeyboardProvider } from '@/features/keyboard';
import { ShortcutsModal } from '@/features/keyboard';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthSessionProvider>
        <QueryProvider>
          <KeyboardProvider>
            <TooltipProvider>
              {children}
              <ShortcutsModal />
            </TooltipProvider>
          </KeyboardProvider>
        </QueryProvider>
      </AuthSessionProvider>
    </ThemeProvider>
  );
}
