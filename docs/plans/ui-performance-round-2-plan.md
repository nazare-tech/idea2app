---
implemented: false
implemented_at: null
implementation_summary: null
---

# UI Performance Round 2 — Backlog Plan (not yet implemented)

## Goal

Catalog the remaining UI performance opportunities found after the 2026-07-06 first pass (lazy WebGL loader, gated hero rAF loop, memoized MarkdownRenderer, cached landing user count, parallel billing fetches, Supabase preconnect). This is a decision-ready backlog: each item has evidence, expected impact, effort, and risk. **Nothing here is implemented yet.**

## Assumptions

- Landing page is the highest-traffic surface; mobile bandwidth and LCP matter most there.
- Workspace sessions are long-lived; steady-state CPU (polling, layout cost of huge documents) matters more than initial load there.
- No new dependencies unless an item explicitly says so.

## Findings and Proposed Improvements (priority order)

### 1. Stop shipping 1.2MB of hero PNGs to phones (High impact, Low effort)
**Evidence:** `public/landing/hero/` is 1.2MB across 16 layered PNGs. `HeroArtwork` renders them with `loading="eager"` + `unoptimized`, and the container is `hidden lg:block`. CSS hiding does not prevent download: every mobile visitor pays 1.2MB for artwork they never see.
**Proposal:** Render the layer `<Image>`s only when `matchMedia("(min-width: 1024px)")` matches (client gate with a null initial render; the box is already `aria-hidden` decoration so no SEO/CLS concern). Separately, re-export the layers as WebP (expect 60-80% smaller) or drop `unoptimized` so next/image serves WebP/AVIF variants.
**Risk:** Low. Watch for a flash on desktop first paint (mitigate: keep SSR render for lg via a `<link rel="preload" media="(min-width:1024px)">` or accept one-frame pop-in on an already-animated decoration).

### 2. Replace the five landing feature iframes with static captures (High impact, Medium effort)
**Evidence:** `FeatureProductPreview` embeds `/landing-preview/[navKey]` in an `<iframe loading="lazy">` five times. Each iframe boots a full Next.js page: framework JS, hydration, fonts, and styles, times five, on the marketing page. `public/landing/samples/` (2.8MB) feeds these previews.
**Proposal:** Extend the existing `scripts/export-landing-sample.mjs` flow to also capture build-time screenshots of each preview route (Playwright is already used in `output/playwright/`), then swap iframes for `next/image` with proper `sizes`. Keep the iframe path behind a dev flag for design iteration.
**Risk:** Medium. Loses the "live UI" authenticity and the crop/active-section params must be baked into the captures; screenshots go stale if workspace UI changes (mitigate: regenerate in the same script that exports sample content).

### 3. Pause and back off Generate All polling (Medium impact, Low effort)
**Evidence:** `generate-all-store.ts` polls `/api/generate-all/status` on a fixed 3s `setTimeout` loop while a queue is active. There is no `visibilitychange` handling: a hidden tab keeps polling every 3s for the entire multi-minute generation run.
**Proposal:** Pause the loop when `document.hidden`, poll immediately on `visibilitychange` back to visible, and step the interval up for long runs (3s for the first ~2 min, then 6-10s). Server-side execution is already durable, so slower polling only delays UI refresh, not generation.
**Risk:** Low. Keep the immediate poll-on-focus so returning users see fresh state instantly.

### 4. Convert /billing to a server component with client islands (Medium impact, Medium effort)
**Evidence:** `src/app/(dashboard)/billing/page.tsx` is fully client-rendered: users see a spinner while the browser runs auth + three queries (now parallel, but still client round trips after JS loads).
**Proposal:** Fetch plans, subscription, and allowance in a server component (the dashboard layout already resolves the user server-side) and pass them to a client island that owns only the interval toggle and checkout/portal buttons. Removes the spinner flash and cuts client JS.
**Risk:** Medium. Checkout state machine and `useBillingPortal` stay client-side; keep the shared `PlanCard`/`BillingIntervalToggle` components as-is (they already work in both worlds).

