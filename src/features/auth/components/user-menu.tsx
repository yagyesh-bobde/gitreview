'use client';

import Link from 'next/link';
import Image from 'next/image';
import { LogIn, User } from 'lucide-react';
import { useSession } from '@/features/auth/hooks/use-session';
import { cn } from '@/lib/utils/cn';

interface UserMenuProps {
  className?: string;
}

export function UserMenu({ className }: UserMenuProps) {
  const { session, isLoading, isAuthenticated } = useSession();

  if (isLoading) {
    return <div className={cn('size-8 animate-pulse rounded-full bg-zinc-800', className)} />;
  }

  if (!isAuthenticated || !session) {
    return (
      <Link
        href="/login"
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200',
          className,
        )}
      >
        <LogIn className="size-4" />
        Sign in
      </Link>
    );
  }

  return (
    <button
      className={cn(
        'flex size-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200',
        className,
      )}
    >
      {session.user.image ? (
        <Image
          src={session.user.image}
          alt={session.user.name ?? 'User'}
          width={32}
          height={32}
          className="size-8 rounded-full"
        />
      ) : (
        <User className="size-4" />
      )}
    </button>
  );
}
