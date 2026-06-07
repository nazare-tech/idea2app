# Holistic Review of Uncommitted Changes

Date: 2026-04-25

Scope: current staged, unstaged, and untracked changes in this workspace. Review focus is architecture, runtime bugs, security/billing behavior, database migrations, onboarding generation, and project-based entitlement changes. This is a review artifact only; no implementation fixes are included here.

Subagents used:
- Architecture review: queue model, API boundaries, onboarding flow, legacy compatibility.
- Runtime bug review: polling, retries, cancellation, partial/error states, redirects.
- Security/billing review: credits, internal entitlement, RLS, Stripe, migrations.

## Executive Summary

The uncommitted changes move the system in the right architectural direction: generation is becoming server-owned, normalized per-document queue items now hold attempts/dependencies/output refs, and onboarding project creation is bundled with document generation instead of landing users on a manual Generate All step.

However, the diff still has release-blocking issues. The most serious is a billing bypass: manual Generate All accepts client-provided queue metadata, and the executor treats `source: "onboarding"` or `creditStatus: "not_charged"` as free/bundled. There are also high-risk queue lifecycle bugs around stale `generating` rows, cancellation races, terminal status computation while work is still running, and refund accounting.

Recommended path: fix the P0/P1 findings before shipping, then add route-level tests for the race cases. The larger architecture should eventually move from long-running HTTP requests to a real background worker or durable job runner.

## Findings

### P0 - Client Can Bypass Manual Generate All Credits

Files:
- `src/app/api/generate-all/start/route.ts:31`
- `src/lib/generation-queue-service.ts:60-78`
- `src/lib/generation-queue-service.ts:123-134`
- `src/lib/onboarding-generation.ts:167-176`
- `src/app/api/generate-all/execute/route.ts:203-210`

Problem: `/api/generate-all/start` parses and persists client-supplied queue fields. `parseQueueJson()` accepts `source`, `creditStatus`, `creditCost`, `runId`, and `idempotencyKey` from the request, and `createGenerationQueueItems()` writes those fields into `generation_queue_items`. The executor then treats a row as bundled/free when the queue looks onboarding, when `credit_status === "not_charged"`, or when `source === "onboarding"`.

Impact: any authenticated user can POST a manual Generate All queue with `source: "onboarding"` or `creditStatus: "not_charged"` and avoid `consume_credits`.

Recommended fix: derive `source`, `credit_status`, `credit_cost`, `depends_on`, `attempt`, `max_attempts`, `run_id`, and idempotency server-side in `/api/generate-all/start`. Manual queues should always be `source = "manual"` and billable unless the server has verified a trusted onboarding queue row created by `/api/projects/create-from-intake`.

### P1 - RLS Allows Direct Mutation of Billing-Critical Queue Items

File: `supabase/migrations/20260425000000_generation_queue_items.sql:57-67`

Problem: `generation_queue_items` policies allow authenticated users to insert, update, and delete rows whenever `auth.uid() = user_id`. The table contains billing and workflow authority fields: `credit_status`, `credit_cost`, `source`, `status`, attempts, output refs, and dependency state.

Impact: users can mutate their own queue rows through Supabase APIs and influence billing/status behavior outside the intended API routes. This compounds the P0 bypass.

Recommended fix: do not expose mutation of this table directly to browser clients. Use service-role server mutations, locked-down RPCs, or policies/triggers that allow users to read rows but prevent direct writes to billing/workflow columns.

### P1 - Stale `generating` Rows Can Still Hang Onboarding

Files:
- `src/components/projects/idea-intake-wizard.tsx:145-161`
- `src/stores/generate-all-store.ts:193-203`
- `src/stores/generate-all-store.ts:264-270`
- `src/app/api/projects/[id]/onboarding-status/route.ts:121-138`

Problem: stale recovery exists inside `/api/generate-all/execute`, but the client only re-kicks execute when rows are pending and nothing has started. If the execute request dies after claiming an item as `generating`, onboarding status reports started work, the wizard does not retry execute, and recovery never runs. Manual hydrate also auto-cancels old running queues instead of invoking recovery.

