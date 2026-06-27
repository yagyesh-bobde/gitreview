# GitReview — Gallery & Visual Assets Spec

The first gallery image is the single highest-impact asset on the page — it appears in the carousel, social shares, and embeds, and decides whether someone reads further. Motion (GIF/video) correlated with every strong code-review launch; static-screenshot-only galleries are the also-ran signature.

## Hard specs (verified against PH docs)

| Asset | Spec |
|---|---|
| Gallery image | **1270 × 760 px** (≈1.67:1), PNG (static) or GIF (animated), **< 5 MB each** |
| Thumbnail | **240 × 240 px**, GIF must be **< 3 MB**. Use a crisp logo/product moment — **not a gradient**, faces/UI outperform gradients |
| Video | **YouTube link only** — upload ahead of launch, confirm it's NOT private/unlisted-broken. ~53% of Product-of-the-Day winners had one |
| Minimum | 2 images for the gallery to render. **Optimal: 5–6 strong visuals** (five strong beat six mediocre) |
| Composition | Browser-frame web-app shots, 10–20% padding, **one annotation max per image**, text readable at thumbnail size |

You already have two high-res source screenshots in `docs/screenshots/`:
- `dashboard.png` — multi-repo PR dashboard
- `pull-request-diff.png` — 147-file PR with categorized tree + syntax-highlighted diff

These are the raw material for slides 2 and 3 below. Crop/frame them to 1270×760.

## The 6-slide shot list

Put the **demo video first in the YouTube slot** if you make one; keep slide 1 as the static poster regardless.

### Slide 1 — Hero / launch poster (static PNG) ⭐ make-or-break
- Clean shot of a large PR open in GitReview, with a bold overlay headline.
- Headline: **"Review a 500-file PR in minutes."** (or the chosen tagline)
- Must be scannable as a thumbnail. This is what stops the scroll.

### Slide 2 — Intelligent file grouping
- The sidebar grouping a huge changeset into logical buckets (by feature/module/impact), showing a high file count (the README cites 147).
- Annotation: **"Files grouped intelligently — not an alphabetical wall."**
- Source: crop from `docs/screenshots/pull-request-diff.png`.

### Slide 3 — Virtualized diff viewer (GIF or video) ⭐ the "wow"
- A short animated scroll through a 1,000-file diff staying buttery smooth.
- Annotation: **"1,000 files. Zero lag."**
- This is the proof the tool does the thing GitHub can't.

### Slide 4 — Gemini AI assistant
- The floating AI bar summarizing a complex change / flagging a risky diff / answering "what does this function do?"
- Annotation: **"Ask AI about any change, on any screen."**

### Slide 5 — Keyboard-driven workflow
- Shortcuts overlaid on an active review (j/k navigate, toggle hunk, mark viewed, approve).
- Annotation: **"Review without touching the mouse."**
- Speaks directly to power-user devs (the PH dev audience).

### Slide 6 — GitHub bidirectional sync + before/after
- Comments/approval syncing back to the GitHub PR. Optionally a before/after: chaotic GitHub diff vs. clean GitReview view.
- Annotation: **"Your work syncs back to GitHub."**

## The demo video (if you make one — recommended)

- **30–60 seconds**, no intro fluff, action in the first 3 seconds.
- Script beat: open a genuinely huge PR in GitHub (show it choking/scrolling forever) → cut to the same PR in GitReview (grouped, instant) → scroll the virtualized diff → ask the AI a question → approve with a keyboard shortcut → comment syncs to GitHub.
- End card: logo + tagline + URL.
- Captions on (most PH browsing is muted).

---

*Specs: [How to post a product](https://help.producthunt.com/en/articles/479557-how-to-post-a-product), [Preparing for launch](https://www.producthunt.com/launch/preparing-for-launch), [Framed Shot gallery guide](https://framed-shot.com/guides/product-hunt-gallery-screenshots-sizes/).*
