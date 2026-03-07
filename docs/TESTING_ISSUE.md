# Automated Testing Infrastructure

Set up comprehensive testing for GitReview covering unit, component, integration, and E2E browser tests.

## Stack

- **Vitest 3.x** -- unit + component + integration (fast, ESM-native, TS via esbuild)
- **Playwright** -- E2E browser tests, visual regression, performance
- **Testing Library** -- component tests (React)
- **MSW 2.x** -- API mocking at network level (shared across all test layers)
- **happy-dom** -- lightweight DOM for Vitest
- **v8 coverage** via Vitest

Full plan: [`docs/TESTING_PLAN.md`](./TESTING_PLAN.md)

---

## Phase 1: Foundation

- [ ] Install test dependencies (`vitest`, `@playwright/test`, `@testing-library/react`, `msw`, `happy-dom`)
- [ ] Create `vitest.config.ts` with path aliases, happy-dom, coverage thresholds
- [ ] Create `vitest.workspace.ts` (unit + integration projects)
- [ ] Create `playwright.config.ts` (multi-browser, sharded, webServer)
- [ ] Create `tests/setup.ts` (jest-dom matchers)
- [ ] Create `tests/setup-msw.ts` (MSW server lifecycle)
- [ ] Create `tests/helpers/render-with-providers.tsx`
- [ ] Add test scripts to `package.json` (`test`, `test:unit`, `test:integration`, `test:e2e`, `test:coverage`)

## Phase 2: Mock Data Layer

- [ ] Create MSW handlers for GitHub API (`tests/msw/handlers/github.ts`)
- [ ] Create MSW handlers for auth (`tests/msw/handlers/auth.ts`)
- [ ] Create MSW server entry (`tests/msw/server.ts`)
- [ ] Create factory: `tests/helpers/create-mock-pr.ts`
- [ ] Create factory: `tests/helpers/create-mock-diff.ts`
- [ ] Capture real GitHub API fixtures (small/medium/large PRs) via `scripts/capture-fixtures.sh`
- [ ] Store fixtures in `tests/fixtures/github/`

## Phase 3: Unit Tests (Critical Path)

- [ ] **`parse-diff.test.ts`** -- basic parsing, line numbering, edge cases (binary, rename, `/dev/null`, no-newline-at-EOF, Unicode, multi-hunk, multi-file), performance (5000 lines < 50ms)
- [ ] `line-mapping.test.ts` -- old-to-new line mapping for split view
- [ ] `diff-utils.test.ts` -- helper functions
- [ ] `file-tree-builder.test.ts` -- flat-to-tree, directory collapsing, sorting, stat propagation
- [ ] `categorize.test.ts` -- file categorization logic
- [ ] `impact-scoring.test.ts` -- impact level calculation
- [ ] `file-patterns.test.ts` -- file type detection
- [ ] `client.test.ts` -- GitHub client construction, headers
- [ ] `rate-limit-tracker.test.ts` -- throttle detection, reset timing
- [ ] `etag-cache.test.ts` -- store/retrieve/overwrite
- [ ] `shortcuts.test.ts` -- keybinding map, no duplicates
- [ ] `token-budget.test.ts` -- estimation, truncation
- [ ] `prompt-builder.test.ts` -- prompt template assembly
- [ ] `context-extractor.test.ts` -- diff context extraction for AI
- [ ] `review-store.test.ts` -- active file, view mode, reviewed files
- [ ] `ai-bar-store.test.ts` -- AI panel state
- [ ] `ui-store.test.ts` -- sidebar, theme state

## Phase 4: Component Tests

- [ ] `file-tree.test.tsx` -- render files, expand/collapse, click selection, active highlight, stat display
- [ ] `file-tree-node.test.tsx` -- individual node rendering
- [ ] `file-tree-search.test.tsx` -- filter files by query
- [ ] `diff-viewer.test.tsx` -- unified view, split view, line numbers, gutter, file path header
- [ ] `unified-diff.test.tsx` -- unified-specific rendering
- [ ] `split-diff.test.tsx` -- split-specific rendering, side-by-side alignment
- [ ] `diff-virtual-scroller.test.tsx` -- virtualization behavior
- [ ] `auth-guard.test.tsx` -- authenticated/loading/unauthenticated states
- [ ] `sign-in-button.test.tsx` -- click triggers signIn
- [ ] `user-menu.test.tsx` -- displays user info, sign out option

## Phase 5: Integration Tests

- [ ] `github-pr.test.ts` -- `GET /api/github/:org/:repo/pull/:id` returns PR data via MSW
- [ ] `github-files.test.ts` -- files endpoint
- [ ] `github-diff.test.ts` -- diff endpoint
- [ ] `review-sessions.test.ts` -- CRUD for review sessions
- [ ] `ai-chat.test.ts` -- AI chat route with mocked Gemini
- [ ] `auth-flow.test.ts` -- user creation on first login, token storage, refresh

## Phase 6: E2E Browser Tests

- [ ] `auth.setup.ts` -- reusable auth state (mock session cookie)
- [ ] `pr-review.spec.ts` -- full journey: dashboard -> PR -> browse files -> read diffs -> mark reviewed
- [ ] `keyboard-nav.spec.ts` -- j/k navigation, ? help modal, / search focus, Escape close
- [ ] `responsive.spec.ts` -- sidebar collapse on mobile, visible on desktop
- [ ] `performance.spec.ts` -- diff render time (<2s for 200+ files), scroll FPS (>45fps), page load budget
- [ ] `visual-regression.spec.ts` -- unified diff, split diff, file tree, dark mode screenshots

## Phase 7: CI/CD

- [ ] `.github/workflows/test.yml` -- lint, typecheck, unit, integration, E2E (sharded 3x), visual (on label)
- [ ] `.github/workflows/nightly.yml` -- full suite + performance benchmarks on schedule
- [ ] Configure coverage thresholds (diff-viewer/lib: 90%, file-tree/lib: 85%, global: 70%)
- [ ] Add `lint-staged` for pre-commit lint + format
- [ ] Add `.gitignore` entries for `test-results/`, `playwright-report/`, `coverage/`

---

## Coverage Targets

| Module | Lines | Branches | Functions |
|--------|-------|----------|-----------|
| `diff-viewer/lib/` | 90% | 90% | 95% |
| `file-tree/lib/` | 85% | 85% | 90% |
| `github/api/` | 80% | 80% | 85% |
| Global minimum | 70% | 70% | 75% |

## Test Pyramid (~240 tests)

| Layer | Count | Files | Trigger |
|-------|-------|-------|---------|
| Unit | ~120 | 17+ | Every push |
| Component | ~80 | 10+ | Every PR |
| Integration | ~25 | 6 | Every PR |
| E2E | ~30 | 5 | PR (Chromium), Nightly (all browsers) |
| Visual | ~4 | 1 | Nightly / label |