### 5. Trim loaded font weights (Small impact, Trivial effort)
**Evidence:** `layout.tsx` loads Hanken Grotesk in 7 weights (300-900). Usage across `src/`: 400 (3), 500 (85), 600 (117), 700 (55), 800 (5), 900 (2), and **zero** uses of 300. globals.css only pins 400/500.
**Proposal:** Drop 300 outright. Migrate the 7 uses of `font-extrabold`/`font-black` to 700 or 800 and drop the other, ending at 4-5 weights. Fewer font files on every page of the app.
**Risk:** Low. Visual check on the two `font-black` usages (billing summary numerals) and five `font-extrabold` spots.

### 6. Enable AVIF in the image optimizer (Small impact, Trivial effort)
**Evidence:** `next.config.ts` has no `images.formats` entry, so next/image serves WebP at best. The 2.8MB of sample screenshots and mockup images are the main beneficiaries.
**Proposal:** `images: { formats: ["image/avif", "image/webp"] }`. AVIF typically saves another 20-40% on screenshots.
**Risk:** Low. First-hit transform cost on Vercel; cached afterward.

### 7. content-visibility for below-the-fold workspace documents (Medium impact, Medium effort)
**Evidence:** `ScrollableContent` defers below-fold sections by one animation frame at mount, but after that every generated document (often thousands of DOM nodes each) stays in the layout/paint tree for the life of the session.
**Proposal:** Apply `content-visibility: auto` with a rough `contain-intrinsic-size` to off-screen document sections so the browser skips their layout/paint work during scrolling and mutations.
**Risk:** Medium. Must not break hash-anchor navigation (`#executive-summary` etc.), the scroll-sync IntersectionObserver, or scroll-position restoration; needs manual testing on a project with all documents generated. Find-in-page inside skipped sections still works in Chromium but verify the nav-jump UX.

### 8. Deduplicate server-side auth lookups per request (Small impact, Low effort)
**Evidence:** The dashboard layout calls `supabase.auth.getUser()` and pages like `/projects` call it again in the same request; each is a network call to Supabase from the server.
**Proposal:** Wrap the server-side "current user" lookup in React `cache()` so layout + page share one call per request.
**Risk:** Low. Scope strictly per-request (React cache already is); no behavior change.

### 9. Quantize the testimonial dot blur updates (Tiny impact, Low effort)
**Evidence:** `testimonial-band.tsx` writes `feGaussianBlur stdDeviation` every animation frame while the dot travels; each write forces an SVG filter re-rasterization. The animation is short and IntersectionObserver-gated, so total cost is bounded.
**Proposal:** Quantize `stdDeviation` to ~4 buckets (skip the write when the bucket is unchanged), keeping the visual identical at a fraction of the filter invalidations.
**Risk:** Low. Purely decorative; verify the settle-to-round frame still looks right.

## Suggested Sequencing

1. Quick wins batch: items 5, 6, 8, 3 (one small PR, low risk).
2. Landing bandwidth batch: items 1, then 2 (largest user-facing wins; item 2 needs the screenshot pipeline).
3. Workspace/billing batch: items 4 and 7 (each its own PR with browser verification).
4. Item 9 only if touching the testimonial band anyway.

## Validation (when implemented)

- Lighthouse mobile run on `/` before/after items 1-2 (LCP, total bytes; expect multi-hundred-KB reductions).
- Network panel: confirm zero hero PNG requests at 375px width; confirm no `/landing-preview` document requests after item 2.
- DevTools performance trace on a fully generated workspace before/after item 7.
- Background tab: confirm status polling stops while hidden and resumes on focus (item 3).
- `npm run build`, lint, tests, and real-browser checks per project rules.

## Risks / Rollback

- Each item ships as its own commit; revert individually. Items 2 and 7 are behavior-visible and should get their own plan-file updates with browser evidence when implemented.

## Open Decisions

- Item 2: accept static screenshots vs keep live iframes on desktop only (recommendation: static everywhere; the scaled-down live UI is indistinguishable from a capture at that size).
- Item 5: keep 800 and drop 900, or migrate both to 700 (recommendation: keep 800, migrate the two 900 uses).
