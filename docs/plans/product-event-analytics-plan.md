---
implemented: true
implemented_at: 2026-07-10T22:07:26-07:00
implementation_summary: Implemented and deployed the first-party Supabase product analytics foundation, including typed event contracts, trusted ingestion, UI/server instrumentation, private analytics views, retention, durable taxonomy guidance, tests, review, UI evidence, and live transactional SQL/RLS/idempotency/quota/cron verification.
---

# Plan: Product Event Analytics Foundation

## Goal

Implement the NAZ-43 product-event foundation in Supabase so Maker Compass can measure activation, workspace section reach and drop-off, mockup and AI Prompt engagement, upgrade intent, billing conversion, subscription churn, and generation lifecycle outcomes without collecting generated content or other sensitive payloads. The result must also leave a durable taxonomy and feature-planning checkpoint for future events.

## Assumptions

- Supabase PostgreSQL remains the canonical analytics store selected by the user; no external analytics dependency is added now.
- `api_request_metrics` remains operational telemetry and is not reused for behavioral events.
- Existing generation queues, artifact tables, subscriptions, and Stripe webhook claims remain business authority; product events are analytical evidence only.
- The dirty working tree contains user-owned work. This implementation will preserve those changes and keep edits narrowly scoped.
- Raw events retain controlled identifiers and enums only. Idea text, generated documents, prompt contents, image URLs/paths, email, raw referrers, IP addresses, user-agent strings, DOM snapshots, and arbitrary error text are prohibited.

## Clarifying Questions

1. Where should product events be stored?
   - Recommendation A: Add an append-only `product_events` table in Supabase with an authenticated first-party ingestion route and analytics views.
   - Trade-off: Lowest infrastructure cost and best joins with project, generation, and Stripe data; funnels require SQL/Metabase rather than a bundled product-analytics UI.
   - Recommendation B: Add a self-hosted analytics platform such as OpenPanel/PostHog now.
   - Trade-off: Faster dashboard UX but substantially more infrastructure, another source of truth, and more privacy/operations work.
   - Selected: Recommendation A, explicitly chosen by the user.

2. Should reach tracking use raw scrolling/autocapture or semantic events?
   - Recommendation A: Emit controlled section-reach events after the existing scrollspy target remains active for one second, deduplicated per workspace visit.
   - Trade-off: Answers the product question without noisy raw coordinates or surveillance-style data; it does not recreate pixel-perfect session replay.
   - Recommendation B: Store raw scroll positions, clicks, or DOM replay.
   - Trade-off: More forensic detail but higher privacy risk, volume, and false-signal rate.
   - Selected: Recommendation A.

3. How reliable should browser session-end and batching delivery be?
   - Recommendation A: Batch normal events, flush on a short cadence, and use same-origin `fetch(..., { keepalive: true })` on `visibilitychange`/`pagehide`; treat session-end as best-effort and derive fallback session summaries from received events.
   - Trade-off: Browser lifecycle cannot guarantee delivery, but idempotent retries and derived fallbacks keep metrics honest without blocking navigation.
   - Recommendation B: Await every event request before UI actions and navigation.
   - Trade-off: Higher delivery rate but visible latency and a worse product experience.
   - Selected: Recommendation A.

4. Should authoritative generation and billing facts be copied into the event stream?
   - Recommendation A: Emit a small, idempotent set of trusted lifecycle events after successful server transitions while keeping queue/subscription tables authoritative.
   - Trade-off: Enables one coherent funnel and event-time plan/attribution snapshots, but requires strict deduplication around retries/webhooks.
   - Recommendation B: Derive all server lifecycle facts only through joins.
   - Trade-off: Avoids duplication but makes event funnels, attribution, and event-time snapshots more difficult.
   - Selected: Recommendation A because the repository prefers reusable durability and idempotency patterns.

5. Where should the “consider events for new features” rule live?
   - Recommendation A: Add a typed code registry, a durable operating-system taxonomy guide, a short AGENTS.md rule, and a PROJECT_CONTEXT.md architecture reference.
   - Trade-off: Several synchronized touchpoints, but the code registry remains executable authority and the docs make the product decision visible during planning/review.
   - Recommendation B: Document it only in this implementation plan.
   - Trade-off: Lower immediate effort but easy to lose after this task.
   - Selected: Recommendation A.

