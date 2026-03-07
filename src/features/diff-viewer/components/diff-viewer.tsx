'use client';

import { FileCode2 } from 'lucide-react';
import type { FileDiff, DiffLine, LineType } from '@/features/diff-viewer/types';
import { cn } from '@/lib/utils/cn';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

interface DiffViewerProps {
  fileDiff: FileDiff | null;
  isLoading: boolean;
}

const lineTypeClasses: Record<LineType, string> = {
  add: 'bg-[var(--diff-add-bg)] text-[var(--diff-add-text)]',
  remove: 'bg-[var(--diff-remove-bg)] text-[var(--diff-remove-text)]',
  context: '',
  'hunk-header': 'bg-[var(--diff-hunk-bg)] text-zinc-500',
};

const lineTypePrefix: Record<LineType, string> = {
  add: '+',
  remove: '-',
  context: ' ',
  'hunk-header': '',
};

function DiffLineRow({ line }: { line: DiffLine }) {
  return (
    <tr className={cn('group', lineTypeClasses[line.type])}>
      <td className="w-[1%] select-none whitespace-nowrap border-r border-zinc-800/50 px-2 text-right font-mono text-xs text-zinc-600">
        {line.oldLineNumber ?? ''}
      </td>
      <td className="w-[1%] select-none whitespace-nowrap border-r border-zinc-800/50 px-2 text-right font-mono text-xs text-zinc-600">
        {line.newLineNumber ?? ''}
      </td>
      <td className="whitespace-pre-wrap break-all px-3 font-mono text-xs leading-5">
        <span className="select-none text-zinc-600">{lineTypePrefix[line.type]}</span>
        {line.content}
      </td>
    </tr>
  );
}

function DiffHeader({ diff }: { diff: FileDiff }) {
  const statusLabel =
    diff.status === 'renamed' && diff.previousFilename
      ? `${diff.previousFilename} -> ${diff.filename}`
      : diff.filename;

  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-4 py-2">
      <FileCode2 className="size-4 text-zinc-500" />
      <span className="truncate font-mono text-sm text-zinc-300">{statusLabel}</span>
      <div className="ml-auto flex gap-2 text-xs">
        {diff.additions > 0 && <span className="text-green-500">+{diff.additions}</span>}
        {diff.deletions > 0 && <span className="text-red-500">-{diff.deletions}</span>}
      </div>
    </div>
  );
}

export function DiffViewer({ fileDiff, isLoading }: DiffViewerProps) {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" label="Loading diff..." />
      </div>
    );
  }

  if (!fileDiff) {
    return (
      <EmptyState
        icon={<FileCode2 className="size-10" />}
        title="No file selected"
        description="Select a file from the sidebar to view its diff"
      />
    );
  }

  if (fileDiff.isBinary) {
    return (
      <div className="flex flex-col">
        <DiffHeader diff={fileDiff} />
        <EmptyState title="Binary file" description="Binary files cannot be displayed as diffs" />
      </div>
    );
  }

  if (fileDiff.hunks.length === 0) {
    return (
      <div className="flex flex-col">
        <DiffHeader diff={fileDiff} />
        <EmptyState title="No changes" description="This file has no visible changes" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <DiffHeader diff={fileDiff} />
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <tbody>
            {fileDiff.hunks.map((hunk, hunkIdx) => (
              <DiffHunkRows key={hunkIdx} hunk={hunk} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DiffHunkRows({ hunk }: { hunk: FileDiff['hunks'][number] }) {
  return (
    <>
      <tr className="bg-[var(--diff-hunk-bg)]">
        <td colSpan={3} className="px-3 py-1 font-mono text-xs text-zinc-500">
          {hunk.header}
        </td>
      </tr>
      {hunk.lines.map((line, lineIdx) => (
        <DiffLineRow key={lineIdx} line={line} />
      ))}
    </>
  );
}
