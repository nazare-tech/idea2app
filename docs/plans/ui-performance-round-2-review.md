---
reviewed_at: 2026-07-06T17:55:04-07:00
implementation_plan: docs/plans/ui-performance-round-2-plan.md
status: passed
---

# UI Performance Round 2 Review

## Scope

Implemented all nine UI Performance Round 2 items:

- Desktop-gated and optimized landing hero artwork.
- Static landing feature preview captures with a live iframe dev flag.
- Generate All polling backoff and hidden-tab pause/resume.
- Server-rendered `/billing` with checkout/portal client islands.
- Hanken Grotesk font-weight trim.
- AVIF/WebP image optimizer formats.
- Workspace document `content-visibility` containment.
- Cached server current-user lookup for dashboard requests.
- Quantized testimonial SVG blur updates.

Subagent exploration was used for the medium-sized landing, billing, and workspace/polling portions. The final implementation, verification, and documentation updates were done in this thread.

## Verification Run

| Check | Result | Notes |
|---|---|---|
| `node --import tsx --test src/stores/generate-all-store.test.ts src/components/layout/workspace-document-frame.test.tsx src/components/layout/scrollable-content.test.tsx` | Passed | Focused coverage for polling cadence and workspace containment behavior. |
| `node --import tsx --test src/stores/generate-all-store.test.ts` | Passed | Re-run after fixing the `started_at` fallback edge case. |
| `npm run typecheck` | Passed | TypeScript accepted the server/client billing split and new DTO helpers. |
| `npm run lint` | Passed with existing warning | Existing unrelated warning remains in `output/playwright/prod-full-flow.mjs`. |
| `npm test` | Passed | Full test suite passed: 400 tests. |
| `npm run build` | Passed | First sandboxed run failed with a Turbopack port bind permission error; rerun outside the sandbox passed and the webpack/chunk regression guard passed. |
| `LANDING_PREVIEW_BASE_URL=http://localhost:3000 node scripts/export-landing-sample.mjs --capture-previews-only` | Passed | Generated five static preview PNGs under `public/landing/samples/previews/`. |
| `node ui-evidence/2026-07-07/ui-performance-round-2/verify-ui.mjs` | Passed | Real local UI verification against `http://localhost:3000`. |

## UI Evidence

| Route | Viewport / State | Evidence |
|---|---|---|
| `/` | 375px mobile landing top; verified zero hero-layer images, zero preview iframes, and no hero/preview requests | `ui-evidence/2026-07-07/ui-performance-round-2/landing-mobile-top.png` |
| `/#features` | 1440px desktop features; verified five static preview images, zero preview iframes, and zero `/landing-preview` requests | `ui-evidence/2026-07-07/ui-performance-round-2/landing-desktop-features.png` |
| `/billing` | 1440px signed-in billing; verified heading and available-plan content render with no spinner | `ui-evidence/2026-07-07/ui-performance-round-2/billing-desktop.png` |

Chrome plugin tooling was not exposed in the available tools for this turn, so local UI verification used Playwright against the real dev server and real local environment. The screenshots and checks were still captured through the actual app routes, not fixtures or patched routes.

## Code Review Findings

- Fixed during review: `generate-all-store.ts` hydration could compute the stale-queue cutoff from `new Date(dbRow.started_at)` even when `started_at` was missing. It now uses the same fallback timestamp assigned to `pollStartedAtRef.current`.
- Fixed during review: the local UI evidence script initially used a Playwright API shape that was unavailable in the installed runtime; it was patched to stable locators and rerun successfully.
- No unresolved correctness findings after reviewing the landing preview swap, billing data boundaries, polling lifecycle cleanup, workspace containment props, and scroll-sync behavior.

## Security Review Findings

- No secrets were hardcoded or printed. The UI verification script reads local e2e credentials from `.env.e2e.local` and does not log credential values.
- Billing checkout and portal writes remain in the existing API routes. The client island still sends `{ planId, priceId }`, and `/api/stripe/checkout` remains responsible for validating the requested `plan_prices.stripe_price_id`.
- Server-rendered billing data remains scoped to `getCurrentUser()` and the existing Supabase RLS/user-context client.
- No database schema, RLS policy, webhook, or durable authority-field changes were introduced.

## Architecture Improvement Review

- Static preview captures landed and removed the production iframe boot path. Deferred risk: captures must be regenerated when the workspace preview design changes.
- Server billing split landed with DTO normalization in `src/lib/billing-page-data.ts`; the client island owns only interval and checkout/portal interactions.
- Cached current-user lookup landed in `src/lib/supabase/current-user.ts` and is shared by the dashboard layout and pages.
- Workspace containment landed behind explicit `performanceContain` props and is disabled for the currently active source document.
- Scroll navigation was updated to jump first to the owning frame, then to the exact subsection after layout has a frame, which addresses the main containment/anchor risk.
- Generate All polling backoff landed with cleanup for timers and the `visibilitychange` listener.
- No new duplication, authorization gap, non-idempotent durable path, or recovery blind spot was found in the reviewed changes.

## Remediation Status

All review findings identified during this pass were remediated and re-tested.
