---
reviewed_at: 2026-07-10T22:07:26-07:00
status: complete
---

# Product Event Analytics Review

## Scope

Reviewed the first-party Supabase product analytics foundation for NAZ-43 and NAZ-126: typed event contracts, browser batching, authenticated ingestion, semantic workspace reach, mockup/prompt/upgrade actions, trusted project/generation/Stripe lifecycle events, storage/RLS/views/retention, and durable taxonomy guidance.

## Verification Run

- `npm test`: 533 passed, 0 failed after final remediation.
- `npm run typecheck`: passed.
- Changed-file ESLint across all analytics, API, Stripe, workspace, artifact, upgrade, and billing files: passed.
- `npm run lint`: blocked by one unrelated existing error in `src/components/layout/workspace-document-frame.tsx:52` (`setState` synchronously in an effect) and one unrelated warning in `output/playwright/prod-full-flow.mjs:28` (unused variable).
- `git diff --check`: passed.
- `npm run build`: passed before the final timing-query remediation, including 75 static pages and the webpack/chunky vendor guard. The final rerun could not start because elevated execution approval hit the Codex usage limit; the subsequent change passed tests, typecheck, focused lint, diff check, and fresh-eyes review.
- Focused analytics/Stripe/component tests: passed.
- Local Supabase validation was unavailable because Docker Desktop was not running; linked-database verification was used instead.
- `npx supabase db push`: applied sole pending migration `20260710000100_create_product_event_analytics.sql`; the subsequent migration list showed matching local and remote versions.
- Live transactional SQL probe: `product_events` exists with RLS enabled and forced, zero browser policies, and no `anon`/`authenticated` select, insert, or ingestion-RPC privilege. `service_role` has select/insert and RPC execute, but no update/delete or cleanup execute.
- Live behavioral probe: duplicate direct inserts and duplicate batch-RPC calls each produced exactly one row; a one-event daily limit rejected overflow with `product_event_daily_quota_exceeded`.
- Live analysis/retention probe: all 10 private `analytics` views exist and one active `cleanup-product-events` cron job is scheduled. The production activity view returned safely, with zero rows before real production events arrive.
- The verification ran inside a rolled-back transaction; a follow-up query confirmed zero persisted `codex-product-analytics-verify-*` rows.

## Real UI Verification

Chrome Plasma profile exercised the actual authenticated local app at 1430px width:

- Workspace section nav to a generating Design Mockup concept (`#mockups-concept-1`) after the one-second reach threshold.
- Prompt Files nav, ready-card impression window, and first-prompt lightbox open.
- Ready Design Mockup Concept 1 nav/reach, lightbox open, and successful image clipboard action with visible copied feedback.
- Prompt text clipboard feedback did not succeed in the controlled Chrome session; because instrumentation is success-only, no copied event should be emitted for that attempt.

Evidence: `ui-evidence/2026-07-10/product-event-analytics/`.

The linked database now proves storage availability, private browser access, append-only service privileges, idempotent inserts, atomic quota rejection, production-view availability, and cleanup scheduling. Real production aggregates will populate only after deployed application traffic emits production events.

## Code Review Findings

Two fresh-eyes passes found no unresolved P0-P2 issues after remediation. Findings that were fixed included:

- Separate retry run identity/mode from the original generation run and exclude old completed steps from retry telemetry.
- Preserve ready-state mockup impressions after partial reach, keep the pagehide flush independent from a normal in-flight batch, and classify the second section as scroll rather than initial viewport.
- Cover manual analysis/mockup generation, validate persistence before completion, and compute mockup duration from the trusted `generation_started` event rather than the first completed image draft.
- Recover subscription cancellation identity/plan when the local subscription row is absent, with `unknown` as an explicit non-forged fallback.

## Security Review Findings

The final security review found no unresolved P0-P2 issues. Earlier findings were remediated by:

- Correlating checkout attribution to a recent, owned, stored `upgrade_cta_clicked` event and reconstructing trusted context from that row rather than browser metadata.
- Enforcing the per-user daily quota atomically with a service-only, fixed-search-path RPC and a transaction advisory lock.
- Applying streaming request-body hard caps before buffering product-event and Stripe-webhook bodies.
- Keeping raw event storage and analytics views unavailable to browser roles; only the service role can insert/select raw rows.

## Architecture Improvement Review

- Typed/versioned registry: landed with exact client/server event and property allowlists.
- Idempotent writes: landed with client UUID keys and deterministic queue/Stripe transition keys.
- Trust-boundary enrichment: landed; user, plan, environment, and release are server-derived, and project references require ownership.
- Private analysis layer: migration includes production-only activity, section, artifact, activation, retention, churn-risk, and mockup-entitlement views.
- Semantic measurement: landed; canonical section targets and stable dwell replace raw scroll coordinates/autocapture.
- Centralized action instrumentation: landed through the browser client and shared upgrade link.
- Retention/cleanup: fixed 180-day cleanup is in the migration.
- Deferred open-source additions: Metabase first; dbt Core/ClickHouse/OpenPanel/PostHog only after measured need.
- No new authorization gaps, content capture, arbitrary JSON properties, or non-idempotent trusted transitions were intentionally introduced.

## Remediation Status

- Corrected analysis views to group real canonical subsection IDs rather than nonexistent top-level IDs.
- Corrected retention cohorts to start from first activation and count meaningful returns rather than session starts.
- Restricted the mockup-entitlement denominator to current valid OpenRouter image mockup rows.
- Bounded browser event retries and queue size; protected best-effort lifecycle flushes from an already in-flight batch.
- Prevented modal artifact previews from producing analytics reach events while the dialog is open.
- Added trusted manual generation coverage, retry-run isolation, persistence checks, and full mockup-run duration measurement.
- Replaced browser-authored checkout context with stored click correlation and made ingestion quota enforcement atomic.
- Added streaming hard caps for product analytics and Stripe webhook requests.
- Applied the analytics migration to the linked Supabase database and completed live SQL/RLS/idempotency/quota/view/cron probes with rollback-safe synthetic data.

## Recovery

Code rollback stops emission without changing product, generation, or billing authority. If database rollback is required, first disable ingestion, unschedule cleanup, and then remove analytics views/function/table in a deliberate follow-up migration. Deterministic trusted-event keys permit replay after transient analytics failures.
