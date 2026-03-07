'use client';

import { useMemo } from 'react';
import { usePRFiles } from '@/features/github/hooks/use-pr-files';
import { useReviewStore } from '@/stores/review-store';
import { useUIStore } from '@/stores/ui-store';
import {
  CommandPalette,
  useKeyboardScope,
  useRegisterShortcut,
  type PaletteItem,
} from '@/features/keyboard';

// ---------------------------------------------------------------------------
// File type icon -- gives visual cue about the file extension
// ---------------------------------------------------------------------------

const EXT_COLORS: Record<string, string> = {
  ts: 'text-blue-400',
  tsx: 'text-blue-400',
  js: 'text-yellow-400',
  jsx: 'text-yellow-400',
  css: 'text-purple-400',
  scss: 'text-pink-400',
  json: 'text-yellow-600',
  md: 'text-zinc-400',
  py: 'text-green-400',
  go: 'text-cyan-400',
  rs: 'text-orange-400',
  yml: 'text-red-400',
  yaml: 'text-red-400',
};

function FileIcon({ filename }: { filename: string }) {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const color = EXT_COLORS[ext] ?? 'text-zinc-500';

  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={`size-4 ${color}`}>
      <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Review Palette
// ---------------------------------------------------------------------------

interface ReviewPaletteProps {
  org: string;
  repo: string;
  prNumber: number;
}

export function ReviewPalette({ org, repo, prNumber }: ReviewPaletteProps) {
  useKeyboardScope('review');

  // Register Cmd+B -> toggle sidebar
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  useRegisterShortcut('toggle-sidebar', toggleSidebar);

  const { data: files } = usePRFiles(org, repo, prNumber);
  const setActiveFile = useReviewStore((s) => s.setActiveFile);
  const activeFile = useReviewStore((s) => s.activeFile);

  const items: PaletteItem[] = useMemo(() => {
    if (!files) return [];
    return files.map((file) => {
      const parts = file.filename.split('/');
      const name = parts[parts.length - 1];
      const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '';

      return {
        id: file.filename,
        name,
        description: dir,
        icon: <FileIcon filename={file.filename} />,
      };
    });
  }, [files]);

  // Track recently viewed files by using the current active file
  const recentIds = useMemo(() => {
    if (!activeFile) return [];
    return [activeFile];
  }, [activeFile]);

  const handleSelect = (item: PaletteItem) => {
    setActiveFile(item.id);
  };

  return (
    <CommandPalette
      items={items}
      placeholder="Go to file..."
      onSelect={handleSelect}
      recentIds={recentIds}
      emptyMessage="No matching files."
    />
  );
}
