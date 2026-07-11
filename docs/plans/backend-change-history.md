# Backend Change History

Use this file as the durable human-readable history for backend, database, Supabase, auth/RLS, webhook, persistence, and data-shape changes. Supabase and git may store technical history, but this log explains intent, verification, and recovery in one place.

Do not record secrets, tokens, passwords, private keys, or raw credential values.

## Entry Template

```markdown
## YYYY-MM-DD: <change title>

- Plan:
- Review:
- Durable source of truth:
- Schema or data-shape changes:
- Auth, RLS, or permission changes:
- Runtime/API behavior changes:
- Migration or deployment steps:
- Verification:
- Rollback or recovery:
- Follow-ups:
```

## Entries

## 2026-07-10: First-party product event analytics foundation (NAZ-43, NAZ-126)

- Plan: [docs/plans/product-event-analytics-plan.md](/Users/Mukul/Documents/GitHub/2026 projects/5_idea2app/docs/plans/product-event-analytics-plan.md)
- Review: [docs/plans/product-event-analytics-review.md](/Users/Mukul/Documents/GitHub/2026 projects/5_idea2app/docs/plans/product-event-analytics-review.md)
- Durable source of truth: `src/lib/product-analytics/contracts.ts` is the executable event/property allowlist; `docs/operating-system/product-analytics-event-taxonomy.md` owns product definitions and the future-feature checklist; `public.product_events` stores raw events; private `analytics` views own decision-ready derivations. Project, queue, artifact, subscription, and Stripe tables remain business authority.
- Schema or data-shape changes: Additive migration `20260710000100_create_product_event_analytics.sql` creates append-only `product_events`, production-only activity/section/artifact/activation/retention/churn/mockup-entitlement views, indexes, and a fixed 180-day cleanup job.
- Auth, RLS, or permission changes: Browser roles have no table policy or grant. Service role receives only insert/select; authenticated client events pass through the same-origin, size-bounded, rate-limited `/api/product-events` route, which enriches user/plan/environment server-side and rejects a whole batch if any project is not owned.
- Runtime/API behavior changes: Workspace semantic reach/nav/session events, mockup and prompt-file value actions, upgrade CTA attribution, project/generation transitions, Checkout creation/completion, and subscription cancellation transitions emit controlled idempotent events. Analytics failures are isolated from product, generation, and billing behavior.
- Migration or deployment steps: Applied `20260710000100_create_product_event_analytics.sql` to the linked Supabase project with `npx supabase db push`; local and remote migration history now match. Metabase may later connect with a dedicated read-only role limited to approved `analytics` views; do not use the service key as a BI credential.
- Verification: 533 tests, typecheck, focused changed-file lint, diff check, an earlier passing production build, two clean final code-review passes, a clean final security review, and real authenticated Chrome evidence are recorded in the review. The final production-build rerun was prevented by the Codex elevated-execution usage limit after the earlier build passed. Live transactional database probes confirmed forced RLS, no browser grants/policies, append/read-only service access, service-only atomic ingestion, direct/RPC idempotency, quota rejection, all 10 private analytics views, and the active 180-day cleanup cron. The transaction rolled back and a follow-up query confirmed zero synthetic verification rows persisted.
- Rollback or recovery: Disable/revert emitters first; product behavior remains intact. If storage must be removed, unschedule cleanup and drop analytics views/function/table in a deliberate follow-up migration. Deterministic trusted-event keys support safe replay after transient failures.
- Follow-ups: Establish the initial NAZ-126 observation window, then connect Metabase only if direct SQL analysis is too slow for regular product decisions. Revisit ClickHouse, dbt Core, OpenPanel, or PostHog only when measured volume, query load, experimentation, or replay requirements justify them.

## 2026-07-10: Evidence-backed competitor source metadata and inline links (NAZ-68)

