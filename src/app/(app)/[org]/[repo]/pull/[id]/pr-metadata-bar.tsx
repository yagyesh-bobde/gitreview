'use client';

import Image from 'next/image';
import { GitBranch, User, Plus, Minus } from 'lucide-react';
import type { PullRequest } from '@/types/pr';

interface PRMetadataBarProps {
  pr: PullRequest | null;
  isLoading: boolean;
}

export function PRMetadataBar({ pr, isLoading }: PRMetadataBarProps) {
  if (isLoading) {
    return (
      <div className="flex h-10 items-center gap-4 border-b border-zinc-800 bg-zinc-950 px-4">
        <div className="h-4 w-24 animate-pulse rounded bg-zinc-800" />
        <div className="h-4 w-32 animate-pulse rounded bg-zinc-800" />
        <div className="h-4 w-16 animate-pulse rounded bg-zinc-800" />
      </div>
    );
  }

  if (!pr) return null;

  return (
    <div className="flex h-10 shrink-0 items-center gap-4 overflow-x-auto border-b border-zinc-800 bg-zinc-950 px-4 text-xs">
      {/* Author */}
      <div className="flex items-center gap-1.5 text-zinc-400">
        {pr.author.avatarUrl ? (
          <Image
            src={pr.author.avatarUrl}
            alt={pr.author.login}
            width={16}
            height={16}
            className="size-4 rounded-full"
          />
        ) : (
          <User className="size-3.5" />
        )}
        <span className="font-medium text-zinc-300">{pr.author.login}</span>
      </div>

      {/* Branches */}
      <div className="flex items-center gap-1 text-zinc-500">
        <GitBranch className="size-3.5" />
        <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-300">{pr.head.ref}</code>
        <span className="text-zinc-600">into</span>
        <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-300">{pr.base.ref}</code>
      </div>

      {/* Stats */}
      <div className="ml-auto flex items-center gap-3 text-zinc-500">
        <span className="flex items-center gap-1">
          <Plus className="size-3 text-green-500" />
          <span className="text-green-500">{pr.additions}</span>
        </span>
        <span className="flex items-center gap-1">
          <Minus className="size-3 text-red-500" />
          <span className="text-red-500">{pr.deletions}</span>
        </span>
        <span>
          {pr.changedFiles} {pr.changedFiles === 1 ? 'file' : 'files'}
        </span>
      </div>
    </div>
  );
}
