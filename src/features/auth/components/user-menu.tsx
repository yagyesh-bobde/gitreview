'use client';

import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import { LogOut, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function UserMenu() {
  const { data: session } = useSession();

  if (!session?.user) {
    return null;
  }

  const { user } = session;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex size-8 items-center justify-center rounded-full outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring">
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name ?? 'User avatar'}
            width={28}
            height={28}
            className="rounded-full"
            referrerPolicy="no-referrer"
            unoptimized
          />
        ) : (
          <span className="flex size-7 items-center justify-center rounded-full bg-muted">
            <User className="size-4 text-muted-foreground" />
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8}>
        <DropdownMenuLabel>
          <div className="flex flex-col gap-0.5">
            {user.name && (
              <span className="text-sm font-medium">{user.name}</span>
            )}
            {user.email && (
              <span className="text-xs text-muted-foreground">
                {user.email}
              </span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/login' })}>
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
