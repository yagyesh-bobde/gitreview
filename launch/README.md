# GitReview — Product Hunt Launch Kit

Everything needed to launch GitReview on Product Hunt and rank **#1 Product of the Day**. Built from research across Product Hunt's official docs, the 2025–2026 algorithm changes, and post-mortems of every comparable AI code-review launch.

## The one-line strategy

> **Own "large pull requests." Nobody else in the category does.**

The AI-code-review leaderboard is saturated with interchangeable "AI Code Reviewer" taglines (CodeAnt, Matter AI, Ellipsis, and half the field). The two tools that hit **#1** — Trag and cubic — won by carrying a single sharp differentiator verbatim through tagline → description → first comment. GitReview's differentiator is the one no competitor claims: **reviewing massive PRs without your tools (or your brain) choking.** Every asset in this kit hammers that.

## What's in here

| File | What it's for |
|---|---|
| [`01-submission.md`](./01-submission.md) | **Copy-paste ready** form fields: tagline, description, topics, maker's first comment |
| [`02-gallery-spec.md`](./02-gallery-spec.md) | Exact gallery specs + a 6-slide shot list (what each image/GIF must show) |
| [`03-launch-day-playbook.md`](./03-launch-day-playbook.md) | Hour-by-hour launch-day timeline (12:01 AM PT onward) |
| [`04-pre-launch-checklist.md`](./04-pre-launch-checklist.md) | 4-week runway: audience building, assets, scheduling |
| [`05-outreach-templates.md`](./05-outreach-templates.md) | Compliant DM / email / X / Discord copy (NEVER asks for upvotes) |

## The 5 rules that decide the launch

1. **Get Featured first — it's a separate editorial gate.** As of 2025 only ~10% of submissions get Featured (homepage + app + newsletter). Upvotes can't buy it. Editors judge on Useful / Novel / High Craft / Creative. A clear, obvious value prop and a video demo are what win it. **No vaporware, no waitlist.**
2. **Launch at 12:01 AM PT, and win the first 4 hours.** 100+ upvotes in the first 4 hours ≈ 82% chance of Top 10. Positions are won between 12:01–1:00 AM PT. Launches after ~6 AM PT essentially never hit Top 5.
3. **Never ask for upvotes.** Asking people to *visit, comment, or give feedback* is allowed. Asking to *upvote* (or rewarding it) gets you deranked or delisted. Every template here is written to comply.
4. **Comments are weighted heavily — engineer them.** cubic hit #1 with only **73 upvotes** but **737 comments.** Maker's first comment + replying to every comment within ~10 min is the single biggest controllable lever. 70% of Product-of-the-Day winners had a maker first comment.
5. **Drive votes from real, established accounts, spread over time and geography.** New/throwaway accounts are weighted ~0.1x and trigger fraud filters. Same-city/same-minute spikes get stripped in PH's ~2-hourly vote-clearing passes (visible count drops are normal — don't panic).

## The numbers to beat (AI code-review cohort)

| Tool | Rank | Upvotes | Why it won / lost |
|---|---|---|---|
| **Trag** | #1 | 966 | Sharp "twist" (plain-English pattern rules) carried everywhere + `TRAGPH` offer |
| CodeRabbit | #2 | 558 | "Cut code review time & bugs in half" + free-for-OSS |
| CodeAnt AI | #4 | 650 | Pain-point-bullet first comment + time-boxed free month |
| **cubic** | #1 | 73 (+737 comments) | Analogy tagline ("Cursor for code review") + massive comment mobilization |

**Realistic target:** 550–650 upvotes → solid #2–#4. **Stretch (#1):** beat 966, *or* out-comment the field the way cubic did. The category is winnable — only 2 tools have ever hit #1.

## Decisions you still need to make

- **Launch date** — recommend a **Tuesday, Wednesday, or Thursday** if you have an audience to mobilize for max signups; **Friday–Sunday** if your list is small and you mainly want the #1 badge. See `04-pre-launch-checklist.md`.
- **The offer** — GitReview is free, so there's no discount to give. Recommended play: **"Product Hunt fast-track"** — PH commenters get priority early access to the next paid/Pro feature, or a permanent "founding reviewer" badge. It doubles as a comment-driver. Drafted in `01-submission.md`.
- **Demo video** — 53% of Product-of-the-Day winners had one, and every strong code-review launch used motion (GIF/video) over static screenshots. Strongly recommended. Spec in `02-gallery-spec.md`.

---

*Sources: Product Hunt official docs (featuring guidelines, community guidelines, preparing-for-launch), CEO AMA (Rajiv Ayyangar), and PH pages for Trag, cubic, CodeRabbit, CodeAnt, Ellipsis, Graphite, Qodo. Full citations in the per-file footers.*
