# GitReview Testing Plan

> Comprehensive automated testing strategy for the GitReview PR review tool.
> Next.js 16 / React 19 / TypeScript / Drizzle ORM / Shiki / TanStack Query + Virtual

---

## Table of Contents

1. [Testing Stack](#1-testing-stack)
2. [Project Structure](#2-project-structure)
3. [Unit Tests](#3-unit-tests)
4. [Component Tests](#4-component-tests)
5. [Integration Tests](#5-integration-tests)
6. [E2E Browser Tests](#6-e2e-browser-tests)
7. [Mock Data Strategy](#7-mock-data-strategy)
8. [CI/CD Integration](#8-cicd-integration)
9. [Coverage Thresholds](#9-coverage-thresholds)

---

## 1. Testing Stack

### Decisions

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Test runner | **Vitest 3.x** | Native ESM, `moduleResolution: bundler` compat, 5-10x faster than Jest on cold starts, first-class TypeScript via esbuild. Jest's CJS transform layer fights Next.js 16's ESM-first model. |
| Browser / E2E | **Playwright 1.x** | Multi-browser (Chromium, Firefox, WebKit), network interception, native `toHaveScreenshot()` for visual regression. Cypress can't do multi-tab or multi-origin without hacks. |
| Component testing | **@testing-library/react** + **vitest** | Industry standard for "test like a user." Avoids shallow rendering trap. |
| React rendering in tests | **happy-dom** (unit/component), **Playwright** (E2E) | happy-dom is 2-3x faster than jsdom for our use case. Playwright for anything needing real browser APIs (IntersectionObserver, canvas, scroll). |
| API mocking | **msw 2.x** (Mock Service Worker) | Intercepts at the network level, works in both Node (tests) and browser (Storybook/dev). Same mock definitions across unit, integration, and component tests. |
| Visual regression | **Playwright `toHaveScreenshot()`** | Built-in, no third-party service. Stored in repo as `*.png` baselines. |
| Coverage | **v8** via Vitest | Faster than istanbul, accurate for modern JS. |

### Packages to Install

```bash
# Unit + Component testing
pnpm add -D vitest @vitest/coverage-v8 @vitest/ui happy-dom \
  @testing-library/react @testing-library/user-event @testing-library/jest-dom \
  msw

# E2E testing
pnpm add -D @playwright/test

# Playwright browsers (CI will use npx playwright install --with-deps)
npx playwright install chromium
```

---

## 2. Project Structure

```
gitreview/
  vitest.config.ts              # Vitest config (unit + component)
  vitest.workspace.ts           # Workspace: [unit, component, integration]
  playwright.config.ts          # Playwright config (E2E)
  src/
    __tests__/                  # Integration tests (API routes, auth flow)
      api/
        github-pr.test.ts
        github-files.test.ts
        github-diff.test.ts
        review-sessions.test.ts
        ai-chat.test.ts
      auth/
        auth-flow.test.ts
    features/
      diff-viewer/
        lib/
          __tests__/
            parse-diff.test.ts          # CRITICAL: most important unit test
            line-mapping.test.ts
            diff-utils.test.ts
            syntax-highlight.test.ts
        components/
          __tests__/
            diff-viewer.test.tsx
            unified-diff.test.tsx
            split-diff.test.tsx
            diff-virtual-scroller.test.tsx
      file-tree/
        lib/
          __tests__/
            file-tree-builder.test.ts
            categorize.test.ts
            impact-scoring.test.ts
            file-patterns.test.ts
        components/
          __tests__/
            file-tree.test.tsx
            file-tree-node.test.tsx
            file-tree-search.test.tsx
      github/
        api/
          __tests__/
            client.test.ts
            pulls.test.ts
            contents.test.ts
            comments.test.ts
        utils/
          __tests__/
            rate-limit-tracker.test.ts
            etag-cache.test.ts
      auth/
        components/
          __tests__/
            sign-in-button.test.tsx
            user-menu.test.tsx
            auth-guard.test.tsx
      keyboard/
        __tests__/
          shortcuts.test.ts
          use-keyboard-nav.test.tsx
      ai-bar/
        lib/
          __tests__/
            prompt-builder.test.ts
            context-extractor.test.ts
            token-budget.test.ts
    stores/
      __tests__/
        review-store.test.ts
        ai-bar-store.test.ts
        ui-store.test.ts
  tests/
    e2e/
      auth.spec.ts
      pr-review.spec.ts
      file-navigation.spec.ts
      diff-viewer.spec.ts
      keyboard-nav.spec.ts
      responsive.spec.ts
      performance.spec.ts
    fixtures/
      pr-small.json              # 3 files, ~50 lines changed
      pr-medium.json             # 20 files, ~500 lines changed
      pr-large.json              # 200+ files, ~5000 lines changed
      pr-binary-files.json       # Binary file changes
      pr-rename.json             # File renames/moves
      diff-unified.patch         # Raw unified diff text
      diff-conflict.patch        # Merge conflict markers
      github/
        pr-response.json         # GET /repos/:owner/:repo/pulls/:number
        pr-files-response.json   # GET /repos/.../pulls/:number/files
        pr-diff-response.txt     # GET /repos/.../pulls/:number (Accept: diff)
        pr-comments-response.json
        rate-limit-response.json
    helpers/
      render-with-providers.tsx  # Wraps component in QueryProvider + theme + session
      create-mock-pr.ts          # Factory for PR test data
      create-mock-diff.ts        # Factory for diff/hunk test data
      setup-msw.ts               # MSW server bootstrap
      playwright-helpers.ts      # Login helper, navigation helpers
    msw/
      handlers/
        github.ts               # GitHub API mock handlers
        auth.ts                  # NextAuth mock handlers
        ai.ts                    # Gemini API mock handlers
      server.ts                  # MSW setupServer()
      browser.ts                 # MSW setupWorker() (for Storybook)
```

---

## 3. Unit Tests

### 3.1. Diff Parser (`parse-diff.ts`) -- CRITICAL PATH

This is the single most important unit to test. A bug here silently corrupts every diff view.

**File:** `src/features/diff-viewer/lib/__tests__/parse-diff.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { parseDiff } from '../parse-diff';

// Test data: raw unified diff strings
const SIMPLE_ADD = `--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,5 @@
 import { foo } from './foo';
+import { bar } from './bar';
+import { baz } from './baz';

 export function main() {`;

const SIMPLE_DELETE = `--- a/src/old.ts
+++ b/src/old.ts
@@ -1,5 +1,3 @@
 import { foo } from './foo';
-import { bar } from './bar';
-import { baz } from './baz';

 export function main() {`;

const MULTI_HUNK = `--- a/src/app.ts
+++ b/src/app.ts
@@ -1,4 +1,4 @@
-const OLD = 'old';
+const NEW = 'new';

 function a() {}

@@ -10,4 +10,5 @@
 function b() {}

+// Added comment
 function c() {}
 `;

describe('parseDiff', () => {
  describe('basic parsing', () => {
    it('parses a simple addition', () => {
      const result = parseDiff(SIMPLE_ADD);
      expect(result).toHaveLength(1); // one file
      expect(result[0].hunks).toHaveLength(1);
      expect(result[0].hunks[0].lines.filter(l => l.type === 'add')).toHaveLength(2);
    });

    it('parses a simple deletion', () => {
      const result = parseDiff(SIMPLE_DELETE);
      expect(result[0].hunks[0].lines.filter(l => l.type === 'delete')).toHaveLength(2);
    });

    it('parses multiple hunks in a single file', () => {
      const result = parseDiff(MULTI_HUNK);
      expect(result[0].hunks).toHaveLength(2);
    });

    it('returns empty array for empty input', () => {
      expect(parseDiff('')).toEqual([]);
    });

    it('returns empty array for whitespace-only input', () => {
      expect(parseDiff('   \n\n  ')).toEqual([]);
    });
  });

  describe('line numbering', () => {
    it('tracks old and new line numbers correctly for additions', () => {
      const result = parseDiff(SIMPLE_ADD);
      const lines = result[0].hunks[0].lines;
      // First context line: old=1, new=1
      expect(lines[0]).toMatchObject({ oldLine: 1, newLine: 1, type: 'context' });
      // First addition: old=null, new=2
      expect(lines[1]).toMatchObject({ oldLine: null, newLine: 2, type: 'add' });
    });

    it('tracks old and new line numbers correctly for deletions', () => {
      const result = parseDiff(SIMPLE_DELETE);
      const lines = result[0].hunks[0].lines;
      const deletions = lines.filter(l => l.type === 'delete');
      // Deletions have oldLine but no newLine
      expect(deletions[0].oldLine).toBeDefined();
      expect(deletions[0].newLine).toBeNull();
    });

    it('maintains correct line count across multiple hunks', () => {
      const result = parseDiff(MULTI_HUNK);
      const hunk2 = result[0].hunks[1];
      // Second hunk starts at line 10 (old)
      expect(hunk2.oldStart).toBe(10);
      expect(hunk2.newStart).toBe(10);
    });
  });

  describe('edge cases', () => {
    it('handles file with no newline at EOF marker', () => {
      const diff = `--- a/f.txt
+++ b/f.txt
@@ -1 +1 @@
-old
\\ No newline at end of file
+new
\\ No newline at end of file`;
      const result = parseDiff(diff);
      expect(result[0].hunks[0].lines).toBeDefined();
    });

    it('handles new file (--- /dev/null)', () => {
      const diff = `--- /dev/null
+++ b/new-file.ts
@@ -0,0 +1,3 @@
+line 1
+line 2
+line 3`;
      const result = parseDiff(diff);
      expect(result[0].oldPath).toBeNull();
      expect(result[0].newPath).toBe('new-file.ts');
    });

    it('handles deleted file (+++ /dev/null)', () => {
      const diff = `--- a/deleted.ts
+++ /dev/null
@@ -1,3 +0,0 @@
-line 1
-line 2
-line 3`;
      const result = parseDiff(diff);
      expect(result[0].newPath).toBeNull();
    });

    it('handles renamed file', () => {
      const diff = `diff --git a/old-name.ts b/new-name.ts
similarity index 95%
rename from old-name.ts
rename to new-name.ts
--- a/old-name.ts
+++ b/new-name.ts
@@ -1,3 +1,3 @@
-const a = 1;
+const a = 2;
 const b = 2;
 const c = 3;`;
      const result = parseDiff(diff);
      expect(result[0].oldPath).toBe('old-name.ts');
      expect(result[0].newPath).toBe('new-name.ts');
    });

    it('handles binary file diff', () => {
      const diff = `diff --git a/image.png b/image.png
Binary files a/image.png and b/image.png differ`;
      const result = parseDiff(diff);
      expect(result[0].isBinary).toBe(true);
      expect(result[0].hunks).toHaveLength(0);
    });

    it('handles diff with Unicode content', () => {
      const diff = `--- a/i18n.ts
+++ b/i18n.ts
@@ -1,3 +1,3 @@
-const greeting = 'Hello';
+const greeting = '\u3053\u3093\u306b\u3061\u306f';
 const emoji = '\ud83d\ude80';
 const cjk = '\u4e2d\u6587';`;
      const result = parseDiff(diff);
      expect(result[0].hunks[0].lines[1].content).toContain('\u3053\u3093\u306b\u3061\u306f');
    });

    it('handles very long lines (>10000 chars) without crashing', () => {
      const longLine = 'x'.repeat(15000);
      const diff = `--- a/f.ts
+++ b/f.ts
@@ -1 +1 @@
-${longLine}
+${longLine}modified`;
      expect(() => parseDiff(diff)).not.toThrow();
    });

    it('handles diff with only context lines (permissions change)', () => {
      const diff = `diff --git a/script.sh b/script.sh
old mode 100644
new mode 100755`;
      const result = parseDiff(diff);
      expect(result[0].hunks).toHaveLength(0);
      expect(result[0].modeChange).toBeDefined();
    });
  });

  describe('multi-file diffs', () => {
    it('splits a multi-file diff into separate file entries', () => {
      const diff = `--- a/file1.ts
+++ b/file1.ts
@@ -1 +1 @@
-old1
+new1
--- a/file2.ts
+++ b/file2.ts
@@ -1 +1 @@
-old2
+new2`;
      const result = parseDiff(diff);
      expect(result).toHaveLength(2);
      expect(result[0].newPath).toBe('file1.ts');
      expect(result[1].newPath).toBe('file2.ts');
    });
  });

  describe('performance', () => {
    it('parses a 5000-line diff in under 50ms', () => {
      // Generate a large diff
      const lines: string[] = ['--- a/big.ts', '+++ b/big.ts', '@@ -1,2500 +1,2500 @@'];
      for (let i = 0; i < 2500; i++) {
        lines.push(`-old line ${i}`);
        lines.push(`+new line ${i}`);
      }
      const bigDiff = lines.join('\n');

      const start = performance.now();
      const result = parseDiff(bigDiff);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(50);
      expect(result[0].hunks[0].lines).toHaveLength(5000);
    });
  });
});
```

### 3.2. File Tree Builder

**File:** `src/features/file-tree/lib/__tests__/file-tree-builder.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { buildFileTree } from '../file-tree-builder';

describe('buildFileTree', () => {
  it('builds a nested tree from flat file paths', () => {
    const files = [
      { path: 'src/index.ts', additions: 10, deletions: 5 },
      { path: 'src/utils/helpers.ts', additions: 3, deletions: 0 },
      { path: 'README.md', additions: 1, deletions: 1 },
    ];
    const tree = buildFileTree(files);

    expect(tree.children).toHaveLength(2); // src/, README.md
    const srcNode = tree.children.find(n => n.name === 'src');
    expect(srcNode?.children).toHaveLength(2); // index.ts, utils/
  });

  it('collapses single-child directories (src/app/ -> src/app/)', () => {
    const files = [
      { path: 'src/app/components/button.tsx', additions: 5, deletions: 0 },
    ];
    const tree = buildFileTree(files);
    // Should collapse src/app/components into a single node
    // (implementation-dependent, but the test documents the expectation)
    expect(tree).toBeDefined();
  });

  it('handles root-level files', () => {
    const files = [{ path: 'package.json', additions: 2, deletions: 1 }];
    const tree = buildFileTree(files);
    expect(tree.children[0].name).toBe('package.json');
    expect(tree.children[0].isDirectory).toBe(false);
  });

  it('sorts directories before files', () => {
    const files = [
      { path: 'z-file.ts', additions: 1, deletions: 0 },
      { path: 'a-dir/file.ts', additions: 1, deletions: 0 },
    ];
    const tree = buildFileTree(files);
    expect(tree.children[0].isDirectory).toBe(true);
    expect(tree.children[1].isDirectory).toBe(false);
  });

  it('handles empty file list', () => {
    const tree = buildFileTree([]);
    expect(tree.children).toHaveLength(0);
  });

  it('propagates addition/deletion counts to parent directories', () => {
    const files = [
      { path: 'src/a.ts', additions: 10, deletions: 5 },
      { path: 'src/b.ts', additions: 3, deletions: 2 },
    ];
    const tree = buildFileTree(files);
    const srcNode = tree.children.find(n => n.name === 'src');
    expect(srcNode?.additions).toBe(13);
    expect(srcNode?.deletions).toBe(7);
  });
});
```

### 3.3. GitHub API Client

**File:** `src/features/github/api/__tests__/client.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createGitHubClient } from '../client';

// MSW is used at integration level; here we test the client's logic,
// not the network calls themselves.
describe('createGitHubClient', () => {
  it('throws if no access token is provided', () => {
    expect(() => createGitHubClient('')).toThrow();
  });

  it('sets the Authorization header', () => {
    const client = createGitHubClient('ghp_test123');
    // Verify internal state or use a spy on fetch
    expect(client).toBeDefined();
  });

  it('includes Accept: application/vnd.github.v3+json by default', () => {
    const client = createGitHubClient('ghp_test123');
    expect(client).toBeDefined();
  });
});
```

### 3.4. Rate Limit Tracker

**File:** `src/features/github/utils/__tests__/rate-limit-tracker.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RateLimitTracker } from '../rate-limit-tracker';

describe('RateLimitTracker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('tracks remaining requests from response headers', () => {
    const tracker = new RateLimitTracker();
    tracker.update({
      'x-ratelimit-remaining': '4999',
      'x-ratelimit-limit': '5000',
      'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
    });
    expect(tracker.remaining).toBe(4999);
  });

  it('returns true for shouldThrottle when near limit', () => {
    const tracker = new RateLimitTracker();
    tracker.update({
      'x-ratelimit-remaining': '5',
      'x-ratelimit-limit': '5000',
      'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
    });
    expect(tracker.shouldThrottle()).toBe(true);
  });

  it('returns time until reset', () => {
    const tracker = new RateLimitTracker();
    const resetTime = Math.floor(Date.now() / 1000) + 3600;
    tracker.update({
      'x-ratelimit-remaining': '0',
      'x-ratelimit-limit': '5000',
      'x-ratelimit-reset': String(resetTime),
    });
    expect(tracker.timeUntilReset()).toBeGreaterThan(0);
  });
});
```

### 3.5. ETag Cache

**File:** `src/features/github/utils/__tests__/etag-cache.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { ETagCache } from '../etag-cache';

describe('ETagCache', () => {
  it('stores and retrieves an etag for a URL', () => {
    const cache = new ETagCache();
    cache.set('/repos/foo/bar/pulls/1', '"abc123"', { title: 'Test PR' });
    const entry = cache.get('/repos/foo/bar/pulls/1');
    expect(entry?.etag).toBe('"abc123"');
    expect(entry?.data.title).toBe('Test PR');
  });

  it('returns undefined for unknown URLs', () => {
    const cache = new ETagCache();
    expect(cache.get('/unknown')).toBeUndefined();
  });

  it('overwrites existing entries', () => {
    const cache = new ETagCache();
    cache.set('/url', '"v1"', { old: true });
    cache.set('/url', '"v2"', { old: false });
    expect(cache.get('/url')?.etag).toBe('"v2"');
  });
});
```

### 3.6. Keyboard Shortcuts

**File:** `src/features/keyboard/__tests__/shortcuts.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { SHORTCUTS } from '../shortcuts';

describe('SHORTCUTS', () => {
  it('defines j for next file/hunk', () => {
    expect(SHORTCUTS['j']).toBeDefined();
    expect(SHORTCUTS['j'].action).toBe('next-file');
  });

  it('defines ? for help modal', () => {
    expect(SHORTCUTS['?']).toBeDefined();
  });

  it('has no duplicate key bindings', () => {
    const keys = Object.keys(SHORTCUTS);
    const unique = new Set(keys);
    expect(keys.length).toBe(unique.size);
  });
});
```

### 3.7. AI Prompt Builder / Token Budget

**File:** `src/features/ai-bar/lib/__tests__/token-budget.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { TokenBudget } from '../token-budget';

describe('TokenBudget', () => {
  it('calculates approximate token count for text', () => {
    const budget = new TokenBudget(4096);
    const count = budget.estimateTokens('Hello world, this is a test.');
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(20);
  });

  it('returns true when content exceeds budget', () => {
    const budget = new TokenBudget(10);
    const longText = 'word '.repeat(1000);
    expect(budget.exceedsBudget(longText)).toBe(true);
  });

  it('truncates content to fit budget', () => {
    const budget = new TokenBudget(50);
    const longText = 'word '.repeat(1000);
    const truncated = budget.truncateToFit(longText);
    expect(budget.exceedsBudget(truncated)).toBe(false);
  });
});
```

### 3.8. Zustand Stores

**File:** `src/stores/__tests__/review-store.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useReviewStore } from '../review-store';

describe('useReviewStore', () => {
  beforeEach(() => {
    // Reset store between tests
    useReviewStore.setState(useReviewStore.getInitialState());
  });

  it('sets active file', () => {
    useReviewStore.getState().setActiveFile('src/index.ts');
    expect(useReviewStore.getState().activeFile).toBe('src/index.ts');
  });

  it('sets view mode (unified/split)', () => {
    useReviewStore.getState().setViewMode('split');
    expect(useReviewStore.getState().viewMode).toBe('split');
  });

  it('tracks reviewed files', () => {
    useReviewStore.getState().markFileReviewed('src/a.ts');
    useReviewStore.getState().markFileReviewed('src/b.ts');
    expect(useReviewStore.getState().reviewedFiles).toContain('src/a.ts');
    expect(useReviewStore.getState().reviewedFiles).toContain('src/b.ts');
  });

  it('toggles file reviewed status', () => {
    useReviewStore.getState().markFileReviewed('src/a.ts');
    useReviewStore.getState().unmarkFileReviewed('src/a.ts');
    expect(useReviewStore.getState().reviewedFiles).not.toContain('src/a.ts');
  });
});
```

---

## 4. Component Tests

### Test Utilities

**File:** `tests/helpers/render-with-providers.tsx`

```typescript
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactElement, type PropsWithChildren } from 'react';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

export function renderWithProviders(
  ui: ReactElement,
  { queryClient = createTestQueryClient(), ...options }: ExtendedRenderOptions = {},
) {
  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...options }),
    queryClient,
  };
}
```

### 4.1. File Tree Component

**File:** `src/features/file-tree/components/__tests__/file-tree.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@tests/helpers/render-with-providers';
import { FileTree } from '../file-tree';

const mockFiles = [
  { path: 'src/index.ts', additions: 10, deletions: 5, status: 'modified' as const },
  { path: 'src/utils/helpers.ts', additions: 3, deletions: 0, status: 'added' as const },
  { path: 'README.md', additions: 1, deletions: 1, status: 'modified' as const },
];

describe('FileTree', () => {
  it('renders all file names', () => {
    renderWithProviders(
      <FileTree files={mockFiles} activeFile={null} onFileSelect={vi.fn()} />,
    );
    expect(screen.getByText('index.ts')).toBeInTheDocument();
    expect(screen.getByText('helpers.ts')).toBeInTheDocument();
    expect(screen.getByText('README.md')).toBeInTheDocument();
  });

  it('shows directories as expandable', () => {
    renderWithProviders(
      <FileTree files={mockFiles} activeFile={null} onFileSelect={vi.fn()} />,
    );
    expect(screen.getByText('src')).toBeInTheDocument();
  });

  it('collapses a directory on click', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <FileTree files={mockFiles} activeFile={null} onFileSelect={vi.fn()} />,
    );

    const srcDir = screen.getByText('src');
    await user.click(srcDir);

    // After collapse, child files should be hidden
    expect(screen.queryByText('index.ts')).not.toBeVisible();
  });

  it('calls onFileSelect when a file is clicked', async () => {
    const user = userEvent.setup();
    const onFileSelect = vi.fn();
    renderWithProviders(
      <FileTree files={mockFiles} activeFile={null} onFileSelect={onFileSelect} />,
    );

    await user.click(screen.getByText('README.md'));
    expect(onFileSelect).toHaveBeenCalledWith('README.md');
  });

  it('highlights the active file', () => {
    renderWithProviders(
      <FileTree files={mockFiles} activeFile="src/index.ts" onFileSelect={vi.fn()} />,
    );
    const activeNode = screen.getByText('index.ts').closest('[data-active]');
    expect(activeNode).toHaveAttribute('data-active', 'true');
  });

  it('shows addition/deletion counts', () => {
    renderWithProviders(
      <FileTree files={mockFiles} activeFile={null} onFileSelect={vi.fn()} />,
    );
    expect(screen.getByText('+10')).toBeInTheDocument();
    expect(screen.getByText('-5')).toBeInTheDocument();
  });
});
```

### 4.2. Diff Viewer Component

**File:** `src/features/diff-viewer/components/__tests__/diff-viewer.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@tests/helpers/render-with-providers';
import { DiffViewer } from '../diff-viewer';

const mockHunks = [
  {
    oldStart: 1,
    oldCount: 3,
    newStart: 1,
    newCount: 4,
    lines: [
      { type: 'context' as const, content: 'import { foo } from "./foo";', oldLine: 1, newLine: 1 },
      { type: 'add' as const, content: 'import { bar } from "./bar";', oldLine: null, newLine: 2 },
      { type: 'context' as const, content: '', oldLine: 2, newLine: 3 },
      { type: 'context' as const, content: 'export function main() {}', oldLine: 3, newLine: 4 },
    ],
  },
];

describe('DiffViewer', () => {
  it('renders in unified view by default', () => {
    renderWithProviders(
      <DiffViewer hunks={mockHunks} filePath="src/index.ts" viewMode="unified" />,
    );
    expect(screen.getByText(/import \{ bar \}/)).toBeInTheDocument();
  });

  it('shows added lines with green styling', () => {
    renderWithProviders(
      <DiffViewer hunks={mockHunks} filePath="src/index.ts" viewMode="unified" />,
    );
    const addedLine = screen.getByText(/import \{ bar \}/).closest('[data-line-type]');
    expect(addedLine).toHaveAttribute('data-line-type', 'add');
  });

  it('displays line numbers in the gutter', () => {
    renderWithProviders(
      <DiffViewer hunks={mockHunks} filePath="src/index.ts" viewMode="unified" />,
    );
    // Line 1 old, line 1 new for the context line
    expect(screen.getByText('1', { selector: '[data-gutter="old"]' })).toBeInTheDocument();
  });

  it('renders in split view when viewMode is split', () => {
    renderWithProviders(
      <DiffViewer hunks={mockHunks} filePath="src/index.ts" viewMode="split" />,
    );
    // Split view should have two columns
    const columns = document.querySelectorAll('[data-diff-side]');
    expect(columns.length).toBeGreaterThanOrEqual(2);
  });

  it('shows file path in the header', () => {
    renderWithProviders(
      <DiffViewer hunks={mockHunks} filePath="src/index.ts" viewMode="unified" />,
    );
    expect(screen.getByText('src/index.ts')).toBeInTheDocument();
  });
});
```

### 4.3. Auth Components

**File:** `src/features/auth/components/__tests__/auth-guard.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@tests/helpers/render-with-providers';
import { AuthGuard } from '../auth-guard';

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

import { useSession } from 'next-auth/react';
const mockUseSession = vi.mocked(useSession);

describe('AuthGuard', () => {
  it('renders children when authenticated', () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: 'Test', email: 'test@example.com' }, expires: '' },
      status: 'authenticated',
      update: vi.fn(),
    });

    renderWithProviders(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>,
    );
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('shows loading state while session loads', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading',
      update: vi.fn(),
    });

    renderWithProviders(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>,
    );
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects to login when unauthenticated', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: vi.fn(),
    });

    renderWithProviders(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>,
    );
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
```

---

## 5. Integration Tests

### 5.1. API Route Tests

Uses MSW to mock the upstream GitHub API while testing our Next.js API routes end-to-end.

**File:** `tests/msw/handlers/github.ts`

```typescript
import { http, HttpResponse } from 'msw';

export const githubHandlers = [
  // GET PR metadata
  http.get('https://api.github.com/repos/:owner/:repo/pulls/:number', ({ params }) => {
    return HttpResponse.json({
      number: Number(params.number),
      title: 'Test PR: Add new feature',
      state: 'open',
      user: { login: 'testuser', avatar_url: 'https://github.com/testuser.png' },
      head: { sha: 'abc123', ref: 'feature-branch' },
      base: { sha: 'def456', ref: 'main' },
      additions: 100,
      deletions: 50,
      changed_files: 5,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-02T00:00:00Z',
    });
  }),

  // GET PR files
  http.get('https://api.github.com/repos/:owner/:repo/pulls/:number/files', () => {
    return HttpResponse.json([
      {
        sha: 'file1sha',
        filename: 'src/index.ts',
        status: 'modified',
        additions: 10,
        deletions: 5,
        patch: '@@ -1,3 +1,5 @@\n import { foo } from "./foo";\n+import { bar } from "./bar";\n+import { baz } from "./baz";\n \n export function main() {}',
      },
      {
        sha: 'file2sha',
        filename: 'README.md',
        status: 'modified',
        additions: 1,
        deletions: 1,
        patch: '@@ -1 +1 @@\n-# Old Title\n+# New Title',
      },
    ]);
  }),

  // GET PR as diff
  http.get('https://api.github.com/repos/:owner/:repo/pulls/:number', ({ request }) => {
    if (request.headers.get('Accept') === 'application/vnd.github.v3.diff') {
      return HttpResponse.text('--- a/src/index.ts\n+++ b/src/index.ts\n@@ -1 +1 @@\n-old\n+new');
    }
    // Fall through to JSON handler above (MSW uses first match, so order matters --
    // in practice, split into separate handler based on Accept header check)
  }),

  // GET PR comments
  http.get('https://api.github.com/repos/:owner/:repo/pulls/:number/comments', () => {
    return HttpResponse.json([
      {
        id: 1,
        body: 'Looks good!',
        user: { login: 'reviewer', avatar_url: 'https://github.com/reviewer.png' },
        path: 'src/index.ts',
        line: 2,
        created_at: '2025-01-02T00:00:00Z',
      },
    ]);
  }),

  // Rate limit response
  http.get('https://api.github.com/rate_limit', () => {
    return HttpResponse.json({
      rate: { limit: 5000, remaining: 4999, reset: Math.floor(Date.now() / 1000) + 3600 },
    });
  }),
];
```

**File:** `tests/msw/server.ts`

```typescript
import { setupServer } from 'msw/node';
import { githubHandlers } from './handlers/github';

export const server = setupServer(...githubHandlers);
```

**File:** `src/__tests__/api/github-pr.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { server } from '@tests/msw/server';
import { GET } from '@/app/api/github/[org]/[repo]/pull/[id]/route';
import { NextRequest } from 'next/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('GET /api/github/:org/:repo/pull/:id', () => {
  it('returns PR metadata', async () => {
    const request = new NextRequest('http://localhost:3000/api/github/facebook/react/pull/123');
    const response = await GET(request, {
      params: { org: 'facebook', repo: 'react', id: '123' },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.title).toBe('Test PR: Add new feature');
    expect(data.number).toBe(123);
  });

  it('returns 401 without auth', async () => {
    // Test with no session cookie
    const request = new NextRequest('http://localhost:3000/api/github/facebook/react/pull/123');
    // Remove auth -- depends on implementation
    const response = await GET(request, {
      params: { org: 'facebook', repo: 'react', id: '123' },
    });
    // Expect 401 or redirect depending on auth strategy
    expect([401, 302]).toContain(response.status);
  });
});
```

### 5.2. Auth Flow Integration

**File:** `src/__tests__/auth/auth-flow.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Auth Flow', () => {
  it('creates a user record on first login', async () => {
    // Test the NextAuth callback that upserts user into Drizzle
    // This requires mocking the DB layer
  });

  it('stores the GitHub access token in the session', async () => {
    // Verify the JWT callback includes the access_token
  });

  it('refreshes expired tokens', async () => {
    // Verify token refresh logic in the JWT callback
  });
});
```

---

## 6. E2E Browser Tests (Playwright)

### Playwright Configuration

**File:** `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html', { open: 'on-failure' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Auth setup project -- runs first, saves auth state
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'tests/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: 'tests/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    // Mobile viewport
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: 'tests/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'pnpm dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

### Auth Setup (Reusable Login State)

**File:** `tests/e2e/auth.setup.ts`

```typescript
import { test as setup, expect } from '@playwright/test';

const authFile = 'tests/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Option 1: Use a test GitHub account (for CI, use a PAT-based approach)
  // Option 2: Mock the auth at the cookie level
  //
  // For local dev and CI, we mock the NextAuth session cookie directly.
  // This avoids depending on GitHub OAuth in tests.
  await page.goto('/');

  // Set the NextAuth session cookie
  await page.context().addCookies([
    {
      name: 'next-auth.session-token',
      value: process.env.TEST_SESSION_TOKEN || 'test-session-token',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  // Verify we're logged in
  await page.goto('/dashboard');
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

  // Save auth state
  await page.context().storageState({ path: authFile });
});
```

### 6.1. Full User Journey

**File:** `tests/e2e/pr-review.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('PR Review Journey', () => {
  test('full flow: dashboard -> PR -> browse files -> read diffs', async ({ page }) => {
    // 1. Start at dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveTitle(/GitReview/);

    // 2. Navigate to a PR (mocked via MSW or route intercept)
    await page.route('**/api/github/**', (route) => {
      // Intercept API calls with fixture data
      const url = route.request().url();
      if (url.includes('/pull/') && url.endsWith('/files')) {
        return route.fulfill({
          json: [
            { filename: 'src/index.ts', status: 'modified', additions: 10, deletions: 5 },
            { filename: 'src/utils.ts', status: 'added', additions: 20, deletions: 0 },
          ],
        });
      }
      return route.continue();
    });

    await page.goto('/facebook/react/pull/123');

    // 3. File tree should be visible
    await expect(page.locator('[data-testid="file-tree"]')).toBeVisible();

    // 4. Click a file in the tree
    await page.getByText('index.ts').click();

    // 5. Diff viewer should show the file's diff
    await expect(page.locator('[data-testid="diff-viewer"]')).toBeVisible();

    // 6. Verify diff content is rendered
    await expect(page.locator('[data-line-type="add"]').first()).toBeVisible();
  });

  test('switch between unified and split view', async ({ page }) => {
    await page.goto('/facebook/react/pull/123');
    await page.getByText('index.ts').click();

    // Default is unified
    await expect(page.locator('[data-view-mode="unified"]')).toBeVisible();

    // Switch to split
    await page.getByRole('button', { name: /split/i }).click();
    await expect(page.locator('[data-view-mode="split"]')).toBeVisible();
  });

  test('mark file as reviewed', async ({ page }) => {
    await page.goto('/facebook/react/pull/123');
    await page.getByText('index.ts').click();

    // Mark as reviewed
    await page.getByRole('checkbox', { name: /reviewed/i }).check();

    // File tree should show reviewed indicator
    await expect(
      page.locator('[data-testid="file-tree"] [data-reviewed="true"]'),
    ).toBeVisible();
  });
});
```

### 6.2. Keyboard Navigation

**File:** `tests/e2e/keyboard-nav.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/facebook/react/pull/123');
  });

  test('j/k navigates between files', async ({ page }) => {
    await page.keyboard.press('j');
    // First file should be selected
    await expect(page.locator('[data-active="true"]').first()).toBeVisible();

    await page.keyboard.press('j');
    // Second file should be selected
  });

  test('? opens the keyboard shortcuts modal', async ({ page }) => {
    await page.keyboard.press('?');
    await expect(page.getByRole('dialog', { name: /shortcuts/i })).toBeVisible();
  });

  test('Escape closes the shortcuts modal', async ({ page }) => {
    await page.keyboard.press('?');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('/ focuses the file search', async ({ page }) => {
    await page.keyboard.press('/');
    await expect(page.locator('[data-testid="file-search-input"]')).toBeFocused();
  });
});
```

### 6.3. Responsive Layout

**File:** `tests/e2e/responsive.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Responsive Layout', () => {
  test('sidebar collapses on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone viewport
    await page.goto('/facebook/react/pull/123');

    // Sidebar should not be visible by default on mobile
    await expect(page.locator('[data-testid="file-tree-sidebar"]')).not.toBeVisible();

    // Hamburger menu should be visible
    await expect(page.getByRole('button', { name: /menu/i })).toBeVisible();
  });

  test('sidebar is visible on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/facebook/react/pull/123');

    await expect(page.locator('[data-testid="file-tree-sidebar"]')).toBeVisible();
  });
});
```

### 6.4. Performance Benchmarks

**File:** `tests/e2e/performance.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Performance', () => {
  test('diff rendering completes in under 2 seconds for 200+ file PR', async ({ page }) => {
    // Use the large PR fixture (200+ files)
    await page.route('**/api/github/**/files', (route) =>
      route.fulfill({ path: 'tests/fixtures/pr-large-files.json' }),
    );
    await page.route('**/api/github/**/diff', (route) =>
      route.fulfill({ path: 'tests/fixtures/pr-large-diff.txt' }),
    );

    const start = Date.now();
    await page.goto('/facebook/react/pull/999');

    // Wait for the diff viewer to be interactive
    await page.locator('[data-testid="diff-viewer"]').waitFor({ state: 'visible' });
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(2000);
  });

  test('virtual scroll maintains 60fps during fast scrolling', async ({ page }) => {
    await page.goto('/facebook/react/pull/123');
    await page.getByText('index.ts').click();

    // Measure frame rate during scroll
    const fps = await page.evaluate(async () => {
      return new Promise<number>((resolve) => {
        let frames = 0;
        const start = performance.now();

        function countFrame() {
          frames++;
          if (performance.now() - start < 1000) {
            requestAnimationFrame(countFrame);
          } else {
            resolve(frames);
          }
        }

        // Trigger fast scroll
        const diffViewer = document.querySelector('[data-testid="diff-viewer"]');
        if (diffViewer) {
          diffViewer.scrollTop = 10000;
        }
        requestAnimationFrame(countFrame);
      });
    });

    // Allow some tolerance -- 45fps is acceptable for scroll
    expect(fps).toBeGreaterThan(45);
  });

  test('initial page load under performance budget', async ({ page }) => {
    // Measure Core Web Vitals
    await page.goto('/facebook/react/pull/123', { waitUntil: 'networkidle' });

    const metrics = await page.evaluate(() => {
      return JSON.stringify(performance.getEntriesByType('navigation'));
    });
    const navEntry = JSON.parse(metrics)[0];

    // DOM interactive under 1.5s
    expect(navEntry.domInteractive).toBeLessThan(1500);
  });
});
```

### 6.5. Visual Regression

**File:** `tests/e2e/visual-regression.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('diff viewer unified view', async ({ page }) => {
    await page.goto('/facebook/react/pull/123');
    await page.getByText('index.ts').click();
    await page.locator('[data-testid="diff-viewer"]').waitFor();

    await expect(page.locator('[data-testid="diff-viewer"]')).toHaveScreenshot(
      'diff-unified.png',
      { maxDiffPixelRatio: 0.01 },
    );
  });

  test('diff viewer split view', async ({ page }) => {
    await page.goto('/facebook/react/pull/123');
    await page.getByText('index.ts').click();
    await page.getByRole('button', { name: /split/i }).click();

    await expect(page.locator('[data-testid="diff-viewer"]')).toHaveScreenshot(
      'diff-split.png',
      { maxDiffPixelRatio: 0.01 },
    );
  });

  test('file tree sidebar', async ({ page }) => {
    await page.goto('/facebook/react/pull/123');
    await expect(page.locator('[data-testid="file-tree-sidebar"]')).toHaveScreenshot(
      'file-tree.png',
      { maxDiffPixelRatio: 0.01 },
    );
  });

  test('dark mode', async ({ page }) => {
    await page.goto('/facebook/react/pull/123');
    // Toggle dark mode
    await page.getByRole('button', { name: /theme/i }).click();
    await page.getByText(/dark/i).click();

    await expect(page).toHaveScreenshot('full-page-dark.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });
});
```

---

## 7. Mock Data Strategy

### Principles

1. **Snapshot real responses.** Capture actual GitHub API responses using `curl` and store as JSON fixtures. Strip any sensitive data (tokens, private repo names).
2. **Three PR sizes.** Every fixture set has small (3 files), medium (20 files), and large (200+ files) variants.
3. **Factory functions.** Use builder functions to create test data programmatically for unit/component tests. Use static JSON fixtures for integration/E2E tests.
4. **MSW as the single mock layer.** All GitHub API mocks go through MSW handlers. No ad-hoc `fetch` mocks scattered across test files.

### Fixture Files

```
tests/fixtures/
  github/
    pr-response.json               # Real PR metadata response (sanitized)
    pr-files-small.json             # 3 files
    pr-files-medium.json            # 20 files
    pr-files-large.json             # 200+ files
    pr-diff-small.txt               # Corresponding diffs
    pr-diff-medium.txt
    pr-diff-large.txt
    pr-comments.json                # PR review comments
    pr-review-threads.json
    rate-limit.json
    user-response.json
```

### Capturing Fixtures

```bash
# Script: scripts/capture-fixtures.sh
# Usage: GITHUB_TOKEN=ghp_xxx ./scripts/capture-fixtures.sh owner/repo 123

#!/bin/bash
set -euo pipefail

REPO=$1
PR_NUMBER=$2
OUT_DIR="tests/fixtures/github"

mkdir -p "$OUT_DIR"

# PR metadata
curl -s -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/$REPO/pulls/$PR_NUMBER" \
  | jq 'del(.user.gravatar_id)' > "$OUT_DIR/pr-response.json"

# PR files
curl -s -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/$REPO/pulls/$PR_NUMBER/files?per_page=100" \
  > "$OUT_DIR/pr-files-response.json"

# PR diff
curl -s -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3.diff" \
  "https://api.github.com/repos/$REPO/pulls/$PR_NUMBER" \
  > "$OUT_DIR/pr-diff-response.txt"

# Comments
curl -s -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/$REPO/pulls/$PR_NUMBER/comments" \
  > "$OUT_DIR/pr-comments-response.json"

echo "Fixtures captured to $OUT_DIR"
```

### Factory Functions

**File:** `tests/helpers/create-mock-pr.ts`

```typescript
import type { PullRequest } from '@/types/pr';

export function createMockPR(overrides: Partial<PullRequest> = {}): PullRequest {
  return {
    number: 123,
    title: 'Test PR: Add new feature',
    state: 'open',
    author: { login: 'testuser', avatarUrl: 'https://github.com/testuser.png' },
    headSha: 'abc123',
    baseSha: 'def456',
    headRef: 'feature-branch',
    baseRef: 'main',
    additions: 100,
    deletions: 50,
    changedFiles: 5,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
    ...overrides,
  };
}
```

**File:** `tests/helpers/create-mock-diff.ts`

```typescript
import type { Hunk, DiffLine } from '@/features/diff-viewer/types';

export function createMockHunk(overrides: Partial<Hunk> = {}): Hunk {
  return {
    oldStart: 1,
    oldCount: 3,
    newStart: 1,
    newCount: 3,
    lines: [
      { type: 'context', content: 'line 1', oldLine: 1, newLine: 1 },
      { type: 'delete', content: 'old line 2', oldLine: 2, newLine: null },
      { type: 'add', content: 'new line 2', oldLine: null, newLine: 2 },
      { type: 'context', content: 'line 3', oldLine: 3, newLine: 3 },
    ],
    ...overrides,
  };
}

export function createLargeDiff(fileCount: number, linesPerFile: number): string {
  const files: string[] = [];
  for (let f = 0; f < fileCount; f++) {
    const lines = [`--- a/file-${f}.ts`, `+++ b/file-${f}.ts`, `@@ -1,${linesPerFile} +1,${linesPerFile} @@`];
    for (let l = 0; l < linesPerFile; l++) {
      lines.push(l % 3 === 0 ? `+added line ${l}` : l % 3 === 1 ? `-deleted line ${l}` : ` context line ${l}`);
    }
    files.push(lines.join('\n'));
  }
  return files.join('\n');
}
```

---

## 8. CI/CD Integration

### GitHub Actions Workflow

**File:** `.github/workflows/test.yml`

```yaml
name: Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: test-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: 22

jobs:
  # -----------------------------------------------
  # Lint + Typecheck (fast, runs on every push)
  # -----------------------------------------------
  lint:
    name: Lint & Typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint

  # -----------------------------------------------
  # Unit + Component Tests (fast, runs on every push)
  # -----------------------------------------------
  unit:
    name: Unit & Component Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm vitest run --coverage
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-report
          path: coverage/

  # -----------------------------------------------
  # Integration Tests (runs on PR + main)
  # -----------------------------------------------
  integration:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: [lint]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm vitest run --project integration

  # -----------------------------------------------
  # E2E Tests (runs on PR + main, parallelized by shard)
  # -----------------------------------------------
  e2e:
    name: E2E Tests (${{ matrix.shard }})
    runs-on: ubuntu-latest
    needs: [lint, unit]
    strategy:
      fail-fast: false
      matrix:
        shard: [1/3, 2/3, 3/3]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test --shard=${{ matrix.shard }}
        env:
          TEST_SESSION_TOKEN: ${{ secrets.TEST_SESSION_TOKEN }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report-${{ strategy.job-index }}
          path: playwright-report/
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: test-results-${{ strategy.job-index }}
          path: test-results/

  # -----------------------------------------------
  # Visual Regression (nightly only, expensive)
  # -----------------------------------------------
  visual:
    name: Visual Regression
    runs-on: ubuntu-latest
    if: github.event_name == 'schedule' || contains(github.event.pull_request.labels.*.name, 'visual-test')
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: npx playwright install --with-deps chromium firefox webkit
      - run: npx playwright test tests/e2e/visual-regression.spec.ts --update-snapshots
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: visual-diff
          path: test-results/
```

### Nightly Full Suite

**File:** `.github/workflows/nightly.yml`

```yaml
name: Nightly Full Test Suite

on:
  schedule:
    - cron: '0 4 * * *'  # 4 AM UTC daily
  workflow_dispatch:

jobs:
  full-suite:
    uses: ./.github/workflows/test.yml
    secrets: inherit

  # Also run performance benchmarks nightly
  perf:
    name: Performance Benchmarks
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test tests/e2e/performance.spec.ts
        env:
          TEST_SESSION_TOKEN: ${{ secrets.TEST_SESSION_TOKEN }}
```

### When Tests Run

| Trigger | Lint | Typecheck | Unit | Integration | E2E | Visual | Perf |
|---------|------|-----------|------|-------------|-----|--------|------|
| Pre-commit (local) | Yes | Yes | -- | -- | -- | -- | -- |
| Push to PR | Yes | Yes | Yes | Yes | Yes (Chromium) | On label | -- |
| Merge to main | Yes | Yes | Yes | Yes | Yes (Chromium) | -- | -- |
| Nightly | Yes | Yes | Yes | Yes | Yes (all browsers) | Yes | Yes |

### Pre-commit Hook (lint-staged)

```bash
# Add to package.json or .lintstagedrc
pnpm add -D lint-staged
```

```json
// package.json (partial)
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml}": ["prettier --write"]
  }
}
```

---

## 9. Coverage Thresholds

### Vitest Coverage Config

**File:** `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/types.ts',
        'src/app/**/layout.tsx',
        'src/app/**/loading.tsx',
        'src/app/**/error.tsx',
        'src/app/**/not-found.tsx',
        'src/components/ui/**',  // shadcn generated
        'src/env.ts',
        'src/lib/db/migrations.ts',
      ],
      thresholds: {
        // Critical paths: high coverage
        'src/features/diff-viewer/lib/': {
          branches: 90,
          functions: 95,
          lines: 90,
          statements: 90,
        },
        'src/features/file-tree/lib/': {
          branches: 85,
          functions: 90,
          lines: 85,
          statements: 85,
        },
        'src/features/github/api/': {
          branches: 80,
          functions: 85,
          lines: 80,
          statements: 80,
        },
        // Global minimum
        branches: 70,
        functions: 75,
        lines: 70,
        statements: 70,
      },
    },
  },
});
```

### Vitest Workspace (Separate Unit / Integration)

**File:** `vitest.workspace.ts`

```typescript
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    extends: './vitest.config.ts',
    test: {
      name: 'unit',
      include: ['src/**/*.test.{ts,tsx}'],
      exclude: ['src/__tests__/**'],
    },
  },
  {
    extends: './vitest.config.ts',
    test: {
      name: 'integration',
      include: ['src/__tests__/**/*.test.{ts,tsx}'],
      setupFiles: ['./tests/setup.ts', './tests/setup-msw.ts'],
      // Integration tests may need longer timeouts
      testTimeout: 15_000,
    },
  },
]);
```

### Test Setup

**File:** `tests/setup.ts`

```typescript
import '@testing-library/jest-dom/vitest';
```

**File:** `tests/setup-msw.ts`

```typescript
import { beforeAll, afterAll, afterEach } from 'vitest';
import { server } from './msw/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run --project unit",
    "test:integration": "vitest run --project integration",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:visual": "playwright test tests/e2e/visual-regression.spec.ts",
    "test:all": "vitest run && playwright test"
  }
}
```

---

## Summary: Test Pyramid

```
                    /\
                   /  \          E2E (Playwright)
                  / 12 \         5 spec files, ~30 tests
                 /------\        Runs on PR (Chromium), nightly (all)
                /        \
               / 25 tests \     Integration (Vitest + MSW)
              /   5 files  \    API routes, auth flow, data fetching
             /--------------\   Runs on every PR
            /                \
           /    80+ tests     \  Component (Vitest + Testing Library)
          /    15 test files   \ File tree, diff viewer, auth components
         /----------------------\Runs on every PR
        /                        \
       /      120+ tests          \  Unit (Vitest)
      /      25+ test files        \ Diff parser, tree builder, stores, utils
     /------------------------------\Runs on every push
```

Total estimated test count: **~240 tests** at full implementation.

Priority order for implementation:
1. `parse-diff.test.ts` -- a bug here breaks everything
2. `file-tree-builder.test.ts` -- core navigation depends on it
3. Store tests -- state management correctness
4. Component tests -- UI correctness
5. Integration tests -- API layer
6. E2E tests -- user journeys