Impact: new users can be stranded on the loading screen with a `generating` item that never completes.

Recommended fix: have polling detect stale `generating` rows and re-kick `/execute`, or move stale recovery into a status/resume endpoint. Do not make recovery depend only on a future execute call that the UI may never send.

### P1 - Polling Can Report Terminal Status While Work Is Still Running

Files:
- `src/lib/generation-queue-service.ts:312-317`
- `src/app/api/generate-all/status/route.ts:43-55`
- `src/stores/generate-all-store.ts:185-205`
- `src/app/api/projects/[id]/onboarding-status/route.ts:130-138`

Problem: `computeQueueStatus()` returns `error` or `partial` as soon as any item fails, even if another item is still `generating`. The status route sends that computed terminal status to the client, and the store stops polling for any non-running status.

Impact: in a concurrent batch, if `launch` fails while `competitive` is still generating, the UI can stop polling early. Retry then calls `/start`, but the persisted queue row can still be `running`, so `/start` returns 409. Onboarding can similarly show a fatal error before the required competitive document finishes.

Recommended fix: terminal statuses should only be returned when no item is `generating`. If any item is active, queue status should remain `running` while surfacing per-item errors.

### P1 - Cancellation Races With In-Flight Saves and Refunds

Files:
- `src/app/api/generate-all/cancel/route.ts:41-47`
- `src/app/api/generate-all/cancel/route.ts:96-108`
- `src/app/api/generate-all/execute/route.ts:247-268`
- `src/app/api/generate-all/execute/route.ts:276-296`

Problem: cancellation immediately marks `generating` items cancelled and refunds charged credits, but the executor does not abort the in-flight `generateProjectDocument()` call. That call can still insert an output row before `finishGeneratingItem()` sees the item is no longer `generating`. If generation fails after cancellation already refunded, the executor can attempt another refund from its local `charged` flag.

Impact: a queue item can end as `cancelled/refunded` while a generated document exists and is visible elsewhere, or a charged step can receive duplicate refund attempts.

Recommended fix: treat cancellation as a requested state for active items, then have the worker acknowledge it after checking status before save/final refund. Alternatively use abortable generation and a single refund owner.

### P1 - Refund Failures Are Recorded as Refunded

Files:
- `src/app/api/generate-all/execute/route.ts:276-296`
- `src/app/api/generate-all/cancel/route.ts:96-108`

Problem: Supabase `rpc()` returns `{ data, error }`; it does not throw on database errors. The refund calls are awaited inside `try/catch`, but the returned `error` is ignored. The code then sets `credit_status = "refunded"` if the item had been charged.

Impact: failed refunds can be recorded as successful, leaving unrecoverable credit accounting mismatches.

Recommended fix: inspect the RPC result and only mark `refunded` after a confirmed successful refund. If refund fails, keep `credit_status = "charged"` or introduce `refund_failed` with retry/reporting.

### P2 - `/api/generate-all/update` Can Cancel Charged Work Without Refund

File: `src/app/api/generate-all/update/route.ts:90-102`

Problem: the update endpoint accepts `status: "cancelled"` and marks pending/generating normalized items cancelled directly. This bypasses the refund-aware logic in `/api/generate-all/cancel`.

Impact: a public API path can strand charged items without refunds.

Recommended fix: remove cancellation from the generic update endpoint or delegate to the same refund-aware cancellation helper used by `/cancel`.

### P2 - Legacy Update Can Attach Outputs From Outside the Queue Run

Files:
- `src/app/api/generate-all/update/route.ts:157-171`
- `src/app/api/generate-all/update/route.ts:189-203`

Problem: when the legacy update endpoint receives a client queue item marked `done` or `skipped`, it links the latest document for the project/doc type. It does not verify run id, queue id, created-at boundary, or whether the current executor produced that output.

Impact: a queue can look complete using older or unrelated documents, which weakens the normalized queue/output contract.

Recommended fix: only attach outputs written by the current queue run, or avoid allowing client-supplied queue status to complete normalized items.

