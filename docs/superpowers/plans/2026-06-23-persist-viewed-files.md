# Persist "File Viewed" State (sha-keyed, per-browser) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist a reviewer's "viewed" files across page reloads using localStorage, scoped per PR, and tied to each file's content sha so a file that changes after being marked viewed is automatically un-viewed and flagged "changed since viewed."

**Architecture:** Move the viewed state in the Zustand `review-store` from an in-memory `Record<path, boolean>` to a persisted `viewedByPr: Record<prKey, Record<path, sha>>` map (localStorage via zustand `persist`). The store keeps a transient `currentShaByPath` for the loaded PR and derives two boolean maps for the current PR — `viewedFiles` (sha matches → genuinely viewed) and `staleViewedFiles` (marked viewed but sha changed). All public store actions keep their existing signatures (`toggleFileViewed(path)`, `setFilesViewed(paths, viewed)`, `clearViewedFiles()`) by resolving shas internally, so consumer components need minimal changes. A new `hydratePR(prKey, files)` action is called from the PR page when files load, reconciling persisted state against current shas.

**Tech Stack:** Next.js 16 (App Router, RSC + client components), React 19, Zustand 5 (`persist` + `createJSONStorage`), TanStack Query 5, TypeScript 5.

## Global Constraints

- **Decision (locked):** Stale behavior = **un-view + flag (GitHub-style)** — a file whose sha changed after being marked viewed must NOT count as viewed, and should show a "changed since viewed" indicator.
- **Decision (locked):** Persistence scope = **per-browser (localStorage)** only. No server/API calls. The stubbed DB schema (`src/lib/db/schema/file-review-statuses.ts`) stays untouched as a future upgrade path.
- **No test runner exists** in this repo (`package.json` has no vitest/jest). Verification gates are: `npm run typecheck`, `npm run lint`, `npm run build`, plus the manual QA matrix in Task 5. Tricky logic is isolated in a pure helper module (Task 1) so it can be unit-tested later if a runner is added.
- **Public store API must stay signature-compatible:** `viewedFiles: Record<string, boolean>`, `toggleFileViewed(path: string)`, `setFilesViewed(paths: string[], viewed: boolean)`, `clearViewedFiles()`. Consumers (`file-tree.tsx`, `file-tree-group.tsx`, `file-tree-node.tsx`, `multi-file-diff-viewer.tsx`, dead-but-compiled `diff-header.tsx`) rely on these.
- **Path alias:** `@/` → `src/` (e.g. `@/lib/review/viewed`, `@/stores/review-store`). Match existing import style.
- **SSR-safe:** the store module is imported by `'use client'` components but still evaluated during SSR; localStorage access must be guarded.
- Cap retained PRs at `MAX_TRACKED_PRS = 100` to bound localStorage growth.

---

### Task 1: Pure viewed-state helper module

**Files:**
- Create: `src/lib/review/viewed.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `function prStorageKey(org: string, repo: string, prNumber: number): string`
  - `type ViewedShaMap = Record<string, string>` (filePath → sha viewed at)
  - `type ShaByPath = Record<string, string>` (filePath → current sha)
  - `interface ViewedMaps { viewed: Record<string, boolean>; stale: Record<string, boolean> }`
  - `function deriveViewedMaps(storedShas: ViewedShaMap | undefined, currentShas: ShaByPath): ViewedMaps`
  - `function pruneTrackedPrs<T>(byPr: Record<string, T>, currentKey: string, max: number): Record<string, T>`

- [ ] **Step 1: Create the helper module**

Create `src/lib/review/viewed.ts`:

```ts
/**
 * Pure helpers for sha-keyed "viewed file" review state.
 *
 * A file is considered "viewed" only while the sha it was marked viewed at
 * still matches the file's current sha in the PR. If the author pushes a change
 * to that file, its sha changes and the prior "viewed" mark becomes "stale"
 * (changed since viewed) — it must NOT count as viewed (GitHub behaviour).
 */

/** Stable key identifying a PR review session for persistence scoping. */
export function prStorageKey(
  org: string,
  repo: string,
  prNumber: number,
): string {
  return `${org}/${repo}/${prNumber}`;
}

/** Persisted per-PR record: filePath -> the file sha that was marked viewed. */
export type ViewedShaMap = Record<string, string>;

/** Current file shas for the loaded PR: filePath -> current sha. */
export type ShaByPath = Record<string, string>;

export interface ViewedMaps {
  /** path -> true when the stored sha matches the current sha (genuinely viewed). */
  viewed: Record<string, boolean>;
  /** path -> true when marked viewed but the file changed since (stale). */
  stale: Record<string, boolean>;
}