- Plan: [docs/plans/naz-68-competitor-mention-links-plan.md](/Users/Mukul/Documents/GitHub/2026 projects/5_idea2app/docs/plans/naz-68-competitor-mention-links-plan.md)
- Review: [docs/plans/naz-68-competitor-mention-links-review.md](/Users/Mukul/Documents/GitHub/2026 projects/5_idea2app/docs/plans/naz-68-competitor-mention-links-review.md)
- Durable source of truth: New Market Research rows persist validated `{ name, url }` pairs at `analyses.metadata.live_research.competitor_sources`; a pair is eligible only when the Perplexity result has a safe public HTTP(S) URL and Tavily returned an extraction result for the same canonical URL. Existing v2 rows without this metadata key use safe parsed Direct Competitor H3 URLs as a compatibility fallback.
- Schema or data-shape changes: No database migration. The existing JSON `analyses.metadata` gains optional `live_research.competitor_sources: Array<{ name: string; url: string }>` for newly generated Market Research rows.
- Auth, RLS, or permission changes: None. Existing user-scoped analysis reads and write paths are unchanged.
- Runtime/API behavior changes: Both direct and Generate All Market Research save paths already spread pipeline metadata and now retain the source pairs. The structured workspace renderer linkifies exact competitor mentions across prose, lists, table headers/cells, profile fields, and positioning content. New rows with an explicit empty source array fail closed; streaming waits for saved metadata instead of promoting unfinished model markdown; legacy markdown rendering is unchanged.
- Security and boundedness: URLs are canonicalized and limited to public HTTP(S) hostnames; credentials, local/private IP literals, localhost/non-public suffixes, control characters, and malformed forms are rejected. Mention indexes are capped at 50 sources, 120 characters per name, and 4,000 total pattern characters. Single-token names require exact casing to reduce common-word false positives.
- Migration or deployment steps: None. Existing rows continue working through the parsed-H3 compatibility path; no historical data rewrite is performed.
- Verification: Focused parser, pipeline, matcher, renderer, and streaming tests pass; full suite, typecheck, lint, and real UI evidence are recorded in the review artifact.
- Rollback or recovery: Remove `competitor_sources` from pipeline metadata and the mention-link provider integration. Stored markdown is unchanged, so rollback returns the prior plain-text structured rendering without data loss.
- Follow-ups: Configure the local Perplexity key to capture fresh positive current-pipeline UI evidence; the required fresh Idea 1.1 run correctly produced an empty source map while the key was unavailable.

## 2026-07-10: Contact form stored in Supabase (contact_requests)

- Plan: [docs/plans/contact-form-supabase-plan.md](/Users/Mukul/Documents/GitHub/2026 projects/5_idea2app/docs/plans/contact-form-supabase-plan.md)
- Review: [docs/plans/contact-form-supabase-review.md](/Users/Mukul/Documents/GitHub/2026 projects/5_idea2app/docs/plans/contact-form-supabase-review.md)
- Durable source of truth: `public.contact_requests` table holds contact form submissions; read path is the Supabase dashboard (no support inbox exists). `src/lib/contact.ts` owns validation shared by `/api/contact`.
- Schema or data-shape changes: New `contact_requests` table (`id`, optional `name` <= 200 chars, `email` with format check <= 254 chars, `message` 10..4000 chars, `created_at`) via migration `20260710000000_create_contact_requests.sql`.
- Auth, RLS, or permission changes: RLS enabled with deny-all (no policies), stricter than the waitlist table on purpose: the rate-limited `/api/contact` route using the service role is the only write path, so anon clients cannot bypass rate limiting with direct PostgREST inserts.
- Runtime/API behavior changes: New public `POST /api/contact` (rate limit 5 requests / 10 min / IP via `checkRateLimit`, body validation, service-role insert). `/contact` page replaces the mailto CTA with the form; `/privacy` and `/terms` no longer mention `support@makercompass.com` and point to the contact page instead. `src/lib/support.ts` is now unused but kept pending deletion approval.
- Migration or deployment steps: Applied `20260710000000_create_contact_requests.sql` to the linked project via `supabase db push`. Note: before pushing, `supabase migration repair --status applied` was run for `20260616001000..20260616001400`, `20260621000000`, and `20260709000000`, which existed remotely (verified by live column/table probes) but were missing from the remote migration history, so `db push` would have replayed them.
- Verification: `node --import tsx --test src/lib/contact.test.ts` (10 pass); eslint clean on changed files; typecheck shows only a pre-existing unrelated error in `src/lib/analysis-pipelines.ts` from the dirty working tree. Real UI: submitted the form on `/contact` via the local dev server, `POST /api/contact` returned 200, success panel rendered, and the row appeared in `contact_requests` (service-role select). Validation paths exercised with curl (short message 400, bad email 400, malformed body 400). Evidence: `ui-evidence/2026-07-10/contact-form/`.
- Rollback or recovery: Revert the commit to restore the mailto CTA; `drop table public.contact_requests;` removes the table (loses only contact submissions). The table is inert without the route, so code-only rollback is safe.
- Follow-ups: Optional email notification (e.g. Resend free tier) if dashboard-checking proves painful; optional `status` triage column at real volume; delete `src/lib/support.ts` after confirmation.

