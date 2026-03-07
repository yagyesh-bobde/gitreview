import type { Metadata } from 'next';
import Link from 'next/link';
import { GitPullRequest } from 'lucide-react';
import { UserMenu } from '@/features/auth/components/user-menu';
import { PRList } from './_components/pr-list';
import { DashboardKeyboard } from './_components/dashboard-keyboard';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default function DashboardPage() {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto flex h-12 max-w-4xl items-center px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm font-semibold text-zinc-200 transition-colors hover:text-white"
          >
            <GitPullRequest className="size-4" />
            <span>GitReview</span>
          </Link>
          <div className="flex-1" />
          <DashboardKeyboard />
          <div className="ml-3">
            <UserMenu />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-zinc-100">Pull Requests</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Open PRs you authored or are requested to review.
          </p>
        </div>
        <PRList />
      </div>
    </>
  );
}