/**
 * Derive the current-PR viewed/stale boolean maps from the persisted sha map
 * and the current file shas. Paths no longer present in the PR are dropped.
 */
export function deriveViewedMaps(
  storedShas: ViewedShaMap | undefined,
  currentShas: ShaByPath,
): ViewedMaps {
  const viewed: Record<string, boolean> = {};
  const stale: Record<string, boolean> = {};
  if (!storedShas) return { viewed, stale };

  for (const [path, viewedSha] of Object.entries(storedShas)) {
    const currentSha = currentShas[path];
    if (currentSha === undefined) continue; // file no longer in PR
    if (currentSha === viewedSha) viewed[path] = true;
    else stale[path] = true;
  }
  return { viewed, stale };
}

/**
 * Evict oldest PR entries (object insertion order) beyond `max`, never removing
 * the current key. Returns the same reference when nothing needs pruning.
 */
export function pruneTrackedPrs<T>(
  byPr: Record<string, T>,
  currentKey: string,
  max: number,
): Record<string, T> {
  const keys = Object.keys(byPr);
  if (keys.length <= max) return byPr;

  const next = { ...byPr };
  for (const k of keys) {
    if (Object.keys(next).length <= max) break;
    if (k === currentKey) continue;
    delete next[k];
  }
  return next;
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npm run typecheck`
Expected: PASS (no errors). The module is self-contained.

- [ ] **Step 3: Commit**

```bash
git add src/lib/review/viewed.ts
git commit -m "feat(review): add pure sha-keyed viewed-state helpers"
```

---

### Task 2: Rewrite review-store with persisted, sha-keyed viewed state

**Files:**
- Modify: `src/stores/review-store.ts` (full rewrite of the file)

**Interfaces:**
- Consumes: `prStorageKey` (unused here but exported for callers), `deriveViewedMaps`, `pruneTrackedPrs`, `ViewedShaMap`, `ShaByPath` from `@/lib/review/viewed` (Task 1).
- Produces (store shape relied on by later tasks + existing consumers):
  - `viewedFiles: Record<string, boolean>` — current PR, genuinely viewed (UNCHANGED contract).
  - `staleViewedFiles: Record<string, boolean>` — current PR, viewed-but-changed (NEW).
  - `hydratePR(prKey: string, files: Array<{ filename: string; sha: string }>): void` (NEW).
  - `toggleFileViewed(path: string): void` (UNCHANGED signature).
  - `setFilesViewed(paths: string[], viewed: boolean): void` (UNCHANGED signature).
  - `clearViewedFiles(): void` (UNCHANGED signature) — clears current PR only.

- [ ] **Step 1: Replace the store file contents**

Replace the entire contents of `src/stores/review-store.ts` with:

```ts
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
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS. Existing consumers compile unchanged because `viewedFiles`, `toggleFileViewed(path)`, `setFilesViewed(paths, viewed)`, and `clearViewedFiles()` keep their shapes/signatures.

- [ ] **Step 3: Verify lint passes**

Run: `npm run lint`
Expected: PASS (no new errors).

- [ ] **Step 4: Commit**

```bash
git add src/stores/review-store.ts
git commit -m "feat(review): persist viewed files per-PR via sha-keyed localStorage"
```

---

### Task 3: Hydrate viewed state on the PR page when files load

**Files:**
- Modify: `src/app/(app)/[org]/[repo]/pull/[id]/page.tsx`

**Interfaces:**
- Consumes: `useReviewStore` `hydratePR` action (Task 2), `prStorageKey` (Task 1). `files.data` is `PRFile[]` where each item has `filename` and `sha`, matching `hydratePR`'s `Array<{ filename; sha }>` parameter.
- Produces: nothing new; wires persistence into the page lifecycle.

- [ ] **Step 1: Add the import for `prStorageKey`**

In `src/app/(app)/[org]/[repo]/pull/[id]/page.tsx`, add to the imports near the other `@/` imports:

```ts
import { prStorageKey } from '@/lib/review/viewed';
```

- [ ] **Step 2: Select the `hydratePR` action**

Inside `PullRequestPage`, alongside the existing `useReviewStore` selectors (`activeFile`, `setActiveFile`), add:

```ts
  const hydratePR = useReviewStore((s) => s.hydratePR);
```

- [ ] **Step 3: Add the hydration effect**

Immediately after the existing "Auto-select first file when files load" `useEffect` block, add:

```ts
  // Reconcile persisted "viewed" state for this PR against the current file
  // shas whenever the file list loads or changes (e.g. new commits pushed).
  useEffect(() => {
    if (files.data) {
      hydratePR(prStorageKey(org, repo, prNumber), files.data);
    }
  }, [files.data, org, repo, prNumber, hydratePR]);
```

- [ ] **Step 4: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS. (`files.data` is `PRFile[]`; `PRFile` has `filename: string` and `sha: string`, structurally satisfying the param type.)

- [ ] **Step 5: Manual smoke test — persistence across reload**

Run: `npm run dev`
Then in the browser:
1. Open a PR review page (`/<org>/<repo>/pull/<id>`).
2. Mark 2-3 files as viewed (file tree checkmark or the "Viewed" button in a diff header).
3. Confirm the progress bar / "N / M files reviewed" count updates.
4. Reload the tab (Cmd-R).
Expected: the same files are still marked viewed after reload; the count and progress bar are restored. (Before this change they reset to 0.)

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/[org]/[repo]/pull/[id]/page.tsx"
git commit -m "feat(review): hydrate persisted viewed state on PR page load"
```

---

### Task 4: Surface "changed since viewed" flag in the UI

**Files:**
- Modify: `src/features/diff-viewer/components/multi-file-diff-viewer.tsx` (CollapsibleFileHeader)
- Modify: `src/features/file-tree/components/file-tree.tsx` (pass stale map down)
- Modify: `src/features/file-tree/components/file-tree-group.tsx` (thread prop)
- Modify: `src/features/file-tree/components/file-tree-node.tsx` (render indicator)

**Interfaces:**
- Consumes: `staleViewedFiles: Record<string, boolean>` from the store (Task 2).
- Produces: a "Changed" pill in the multi-file header and an amber "changed since viewed" dot on file tree nodes. `FileTreeGroup` and `FileTreeNode` gain a `staleViewedFiles: Record<string, boolean>` prop.

- [ ] **Step 1: Add the "Changed" pill to `CollapsibleFileHeader`**

In `src/features/diff-viewer/components/multi-file-diff-viewer.tsx`, inside `CollapsibleFileHeader`, add a stale selector next to the existing viewed selectors:

```ts
  const viewedFiles = useReviewStore((s) => s.viewedFiles);
  const toggleFileViewed = useReviewStore((s) => s.toggleFileViewed);
  const isViewed = !!viewedFiles[file.filename];
  const isStale = useReviewStore((s) => !!s.staleViewedFiles[file.filename]);
```

Then, in the returned JSX, insert a "Changed" pill immediately **before** the `{/* Status badge */}` `StatusBadge` line:

```tsx
      {/* Changed since last viewed */}
      {isStale && (
        <span
          className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400"
          title="This file changed since you marked it viewed"
        >
          Changed
        </span>
      )}

```

- [ ] **Step 2: Pass `staleViewedFiles` from `FileTree`**

In `src/features/file-tree/components/file-tree.tsx`:

a) Add a selector next to the existing `viewedFiles` selector:

```ts
  const viewedFiles = useReviewStore((s) => s.viewedFiles);
  const staleViewedFiles = useReviewStore((s) => s.staleViewedFiles);
```

b) Pass it to the root `FileTreeGroup` (add the prop alongside `viewedFiles={viewedFiles}`):

```tsx
        <FileTreeGroup
          nodes={tree}
          depth={0}
          selectedFile={selectedFile}
          expandedPaths={expandedPaths}
          viewedFiles={viewedFiles}
          staleViewedFiles={staleViewedFiles}
          onFileSelect={onFileSelect}
          onToggle={toggleDirectory}
          onToggleViewed={handleToggleViewed}
        />
```

- [ ] **Step 3: Thread `staleViewedFiles` through `FileTreeGroup`**

In `src/features/file-tree/components/file-tree-group.tsx`:

a) Add to `FileTreeGroupProps`:

```ts
  viewedFiles: Record<string, boolean>;
  staleViewedFiles: Record<string, boolean>;
```

b) Destructure it in the component params (add `staleViewedFiles` next to `viewedFiles`).

c) Pass `staleViewedFiles={staleViewedFiles}` to **both** the `<FileTreeNode ... />` and the recursive `<FileTreeGroup ... />` (each already passes `viewedFiles={viewedFiles}` — add the stale prop in the same two places).

- [ ] **Step 4: Render the indicator in `FileTreeNode`**

In `src/features/file-tree/components/file-tree-node.tsx`:

a) Add to `FileTreeNodeProps` (next to `viewedFiles`):

```ts
  viewedFiles: Record<string, boolean>;
  staleViewedFiles: Record<string, boolean>;
```

b) Destructure `staleViewedFiles` in the component params (next to `viewedFiles`).

c) After the `isViewed` computation, add:

```ts
  // A file marked viewed whose content changed since (only meaningful for files).
  const isStale = !isDirectory && !!staleViewedFiles[node.path];
```

d) Replace the existing status-dot block:

```tsx
      {/* Status dot for files (hidden once viewed) */}
      {!isDirectory && node.status && !isViewed && (
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            STATUS_DOT_COLORS[node.status]
          )}
        />
      )}