## 2026-07-10: Plan-tier AI model routing and composer rate limits (NAZ-123, NAZ-124)

- Plan: [docs/plans/naz-123-124-tier-model-routing-and-composer-rate-limits-plan.md](/Users/Mukul/Documents/GitHub/2026 projects/5_idea2app/docs/plans/naz-123-124-tier-model-routing-and-composer-rate-limits-plan.md)
- Review: Verification evidence in `ui-evidence/2026-07-10/naz-123-124-tier-model-routing/README.md`; findings recorded in the plan file.
- Durable source of truth: `src/lib/generation-model-policy.ts` owns tier-to-model policy (Free/Starter -> `google/gemini-3.5-flash`, Pro+ -> `openai/gpt-5.6-sol`, both at `reasoning.effort: "high"`). Plan resolution reuses `getUserPlanName()` in `src/lib/project-allowance.ts` against the existing `subscriptions`/`plans` tables.
- Schema or data-shape changes: None.
- Auth, RLS, or permission changes: None. Plan lookup runs server-side with the user's own client; lookup failure fails safe to the standard (cheaper) tier.
- Runtime/API behavior changes: `/api/analysis/[type]`, `/api/generate-all/execute` (text doc types `competitive`/`prd`/`mvp` only; mockups keep their image model), and `/api/projects/[id]/composer` now resolve the generation model from the user's plan tier instead of fixed defaults. All routed OpenRouter calls send `reasoning: { effort: "high" }` and get extra `max_tokens` headroom (`withReasoningHeadroom`, default +8192; composer +2048) because reasoning tokens count against the completion cap. Token-credit multipliers added: `gemini-3.5-flash` 0.9, `gpt-5.6-sol` 1.5. Composer rate limits changed from 30/user/hour + 90/IP/hour to 40/user/hour + 200/user/day + 90/IP/hour (NAZ-124 abuse guardrails; plan allowances remain the usage meter). Follow-up the same day: `/api/intake/questions` per-user limit raised 5 -> 20/hour and per-IP 20 -> 80/hour, because the old 5/hour cap contradicted the Pro entitlement (10 projects/month, all burnable in one hour); the rule recorded on NAZ-124 is "double the max projects-per-hour of the Pro plan, same limit for every plan". Composer model precedence: `OPENROUTER_COMPOSER_MODEL` env override > tier routing > legacy (`OPENROUTER_CHAT_MODEL` or `anthropic/claude-sonnet-4-6`).
- Migration or deployment steps: None required. Optional env: `TIER_MODEL_ROUTING_DISABLED=1` (kill switch), `OPENROUTER_STANDARD_TIER_MODEL` / `OPENROUTER_PRO_TIER_MODEL` (hot-swap). Recommended before launch: provision Upstash Redis and set `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` (or `RATE_LIMIT_REDIS_REST_URL`/`_TOKEN`) so rate limits are enforced globally instead of per serverless instance; no Redis env is currently configured locally or on Vercel.
- Verification: `npm test` (476 pass, includes new `src/lib/generation-model-policy.test.ts`), `tsc --noEmit`, eslint clean. Real-flow: e2e user (Internal Dev plan, pro tier) generated a tech spec through `/api/analysis/tech-spec` on the local dev server; server log shows `openrouter_generation_started`/`succeeded` with `openai/gpt-5.6-sol` and 47,208 chars (past the old 8,192 cap, proving reasoning headroom). Composer answered a real question through the tier-routed model with the new rate-limit trio active. Evidence: `ui-evidence/2026-07-10/naz-123-124-tier-model-routing/`.
- Rollback or recovery: Set `TIER_MODEL_ROUTING_DISABLED=1` to restore all legacy fixed defaults without deploy; or revert the commit. Rate limit constants live in the composer route; revert restores 30/hour.
- Follow-ups: Provision Redis for rate limiting before launch; consider exposing tier-accurate client-side credit estimates for manual regenerations (deferred in plan); no e2e user exists on a standard-tier plan for live Free/Starter path testing.

