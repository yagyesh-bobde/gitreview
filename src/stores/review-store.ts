import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { DiffViewMode } from '@/features/diff-viewer/types';
import type { PRCommentSide } from '@/types/pr';
import {
  deriveViewedMaps,
  pruneTrackedPrs,
  type ShaByPath,
  type ViewedShaMap,
} from '@/lib/review/viewed';

interface LineSelection {
  start: number;
  end: number;
}

interface CommentAnchor {
  path: string;
  line: number;
  side: PRCommentSide;
}

/** Max number of PRs whose viewed-state we retain in localStorage. */
const MAX_TRACKED_PRS = 100;

interface ReviewStore {
  activeFile: string | null;
  viewMode: DiffViewMode;
  selectedLines: LineSelection | null;

  /** Anchor for the comment form the user is currently composing */
  pendingCommentAnchor: CommentAnchor | null;
  /** Set of open (expanded) comment threads, keyed as "path:line:side" */
  openCommentThreads: Set<string>;

  // --- Viewed state (sha-keyed, persisted per PR) ---
  /** PERSISTED: prKey -> (filePath -> sha the file was viewed at). */
  viewedByPr: Record<string, ViewedShaMap>;
  /** The PR currently loaded (transient, not persisted). */
  currentPrKey: string | null;
  /** Current file shas for the loaded PR (transient, not persisted). */
  currentShaByPath: ShaByPath;
  /** Derived for current PR: path -> genuinely viewed (sha matches). */
  viewedFiles: Record<string, boolean>;
  /** Derived for current PR: path -> viewed but changed since (stale). */
  staleViewedFiles: Record<string, boolean>;

  setActiveFile: (file: string | null) => void;
  setViewMode: (mode: DiffViewMode) => void;
  setSelectedLines: (lines: LineSelection | null) => void;
  setPendingCommentAnchor: (anchor: CommentAnchor | null) => void;
  clearPendingCommentAnchor: () => void;
  toggleCommentThread: (threadKey: string) => void;

  /**
   * Load a PR's persisted viewed-state and reconcile it against the current
   * file shas. Recomputes `viewedFiles`/`staleViewedFiles`, drops stored paths
   * no longer in the PR, and prunes old PRs from storage. Call when PR files
   * load (and on refetch).
   */
  hydratePR: (
    prKey: string,
    files: Array<{ filename: string; sha: string }>,
  ) => void;
  toggleFileViewed: (path: string) => void;
  /** Mark/unmark many files at once (e.g. a whole folder). */
  setFilesViewed: (paths: string[], viewed: boolean) => void;
  /** Clear viewed-state for the currently loaded PR only. */
  clearViewedFiles: () => void;
}

export const useReviewStore = create<ReviewStore>()(
  persist(
    (set) => ({
      activeFile: null,
      viewMode: 'unified',
      selectedLines: null,
      pendingCommentAnchor: null,
      openCommentThreads: new Set<string>(),

      viewedByPr: {},
      currentPrKey: null,
      currentShaByPath: {},
      viewedFiles: {},
      staleViewedFiles: {},

      setActiveFile: (file) => set({ activeFile: file, selectedLines: null }),

      setViewMode: (mode) => set({ viewMode: mode }),

      setSelectedLines: (lines) => set({ selectedLines: lines }),

      setPendingCommentAnchor: (anchor) =>
        set({ pendingCommentAnchor: anchor }),

      clearPendingCommentAnchor: () => set({ pendingCommentAnchor: null }),

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

      hydratePR: (prKey, files) =>
        set((state) => {
          const currentShaByPath: ShaByPath = {};
          for (const f of files) currentShaByPath[f.filename] = f.sha;

          const stored = state.viewedByPr[prKey];
          const { viewed, stale } = deriveViewedMaps(stored, currentShaByPath);

          // Drop stored entries for files no longer in the PR so localStorage
          // doesn't accumulate dead paths.
          let nextByPr = state.viewedByPr;
          if (stored) {
            const cleaned: ViewedShaMap = {};
            for (const [path, sha] of Object.entries(stored)) {
              if (currentShaByPath[path] !== undefined) cleaned[path] = sha;
            }
            nextByPr = { ...state.viewedByPr, [prKey]: cleaned };
          }
          nextByPr = pruneTrackedPrs(nextByPr, prKey, MAX_TRACKED_PRS);

          return {
            currentPrKey: prKey,
            currentShaByPath,
            viewedFiles: viewed,
            staleViewedFiles: stale,
            viewedByPr: nextByPr,
          };
        }),

      toggleFileViewed: (path) =>
        set((state) => {
          const { currentPrKey, currentShaByPath } = state;
          if (!currentPrKey) return {};
          const sha = currentShaByPath[path];
          if (sha === undefined) return {};

          const prMap = { ...(state.viewedByPr[currentPrKey] ?? {}) };
          const viewed = { ...state.viewedFiles };
          const stale = { ...state.staleViewedFiles };

          if (viewed[path]) {
            delete prMap[path];
            delete viewed[path];
          } else {
            prMap[path] = sha;
            viewed[path] = true;
          }
          delete stale[path]; // toggling always clears the changed-since flag

          return {
            viewedByPr: { ...state.viewedByPr, [currentPrKey]: prMap },
            viewedFiles: viewed,
            staleViewedFiles: stale,
          };
        }),

      setFilesViewed: (paths, isViewed) =>
        set((state) => {
          const { currentPrKey, currentShaByPath } = state;
          if (!currentPrKey) return {};

          const prMap = { ...(state.viewedByPr[currentPrKey] ?? {}) };
          const viewed = { ...state.viewedFiles };
          const stale = { ...state.staleViewedFiles };

          for (const path of paths) {
            const sha = currentShaByPath[path];
            if (sha === undefined) continue;
            if (isViewed) {
              prMap[path] = sha;
              viewed[path] = true;
            } else {
              delete prMap[path];
              delete viewed[path];
            }
            delete stale[path];
          }

          return {
            viewedByPr: { ...state.viewedByPr, [currentPrKey]: prMap },
            viewedFiles: viewed,
            staleViewedFiles: stale,
          };
        }),

      clearViewedFiles: () =>
        set((state) => {
          const { currentPrKey } = state;
          if (!currentPrKey) return { viewedFiles: {}, staleViewedFiles: {} };
          const nextByPr = { ...state.viewedByPr };
          delete nextByPr[currentPrKey];
          return {
            viewedByPr: nextByPr,
            viewedFiles: {},
            staleViewedFiles: {},
          };
        }),
    }),
    {
      name: 'gitreview:review-viewed',
      version: 1,
      // Guard storage so SSR (no window) never touches localStorage.
      storage: createJSONStorage(() =>
        typeof window !== 'undefined'
          ? window.localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            },
      ),
      // Only the durable per-PR sha map is persisted; everything else
      // (active file, view mode, comment threads, derived maps) is transient.
      partialize: (state) => ({ viewedByPr: state.viewedByPr }),
    },
  ),
);
