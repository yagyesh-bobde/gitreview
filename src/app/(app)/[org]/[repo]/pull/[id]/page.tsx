'use client';

import { use, useEffect, useCallback } from 'react';
import { AppHeader } from '@/components/layout/app-header';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { FileTree } from '@/features/file-tree/components/file-tree';
import { DiffViewer } from '@/features/diff-viewer/components/diff-viewer';
import { PRMetadataBar } from './pr-metadata-bar';
import { usePR } from '@/features/github/hooks/use-pr';
import { usePRFiles } from '@/features/github/hooks/use-pr-files';
import { usePRDiff } from '@/features/github/hooks/use-pr-diff';
import { useReviewStore } from '@/stores/review-store';
import { useUIStore } from '@/stores/ui-store';
import { ErrorBoundary } from '@/components/shared/error-boundary';
import { PageError } from './page-error';
import { ReviewPalette } from './review-palette';
import { ConversationPanel } from './conversation-panel';

interface Props {
  params: Promise<{ org: string; repo: string; id: string }>;
}

export default function PullRequestPage({ params }: Props) {
  const { org, repo, id } = use(params);
  const activeFile = useReviewStore((s) => s.activeFile);
  const setActiveFile = useReviewStore((s) => s.setActiveFile);
  const conversationOpen = useUIStore((s) => s.conversationOpen);

  const prNumber = Number(id);
  const pr = usePR(org, repo, prNumber);
  const files = usePRFiles(org, repo, prNumber);
  const diff = usePRDiff(org, repo, prNumber, activeFile);

  // Auto-select first file when files load
  useEffect(() => {
    if (files.data && files.data.length > 0 && !activeFile) {
      setActiveFile(files.data[0].filename);
    }
  }, [files.data, activeFile, setActiveFile]);

  const handleFileSelect = useCallback(
    (path: string) => {
      setActiveFile(path);
    },
    [setActiveFile],
  );

  // Top-level error state
  if (pr.error && !pr.data) {
    return (
      <PageError
        title="Failed to load pull request"
        message={pr.error.message}
        onRetry={() => pr.refetch()}
      />
    );
  }

  return (
    <ErrorBoundary>
      <ReviewPalette org={org} repo={repo} prNumber={prNumber} />
      <div className="flex h-full flex-col">
        <AppHeader
          pr={
            pr.data
              ? {
                  title: pr.data.title,
                  number: pr.data.number,
                  state: pr.data.state,
                  draft: pr.data.draft,
                }
              : null
          }
          org={org}
          repo={repo}
          isLoading={pr.isLoading}
        />

        <PRMetadataBar pr={pr.data ?? null} isLoading={pr.isLoading} />

        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1">
            <SidebarLayout
              sidebar={
                files.isLoading ? (
                  <FileTreeSkeleton />
                ) : files.error ? (
                  <FileTreeError onRetry={() => files.refetch()} />
                ) : files.data ? (
                  <FileTree
                    files={files.data}
                    selectedFile={activeFile}
                    onFileSelect={handleFileSelect}
                  />
                ) : null
              }
            >
              <DiffViewer fileDiff={diff.data ?? null} isLoading={diff.isLoading} />
            </SidebarLayout>
          </div>

          {conversationOpen && (
            <ConversationPanel org={org} repo={repo} prNumber={prNumber} />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}

const SKELETON_WIDTHS = ['75%', '60%', '85%', '55%', '90%', '65%', '80%', '70%'];

function FileTreeSkeleton() {
  return (
    <div className="space-y-1 p-3">
      {SKELETON_WIDTHS.map((w, i) => (
        <div
          key={i}
          className="h-5 animate-pulse rounded bg-zinc-800"
          style={{ width: w }}
        />
      ))}
    </div>
  );
}

function FileTreeError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 p-4 text-center">
      <p className="text-sm text-zinc-400">Failed to load files</p>
      <button
        onClick={onRetry}
        className="text-sm text-zinc-300 underline underline-offset-2 hover:text-white"
      >
        Retry
      </button>
    </div>
  );
}
