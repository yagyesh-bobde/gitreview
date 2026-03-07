'use client';

import Image from 'next/image';
import { Check, Plus, Loader2 } from 'lucide-react';
import { useGitHubAccounts } from '@/features/auth/hooks/use-github-accounts';
import { useSwitchAccount } from '@/features/auth/hooks/use-switch-account';
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface AccountSwitcherProps {
  /** Called when the user clicks "Link another account". */
  onLinkAccount?: () => void;
}

/**
 * Account switcher component designed to be rendered inside a DropdownMenuContent.
 * Shows all linked GitHub accounts with the active one checked, plus a "Link account" action.
 */
export function AccountSwitcher({ onLinkAccount }: AccountSwitcherProps) {
  const { data, isLoading } = useGitHubAccounts();
  const switchAccount = useSwitchAccount();

  if (isLoading) {
    return (
      <>
        <div className="px-1.5 py-1 text-xs font-medium text-muted-foreground">
          GitHub Accounts
        </div>
        <div className="flex items-center justify-center py-3">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
        <DropdownMenuSeparator />
      </>
    );
  }

  const accounts = data?.accounts ?? [];
  const activeAccountId = data?.activeAccountId ?? null;

  if (accounts.length === 0) {
    return null;
  }

  return (
    <>
      <DropdownMenuGroup>
        <div className="px-1.5 py-1 text-xs font-medium text-muted-foreground">
          GitHub Accounts
        </div>
        {accounts.map((account) => {
          const isActive = account.id === activeAccountId;
          return (
            <DropdownMenuItem
              key={account.id}
              className="gap-2"
              disabled={switchAccount.isPending}
              onClick={() => {
                if (!isActive) {
                  switchAccount.mutate(account.id);
                }
              }}
            >
              <div className="relative size-5 shrink-0">
                {account.avatarUrl ? (
                  <Image
                    src={account.avatarUrl}
                    alt={account.login}
                    width={20}
                    height={20}
                    className="size-5 rounded-full"
                  />
                ) : (
                  <div className="size-5 rounded-full bg-zinc-700" />
                )}
              </div>
              <span className="truncate font-medium">{account.login}</span>
              {isActive && <Check className="ml-auto size-3.5 text-green-500" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        className="gap-2"
        onClick={() => onLinkAccount?.()}
      >
        <Plus className="size-4 text-muted-foreground" />
        <span>Link another account</span>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
    </>
  );
}