## Recommended First Step

Write failing tests for the event registry, property validation, batch limits, trusted-field enrichment, section/session classification, idempotency keys, and billing transition classification. Then add the migration and the smallest implementation that makes those contracts pass.

## Architecture Improvement Opportunities

- **Typed, versioned event registry — selected.** Benefit: one executable source for client/server allowlists, controlled properties, and future schema evolution. Trade-off: registry changes require deliberate tests/docs. Likely boundary: `src/lib/product-analytics/`.
- **Idempotent client and server writes — selected.** Benefit: retries, React remounts, duplicate executors, and Stripe webhook retries cannot inflate metrics. Trade-off: deterministic key design and conflict-ignore handling. Likely boundaries: ingestion service, generation executor, Stripe webhook.
- **Trust-boundary enrichment and ownership checks — selected.** Benefit: the browser cannot forge user, plan, environment, release, billing, or foreign-project events. Trade-off: one ownership/plan query per batch. Likely boundary: `/api/product-events` and server tracker.
- **Analytics schema with approved views — selected.** Benefit: Metabase can consume decision-ready views without raw application-table access; production-only defaults reduce QA pollution. Trade-off: SQL views need contract tests/manual probes. Likely boundary: Supabase migration.
- **Semantic reach/dwell state instead of raw scroll capture — selected.** Benefit: smaller, privacy-conscious data with clear product meaning. Trade-off: no pixel replay. Likely boundary: workspace telemetry hook.
- **Centralized action instrumentation — selected.** Benefit: mockup/prompt/upgrade events use shared helpers and controlled properties rather than ad hoc fetches. Trade-off: small prop threading through existing renderers.
- **Raw-event retention and cleanup — selected.** Benefit: bounds privacy/storage while retaining enough data for D30 and initial cohort analysis. Trade-off: analysis beyond 180 days requires rollups. Likely boundary: migration function/cron.
- **ClickHouse, dbt, OpenPanel/PostHog — deferred.** Benefit: high-scale OLAP, modeled transformations, experiments, replay, and ready-made funnels. Trade-off: disproportionate infrastructure now. Revisit when PostgreSQL query load or event volume proves the need.
- **Monthly table partitioning — rejected as over-engineering.** Current traffic does not justify partition maintenance; indexes and retention are sufficient.

## Event Scope

### Client behavioral events

- `workspace_session_started`
- `workspace_section_reached`
- `workspace_nav_clicked`
- `workspace_session_ended`
- `mockup_concept_impression`
- `mockup_concept_opened`
- `mockup_concept_copied`
- `mockup_concept_downloaded`
- `prompt_file_impression`
- `prompt_file_opened`
- `prompt_file_copied`
- `prompt_file_downloaded`
- `upgrade_cta_viewed`
- `upgrade_cta_clicked`

### Trusted server events

- `project_created`
- `generation_started`
- `generation_step_completed`
- `generation_completed`
- `generation_failed`
- `checkout_started`
- `checkout_completed`
- `subscription_cancel_requested`
- `subscription_canceled`

Activation, strong activation, D1/D7/D30 retention, behavioral churn risk, section drop-off, and mockup-entitlement conversion are derived metrics rather than forgeable browser events.

## Implementation Phases

1. **Contract and storage**
   - Add typed event registry, controlled property validation, idempotency helpers, environment/release helpers, and tests.
   - Add `product_events`, deny-all browser RLS/grants, indexes, 180-day cleanup, and private `analytics` views.
2. **Ingestion and client transport**
   - Add authenticated, same-origin, size-bounded, rate-limited batch ingestion.
   - Add tab session identity, batching, retries, keepalive flush, active-time accounting, and pure tests.
3. **Workspace and artifacts**
   - Track workspace visits, stable section reach, nav selection, session summaries, mockup concept impressions/actions, and prompt-file impressions/actions.
4. **Upgrade, billing, and lifecycle authority**
   - Track composer/project-delete/preferences/billing upgrade surfaces.
   - Preserve controlled attribution into Stripe Checkout metadata.
   - Emit deterministic checkout, cancellation, project-creation, and generation lifecycle events from trusted transitions.