## 2026-07-10: Streaming preview extended to Product Plan and First Version Plan

- Plan: [docs/plans/workspace-streaming-nav-follow-and-loading-states-plan.md](/Users/Mukul/Documents/GitHub/2026 projects/5_idea2app/docs/plans/workspace-streaming-nav-follow-and-loading-states-plan.md)
- Review: [docs/plans/workspace-streaming-nav-follow-and-loading-states-review.md](/Users/Mukul/Documents/GitHub/2026 projects/5_idea2app/docs/plans/workspace-streaming-nav-follow-and-loading-states-review.md)
- Durable source of truth: `generation_queue_items.partial_content` (existing column from migration `20260709000000`) now also holds throttled partial markdown for `prd` and `mvp` items while they generate, not only `competitive`.
- Schema or data-shape changes: None in the database. API payload shape: `GET /api/generate-all/status` `streamingPreview.docType` can now be `"competitive" | "prd" | "mvp"` (previously always `"competitive"`). `/api/projects/[id]/onboarding-status` is intentionally unchanged (competitive-only, pre-redirect loading panel).
- Auth, RLS, or permission changes: None. Partial content is still read through the user-scoped queue lookup and written by the service-role executor.
- Runtime/API behavior changes: The generate-all executor creates the failure-isolated partial-content writer for the three text planning documents; `generateProjectDocument` threads `onPartialContent` into `runPRD` / `runMVPPlan` (switching those OpenRouter calls to streaming mode, same as Market Research). Partial content is still cleared at terminal item states by the existing writer `finish()` path.
- Migration or deployment steps: None.
- Verification: `npm test` (464 pass), `npx tsc --noEmit`, `npm run build`, plus real fresh-project onboarding QA recorded in the review artifact.
- Rollback or recovery: Revert the docType gate in `src/app/api/generate-all/execute/route.ts` to `competitive`-only; clients degrade gracefully to static generating placeholders when no partial content is served.
- Follow-ups: None required.

## 2026-07-09: Pre-launch Stripe and derived-readiness safeguards

