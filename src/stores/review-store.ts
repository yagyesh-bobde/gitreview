import { create } from 'zustand';

import type { DiffViewMode } from '@/features/diff-viewer/types';
import type { PRCommentSide } from '@/types/pr';

interface LineSelection {
  start: number;
  end: number;
}

interface CommentAnchor {
  path: string;
  line: number;
  side: PRCommentSide;
}

interface ReviewStore {
  activeFile: string | null;
  viewMode: DiffViewMode;
  selectedLines: LineSelection | null;

  /** Anchor for the comment form the user is currently composing */
  pendingCommentAnchor: CommentAnchor | null;
  /** Set of open (expanded) comment threads, keyed as "path:line:side" */
  openCommentThreads: Set<string>;

  /** Files the user has marked as "viewed", keyed by file path */
  viewedFiles: Record<string, boolean>;

  setActiveFile: (file: string | null) => void;
  setViewMode: (mode: DiffViewMode) => void;
  setSelectedLines: (lines: LineSelection | null) => void;
  setPendingCommentAnchor: (anchor: CommentAnchor | null) => void;
  clearPendingCommentAnchor: () => void;
  toggleCommentThread: (threadKey: string) => void;
  toggleFileViewed: (path: string) => void;
  clearViewedFiles: () => void;
}

export const useReviewStore = create<ReviewStore>((set) => ({
  activeFile: null,
  viewMode: 'unified',
  selectedLines: null,
  pendingCommentAnchor: null,
  openCommentThreads: new Set<string>(),
  viewedFiles: {},

  setActiveFile: (file) =>
    set({ activeFile: file, selectedLines: null }),

  setViewMode: (mode) => set({ viewMode: mode }),

  setSelectedLines: (lines) => set({ selectedLines: lines }),

  setPendingCommentAnchor: (anchor) =>
    set({ pendingCommentAnchor: anchor }),

  clearPendingCommentAnchor: () =>
    set({ pendingCommentAnchor: null }),

  toggleCommentThread: (threadKey) =>
    set((state) => {
      const next = new Set(state.openCommentThreads);
      if (next.has(threadKey)) {
        next.delete(threadKey);
      } else {
        next.add(threadKey);
      }
      return { openCommentThreads: next };
    }),

  toggleFileViewed: (path) =>
    set((state) => {
      const next = { ...state.viewedFiles };
      if (next[path]) {
        delete next[path];
      } else {
        next[path] = true;
      }
      return { viewedFiles: next };
    }),

  clearViewedFiles: () => set({ viewedFiles: {} }),
}));