5. **Durable product guidance and analysis**
   - Add the product analytics event-taxonomy operating guide and future-feature checklist.
   - Update AGENTS.md, PROJECT_CONTEXT.md, metrics guide, backend history, and review artifact.
6. **Verification and remediation**
   - Apply the migration to the linked Supabase project.
   - Run focused tests, full test suite, typecheck, lint, build, and migration/RLS probes.
   - Exercise the real authenticated Chrome workspace and billing surfaces, then verify stored event rows without exposing credentials or private content.
   - Run two fresh-eyes passes, code review, security review, remediate findings, and rerun affected checks.

## Milestones

- **M1 — Trustworthy store:** Invalid, forged, oversized, cross-project, duplicated, and browser-direct writes are rejected or deduplicated.
- **M2 — Behavioral coverage:** Workspace, mockup, prompt, and upgrade interactions generate controlled events through real UI flows.
- **M3 — Authoritative funnel:** Project/generation/checkout/subscription transitions emit retry-safe server events with attribution.
- **M4 — Decision-ready analysis:** Views answer section reach/drop-off, artifact engagement, activation/retention, and mockup entitlement questions.
- **M5 — Durable evolution:** Future feature plans and reviews have an explicit taxonomy-update checkpoint.

## Test Strategy

- Pure unit tests for event/property allowlists, UUID/timestamp/size bounds, idempotency keys, environment normalization, session/deepest-section state, and Stripe cancellation transitions.
- Ingestion tests with fake Supabase clients for ownership batching, trusted enrichment, conflict-ignore, and atomic rejection.
- Component/static tests for prop threading and event attributes where meaningful; browser lifecycle and click behavior verified through real Chrome because the repo has no jsdom/Testing Library harness.
- SQL/live probes for table constraints, RLS denial, service-role insert/dedupe, analytics view outputs, production-environment filtering, and cleanup boundaries.
- Real authenticated UI: visit a project, scroll/select sections, open/copy/download mockup and prompt artifacts where available, open upgrade surfaces, and confirm sanitized stored events.
- Full `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check`.

## Rollback Or Recovery

- A code rollback stops new event emission without affecting application behavior; analytics failures are isolated from user flows.
- The new table and analytics schema are additive. If necessary, disable ingestion first, export any needed aggregates, unschedule cleanup, then drop analytics views/functions/table in a deliberate follow-up migration.
- Stripe, subscription, artifact, and queue authority remain unchanged, so product behavior and billing recover independently of analytics.
- Deterministic idempotency keys allow replaying trusted server events after transient analytics failures without duplicates.

## Open Decisions

- None blocking. Recommendation A defaults are selected under repository policy.

## Critique

### Software Architect

- The main risk is creating a second generic logging system. A strict typed taxonomy, server-enriched identity, private analysis views, and controlled lifecycle scope prevent `product_events` from becoming an unbounded JSON dumping ground.
- Generation facts already exist durably. Event copies are justified only for coherent funnels and event-time snapshots; they must never replace queue truth.

### Product Manager

- Instrumentation alone does not answer whether mockups should be gated. The baseline needs enough eligible users, complete mockup readiness, and conversion follow-up. Dashboards must keep eligibility denominators explicit.
- “Reached” and “valued” are different. Impression, open, copy/download, return usage, and conversion should remain distinct measures.

### Customer Or End User

- Analytics must remain invisible to performance and privacy. No content, replay, or raw scrolling is required for the stated decision.
- Copy/download events should represent successful actions, not merely clicks, so failure does not masquerade as value.

### Engineering Implementer

- Existing UI files are already modified in the working tree. Changes must be surgical, avoid formatting churn, and validate current diffs before each patch.
- Browser end events are inherently lossy. The analysis layer must tolerate missing `workspace_session_ended` rows and derive fallbacks from the last received event.

### Risk, Security, Or Operations

- The ingestion endpoint is a storage-abuse target. Authentication, same-origin enforcement, per-user/IP rate limits, batch/body/property caps, timestamp bounds, allowlists, and deny-all browser RLS are required.
- Metabase must later use a dedicated read-only database role with access only to approved analytics views, never the service key or database owner.
- Raw retention is intentionally bounded; scheduled cleanup must use a fixed cutoff and have no public execute grant.
