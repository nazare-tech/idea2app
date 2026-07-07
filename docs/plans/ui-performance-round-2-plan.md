---
implemented: true
implemented_at: 2026-07-06T17:55:04-07:00
implementation_summary: "Implemented all nine UI Performance Round 2 items: desktop-gated optimized landing hero, static landing preview captures with a live-preview dev flag, Generate All polling backoff and hidden-tab pause, server-rendered billing with client islands, font weight trimming, AVIF/WebP image optimizer formats, workspace content-visibility containment, cached server current-user lookup, and quantized testimonial blur updates."
---

# UI Performance Round 2 — Implemented Plan

## Goal

Implement the remaining UI performance opportunities found after the 2026-07-06 first pass. The work focuses on the landing page's mobile bandwidth, workspace steady-state CPU/layout cost, billing first render, repeated server auth lookups, and small animation/font/image optimizer wins.

## Assumptions

- Landing page is the highest-traffic surface; mobile bandwidth and LCP matter most there.
- Workspace sessions are long-lived; steady-state CPU from polling and huge document layout matters more than one-time load cost.
- No new runtime dependencies should be added.
- The Supabase preconnect noted in the first pass was already present and was preserved, not reimplemented.

## Clarifying Questions

No blocking clarification was required. Per repo rules, Recommendation A was selected for the two open decisions.

## Recommendation Choices

- **Landing previews:** Selected Recommendation A, static captures everywhere. Live iframe previews are retained only behind `NEXT_PUBLIC_LANDING_LIVE_PREVIEWS=1` for local design iteration.
- **Font weights:** Selected Recommendation A, keep weight 800 and remove weight 900 usage. Weight 300 was dropped because it had no usage.

## Implementation Phases

1. **Landing bandwidth:** Implemented desktop media gating for hero artwork, removed `unoptimized`, added AVIF/WebP optimizer formats, generated five static preview captures, and replaced production feature iframes with `next/image` captures.
2. **Workspace and polling:** Implemented Generate All polling backoff and visibility pause/resume. Added `content-visibility: auto` plus `contain-intrinsic-size` to inactive heavy workspace document frames and updated scroll navigation to perform exact two-phase jumps when containment is involved.
3. **Billing and auth:** Converted `/billing` to a server component for initial data, split interval/checkout/portal controls into client islands, added billing DTO helpers, and introduced cached `getCurrentUser()` for dashboard layout/pages.
4. **Small wins:** Trimmed Hanken Grotesk weights, migrated the `font-black` billing usage to `font-extrabold`, and quantized testimonial blur updates.
5. **Documentation and verification:** Updated `PROJECT_CONTEXT.md`, generated static preview artifacts, captured UI evidence, and recorded review notes in `docs/plans/ui-performance-round-2-review.md`.

## Architecture Improvement Opportunities

| Opportunity | Benefit | Trade-off | Boundary | Status |
|---|---|---|---|---|
| Static landing preview capture pipeline | Removes five live iframe app boots from the marketing page | Captures can become stale | `scripts/export-landing-sample.mjs`, `/landing-preview`, `FeatureProductPreview` | Selected and implemented |
| Server billing split | Removes spinner-first billing render and reduces client work | Requires DTO normalization between server and client | `/billing`, pricing components, `billing-page-data.ts` | Selected and implemented |
| Cached server current user | Avoids repeated Supabase auth user calls within one request | Must stay request-scoped | dashboard layout/pages, `current-user.ts` | Selected and implemented |
| Workspace content containment | Reduces layout/paint work for large inactive documents | Anchor/hash behavior must be preserved | `ScrollableContent`, `WorkspaceDocumentFrame`, scroll sync hook | Selected and implemented |
| Polling backoff and visibility pause | Reduces hidden-tab network churn without changing durable server execution | Freshness delay grows during long visible runs | `generate-all-store.ts` | Selected and implemented |
| Blur update quantization | Reduces SVG filter invalidations | Tiny visual approximation | `testimonial-band.tsx` | Selected and implemented |

## Test Strategy And Results

- `node --import tsx --test src/stores/generate-all-store.test.ts src/components/layout/workspace-document-frame.test.tsx src/components/layout/scrollable-content.test.tsx` passed.
- `npm run typecheck` passed.
- `npm run lint` passed with one existing unrelated warning in `output/playwright/prod-full-flow.mjs`.
- `npm test` passed.
- `npm run build` passed after rerunning outside the sandbox; the first sandboxed attempt failed on a Turbopack port bind permission error.
- `LANDING_PREVIEW_BASE_URL=http://localhost:3000 node scripts/export-landing-sample.mjs --capture-previews-only` generated all five static preview PNGs under `public/landing/samples/previews/`.
- Real local UI verification against `http://localhost:3000` confirmed: mobile landing has zero hero-layer images, zero preview iframes, and no hero/preview image requests; desktop features render five static preview images and zero preview iframes or `/landing-preview` requests; `/billing` renders signed-in content with no loading spinner.

## UI Evidence

- `ui-evidence/2026-07-07/ui-performance-round-2/landing-mobile-top.png` — `/`, 375px mobile viewport, no hidden hero/preview requests.
- `ui-evidence/2026-07-07/ui-performance-round-2/landing-desktop-features.png` — `/#features`, 1440px desktop viewport, five static preview images.
- `ui-evidence/2026-07-07/ui-performance-round-2/billing-desktop.png` — `/billing`, 1440px desktop viewport, signed-in server-rendered billing content.

## Rollback Or Recovery

- Landing preview rollback: set `NEXT_PUBLIC_LANDING_LIVE_PREVIEWS=1` to use the preserved iframe implementation, or revert `FeatureProductPreview` and the generated preview images.
- Billing rollback: restore the prior client page if a server data contract regression appears; checkout and portal endpoints were not changed.
- Workspace rollback: remove `performanceContain` props from `ScrollableContent` while keeping the scroll-sync improvements.
- Polling rollback: set `getGenerateAllPollDelayMs()` to always return `3000` and remove the visibility listener.

## Candid Critique

- **Architecture:** The static capture pipeline creates a new artifact freshness responsibility; keeping it in the existing sample export script limits that risk.
- **Product:** Static previews are visually equivalent at landing-card size and better for visitors, but they no longer reflect runtime UI changes automatically.
- **Customer:** Billing now avoids the spinner flash and lands on useful account content sooner.
- **Engineering:** The workspace containment change is the riskiest interaction area; tests cover the containment props and rendered-frame behavior, and UI/manual follow-up should focus on hash jumps in a fully generated project.
- **Risk/Security:** No RLS, webhook, checkout validation, or durable data model behavior was weakened. The billing page still scopes data to the authenticated user and leaves Stripe actions in existing API routes.
