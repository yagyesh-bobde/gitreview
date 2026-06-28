# Mission

## Who
Yagyesh — builder and primary author of **GitReview** (a Next.js app for reviewing large GitHub pull requests).

## What they want to learn
A clear, simple-language understanding of how the GitReview repo is actually built:
- The features and what each one does
- The tools/toolkit and packages used — and *why* each was chosen
- How authentication works (GitHub OAuth via NextAuth v5)
- How data is fetched (GitHub REST API, caching, TanStack Query)
- How data is shown / rendered (file tree, virtualized diffs, Shiki highlighting)

## Why (the real grounding) — CONFIRMED 2026-06-28
**To own & extend the codebase confidently** — keep building features and be able to navigate/change any part without hesitation.

Implication for teaching: go DEEP on internals and always answer "where would I change X / where does this live in the code." Show real files, real functions, the seams where new code plugs in. Simple language, but not shallow.

## Teaching constraints (from the user)
- **Language must be very simple to understand.** Avoid jargon; when a technical term is unavoidable, define it in plain words first.
- Ground every claim in the *actual* repo (real file paths), not generic tutorials.

## Lesson sequence (planned)
1. **The Big Picture** — 9 building blocks + journey of loading a PR. ✅ done
2. **Fetching data** — 3-layer path, 3 caches, SWR, resilience, extend recipe. ✅ done (chosen next by user)
3. Rendering data — file tree, TanStack Virtual, Shiki diffs
4. Authentication — GitHub OAuth, NextAuth v5, tokens, multi-account linking
5. The AI bar — Gemini, prompt building, streaming
6. State management — Zustand stores + the "features never import each other" rule
- (hands-on option) Pair-implement the §05 commits endpoint to cement the extend pattern.
