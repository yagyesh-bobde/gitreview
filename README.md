# GitReview

**A better way to review large pull requests.**

---

## The Problem

GitHub's pull request review interface falls apart on large changesets. Once a PR crosses a few hundred lines, the flat file list becomes unnavigable, the diff viewer bogs down, and meaningful review gives way to rubber-stamping. Reviewers lose context, miss bugs, and burn out. The tooling should scale with the code -- not against it.

GitReview is a dedicated review interface that makes large PRs manageable. It groups files intelligently, renders diffs with virtual scrolling, and puts an AI assistant at your fingertips throughout the review.

---

## Key Features

- **Smart file categorization** -- Group changed files by directory, file type, or estimated impact. Navigate a 200-file PR without losing your mind.
- **Enhanced diff viewer** -- Virtualized scrolling handles massive files without choking. Syntax highlighting via Shiki WASM. Collapsible hunks let you focus on what matters.
- **AI-powered assistant** -- A floating Gemini-powered bar available on every screen. Explain code, summarize changes, spot bugs, or ask freeform questions about the diff.
- **GitHub integration** -- Authenticate with your GitHub account, sync comments and reviews bidirectionally. Your work stays on GitHub where your team expects it.
- **Keyboard-driven workflow** -- Navigate files, toggle hunks, and trigger AI actions without touching the mouse.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4, shadcn/ui |
| Database | Drizzle ORM + Neon Postgres |
| Cache | Upstash Redis |
| AI | Google Gemini (`@google/generative-ai`) |
| Auth | NextAuth.js v5 (GitHub OAuth) |
| Virtualization | TanStack Virtual |
| State | Zustand, TanStack Query |
| Package Manager | pnpm |

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm

### Setup

```bash
git clone https://github.com/your-org/gitreview.git
cd gitreview
pnpm install
cp .env.example .env.local
# Fill in your environment variables (see below)
pnpm dev
```

### Environment Variables

Create a `.env.local` file with the following:

```
# Auth
AUTH_SECRET=                    # NextAuth secret (openssl rand -base64 32)
AUTH_GITHUB_ID=                 # GitHub OAuth App client ID
AUTH_GITHUB_SECRET=             # GitHub OAuth App client secret

# Database
DATABASE_URL=                   # Neon Postgres connection string

# Cache
UPSTASH_REDIS_REST_URL=         # Upstash Redis REST URL
UPSTASH_REDIS_REST_TOKEN=       # Upstash Redis REST token

# AI
GOOGLE_GENERATIVE_AI_API_KEY=   # Google Gemini API key
```

---

## URL Structure

GitReview mirrors GitHub's URL pattern:

```
localhost:3000/<org>/<repo>/pull/<id>
```

In production, this maps to:

```
gitreview.app/<org>/<repo>/pull/<id>
```

Paste any GitHub PR URL, swap the domain, and you are in.

---

## Project Structure

```
src/
  app/            # Next.js App Router pages and API routes
  features/       # Feature modules (auth, github, diff-viewer, file-tree, ai-bar, ...)
  lib/            # Shared utilities, DB client, API helpers
  stores/         # Zustand stores (review, ai-bar, ui)
  components/     # Shared UI components
  types/          # Shared TypeScript types
  config/         # App configuration and constants
drizzle/          # Database migrations
```

Each feature is self-contained with its own components, hooks, and server logic. Features communicate through Zustand stores, never by importing each other directly.

For the full architecture, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Contributing

Contributions welcome. Check the issues labeled **`autopilot`** for good starting points.

---

## License

MIT
