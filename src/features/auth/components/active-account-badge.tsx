'use client';

import Image from 'next/image';
import { useGitHubAccounts } from '@/features/auth/hooks/use-github-accounts';

/**
 * Compact badge showing the active GitHub account's avatar and login.
 * Designed for use in tight spaces like the PR metadata bar.
 * Only renders when the user has multiple accounts (otherwise it's noise).
 */
export function ActiveAccountBadge() {
  const { data } = useGitHubAccounts();

  if (!data) return null;

  const { accounts, activeAccountId } = data;

  // Only show when there are multiple accounts -- single account is the default
  if (accounts.length <= 1) return null;

  const active = accounts.find((a) => a.id === activeAccountId);
  if (!active) return null;

  return (
    <div className="flex items-center gap-1.5 rounded bg-zinc-800/60 px-1.5 py-0.5 text-xs text-zinc-400">
      {active.avatarUrl ? (
        <Image
          src={active.avatarUrl}
          alt={active.login}
          width={14}
          height={14}
          className="size-3.5 rounded-full"
        />
      ) : (
        <div className="size-3.5 rounded-full bg-zinc-600" />
      )}
      <span className="font-medium text-zinc-300">{active.login}</span>
    </div>
  );
}
