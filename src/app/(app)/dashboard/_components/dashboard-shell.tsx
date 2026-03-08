'use client';

import { usePRList, type AccountStatus } from '@/features/github/hooks/use-pr-list';
import { useUIStore } from '@/stores/ui-store';
import { DashboardHeader } from './dashboard-header';
import { DashboardKeyboard } from './dashboard-keyboard';
import { PRListView, ListViewSkeleton } from './pr-list-view';
import { PRIDEView, IDEViewSkeleton } from './pr-ide-view';
import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-red-900/50 bg-red-950/20 py-12 mx-auto max-w-6xl mt-8">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="size-10 text-red-400"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
        />
      </svg>
      <h3 className="mt-4 text-sm font-medium text-red-300">
        Failed to load pull requests
      </h3>
      <p className="mt-1 text-sm text-zinc-500">{message}</p>
      <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-800 py-16 mx-auto max-w-6xl mt-8">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="size-12 text-zinc-600"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
        />
      </svg>
      <h3 className="mt-4 text-sm font-medium text-zinc-300">No pull requests</h3>
      <p className="mt-1 text-sm text-zinc-500">
        Open PRs you authored or are requested to review will appear here.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Account error banner
// ---------------------------------------------------------------------------

function AccountErrorBanner({ statuses }: { statuses: AccountStatus[] }) {
  const failed = statuses.filter((s) => s.status === 'error');
  if (failed.length === 0) return null;

  return (
    <div className="mx-4 mt-2 rounded-md border border-yellow-900/50 bg-yellow-950/30 px-4 py-2.5 text-sm text-yellow-200/90">
      {failed.map(({ login, error }) => (
        <p key={login}>
          Could not fetch PRs from <span className="font-medium">@{login}</span>
          {' '}&mdash; {error ?? 'token may need re-linking'}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main shell
// ---------------------------------------------------------------------------

export function DashboardShell() {
  const dashboardView = useUIStore((s) => s.dashboardView);
  const { data, isLoading, error, refetch } = usePRList();

  const prs = data?.prs;
  const githubLogins = data?.githubLogins ?? [];
  const accountStatuses = data?.accountStatuses ?? [];

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950">
      <DashboardHeader />
      <DashboardKeyboard />
      <AccountErrorBanner statuses={accountStatuses} />

      {isLoading ? (
        dashboardView === 'ide' ? <IDEViewSkeleton /> : <ListViewSkeleton />
      ) : error ? (
        <ErrorState
          message={error instanceof Error ? error.message : 'Unknown error'}
          onRetry={() => refetch()}
        />
      ) : !prs || prs.length === 0 ? (
        <EmptyState />
      ) : dashboardView === 'ide' ? (
        <PRIDEView prs={prs} githubLogins={githubLogins} />
      ) : (
        <PRListView prs={prs} githubLogins={githubLogins} />
      )}
    </div>
  );
}
