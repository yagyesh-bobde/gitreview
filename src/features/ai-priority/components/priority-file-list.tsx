'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  KeyRound,
  Sparkles,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useReviewStore } from '@/stores/review-store';
import { FileTreeGroup } from '@/features/file-tree/components/file-tree-group';
import {
  buildAndFinalizeTree,
  collectDirectoryPaths,
  collectFilePaths,
  getAncestorPaths,
} from '@/features/file-tree/lib/file-tree-builder';
import type { FileTreeNode } from '@/features/file-tree/types';
import type { PRFile } from '@/types/pr';
import {
  PRIORITY_BUCKETS,
  PRIORITY_BUCKET_META,
  heuristicBucket,
  type PriorityBucket,
  type PriorityErrorCode,
} from '../lib/priority';
import type { FilePriorityState } from '../hooks/use-file-priority';

const AI_SETTINGS_HREF = '/settings?section=ai';

/** Section marker + label tint per bucket; P0 is deliberately the loudest. */
const BUCKET_STYLES: Record<PriorityBucket, { marker: string; label: string; header?: string }> = {
  p0: {
    marker: 'bg-red-500 ring-[3px] ring-red-500/20',
    label: 'text-red-300',
    header: 'bg-red-500/[0.05]',
  },
  p1: { marker: 'bg-amber-400', label: 'text-zinc-200' },
  p2: { marker: 'bg-sky-400/80', label: 'text-zinc-300' },
  tests: { marker: 'bg-violet-400/80', label: 'text-zinc-300' },
  docs: { marker: 'bg-zinc-500', label: 'text-zinc-300' },
};

interface BucketGroup {
  bucket: PriorityBucket;
  files: PRFile[];
  /** The bucket's files as a folder tree, hottest folders/files first. */
  tree: FileTreeNode[];
  dirPaths: string[];
  additions: number;
  deletions: number;
}

const churn = (node: FileTreeNode) => (node.additions ?? 0) + (node.deletions ?? 0);

/** Directories first (like the Files view), then by churn so hot spots lead. */
function sortByChurn(nodes: FileTreeNode[]): FileTreeNode[] {
  nodes.sort((a, b) =>
    a.type !== b.type
      ? a.type === 'directory'
        ? -1
        : 1
      : churn(b) - churn(a) || a.name.localeCompare(b.name),
  );
  for (const node of nodes) if (node.children) sortByChurn(node.children);
  return nodes;
}

/** Expand/collapse state is per bucket, since a folder can appear in several. */
const dirKey = (bucket: PriorityBucket, path: string) => `${bucket}:${path}`;

/**
 * Group files into priority buckets (display order, empty buckets dropped),
 * each laid out as a folder tree. Until AI results arrive only path-decided
 * buckets (tests/docs) are filled; the rest are left out.
 */
function groupFiles(files: PRFile[], state: FilePriorityState): BucketGroup[] {
  const byBucket = new Map<PriorityBucket, PRFile[]>();
  for (const file of files) {
    const bucket =
      state.kind === 'ready'
        ? (state.buckets.get(file.filename) ?? heuristicBucket(file.filename) ?? 'p1')
        : heuristicBucket(file.filename);
    if (!bucket) continue;
    const list = byBucket.get(bucket) ?? [];
    list.push(file);
    byBucket.set(bucket, list);
  }

  return PRIORITY_BUCKETS.flatMap((bucket) => {
    const list = byBucket.get(bucket);
    if (!list?.length) return [];
    const tree = sortByChurn(buildAndFinalizeTree(list));
    return [
      {
        bucket,
        files: list,
        tree,
        dirPaths: collectDirectoryPaths(tree),
        additions: list.reduce((sum, f) => sum + f.additions, 0),
        deletions: list.reduce((sum, f) => sum + f.deletions, 0),
      },
    ];
  });
}

interface PriorityFileListProps {
  files: PRFile[];
  state: FilePriorityState;
  selectedFile: string | null;
  onFileSelect: (path: string) => void;
  onRun: () => void;
  onRetry: () => void;
}

/**
 * Sidebar "Priority" view: the PR's files grouped into P0 / P1 / P2 / Tests /
 * Docs sections. Rows mirror the file tree's affordances (status color,
 * viewed toggle, active highlight) so switching views feels seamless.
 */