```

with a version that shows an amber "changed since viewed" dot when stale:

```tsx
      {/* Changed-since-viewed indicator (takes precedence over the status dot) */}
      {isStale && (
        <span
          className="size-1.5 shrink-0 rounded-full bg-amber-400"
          title="Changed since you marked it viewed"
        />
      )}

      {/* Status dot for files (hidden once viewed or when showing the changed dot) */}
      {!isDirectory && node.status && !isViewed && !isStale && (
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            STATUS_DOT_COLORS[node.status]
          )}
        />
      )}
```

- [ ] **Step 5: Verify typecheck, lint, and build**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: PASS. All four components compile; no unused-var or missing-prop errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/diff-viewer/components/multi-file-diff-viewer.tsx \
        src/features/file-tree/components/file-tree.tsx \
        src/features/file-tree/components/file-tree-group.tsx \
        src/features/file-tree/components/file-tree-node.tsx
git commit -m "feat(review): flag files changed since marked viewed"
```

---

### Task 5: End-to-end manual verification

**Files:** none (verification only).

**Interfaces:**
- Consumes: the full feature from Tasks 1-4.
- Produces: confirmation the acceptance criteria hold.

- [ ] **Step 1: Run the app**

Run: `npm run dev`

- [ ] **Step 2: Persistence matrix**

