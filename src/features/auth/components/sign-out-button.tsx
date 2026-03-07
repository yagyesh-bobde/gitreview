'use client';

import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SignOutButtonProps {
  className?: string;
}

export function SignOutButton({ className }: SignOutButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={className}
      onClick={() => signOut({ callbackUrl: '/login' })}
    >
      <LogOut className="size-4" />
      Sign out
    </Button>
  );
}