export function PriorityFileList({
  files,
  state,
  selectedFile,
  onFileSelect,
  onRun,
  onRetry,
}: PriorityFileListProps) {
  const viewedFiles = useReviewStore((s) => s.viewedFiles);
  const staleViewedFiles = useReviewStore((s) => s.staleViewedFiles);
  const setFilesViewed = useReviewStore((s) => s.setFilesViewed);
  const setActiveFile = useReviewStore((s) => s.setActiveFile);
  const [collapsed, setCollapsed] = useState<ReadonlySet<PriorityBucket>>(new Set());
  const [collapsedDirs, setCollapsedDirs] = useState<ReadonlySet<string>>(new Set());

  const groups = useMemo(() => groupFiles(files, state), [files, state]);
  const isPending = state.kind === 'checking' || state.kind === 'loading';

  const viewedCount = useMemo(
    () => files.filter((f) => viewedFiles[f.filename]).length,
    [files, viewedFiles],
  );
  const progressPct = files.length > 0 ? (viewedCount / files.length) * 100 : 0;

  const toggleSection = (bucket: PriorityBucket) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(bucket)) next.delete(bucket);
      else next.add(bucket);
      return next;
    });

  const toggleDirectory = useCallback((key: string) => {
    setCollapsedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Same semantics as the Files view: a folder toggle marks every file in it,
  // and marking a folder viewed collapses it.
  const handleToggleViewed = useCallback(
    (bucket: PriorityBucket, node: FileTreeNode) => {
      const paths = collectFilePaths(node);
      if (paths.length === 0) return;
      const allViewed = paths.every((p) => viewedFiles[p]);
      setFilesViewed(paths, !allViewed);

      if (!allViewed && node.type === 'directory') {
        setCollapsedDirs((prev) => new Set(prev).add(dirKey(bucket, node.path)));
        if (selectedFile && paths.includes(selectedFile)) setActiveFile(null);
      }
    },
    [viewedFiles, setFilesViewed, selectedFile, setActiveFile],
  );

  return (
    <div className="flex h-full flex-col bg-zinc-900">
      {/* Header — same shape as the file tree's */}
      <div className="border-b border-zinc-800">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs font-medium text-zinc-400">
            {viewedCount} / {files.length} files reviewed
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setCollapsed(new Set());
                setCollapsedDirs(new Set());
              }}
              className="rounded p-1 text-ui-muted transition-colors hover:bg-ui-hover hover:text-zinc-300"
              title="Expand all"
            >
              <ChevronsUpDown className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCollapsed(new Set(PRIORITY_BUCKETS))}
              className="rounded p-1 text-ui-muted transition-colors hover:bg-ui-hover hover:text-zinc-300"
              title="Collapse all"
            >
              <ChevronsDownUp className="size-3.5" />
            </button>
          </div>
        </div>
        <div className="h-0.5 w-full bg-zinc-800">
          <div
            className="h-full bg-green-500 transition-all duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1" role="tree" aria-busy={isPending}>
        {state.kind === 'unavailable' ? (
          <Notice icon={KeyRound}>
            Add your TypeSafe key in <SettingsLink>Settings</SettingsLink> to enable AI priority.
          </Notice>
        ) : state.kind === 'error' ? (
          <ErrorNotice code={state.code} onRetry={onRetry} />
        ) : (
          <>
            {isPending && <PrioritizingSkeleton />}
            {state.kind === 'manual' && <ManualRunNotice onRun={onRun} />}
            {groups.map((group) => (
              <BucketSection
                key={group.bucket}
                group={group}
                isCollapsed={collapsed.has(group.bucket)}
                onToggle={() => toggleSection(group.bucket)}
                collapsedDirs={collapsedDirs}
                onToggleDirectory={toggleDirectory}
                selectedFile={selectedFile}
                viewedFiles={viewedFiles}
                staleViewedFiles={staleViewedFiles}
                onFileSelect={onFileSelect}
                onToggleViewed={handleToggleViewed}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BucketSection — collapsible header + folder tree
// ---------------------------------------------------------------------------

interface BucketSectionProps {
  group: BucketGroup;
  isCollapsed: boolean;
  onToggle: () => void;
  collapsedDirs: ReadonlySet<string>;
  onToggleDirectory: (key: string) => void;
  selectedFile: string | null;
  viewedFiles: Record<string, boolean>;
  staleViewedFiles: Record<string, boolean>;
  onFileSelect: (path: string) => void;
  onToggleViewed: (bucket: PriorityBucket, node: FileTreeNode) => void;
}

function BucketSection({
  group,
  isCollapsed,
  onToggle,
  collapsedDirs,
  onToggleDirectory,
  selectedFile,
  viewedFiles,
  staleViewedFiles,
  onFileSelect,
  onToggleViewed,
}: BucketSectionProps) {
  const style = BUCKET_STYLES[group.bucket];
  const meta = PRIORITY_BUCKET_META[group.bucket];
  const { bucket, tree, dirPaths } = group;

  // Folders start expanded; the selected file's ancestors are always revealed.
  const expandedPaths = useMemo(() => {
    const expanded = new Set(dirPaths.filter((p) => !collapsedDirs.has(dirKey(bucket, p))));
    if (selectedFile) for (const p of getAncestorPaths(selectedFile, tree)) expanded.add(p);
    return expanded;
  }, [bucket, tree, dirPaths, collapsedDirs, selectedFile]);

  return (
    <div role="group" aria-label={meta.label} className="mb-1">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!isCollapsed}
        title={meta.hint}
        className={cn(
          'flex w-full items-center gap-1.5 px-2 py-1.5 text-left transition-colors hover:bg-ui-hover',
          style.header,
        )}
      >
        {isCollapsed ? (
          <ChevronRight className="size-3.5 shrink-0 text-ui-muted" />
        ) : (
          <ChevronDown className="size-3.5 shrink-0 text-ui-muted" />
        )}
        <BucketMarker bucket={group.bucket} />
        <span className={cn('text-xs font-semibold', style.label)}>{meta.label}</span>
        <span className="text-[11px] tabular-nums text-ui-muted">{group.files.length}</span>
        <span className="ml-auto flex shrink-0 items-center gap-1 font-mono text-[10px]">
          {group.additions > 0 && <span className="text-emerald-400">+{group.additions}</span>}
          {group.deletions > 0 && <span className="text-red-400">-{group.deletions}</span>}
        </span>
      </button>

      {!isCollapsed && (
        <FileTreeGroup
          nodes={tree}
          depth={1}
          selectedFile={selectedFile}
          expandedPaths={expandedPaths}
          viewedFiles={viewedFiles}
          staleViewedFiles={staleViewedFiles}
          onFileSelect={onFileSelect}
          onToggle={(path) => onToggleDirectory(dirKey(bucket, path))}
          onToggleViewed={(node) => onToggleViewed(bucket, node)}
        />
      )}
    </div>
  );
}

/** Small colored dot identifying a bucket (P0 gets a halo). */
export function BucketMarker({ bucket }: { bucket: PriorityBucket }) {
  return (
    <span
      className={cn('size-2 shrink-0 rounded-full', BUCKET_STYLES[bucket].marker)}
      aria-hidden="true"
    />
  );
}

// ---------------------------------------------------------------------------
// Loading + notices
// ---------------------------------------------------------------------------

const SKELETON_WIDTHS = ['78%', '62%', '86%', '54%', '70%'];

function PrioritizingSkeleton() {
  return (
    <div className="mb-1 px-2 py-1.5" role="status">
      <div className="flex items-center gap-1.5 text-[11px] text-ui-muted">
        <Sparkles className="size-3 animate-pulse text-ui-accent-text" />
        Prioritizing with AI…
      </div>
      <div className="mt-2 space-y-2 pl-4">
        {SKELETON_WIDTHS.map((width, i) => (
          <div
            key={i}
            className="h-3 animate-pulse rounded bg-zinc-800"
            style={{ width, animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function ManualRunNotice({ onRun }: { onRun: () => void }) {
  return (
    <div className="mb-1 px-3 py-2.5">
      <p className="text-xs leading-relaxed text-ui-muted">
        Auto-run is off in <SettingsLink>Settings</SettingsLink>. Sort this PR’s files by review
        risk when you’re ready.
      </p>
      <button
        type="button"
        onClick={onRun}
        className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-ui-accent/15 px-2.5 py-1 text-xs font-medium text-ui-accent-text transition-colors hover:bg-ui-accent/25"
      >
        <Sparkles className="size-3.5" />
        Prioritize with AI
      </button>
    </div>
  );
}

function ErrorNotice({ code, onRetry }: { code: PriorityErrorCode; onRetry: () => void }) {
  if (code === 'invalid_key') {
    return (
      <Notice icon={AlertCircle} tone="error">
        TypeSafe rejected your API key. Update it in <SettingsLink>Settings</SettingsLink>.
      </Notice>
    );
  }
  return (
    <Notice icon={AlertCircle} tone="error">
      AI prioritization failed.{' '}
      <button
        type="button"
        onClick={onRetry}
        className="text-zinc-300 underline underline-offset-2 hover:text-white"
      >
        Retry
      </button>{' '}
      or check your key in <SettingsLink>Settings</SettingsLink>.
    </Notice>
  );
}

function Notice({
  icon: Icon,
  tone = 'muted',
  children,
}: {
  icon: typeof AlertCircle;
  tone?: 'muted' | 'error';
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 px-3 py-2.5 text-xs leading-relaxed text-ui-muted">
      <Icon
        className={cn(
          'mt-0.5 size-3.5 shrink-0',
          tone === 'error' ? 'text-red-400' : 'text-ui-accent-text',
        )}
      />
      <p>{children}</p>
    </div>
  );
}

function SettingsLink({ children }: { children: React.ReactNode }) {
  return (
    <Link
      href={AI_SETTINGS_HREF}
      className="text-zinc-300 underline underline-offset-2 hover:text-white"
    >
      {children}
    </Link>
  );
}
