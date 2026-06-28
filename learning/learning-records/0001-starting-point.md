# 0001 — Starting point

**Date:** 2026-06-28

## Context
First session. User (Yagyesh, the repo's author) wants a simple-language tour of how the GitReview repo works: features, tools, auth, data fetching, rendering, packages + why.

## What was taught
- **Lesson 1 — The Big Picture**: one-sentence definition, the 9 building blocks of the stack (with the one-line "why" per package), and the full journey of opening a PR (server → Redis → GitHub → hydrate → TanStack Query → Zustand → Virtual + Shiki). Ends with a 3-question interactive quiz.

## Assumed prior knowledge (to verify)
- User is an experienced builder, so concepts can go deep; only the *wording* needs to stay simple.
- Assumed they know general web terms (browser, server, API) — confirmed reasonable given they wrote this app.

## Zone of proximal development — next
- The orientation lesson is the anchor. Each remaining block now has room to become its own focused lesson.
- **Most likely next:** Authentication (GitHub OAuth + tokens + multi-account) — it's the first thing in the request list and the first thing that runs in the app.
- Sequencing depends on the mission answer (own/extend vs onboard others vs write about it) — pending.

## Open / unknown
- Has the user worked much with server vs client components before? Unverified.
- Confidence with TanStack Query / Zustand specifically? Unverified — Lesson 1 only introduced them by name.