Verify each in the browser:

1. **Reload persistence:** Mark files viewed → reload tab → still viewed. ✅ (the original bug.)
2. **Per-PR isolation:** Mark files viewed in PR A → open a different PR B → B shows its own (likely empty) viewed state, not A's → return to A → A's viewed state intact.
3. **Folder toggle:** Mark a folder viewed in the tree → all descendant files show viewed and count updates → reload → still viewed.
4. **Unmark:** Unmark a viewed file → count decreases → reload → stays unmarked.
5. **Clear:** If a "clear" path is exercised, it only clears the current PR, not others.

- [ ] **Step 3: Stale (changed-since-viewed) check**

Simulate a file changing after being viewed (one of):
- **Easiest:** In DevTools → Application → Local Storage → key `gitreview:review-viewed`, edit the stored sha for one viewed file under the current PR's key to a wrong value, then reload.
- **Realistic:** mark a file viewed on a PR, then have a new commit pushed to that PR's branch that touches the file, then reload.

Expected after reload:
- That file is **no longer counted as viewed** (progress count drops by one).
- The file tree node shows the **amber "changed" dot**.
- The multi-file header for that file shows the **"Changed" pill**.
- Re-marking it viewed clears the changed indicator and persists at the new sha.

- [ ] **Step 4: Report results**

Summarize pass/fail for each matrix item. If all pass, the feature is complete. No commit (verification only).

---

## Self-Review

**Spec coverage:**
- "Saving viewed state across reload" → Tasks 2 + 3 (persist + hydrate). ✅
- "Un-view + flag (GitHub-style)" on file change → `deriveViewedMaps` sha comparison (Task 1) + flag UI (Task 4). ✅
- "Per-browser localStorage, no server" → zustand `persist` + `createJSONStorage(localStorage)`, no API calls. ✅
- Latent per-PR bleed bug → fixed by `viewedByPr` scoping + `hydratePR` (Tasks 2-3). ✅

**Type consistency:** `prStorageKey`, `deriveViewedMaps`, `pruneTrackedPrs`, `ViewedShaMap`, `ShaByPath` defined in Task 1 and consumed with matching signatures in Tasks 2-3. Store exposes `viewedFiles`, `staleViewedFiles`, `hydratePR`, `toggleFileViewed`, `setFilesViewed`, `clearViewedFiles` (Task 2); Tasks 3-4 consume exactly these names. `FileTreeGroup`/`FileTreeNode` `staleViewedFiles` prop type (`Record<string, boolean>`) matches the store field. ✅

**Placeholder scan:** No TBD/TODO/"add error handling"/"similar to Task N" — every code step is complete. ✅

**Deviation noted:** No test runner in the repo, so TDD's red/green test cycle is replaced by `typecheck`/`lint`/`build` gates + the Task 5 manual matrix; pure logic is isolated in `src/lib/review/viewed.ts` to enable later unit tests.
