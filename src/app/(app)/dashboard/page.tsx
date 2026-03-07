import type { Metadata } from 'next';
import { PRList } from './_components/pr-list';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-100">
          Pull Requests
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Open PRs you authored or are requested to review.
        </p>
      </div>
      <PRList />
    </div>
  );
}
