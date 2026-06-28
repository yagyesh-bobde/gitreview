# 0002 — Fetching data

**Date:** 2026-06-28

## Mission confirmed
User's goal: **own & extend the codebase confidently.** Teaching now optimizes for depth + "where would I change/add X." Lessons must always point at real files and show the seam where new code plugs in.

## What was taught (Lesson 2)
- **The golden rule:** browser never calls GitHub directly. The 3-layer path: hook (`use-pr-files.ts`) → API route (`api/github/prs/route.ts`) → GitHub client (`features/github/api/client.ts`).
- **The three caches:** (1) TanStack Query `staleTime` in the browser, (2) Redis stale-while-revalidate on the server, (3) ETag → 304 against GitHub.
- **Stale-while-revalidate** read through with real code: `after()` for post-response refresh + `redisSetNX` single-flight lock.
- **Resilience trio:** Redis circuit breaker, graceful no-op when `REDIS_URL` unset, rate-limit tracker — all baked into shared helpers.
- **Extend recipe:** api fn → route → hook → component (4-step symmetry). Worked example: adding a PR commits endpoint.

## Grounding files read this session
`api/github/prs/route.ts`, `features/github/api/client.ts`, `lib/redis/index.ts`, `hooks/use-pr-files.ts`, `providers/query-provider.tsx`.

## Zone of proximal development — next
- User now understands the read path + the 4-step extend pattern conceptually. **Natural next step that fits "extend":** actually DO the recipe — pair on adding a real `usePRCommits` endpoint (hands-on, tightest feedback loop).
- Alternatively, **Rendering** (file tree + TanStack Virtual + Shiki) or **Auth** (tokens + multi-account, which underpins the `getAllTokens` fan-out they saw in `prs/route.ts`).

## Unknowns to probe later
- Comfort with TanStack Query mutations (vs queries) — only queries covered so far. `use-post-comment.ts` would be the mutation example.
- Haven't yet covered the GraphQL client (`api/graphql-client.ts`) — exists alongside REST.