- Plan: [docs/plans/prelaunch-meeting-ticket-fixes-plan.md](/Users/Mukul/Documents/GitHub/2026 projects/5_idea2app/docs/plans/prelaunch-meeting-ticket-fixes-plan.md)
- Review: [docs/plans/prelaunch-meeting-ticket-fixes-review.md](/Users/Mukul/Documents/GitHub/2026 projects/5_idea2app/docs/plans/prelaunch-meeting-ticket-fixes-review.md)
- Durable source of truth: `src/app/api/stripe/checkout/route.ts`, `src/lib/stripe/checkout-idempotency.ts`, `src/lib/stripe/billing-flow.ts`, `src/app/api/projects/[id]/onboarding-status/route.ts`, `src/lib/ai-prompts-readiness.ts`, and `src/lib/generation/onboarding.ts`.
- Schema or data-shape changes: None. AI Prompts remains display-only and derived from Product Plan and First Version Plan content; no queue item or table was added.
- Auth, RLS, or permission changes: None. Stripe routes keep user authentication and server-side plan/price validation. Onboarding status keeps project and queue ownership checks before service-client reads.
- Runtime/API behavior changes: Checkout retries for one user and selected price use a stable Stripe idempotency key; stale test customer IDs are repaired before checkout; client redirects require exact hosted Stripe HTTPS origins and failures render inline. Onboarding status derives AI Prompts waiting/partial/ready/incomplete from actual source content, and failed upstream generation no longer leaves the derived row indefinitely pending.
- Migration or deployment steps: None. No Stripe keys, live products, database rows, or webhook configuration were changed by implementation.
- Verification: 443 tests, typecheck, lint, production build, diff check, and real Chrome evidence are recorded in the review. Full test-mode checkout/subscription/portal/cancellation remains blocked because the e2e account points to a missing historical test customer and clean signup confirmation/rate limiting prevented a replacement account in this session.
- Rollback or recovery: Revert the checkout helper/idempotency option and derived readiness consumers. No schema rollback is needed. Preserve the existing Stripe webhook mapping and subscription rows.
- Follow-ups: The owner approved closing NAZ-38 with the test-account limitation recorded. Before live billing activation, provision a confirmed clean Stripe QA user or scripted test-clock fixture and complete checkout, subscription-row/allowance, portal cancellation, and webhook-transition evidence.

## 2026-07-06: UI performance round 2 server billing and cached auth lookup

- Plan: [docs/plans/ui-performance-round-2-plan.md](/Users/Mukul/Documents/GitHub/2026 projects/5_idea2app/docs/plans/ui-performance-round-2-plan.md)
- Review: [docs/plans/ui-performance-round-2-review.md](/Users/Mukul/Documents/GitHub/2026 projects/5_idea2app/docs/plans/ui-performance-round-2-review.md)
- Durable source of truth: `src/app/(dashboard)/billing/page.tsx`, `src/lib/billing-page-data.ts`, `src/components/pricing/billing-plans-client.tsx`, `src/components/pricing/manage-subscription-button.tsx`, and `src/lib/supabase/current-user.ts`.
- Schema or data-shape changes: None. `plans`, `plan_prices`, `subscriptions`, and project allowance data keep their existing shapes; billing DTOs only normalize selected fields for the page boundary.
- Auth, RLS, or permission changes: No RLS or permission changes. Dashboard pages now share a cached per-request `getCurrentUser()` helper around the existing Supabase server `auth.getUser()` call.
- Runtime/API behavior changes: `/billing` now fetches plans, active subscription, and allowance in a server component before rendering client islands for interval selection, checkout, and portal access. Stripe checkout and portal API routes were not changed.
- Migration or deployment steps: None.
- Verification: Focused tests, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, static landing preview capture generation, and real local UI verification are recorded in the review artifact. `/billing` rendered signed-in content with no loading spinner in `ui-evidence/2026-07-07/ui-performance-round-2/billing-desktop.png`.
- Rollback or recovery: Revert the billing page/client-island split and cached current-user helper usage. No database rollback is needed.
- Follow-ups: None required.

## 2026-07-02: Mockup backend bugfixes

