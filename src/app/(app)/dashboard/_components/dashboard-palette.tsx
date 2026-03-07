'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { usePRList } from '@/features/github/hooks/use-pr-list';
import {
  CommandPalette,
  useKeyboardScope,
  type PaletteItem,
} from '@/features/keyboard';

// File icon for PRs in the palette
function PRIcon({ draft }: { draft?: boolean }) {
  if (draft) {
    return (
      <svg viewBox="0 0 16 16" fill="currentColor" className="size-4 text-zinc-500">
        <path d="M4.75 7.25a.75.75 0 0 1 .75.75v4.25a.75.75 0 0 1-1.5 0V8a.75.75 0 0 1 .75-.75Zm3.25-2.5a.75.75 0 0 1 .75.75v6.75a.75.75 0 0 1-1.5 0V5.5a.75.75 0 0 1 .75-.75Zm4 5a.75.75 0 0 1 .75.75v1.75a.75.75 0 0 1-1.5 0v-1.75a.75.75 0 0 1 .75-.75Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="size-4 text-emerald-500">
      <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
      <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
    </svg>
  );
}

export function DashboardPalette() {
  useKeyboardScope('dashboard');

  const router = useRouter();
  const { data: prs } = usePRList();

  const items: PaletteItem[] = useMemo(() => {
    if (!prs) return [];
    return prs.map((pr) => ({
      id: String(pr.id),
      name: `#${pr.number} ${pr.title}`,
      description: `${pr.base.repo.owner}/${pr.base.repo.name}`,
      icon: <PRIcon draft={pr.draft} />,
    }));
  }, [prs]);

  const handleSelect = (item: PaletteItem) => {
    const pr = prs?.find((p) => String(p.id) === item.id);
    if (pr) {
      const owner = pr.base.repo.owner;
      const repo = pr.base.repo.name;
      router.push(`/${owner}/${repo}/pull/${pr.number}`);
    }
  };

  return (
    <CommandPalette
      items={items}
      placeholder="Search pull requests..."
      onSelect={handleSelect}
      emptyMessage="No matching pull requests."
    />
  );
}