### P2 - Onboarding Retry Loses Bundled Credit State

Files:
- `src/components/workspace/generate-all-block.tsx:404-417`
- `src/stores/generate-all-store.ts:352-370`
- `src/app/api/generate-all/start/route.ts:68-82`

Problem: the Retry/Resume button calls `startGenerateAll()`, which builds a fresh manual queue and `/start` clears onboarding metadata. A failed onboarding queue retried from the workspace can become a billable manual queue.

Impact: documents that were meant to be bundled into project creation can consume credits on retry.

Recommended fix: add a resume/retry endpoint that preserves onboarding metadata and resets failed/blocked onboarding items in place.

### P2 - Dependency Deadlocks Are Not Explicitly Modeled

File: `src/lib/generation-queue-service.ts:320-330`

Problem: a pending item whose dependencies are neither present nor done is not runnable and not blocked. `getBlockedItems()` only blocks dependents of failed dependencies.

Impact: malformed or legacy queues can remain `running` forever with no runnable items and no terminal status.

Recommended fix: validate queue dependency closure when creating items, and mark missing-dependency items as `blocked` with an explicit error.

### P2 - Internal Dev Plan Exclusion Is Too Name-Based

Files:
- `src/app/(dashboard)/billing/page.tsx:53-58`
- `src/app/api/stripe/checkout/route.ts:29-35`

Problem: billing UI hides only plans with `name !== "Internal Dev"`, and checkout validates active plan/price pairs but does not have a first-class "publicly purchasable" flag. This relies on an exact display name and database convention.

Impact: a renamed, differently-cased, or accidentally price-attached internal plan could appear publicly or become checkout-eligible.

Recommended fix: add an explicit plan field such as `is_public` or `checkout_enabled`, require it in billing and checkout, and keep the Internal Dev entitlement Stripe-ineligible by schema/policy rather than display name.

## Architecture Observations

Positive:
- `generation_queue_items` is the right direction for durable per-document state, retries, dependencies, and output references.
- `document-generation-service.ts` centralizes document generation and save semantics, reducing duplicated save logic across the executor.
- Onboarding has explicit run metadata and a dedicated status API, which is a cleaner product boundary than overloading the old Prompt Chat flow.
- Keeping `generation_queues.queue` as a compatibility projection is reasonable during migration.

Concerns:
- Long-running `/api/generate-all/execute` requests are being used as a background worker. This is fragile for serverless timeouts, client disconnects, deployment restarts, and retry ownership. A durable worker/cron/queue runner would better match the architecture.
- Queue creation and item replacement are still multi-statement operations outside a database transaction. The code now marks errors better, but a transactional RPC would be more reliable.
- The source of truth for "free onboarding generation" is split across queue metadata, item fields, and executor heuristics. It should be a server-trusted queue mode, not client-mutable row data.
- Cancellation, refunding, and output save ownership need a clearer state machine. Today multiple routes can mutate terminal state and refund semantics.

## Test Gaps

Add route/service tests for:
- Manual `/start` rejecting client-provided `source`, `creditStatus`, `creditCost`, `runId`, and `idempotencyKey`.
- Executor billing for manual queues always charging unless trusted onboarding metadata exists.
- `computeQueueStatus()` returning `running` while any item is `generating`, even when another item is `error`.
- Stale `generating` recovery being triggered from polling/resume, not only inside execute.
- Cancellation during an in-flight generation call: no duplicate refund, no cancelled/refunded item with an untracked output.
- Refund RPC error handling.
- Onboarding retry preserving `source`, `runId`, and `not_charged`.
- Missing dependency closure producing `blocked`, not infinite `running`.
- Playwright coverage for the loading state through redirect to `#overview`.

## Repo Hygiene

Current worktree includes local/config artifacts that should be deliberately handled before commit:
- `.claude/settings.local.json` is modified.
- `supabase/.temp/cli-latest` is tracked and modified.
- Existing `plans/*.md` files are untracked, plus this review file.

Do not delete or revert these without explicit approval, but they should be reviewed before staging.
