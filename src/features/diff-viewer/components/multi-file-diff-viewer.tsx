'use client';

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, Circle, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useReviewStore } from '@/stores/review-store';
import { usePRDiff } from '@/features/github/hooks/use-pr-diff';
import type { PRFile } from '@/types/pr';
import type { FileDiff } from '../types';

import { DiffEmptyState } from './diff-empty-state';
import { InlineDiff } from './inline-diff';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Lines threshold: files under this render fully, files over get a capped container */
const LARGE_FILE_LINE_THRESHOLD = 500;
/** Max height (px) for large file sections before user expands */
const LARGE_FILE_MAX_HEIGHT = 600;
/** IntersectionObserver rootMargin — prefetch diffs 600px before they enter viewport */
const PREFETCH_MARGIN = '600px';
/** IntersectionObserver threshold for header tracking */
const HEADER_THRESHOLD = [0, 1];

// ---------------------------------------------------------------------------
// MultiFileDiffViewer — top-level orchestrator
// ---------------------------------------------------------------------------

interface MultiFileDiffViewerProps {
  files: PRFile[];
  org: string;
  repo: string;
  prNumber: number;
  commitId?: string;
}

export function MultiFileDiffViewer({
  files,
  org,
  repo,
  prNumber,
  commitId,
}: MultiFileDiffViewerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const setActiveFile = useReviewStore((s) => s.setActiveFile);

  // Track which file headers are visible; the topmost one is the "active" file
  const headerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const visibleHeaders = useRef<Set<string>>(new Set());
  // Bump this counter to force re-observation when headers register/unregister
  const [headerGeneration, setHeaderGeneration] = useState(0);

  // Register a header element for intersection tracking
  const registerHeader = useCallback(
    (path: string, el: HTMLDivElement | null) => {
      if (el) {
        headerRefs.current.set(path, el);
      } else {
        headerRefs.current.delete(path);
        visibleHeaders.current.delete(path);
      }
      setHeaderGeneration((g) => g + 1);
    },
    [],
  );

  // Single IntersectionObserver to track which file headers are in the top region
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || headerRefs.current.size === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const path = entry.target.getAttribute('data-file-path');
          if (!path) continue;

          if (entry.isIntersecting) {
            visibleHeaders.current.add(path);
          } else {
            visibleHeaders.current.delete(path);
          }
        }

        // Among visible headers, find the one closest to the container top
        const containerTop = container.getBoundingClientRect().top;
        let topFile: string | null = null;
        let topDistance = Infinity;

        for (const path of visibleHeaders.current) {
          const el = headerRefs.current.get(path);
          if (!el) continue;
          const rect = el.getBoundingClientRect();
          const distance = rect.top - containerTop;
          // Prefer headers at or above viewport top (scrolled past), else closest below
          if (distance <= 60 && distance < topDistance) {
            topDistance = distance;
            topFile = path;
          }
        }

        // Fallback: pick closest visible header regardless of position
        if (!topFile && visibleHeaders.current.size > 0) {
          let closestDist = Infinity;
          for (const path of visibleHeaders.current) {
            const el = headerRefs.current.get(path);
            if (!el) continue;
            const dist = Math.abs(el.getBoundingClientRect().top - containerTop);
            if (dist < closestDist) {
              closestDist = dist;
              topFile = path;
            }
          }
        }

        if (topFile) {
          setActiveFile(topFile);
        }
      },
      {
        root: container,
        // Trigger when header enters the top 20% of the container
        rootMargin: '0px 0px -80% 0px',
        threshold: HEADER_THRESHOLD,
      },
    );

    for (const el of headerRefs.current.values()) {
      observer.observe(el);
    }

    return () => observer.disconnect();
    // headerGeneration triggers re-observation when sections mount/unmount
  }, [files, setActiveFile, headerGeneration]);

  if (files.length === 0) {
    return (
      <div className="flex h-full flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
        <DiffEmptyState variant="no-file" />
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className="h-full overflow-y-auto"
    >
      <div className="flex flex-col gap-3 p-3">
        {files.map((file) => (
          <SingleFileDiffSection
            key={file.filename}
            file={file}
            org={org}
            repo={repo}
            prNumber={prNumber}
            commitId={commitId}
            scrollContainer={scrollContainerRef}
            onRegisterHeader={registerHeader}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SingleFileDiffSection — one file's diff within the multi-file scroll
// ---------------------------------------------------------------------------

interface SingleFileDiffSectionProps {
  file: PRFile;
  org: string;
  repo: string;
  prNumber: number;
  commitId?: string;
  scrollContainer: React.RefObject<HTMLDivElement | null>;
  onRegisterHeader: (path: string, el: HTMLDivElement | null) => void;
}

const SingleFileDiffSection = memo(function SingleFileDiffSection({
  file,
  org,
  repo,
  prNumber,
  commitId,
  scrollContainer,
  onRegisterHeader,
}: SingleFileDiffSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Register the header ref for active-file tracking
  useEffect(() => {
    onRegisterHeader(file.filename, headerRef.current);
    return () => onRegisterHeader(file.filename, null);
  }, [file.filename, onRegisterHeader]);

  // Lazy-load: observe when section comes near the viewport
  useEffect(() => {
    const section = sectionRef.current;
    const container = scrollContainer.current;
    if (!section || !container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // Once visible, always loaded
        }
      },
      {
        root: container,
        rootMargin: PREFETCH_MARGIN,
      },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [scrollContainer]);

  return (
    <div
      ref={sectionRef}
      id={`diff-file-${file.filename}`}
      className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950"
    >
      {/* Sticky file header within this section */}
      <div
        ref={headerRef}
        data-file-path={file.filename}
      >
        <CollapsibleFileHeader
          file={file}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed((c) => !c)}
        />
      </div>

      {/* Diff content */}
      {!isCollapsed && (
        <div>
          {isVisible ? (
            <FileDiffContent
              file={file}
              org={org}
              repo={repo}
              prNumber={prNumber}
              commitId={commitId}
            />
          ) : (
            <FileDiffSkeleton />
          )}
        </div>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// CollapsibleFileHeader — compact header with collapse toggle and stats
// ---------------------------------------------------------------------------

interface CollapsibleFileHeaderProps {
  file: PRFile;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

function CollapsibleFileHeader({
  file,
  isCollapsed,
  onToggleCollapse,
}: CollapsibleFileHeaderProps) {
  const viewedFiles = useReviewStore((s) => s.viewedFiles);
  const toggleFileViewed = useReviewStore((s) => s.toggleFileViewed);
  const isViewed = !!viewedFiles[file.filename];

  const parts = file.filename.split('/');
  const basename = parts.pop() ?? file.filename;
  const directory = parts.length > 0 ? parts.join('/') + '/' : '';

  const handleViewedClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      toggleFileViewed(file.filename);
    },
    [toggleFileViewed, file.filename],
  );

  return (
    <div className="flex w-full items-center gap-2 border-b border-zinc-700/50 bg-zinc-900/95 px-3 py-2">
      <button
        type="button"
        onClick={onToggleCollapse}
        className="flex min-w-0 flex-1 items-center gap-2 text-left transition-colors"
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500" />
        )}

        <div className="min-w-0 flex-1 truncate font-mono text-sm">
          <span className="text-zinc-500">{directory}</span>
          <span className="text-zinc-200">{basename}</span>
        </div>
      </button>

      {/* Change stats */}
      <div className="flex shrink-0 items-center gap-1.5 font-mono text-xs">
        {file.additions > 0 && (
          <span className="text-green-400">+{file.additions}</span>
        )}
        {file.deletions > 0 && (
          <span className="text-red-400">-{file.deletions}</span>
        )}
      </div>

      {/* Status badge */}
      <StatusBadge status={file.status} />

      {/* Viewed toggle */}
      <button
        type="button"
        onClick={handleViewedClick}
        className={cn(
          'flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors',
          isViewed
            ? 'bg-emerald-500/15 text-emerald-400'
            : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300',
        )}
        title={isViewed ? 'Mark as unviewed' : 'Mark as viewed'}
      >
        {isViewed ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : (
          <Circle className="h-3.5 w-3.5" />
        )}
        <span className="hidden sm:inline">Viewed</span>
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: PRFile['status'] }) {
  const config: Record<string, { label: string; className: string }> = {
    added: { label: 'A', className: 'bg-green-500/15 text-green-400' },
    removed: { label: 'D', className: 'bg-red-500/15 text-red-400' },
    modified: { label: 'M', className: 'bg-yellow-500/15 text-yellow-400' },
    renamed: { label: 'R', className: 'bg-blue-500/15 text-blue-400' },
    copied: { label: 'C', className: 'bg-blue-500/15 text-blue-400' },
    changed: { label: 'M', className: 'bg-yellow-500/15 text-yellow-400' },
    unchanged: { label: 'U', className: 'bg-zinc-500/15 text-zinc-400' },
  };

  const c = config[status] ?? config.modified;

  return (
    <span
      className={cn(
        'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold',
        c.className,
      )}
    >
      {c.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// FileDiffContent — fetches and renders a single file's diff
// ---------------------------------------------------------------------------

interface FileDiffContentProps {
  file: PRFile;
  org: string;
  repo: string;
  prNumber: number;
  commitId?: string;
}

const FileDiffContent = memo(function FileDiffContent({
  file,
  org,
  repo,
  prNumber,
  commitId,
}: FileDiffContentProps) {
  const diff = usePRDiff(org, repo, prNumber, file.filename);
  const viewMode = useReviewStore((s) => s.viewMode);

  if (diff.isLoading) {
    return <FileDiffSkeleton />;
  }

  if (diff.error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <p className="text-sm text-red-400">Failed to load diff</p>
          <button
            onClick={() => diff.refetch()}
            className="mt-1 text-xs text-zinc-400 underline underline-offset-2 hover:text-zinc-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!diff.data) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-zinc-500">No changes</p>
      </div>
    );
  }

  if (diff.data.isBinary) {
    return <DiffEmptyState variant="binary" />;
  }

  const totalLines = diff.data.hunks.reduce(
    (sum, h) => sum + h.lines.length + 1, // +1 for hunk header
    0,
  );

  return (
    <FileDiffBody
      fileDiff={diff.data}
      viewMode={viewMode}
      totalLines={totalLines}
      org={org}
      repo={repo}
      prNumber={prNumber}
      commitId={commitId}
    />
  );
});

// ---------------------------------------------------------------------------
// FileDiffBody — renders the actual diff lines, with large-file handling
// ---------------------------------------------------------------------------

interface FileDiffBodyProps {
  fileDiff: FileDiff;
  viewMode: 'unified' | 'split';
  totalLines: number;
  org?: string;
  repo?: string;
  prNumber?: number;
  commitId?: string;
}

function FileDiffBody({
  fileDiff,
  viewMode,
  totalLines,
  org,
  repo,
  prNumber,
  commitId,
}: FileDiffBodyProps) {
  const [isExpanded, setIsExpanded] = useState(
    totalLines <= LARGE_FILE_LINE_THRESHOLD,
  );
  const isLargeFile = totalLines > LARGE_FILE_LINE_THRESHOLD;

  return (
    <div>
      <div
        className={cn(
          'relative',
          isLargeFile && !isExpanded && 'overflow-hidden',
        )}
        style={
          isLargeFile && !isExpanded
            ? { maxHeight: `${LARGE_FILE_MAX_HEIGHT}px` }
            : undefined
        }
      >
        <InlineDiff
          fileDiff={fileDiff}
          viewMode={viewMode}
          org={org}
          repo={repo}
          prNumber={prNumber}
          commitId={commitId}
        />

        {/* Fade overlay for truncated large files */}
        {isLargeFile && !isExpanded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-zinc-950 to-transparent" />
        )}
      </div>

      {isLargeFile && !isExpanded && (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="flex w-full items-center justify-center gap-1 border-t border-zinc-800 py-2 text-xs text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
        >
          <ChevronDown className="h-3 w-3" />
          Show all {totalLines} lines
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FileDiffSkeleton — loading placeholder for a single file section
// ---------------------------------------------------------------------------

const SKELETON_WIDTHS = [280, 340, 190, 420, 150, 380, 220, 310];

function FileDiffSkeleton() {
  return (
    <div className="flex flex-col gap-0 p-0">
      <div className="flex h-8 w-full items-center bg-zinc-800/30">
        <div className="ml-4 flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin text-zinc-600" />
          <div className="h-3 w-32 animate-pulse rounded bg-zinc-700/40" />
        </div>
      </div>
      {SKELETON_WIDTHS.map((width, i) => (
        <div key={i} className="flex h-5 w-full items-center">
          <div className="w-[52px] shrink-0" />
          <div className="w-[52px] shrink-0" />
          <div className="w-5 shrink-0" />
          <div
            className="ml-3 h-3 animate-pulse rounded bg-zinc-700/30"
            style={{ width: `${width}px` }}
          />
        </div>
      ))}
    </div>
  );
}
