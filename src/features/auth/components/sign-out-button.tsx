'use client';

import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { track, AnalyticsEvent } from '@/lib/analytics/events';

interface SignOutButtonProps {
  className?: string;
}

export function SignOutButton({ className }: SignOutButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={className}
      onClick={() => {
        track(AnalyticsEvent.SIGNED_OUT);
        signOut({ callbackUrl: '/login' });
      }}
    >
      <LogOut className="size-4" />
      Sign out
    </Button>
  );
}
