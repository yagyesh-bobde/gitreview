'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Check, Loader2, AlertTriangle, X } from 'lucide-react';
import { useGitHubAccounts } from '@/features/auth/hooks/use-github-accounts';
import { useSwitchAccount } from '@/features/auth/hooks/use-switch-account';
import { LinkAccountDialog } from '@/features/auth/components/link-account-dialog';
import { Button } from '@/components/ui/button';

/**
 * Full account management panel for the settings page.
 * Lists all linked accounts, allows switching, linking new, and removing.
 */
export function AccountManagement() {
  const { data: session } = useSession();
  const { data, isLoading, error } = useGitHubAccounts();
  const switchAccount = useSwitchAccount();
  const queryClient = useQueryClient();
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [conflictDismissed, setConflictDismissed] = useState(false);

  // Derive conflict error from session -- no effect needed
  let conflictError: string | null = null;
  if (!conflictDismissed && session?.linkError?.startsWith('account_conflict:')) {
    conflictError = session.linkError.split(':')[1];
  }

  const removeAccount = useMutation<{ success: boolean }, Error, string>({
    mutationFn: async (accountId: string) => {
      const res = await fetch(`/api/auth/accounts/${accountId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to remove account');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['github-accounts'] });
    },
  });

  if (isLoading) {
    return (
      <section>
        <h2 className="text-lg font-semibold">GitHub Accounts</h2>
        <div className="mt-4 flex items-center justify-center py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section>
        <h2 className="text-lg font-semibold">GitHub Accounts</h2>
        <p className="mt-2 text-sm text-destructive">
          Failed to load accounts. Please try refreshing.
        </p>
      </section>
    );
  }

  const accounts = data?.accounts ?? [];
  const activeAccountId = data?.activeAccountId ?? null;

  return (
    <section>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">GitHub Accounts</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Link multiple GitHub accounts to switch between them when reviewing PRs.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLinkDialogOpen(true)}
        >
          <Plus className="size-3.5" />
          Link account
        </Button>
      </div>

      {conflictError && (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-yellow-500" />
          <div className="flex-1 text-sm">
            <p className="font-medium text-yellow-500">Account already linked</p>
            <p className="mt-0.5 text-muted-foreground">
              The GitHub account <span className="font-medium text-foreground">@{conflictError}</span> is already linked to another GitReview account.
              To merge these accounts, please contact support.
            </p>
          </div>
          <button
            onClick={() => setConflictDismissed(true)}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="mt-4 divide-y divide-border rounded-lg border">
        {accounts.map((account) => {
          const isActive = account.id === activeAccountId;
          const canRemove = accounts.length > 1;
          const isRemoving = removeAccount.isPending && removeAccount.variables === account.id;

          return (
            <div
              key={account.id}
              className="flex items-center gap-3 px-4 py-3"
            >
              {account.avatarUrl ? (
                <Image
                  src={account.avatarUrl}
                  alt={account.login}
                  width={32}
                  height={32}
                  className="size-8 rounded-full"
                />
              ) : (
                <div className="size-8 rounded-full bg-zinc-700" />
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{account.login}</span>
                  {isActive && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-500">
                      <Check className="size-3" />
                      Active
                    </span>
                  )}
                </div>
                {account.name && (
                  <p className="truncate text-xs text-muted-foreground">{account.name}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!isActive && (
                  <Button
                    variant="outline"
                    size="xs"
                    disabled={switchAccount.isPending}
                    onClick={() => switchAccount.mutate(account.id)}
                  >
                    Switch
                  </Button>
                )}
                {canRemove && (
                  <Button
                    variant="destructive"
                    size="icon-xs"
                    disabled={isRemoving}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Remove @${account.login}? You can re-link it later.`,
                        )
                      ) {
                        removeAccount.mutate(account.id);
                      }
                    }}
                  >
                    {isRemoving ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Trash2 className="size-3" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {accounts.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No GitHub accounts linked yet. Click &quot;Link account&quot; to get started.
          </div>
        )}
      </div>

      <LinkAccountDialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen} />
    </section>
  );
}
