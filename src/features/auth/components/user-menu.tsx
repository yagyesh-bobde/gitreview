'use client';

import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Loader2, LogOut, Settings, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AccountSwitcher } from '@/features/auth/components/account-switcher';
import { LinkAccountDialog } from '@/features/auth/components/link-account-dialog';
import type { GitReviewSession } from '@/features/auth/types';

// ---------------------------------------------------------------------------
// Derive two-letter initials from a display name.
// Falls back to "YB" when no session is available yet.
// ---------------------------------------------------------------------------

function getInitials(name: string | null | undefined): string {
  if (!name) return 'YB';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (parts.length === 1) {
    return parts[0][0].toUpperCase();
  }
  return 'YB';
}

export function UserMenu() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  if (!session?.user) {
    return null;
  }

  const { user } = session;
  const initials = getInitials(user.name);

  // Cast to our extended session type to access githubLogin.
  const githubLogin = (session as GitReviewSession).githubLogin;

  const isDashboard = pathname === '/dashboard';

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex items-center justify-center outline-none"
        aria-label="User menu"
      >
        <div className="size-7 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-xs font-semibold select-none ring-2 ring-transparent hover:ring-zinc-600 transition-all">
          {initials}
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-56">
        {/* User identity header */}
        <div className="px-1.5 py-1">
          <div className="flex flex-col gap-0.5">
            {user.name && <span className="text-sm font-medium">{user.name}</span>}
            {user.email && (
              <span className="text-xs text-muted-foreground">{user.email}</span>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />

        {/* Linked GitHub accounts */}
        <AccountSwitcher onLinkAccount={() => setLinkDialogOpen(true)} />

        {/* Navigation items */}
        {!isDashboard && (
          <DropdownMenuItem onClick={() => router.push('/dashboard')}>
            <LayoutDashboard className="size-4" />
            Dashboard
          </DropdownMenuItem>
        )}

        {githubLogin && (
          <DropdownMenuItem
            onClick={() =>
              window.open(`https://github.com/${githubLogin}`, '_blank', 'noopener,noreferrer')
            }
          >
            <User className="size-4" />
            Your profile
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={() => router.push('/settings')}>
          <Settings className="size-4" />
          Settings
          <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Destructive actions */}
        <DropdownMenuItem
          variant="destructive"
          disabled={signingOut}
          onClick={() => {
            setSigningOut(true);
            signOut({ callbackUrl: '/login' });
          }}
        >
          {signingOut ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LogOut className="size-4" />
          )}
          Sign out
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <LinkAccountDialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen} />
    </>
  );
}