- Plan: [docs/plans/mockup-backend-bugfixes-plan.md](/Users/Mukul/Documents/GitHub/2026 projects/5_idea2app/docs/plans/mockup-backend-bugfixes-plan.md)
- Review: [docs/plans/mockup-backend-bugfixes-review.md](/Users/Mukul/Documents/GitHub/2026 projects/5_idea2app/docs/plans/mockup-backend-bugfixes-review.md)
- Durable source of truth: `src/lib/mockup-option-drafts.ts`, `src/app/api/mockups/recover-options/route.ts`, `src/lib/mockup-design-plan.ts`, `src/lib/openrouter-image-mockup-pipeline.ts`, `src/lib/document-generation-display-status.ts`, and the mockup generation/finalize call sites.
- Schema or data-shape changes: None. Draft rows, canonical mockup rows, and Storage paths keep their existing shapes.
- Auth, RLS, or permission changes: None. Draft reads/deletes remain scoped by project, user, and run; Storage deletion uses service access only after validating draft row paths and excluding canonical references.
- Runtime/API behavior changes: Successful generation/finalize paths now request Storage-aware draft cleanup that preserves canonical mockup objects; recovery re-reads drafts after insert-only Storage backfill so live richer rows win; the planner brief no longer uses Core User Flows as the fallback source for workflow, capabilities, and screen candidates.
- Migration or deployment steps: None.
- Verification: `npm test -- src/lib/mockup-option-drafts.test.ts src/lib/mockup-design-plan.test.ts src/lib/document-generation-display-status.test.ts src/lib/openrouter-image-mockup-pipeline.test.ts` passed and ran 345 tests via the repo script. Follow-up verification in [docs/plans/nine-bug-remediation-review.md](/Users/Mukul/Documents/GitHub/2026 projects/5_idea2app/docs/plans/nine-bug-remediation-review.md) also passed focused renderer/landing tests, `npm run typecheck`, `npm run lint`, `git diff --check`, and a real local landing-page browser check.
- Rollback or recovery: Revert the scoped helper, route, and test changes. No database rollback is needed.
- Follow-ups: Consider scheduled stale-draft cleanup if cleanup needs a guaranteed retention SLA independent of future generation requests.

## 2026-07-02: Architecture review mockup draft remediation

- Plan: [docs/plans/architecture-review-remediation-plan.md](/Users/Mukul/Documents/GitHub/2026 projects/5_idea2app/docs/plans/architecture-review-remediation-plan.md)
- Review: [docs/plans/architecture-review-remediation-review.md](/Users/Mukul/Documents/GitHub/2026 projects/5_idea2app/docs/plans/architecture-review-remediation-review.md)
- Durable source of truth: `src/lib/openrouter-image-mockup-pipeline.ts`, `src/lib/mockup-option-drafts.ts`, `/api/mockups/recover-options`, `/api/mockups/generate`, and `src/lib/document-generation-service.ts`.
- Schema or data-shape changes: None. `mockup_option_drafts` and canonical `mockups` rows keep their existing shapes.
- Auth, RLS, or permission changes: None. Cleanup and recovery continue to scope draft rows by `project_id`, `user_id`, and `run_id`; Storage path validation still requires the exact draft storyboard path shape.
- Runtime/API behavior changes: Option-progress draft callbacks are best-effort after Storage upload, Storage recovery uses insert-only draft backfill so placeholders cannot overwrite richer live rows, and new manual/queue mockup generation opportunistically removes stale abandoned draft rows plus unreferenced draft Storage objects while preserving finalized canonical mockup images.
- Migration or deployment steps: None.
- Verification: Focused tests passed with `node --import tsx --test src/components/analysis/planning-document-blocks.test.tsx src/lib/document-generation-display-status.test.ts src/components/ui/mockup-renderer.test.tsx src/lib/mockup-option-drafts.test.ts`; full verification is recorded in the review artifact.
- Rollback or recovery: Revert the remediation changes to return to prior draft behavior. No migration rollback is needed. If cleanup were suspected of removing a still-needed draft object, canonical finalized mockup rows are unaffected because referenced runs and paths are skipped.
- Follow-ups: Consider a dedicated scheduled cleanup job or retention setting if abandoned mockup drafts need a guaranteed cleanup SLA independent of future generation requests.

