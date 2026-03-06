# GitReview -- Product Requirements Document

**Version:** 1.0
**Date:** 2026-03-06
**Status:** Draft

---

## Table of Contents

1. [Product Vision & Problem Statement](#1-product-vision--problem-statement)
2. [Target Users](#2-target-users)
3. [Core Features](#3-core-features)
4. [Tech Stack](#4-tech-stack)
5. [Architecture](#5-architecture)
6. [Data Model](#6-data-model)
7. [MVP Scope](#7-mvp-scope)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [Future Considerations](#9-future-considerations)

---

## 1. Product Vision & Problem Statement

### The Problem

GitHub's pull request review UI breaks down at scale. Specifically:

- **Large PRs are unusable.** A PR with 100+ changed files becomes a wall of diffs with no structure. Reviewers lose context, skip files, and miss bugs. GitHub shows a flat list sorted alphabetically -- useless when you need to understand *what changed and why*.
- **Long file diffs are painful.** A 500-line diff in a single file forces you to scroll endlessly. There is no way to collapse sections you have already reviewed, no way to focus on the parts that matter.
- **AI assistance is bolted on, not built in.** GitHub Copilot reviews exist but they are a separate step -- you trigger them, wait, get a dump of comments. There is no interactive AI reviewer sitting alongside you as you read code.
- **Context switching kills flow.** Reviewers bounce between the diff view, the file tree, the conversation tab, and external tools. Every switch is a tax on attention.

### The Vision

GitReview is a web application purpose-built for reviewing pull requests at scale. It fetches PRs from GitHub and presents them in a review interface designed around three principles:

1. **Structure over flatness.** Changed files are grouped by module, type, and impact level -- not dumped in a flat list.
2. **Large diffs are first-class citizens.** Virtual scrolling, collapsible hunks, and inline annotations make 1000-line diffs navigable.
3. **AI is ambient.** A persistent floating bar at the bottom of the screen gives you Claude-powered assistance on any selected code -- explain it, find bugs, suggest improvements -- without leaving the review.

GitReview is not a GitHub replacement. It is a better lens for the review process. All comments and approvals sync back to GitHub.

### Why Now

- The Anthropic API and Claude Code ecosystem have matured enough to power real-time code review assistance.
- GitHub's review UI has not meaningfully improved for large PRs in years.
- Teams working on large codebases (monorepos, infrastructure changes, migrations) are underserved.

---

## 2. Target Users

### Primary: Senior Engineers & Tech Leads

- Review 5-20 PRs per week
- Frequently encounter PRs with 50+ changed files
- Value thoroughness but are time-constrained
- Already use GitHub; not looking to leave it, just want a better review tool

### Secondary: Team Leads & Engineering Managers

- Need to review large refactors, migrations, or dependency updates
- Want high-level summaries before diving into details
- Care about review quality across their team

### Non-Target (for MVP)

- Developers who only make small PRs (< 10 files) -- GitHub is fine for this
- Teams not on GitHub (GitLab, Bitbucket support is post-MVP)
- Non-technical stakeholders

---

## 3. Core Features

Features are ordered by priority (P0 = MVP must-have, P1 = fast-follow, P2 = future).

### P0: Smart File Categorization

**Problem:** GitHub shows changed files in a flat alphabetical list. A PR touching 80 files across 6 modules looks like noise.

**Solution:** Group changed files into meaningful categories automatically.

Categorization layers (applied in order):

| Layer | Logic | Example |
|-------|-------|---------|
| **By directory/module** | Group by top-level and second-level directory paths | `src/api/`, `src/components/`, `tests/` |
| **By file type** | Within each module, sub-group by extension | `.ts`, `.css`, `.test.ts`, `.json` |
| **By change impact** | Tag files by estimated review importance | `high` (new files, large diffs), `medium` (modified logic), `low` (config, lockfiles, generated) |
| **By review status** | Track which files the reviewer has looked at | `reviewed`, `in-progress`, `not-started` |

**UI behavior:**

- Collapsible tree in the left sidebar
- Badge counts per group (e.g., `src/api/ (12 files, 3 unreviewed)`)
- Click a group to expand; click a file to load its diff
- "Auto-collapse low-impact" toggle to hide noise (lockfiles, generated code, `.snap` files)
- Files can be manually re-categorized or pinned

**Impact scoring heuristic (v1):**

```
high:   new files, deleted files, files with >200 lines changed
medium: modified files with 10-200 lines changed
low:    files with <10 lines changed, lockfiles, generated files,
        config files (detected by path patterns)
```

### P0: Enhanced Diff Viewer

**Problem:** Large file diffs in GitHub are slow to render, impossible to navigate, and offer no way to track what you have already read.

**Solution:** A diff viewer built for scale.

**Core capabilities:**

- **Virtual scrolling.** Only render visible hunks. A 5000-line diff should load in under 200ms regardless of size.
- **Unified and split view toggle.** User preference, persisted.
- **Collapsible hunks.** Each hunk (contiguous block of changes) can be collapsed individually. Collapsed state is persisted per-review.
- **Syntax highlighting.** Language-aware highlighting using a WASM-based highlighter (Shiki or equivalent).
- **Inline comments.** Click any line to start a comment thread. Comments sync to GitHub.
- **Minimap.** A narrow vertical strip on the right showing the shape of the diff (green = additions, red = deletions, blue = comments). Clickable for fast navigation.
- **Keyboard navigation.** `j/k` to move between hunks, `n/p` to move between files, `c` to comment, `Enter` to expand/collapse.
- **Line-level "mark as reviewed."** Click a hunk or range to mark it reviewed. Visual indicator (subtle background tint) shows reviewed vs. unreviewed regions.

**Performance targets:**

| Metric | Target |
|--------|--------|
| Time to first hunk visible | < 150ms for files up to 10,000 lines |
| Scroll frame rate | 60fps during virtual scroll |
| Memory usage per file | < 50MB for 10,000-line diffs |

### P0: Persistent AI Assistance Bar

**Problem:** AI code review tools either run as batch jobs (you wait, then read a report) or require context-switching to a separate tool.

**Solution:** A floating bar anchored to the bottom of the viewport, always visible, always ready.

**UI spec:**

```
+------------------------------------------------------------------+
|  [diff viewer content area]                                       |
|                                                                   |
|                                                                   |
+------------------------------------------------------------------+
| [AI icon] Ask about selected code...          [Model: Claude] [^] |
| "Explain this function" | "Find bugs" | "Suggest improvement"    |
+------------------------------------------------------------------+
```

- **Always visible.** Fixed to bottom of viewport, 60-80px tall in collapsed state.
- **Expandable.** Click the `^` or drag up to expand into a chat panel (up to 50% viewport height).
- **Context-aware.** When the user selects lines in the diff, the bar updates to show: "Ask about lines 42-78 of `src/api/handler.ts`".
- **Quick actions.** Pre-built prompts: "Explain this code", "Find potential bugs", "Suggest improvements", "Is this change safe?", "Summarize this file's changes".
- **Streaming responses.** Claude's response streams in real-time.
- **Post as comment.** Any AI response can be posted as a review comment on the PR with one click (attributed as AI-generated).
- **Conversation memory.** Within a review session, the AI retains context of previous questions about the same PR.

**AI context construction:**

When the user asks a question, the prompt sent to Claude includes:

1. The selected code (or full hunk if nothing selected)
2. The surrounding file context (up to 200 lines before/after the change)
3. The PR description and title
4. Other files changed in the PR (file names + summary, not full diffs)
5. Previous conversation in this session

**Token budget:** Target 100K context window usage. For very large PRs, prioritize the selected file and summarize the rest.

### P0: GitHub API Integration

**Problem:** GitReview must read from and write back to GitHub. It is not a standalone tool -- it is a better interface for an existing workflow.

**Capabilities:**

| Operation | GitHub API | Method |
|-----------|-----------|--------|
| Authenticate user | OAuth App flow | `GET /login/oauth/authorize` |
| List user's PRs (authored + review-requested) | REST or GraphQL | `GET /user/repos`, `GET /repos/:owner/:repo/pulls` |
| Fetch PR metadata | GraphQL preferred | PR title, description, author, reviewers, labels, status |
| Fetch changed files | REST | `GET /repos/:owner/:repo/pulls/:number/files` |
| Fetch file diff/patch | REST | `GET /repos/:owner/:repo/pulls/:number/files` (returns patch) |
| Fetch full file content (for context) | REST | `GET /repos/:owner/:repo/contents/:path?ref=:sha` |
| Post review comment (inline) | REST | `POST /repos/:owner/:repo/pulls/:number/comments` |
| Post review (approve/request changes) | REST | `POST /repos/:owner/:repo/pulls/:number/reviews` |
| Fetch existing comments | GraphQL | Review comments, issue comments, review threads |

**Auth flow:**

1. User clicks "Sign in with GitHub"
2. OAuth redirect to GitHub
3. GitHub redirects back with auth code
4. Server exchanges code for access token
5. Token stored server-side, encrypted, associated with user session
6. Token used for all subsequent GitHub API calls

**Rate limiting strategy:**

- GitHub REST API: 5,000 requests/hour per authenticated user
- Cache PR metadata and file lists aggressively (5-minute TTL)
- Use conditional requests (`If-None-Match` / ETags) to avoid consuming rate limit on unchanged data
- For file content fetches, batch requests and cache by SHA (immutable)

### P1: Claude Code Integration

**Problem:** Users who have Claude Code installed and authenticated locally have access to a powerful code review plugin. GitReview should leverage this.

**How it works:**

1. GitReview detects if the user has Claude Code credentials (user opts in via settings).
2. When the user triggers a "deep review" action, GitReview invokes the Claude Code review plugin.
3. The plugin performs a structured review (security, correctness, performance, style).
4. Results are displayed in GitReview's UI.
5. The user can selectively post review comments back to GitHub, attributed as AI-assisted.

**Integration approach:**

- Claude Code exposes a CLI (`claude`) that can be invoked with review commands.
- For the web app, this means server-side invocation -- the user provides their API key or authenticates via Anthropic's OAuth.
- Alternatively, use the Anthropic API directly with a review-focused system prompt that mirrors Claude Code's review behavior.

**MVP approach (P1, not P0):** Use the Anthropic API with a curated review system prompt. Full Claude Code CLI integration is P2.

### P1: Review Workflow

**Actions a reviewer can take:**

- **Approve** -- Submit an approving review to GitHub
- **Request Changes** -- Submit a review requesting changes, with comments
- **Comment** -- Submit general comments without approval/rejection
- **Mark files as reviewed** -- Local tracking (not synced to GitHub, which has no per-file review concept)

**Comment threads:**

- Inline comments on specific lines (synced to GitHub)
- General PR-level comments (synced to GitHub)
- Internal notes (local only, not synced -- for the reviewer's own use)

**Review progress:**

- Progress bar showing `X of Y files reviewed`
- Time estimate: "Based on your pace, ~15 min remaining"
- Summary panel: "You've reviewed 45 files. 3 files have your comments. Ready to submit?"

---

## 4. Tech Stack

### Frontend

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | **Next.js 15 (App Router)** | Server components for initial load performance. API routes for backend. Mature ecosystem. |
| Language | **TypeScript (strict mode)** | Non-negotiable for a codebase this complex. |
| Styling | **Tailwind CSS v4 + shadcn/ui** | Utility-first for speed. shadcn/ui gives accessible, unstyled primitives. No runtime CSS overhead. |
| Diff rendering | **Custom component + `diff` library** | Use `diff` (npm) for computation, custom React component for rendering. No existing diff viewer handles virtual scrolling well enough. |
| Virtual scrolling | **TanStack Virtual** | Battle-tested virtualizer. Handles variable-height rows (hunks). |
| Syntax highlighting | **Shiki (WASM)** | Language-aware, VS Code-quality highlighting. Runs in browser via WASM. |
| State management | **Zustand** | Lightweight, no boilerplate. Good for cross-component state (review progress, AI bar state). |
| Data fetching | **TanStack Query (React Query)** | Caching, deduplication, background refetching for GitHub API data. |
| Keyboard shortcuts | **tinykeys** | 1KB library for keyboard shortcut binding. |

### Backend (Next.js API Routes + Server Actions)

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Runtime | **Node.js (Next.js API routes)** | Co-located with frontend. No separate backend service for MVP. |
| Auth | **NextAuth.js v5 (Auth.js)** | First-class GitHub OAuth provider. Session management built in. |
| Database | **PostgreSQL (via Neon or Supabase)** | Relational data (users, reviews, comments). Serverless Postgres for zero-ops in MVP. |
| ORM | **Drizzle ORM** | Type-safe, lightweight, SQL-first. No magic, no performance surprises. |
| AI | **Anthropic SDK (`@anthropic-ai/sdk`)** | Official SDK. Streaming support. Direct Claude API access. |
| Caching | **Redis (Upstash)** | Cache GitHub API responses. Serverless Redis, pay-per-request. |
| Rate limiting | **Upstash Ratelimit** | Protect AI endpoints from abuse. |

### Infrastructure

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Hosting | **Vercel** | Native Next.js support. Edge functions for low-latency API routes. Generous free tier. |
| Database hosting | **Neon** | Serverless Postgres. Branches for preview deployments. Free tier. |
| Redis | **Upstash** | Serverless Redis. Free tier covers MVP. |
| Monitoring | **Vercel Analytics + Sentry** | Performance monitoring + error tracking. |
| CI/CD | **GitHub Actions** | Lint, type-check, test, deploy on push. |

### Why Not [Alternative]?

| Alternative | Why not |
|-------------|---------|
| Remix | Solid framework but smaller ecosystem. Next.js has better Vercel integration and more community packages. |
| tRPC | Adds a layer of abstraction over API routes. For MVP, plain API routes + TypeScript types are sufficient. Revisit if API surface grows. |
| Prisma | Heavier than Drizzle, slower cold starts on serverless, more opinionated. |
| Monaco Editor (for diffs) | Overkill. We need a diff viewer, not an editor. Monaco's bundle size (~5MB) is not justified. |
| Supabase (full platform) | Good, but we only need Postgres. Neon is more focused and has better serverless scaling. |

---

## 5. Architecture

### High-Level Diagram

```
+--------------------------------------------------+
|                   Browser                         |
|                                                   |
|  +--------------------------------------------+  |
|  |          Next.js App (React)                |  |
|  |                                             |  |
|  |  +----------+  +----------+  +-----------+  |  |
|  |  | File     |  | Diff     |  | AI        |  |  |
|  |  | Sidebar  |  | Viewer   |  | Assist    |  |  |
|  |  | (tree)   |  | (virtual)|  | Bar       |  |  |
|  |  +----------+  +----------+  +-----------+  |  |
|  |                                             |  |
|  |  Zustand (state) + TanStack Query (data)    |  |
|  +--------------------------------------------+  |
+--------------------------------------------------+
            |               |              |
            v               v              v
+--------------------------------------------------+
|              Next.js API Routes                   |
|                                                   |
|  /api/auth/*     /api/github/*    /api/ai/*       |
|  (NextAuth)      (PR data)       (Claude)         |
+--------------------------------------------------+
     |                  |                |
     v                  v                v
+---------+    +-----------------+  +----------+
| Neon    |    | GitHub API      |  | Anthropic|
| Postgres|    | (REST/GraphQL)  |  | API      |
+---------+    +-----------------+  +----------+
     |
     v
+---------+
| Upstash |
| Redis   |
| (cache) |
+---------+
```

### Request Flow: Loading a PR

```
1. User navigates to /review/:owner/:repo/:pr
2. Next.js Server Component fetches PR metadata (cached)
   -> Check Redis cache (key: pr:{owner}/{repo}/{number})
   -> Cache miss: call GitHub API, store in Redis (TTL 5min)
3. Server Component renders initial shell with PR metadata
4. Client hydrates, TanStack Query fetches file list
   -> API route /api/github/files?owner=X&repo=Y&pr=Z
   -> Categorization logic runs server-side
   -> Returns categorized file tree
5. User clicks a file
   -> TanStack Query fetches diff for that file
   -> API route /api/github/diff?owner=X&repo=Y&pr=Z&file=F
   -> Diff parsed into hunks server-side
   -> Client renders with virtual scrolling
6. User selects code and asks AI
   -> POST /api/ai/ask (streaming)
   -> Server constructs prompt with context
   -> Streams Claude response back via SSE
```

### Request Flow: Posting a Comment

```
1. User writes comment on a line in the diff viewer
2. Client calls POST /api/github/comment
   Body: { owner, repo, pr, path, line, body, side }
3. API route calls GitHub API to create review comment
4. On success, update local state + TanStack Query cache
5. Comment appears in diff viewer immediately (optimistic update)
```

### Key Architectural Decisions

**Decision 1: Server-side diff parsing.**
Parse GitHub's patch format into structured hunks on the server, not the client. This keeps the client thin, allows caching of parsed diffs, and reduces JS bundle size.

**Decision 2: No WebSocket for MVP.**
Polling (via TanStack Query's `refetchInterval`) is sufficient for keeping PR data fresh. WebSockets add operational complexity. Revisit if real-time collaboration becomes a requirement.

**Decision 3: AI responses are server-proxied.**
The user's Anthropic API key (or our own, depending on the model) never touches the client. All AI requests go through our API routes. This is both a security requirement and a practical one (we control prompt construction).

**Decision 4: GitHub tokens are server-only.**
The OAuth access token is stored in an encrypted HTTP-only cookie (via NextAuth). It never appears in client-side JavaScript.

---

## 6. Data Model

### Entity Relationship

```
User 1---* ReviewSession *---1 PullRequest
ReviewSession 1---* FileReviewStatus
ReviewSession 1---* LocalNote
ReviewSession 1---* AIConversation 1---* AIMessage
```

### Tables

#### `users`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| github_id | integer | Unique. GitHub user ID. |
| github_login | text | GitHub username |
| avatar_url | text | |
| email | text | Nullable |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `review_sessions`

A review session represents one user reviewing one PR. It tracks local state that GitHub does not model (file review progress, collapsed hunks, etc.).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK -> users |
| repo_owner | text | e.g., `facebook` |
| repo_name | text | e.g., `react` |
| pr_number | integer | |
| pr_head_sha | text | SHA at time of review (detects if PR updated) |
| started_at | timestamptz | |
| last_active_at | timestamptz | |
| status | text | `in_progress`, `submitted`, `abandoned` |
| view_preference | text | `unified`, `split` |

Unique constraint: `(user_id, repo_owner, repo_name, pr_number)` -- one active session per user per PR. If the PR updates (head SHA changes), the session is flagged for re-review.

#### `file_review_statuses`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| session_id | uuid | FK -> review_sessions |
| file_path | text | Relative path in repo |
| status | text | `not_started`, `in_progress`, `reviewed` |
| collapsed_hunks | jsonb | Array of hunk indices that are collapsed |
| reviewed_ranges | jsonb | Array of `{startLine, endLine}` the user has marked reviewed |
| updated_at | timestamptz | |

#### `local_notes`

Notes the reviewer writes for themselves. Not synced to GitHub.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| session_id | uuid | FK -> review_sessions |
| file_path | text | Nullable (null = PR-level note) |
| line_number | integer | Nullable |
| body | text | |
| created_at | timestamptz | |

#### `ai_conversations`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| session_id | uuid | FK -> review_sessions |
| file_path | text | Context file for this conversation |
| created_at | timestamptz | |

#### `ai_messages`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| conversation_id | uuid | FK -> ai_conversations |
| role | text | `user`, `assistant` |
| content | text | |
| selected_lines | jsonb | `{startLine, endLine}` if user selected code |
| model | text | e.g., `claude-sonnet-4-20250514` |
| tokens_used | integer | For tracking/billing |
| created_at | timestamptz | |

### What We Do NOT Store

- **PR metadata** (title, description, author, labels). Fetched from GitHub API, cached in Redis. Not duplicated in Postgres.
- **Diff content.** Fetched from GitHub, cached in Redis by SHA. Not stored in Postgres.
- **GitHub review comments.** Fetched from GitHub API. We only store local notes.
- **GitHub access tokens.** Stored in encrypted session cookies, not in the database.

This keeps the database lean. Postgres holds user state and review progress. GitHub is the source of truth for PR data.

---

## 7. MVP Scope

### MVP (Phase 1) -- "Usable for one reviewer on one PR"

**Target: 4-6 weeks**

| Feature | Scope |
|---------|-------|
| GitHub OAuth login | Sign in, fetch user info, store session |
| PR picker | List PRs where user is requested reviewer OR authored. Search by URL. |
| File categorization | Group by directory + file type. Impact scoring (high/medium/low). Collapsible tree sidebar. |
| Diff viewer | Split + unified view. Syntax highlighting (Shiki). Virtual scrolling for large files. Collapsible hunks. |
| Inline comments | Add comments on lines. Post to GitHub. View existing GitHub comments. |
| Review submission | Approve / Request Changes / Comment. Syncs to GitHub. |
| AI assistance bar | Floating bar. Select code and ask questions. Streaming responses. Quick action buttons. |
| File review tracking | Mark files as reviewed. Progress indicator. Persisted per session. |

**Explicitly out of MVP:**

- Claude Code CLI integration (use Anthropic API directly)
- Real-time collaboration (multiple reviewers)
- Notifications
- PR-level AI summary (auto-generated)
- Custom categorization rules
- GitLab/Bitbucket support
- Self-hosting support

### Phase 2 -- "Team workflow"

**Target: 4 weeks after MVP**

- PR-level AI summary (auto-generate a summary of the PR's changes)
- Claude Code integration (deep review via Anthropic OAuth)
- Review dashboard (all my pending reviews, with priority ranking)
- Comment resolution tracking
- Keyboard-driven workflow (review entire PR without touching mouse)
- Review templates

### Phase 3 -- "Platform"

- Team analytics (review time, comment density, files-per-PR trends)
- Custom categorization rules (user-defined path patterns and labels)
- Webhook-based PR sync (instead of polling)
- Self-hosting (Docker image)
- GitLab and Bitbucket support

---

## 8. Non-Functional Requirements

### Performance

| Scenario | Target |
|----------|--------|
| Initial page load (PR with 50 files) | < 2s to interactive |
| Initial page load (PR with 1000+ files) | < 4s to interactive (file tree visible, diffs lazy-loaded) |
| Opening a file diff (500 lines) | < 200ms to first hunk visible |
| Opening a file diff (10,000 lines) | < 500ms to first hunk visible (virtual scroll) |
| AI response (first token) | < 1s after submit |
| Posting a comment to GitHub | < 2s round-trip |
| Switching between files | < 100ms (cached diffs) |

**How we hit these targets:**

- Server Components for initial render (no client JS needed for shell)
- Virtual scrolling for diffs (TanStack Virtual)
- Aggressive caching: Redis for GitHub API, TanStack Query for client state
- Lazy loading: only fetch diff for the file the user clicks
- Code splitting: AI bar and settings are dynamic imports
- Shiki WASM loaded once, cached in service worker

### Security

| Concern | Mitigation |
|---------|------------|
| GitHub token exposure | Server-only. Encrypted HTTP-only cookie. Never in client JS. |
| XSS in diff content | All diff content rendered as text nodes, never `dangerouslySetInnerHTML`. Syntax highlighting uses token-based rendering. |
| API key security (Anthropic) | Server-side only. Environment variable. Never exposed to client. |
| CSRF | NextAuth includes CSRF protection by default. |
| Rate limiting | Upstash Ratelimit on `/api/ai/*` endpoints (10 req/min per user). GitHub API calls rate-limited per user token. |
| Data privacy | We store minimal data (review progress, local notes). PR content is fetched from GitHub and cached transiently. No long-term storage of code. |
| Dependency security | Dependabot enabled. `npm audit` in CI. Lock file committed. |

### Accessibility

| Requirement | Implementation |
|-------------|---------------|
| Keyboard navigation | Full keyboard support for file tree, diff viewer, and AI bar. Documented shortcuts in `?` modal. |
| Screen reader support | ARIA labels on all interactive elements. Diff viewer announces hunk boundaries. File tree uses `role="tree"`. |
| Color contrast | WCAG 2.1 AA minimum. Diff colors tested for color blindness (red-green alternatives available). |
| Focus management | Focus moves logically: file tree -> diff viewer -> AI bar. `Tab` and `Shift+Tab` follow DOM order. |
| Reduced motion | Respect `prefers-reduced-motion`. No animations that cannot be disabled. |

### Reliability

- **Graceful degradation when GitHub API is down:** Show cached data with a stale-data banner. Allow users to continue reviewing with local notes.
- **AI failures are non-blocking:** If the Anthropic API is unreachable, the AI bar shows an error state. The rest of the app is fully functional.
- **Session recovery:** Review progress is saved to Postgres on every state change (debounced). If the user closes the tab and reopens, they resume where they left off.

### Observability

- **Structured logging** on all API routes (request ID, user ID, latency, status)
- **Error tracking** via Sentry (client + server)
- **Performance metrics** via Vercel Analytics (Core Web Vitals, API route latency)
- **AI usage tracking** stored in `ai_messages` table (tokens used, model, latency)

---

## 9. Future Considerations

Items that are explicitly out of scope but should inform architectural decisions today:

- **Real-time collaboration.** Multiple reviewers on the same PR simultaneously. This will eventually require WebSockets or CRDTs. For now, ensure the data model supports multiple `review_sessions` per PR without conflicts.
- **Self-hosting.** Some teams cannot use a hosted service. The tech stack (Next.js, Postgres, Redis) is all self-hostable. Avoid hard dependencies on Vercel-specific features.
- **Plugin system.** Custom AI prompts, custom categorization rules, custom review checklists. Design the categorization and AI prompt systems to be configurable from day one, even if the UI for configuration comes later.
- **GitHub Enterprise.** Different API base URL. Ensure the GitHub client abstraction allows configurable base URLs.
- **Offline support.** Service worker caching of previously loaded diffs. Low priority but the architecture (client-side state in Zustand, cached data in TanStack Query) supports it naturally.

---

## Appendix: GitHub Issues Breakdown

The following issue structure maps to the MVP scope. Each issue is sized for 1-3 days of work.

### Epic 1: Project Setup
1. Initialize Next.js 15 project with TypeScript, Tailwind, ESLint, Prettier
2. Set up Drizzle ORM + Neon Postgres connection
3. Set up Upstash Redis client
4. Configure GitHub Actions CI (lint, type-check, test)
5. Set up Sentry error tracking

### Epic 2: Authentication
6. Implement GitHub OAuth via NextAuth.js v5
7. Create user table and sync GitHub profile on login
8. Add auth middleware to protect API routes
9. Build login/logout UI

### Epic 3: PR Data Layer
10. Build GitHub API client (typed, with caching)
11. Implement PR list endpoint (user's review-requested + authored PRs)
12. Implement PR metadata endpoint (title, description, reviewers, status)
13. Implement file list endpoint with categorization logic
14. Implement diff/patch endpoint with hunk parsing

### Epic 4: File Sidebar
15. Build collapsible file tree component
16. Implement directory/type/impact grouping logic
17. Add file review status indicators
18. Add search/filter for file tree

### Epic 5: Diff Viewer
19. Build base diff renderer (unified + split view)
20. Integrate Shiki for syntax highlighting
21. Implement virtual scrolling with TanStack Virtual
22. Build collapsible hunks
23. Add minimap component
24. Implement keyboard navigation (j/k/n/p)

### Epic 6: Comments & Review
25. Build inline comment UI (add, view, reply)
26. Implement comment sync to GitHub API
27. Build review submission flow (approve/request changes/comment)
28. Add local notes feature (not synced to GitHub)

### Epic 7: AI Assistance Bar
29. Build floating AI bar component (collapsed/expanded states)
30. Implement code selection context detection
31. Build AI prompt construction with PR context
32. Implement streaming response display
33. Add quick-action buttons
34. Add "post as comment" action for AI responses

### Epic 8: Review Session Management
35. Create review_sessions and file_review_statuses tables
36. Implement session creation/resume logic
37. Build review progress UI (progress bar, file counts)
38. Add session recovery on page reload

---

*This document is the source of truth for GitReview's product scope. Update it as decisions are made.*