## 2026-07-01: Intake question parser-failure retry

- Plan: [docs/plans/intake-question-retry-plan.md](/Users/Mukul/Documents/GitHub/2026 projects/5_idea2app/docs/plans/intake-question-retry-plan.md)
- Review: [docs/plans/intake-question-retry-review.md](/Users/Mukul/Documents/GitHub/2026 projects/5_idea2app/docs/plans/intake-question-retry-review.md)
- Durable source of truth: `src/lib/intake-question-generation.ts` owns intake-question generation, parsing, and retry behavior; `/api/intake/questions` remains the authenticated route entrypoint.
- Schema or data-shape changes: None.
- Auth, RLS, or permission changes: None.
- Runtime/API behavior changes: `generateIntakeQuestions()` now retries once with a stricter repair prompt when `parseIntakeQuestionSet()` rejects model output, including cases where platform-question normalization leaves fewer than four questions. Provider/runtime failures still return the existing retryable error without a parser retry.
- Migration or deployment steps: None.
- Verification: `node --import tsx --test src/lib/intake-question-generation.test.ts`; `npm run typecheck`; `npm run lint` with one unrelated existing warning in `output/playwright/prod-full-flow.mjs`; real `/projects/new` UI creation for Idea 1.1 produced `Signal To Roadmap`.
- Rollback or recovery: Revert the retry helper/test changes to return to one-shot intake-question generation. Existing created projects are unaffected.
- Follow-ups: None required.

## 2026-06-29: Durable mockup option draft recovery hardening

- Plan: [docs/plans/durable-mockup-option-drafts-plan.md](/Users/Mukul/Documents/GitHub/2026 projects/5_idea2app/docs/plans/durable-mockup-option-drafts-plan.md)
- Review: [docs/plans/durable-mockup-option-drafts-review.md](/Users/Mukul/Documents/GitHub/2026 projects/5_idea2app/docs/plans/durable-mockup-option-drafts-review.md)
- Durable source of truth: `mockup_option_drafts` rows store completed mockup option drafts before canonical `mockups` finalization; Supabase Storage remains the image blob store.
- Schema or data-shape changes: Hardened the new draft table timestamp trigger function to use `public.update_mockup_option_drafts_updated_at()` with `SET search_path = public`. Future canonical `mockups.content` rows from full OpenRouter generation now save image proxy URLs without `draftRunId`; draft rows and in-progress previews can still use `draftRunId` until canonical finalization. Table shapes are unchanged.
- Auth, RLS, or permission changes: No RLS policy changes in this follow-up. Existing draft policies remain owner-scoped by `user_id` and project ownership.
- Runtime/API behavior changes: `/api/mockups/recover-options` now treats DB draft rows as authoritative but scans Storage when fewer than three draft labels exist, backfills missing Storage-only labels into `mockup_option_drafts`, and returns the merged A/B/C-ordered option set. Full mockup generation now emits progressive draft URLs through the option callback, then rebuilds canonical saved option URLs from Storage paths after all three options complete.
- Migration or deployment steps: Apply `supabase/migrations/20260628000000_create_mockup_option_drafts.sql` in environments that do not already have the draft table. Apply `supabase/migrations/20260629192000_harden_mockup_option_drafts_trigger.sql` in environments where the prior draft migration was already applied.
- Verification: `node --import tsx --test src/lib/mockup-option-recovery.test.ts src/lib/mockup-option-drafts.test.ts src/lib/openrouter-image-mockup-pipeline.test.ts src/components/ui/mockup-renderer.test.tsx`; `npm run typecheck`; `npm run lint`; `npm test`; `git diff --check`.
- Rollback or recovery: Revert the route/helper/test changes to return only DB drafts or Storage fallback. If needed, replace the trigger function with the previous unqualified definition, though the hardened version is safer and table-compatible.
- Follow-ups: None required from this remediation pass.
