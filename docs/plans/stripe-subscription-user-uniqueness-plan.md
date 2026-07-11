---
implemented: true
implemented_at: 2026-07-11T18:44:54Z
implementation_summary: "Applied one-subscription-per-user uniqueness, repaired Clover/legacy invoice parsing, and successfully replayed the original checkout and invoice events with exactly-once credit grant verification."
---

# Plan: Restore Stripe Subscription Webhook Sync

## Goal
Restore webhook subscription synchronization by enforcing one `subscriptions` row per user and accepting Stripe Clover's current invoice subscription reference, then replay already-failed events without creating another subscription.

## Assumptions
- Webhook `upsert(..., { onConflict: "user_id" })` is intentional.
- One local subscription snapshot per user is the existing product model; Stripe remains billing authority.
- Existing rows must never be deleted or merged automatically.

## Clarifying Questions
1. Which conflict key should own the local snapshot?
   - Recommendation A: Add `UNIQUE(user_id)` and keep current upsert. Trade-off: atomic one-row entitlement; forbids multiple local subscriptions.
   - Recommendation B: Upsert on `stripe_subscription_id`. Trade-off: permits multiple rows but breaks current billing and entitlement assumptions.
   - Selected: Recommendation A.
2. How should historical duplicates be handled?
   - Recommendation A: Abort migration and inspect deliberately. Trade-off: rollout pauses; no silent loss.
   - Recommendation B: Auto-delete extras. Trade-off: faster but unsafe for billing state.
   - Selected: Recommendation A.

## Recommended First Step
Check linked database for duplicate `subscriptions.user_id` values without printing row contents, then apply a guarded unique constraint migration.

## Runtime and Change-Impact Analysis

### Repeated Work
- Trigger: Stripe webhook delivery/replay; retries are expected.
- Work: claim event, map price, upsert one snapshot, optionally grant idempotent period credits, record trusted analytics.
- Frequency: one or several deliveries per billing transition; Stripe retries failed deliveries.

### Ownership, Scope, And Lifetime
- `subscriptions` remains durable local entitlement snapshot owned by one user.
- Constraint applies table-wide. Billing, allowance, checkout guard, portal, and analytics consume the row.

### Boundary And Cache Semantics
- PostgREST `ON CONFLICT (user_id)` gains required uniqueness.
- No payload, cache, RLS, analytics contract, or TypeScript row-shape change.
- Invoice parsing accepts both legacy `invoice.subscription` and current `invoice.parent.subscription_details.subscription` shapes.
- Webhook fails before migration; failed claims become replayable afterward.

### Failure And Recovery
- Historical duplicates abort migration before mutation; no data removed.
- Existing claim/reclaim, snapshot upsert, event analytics, and period-credit idempotency remain unchanged.
- Paid-invoice processing fails closed before entitlement sync or any local mutation when the invoice period differs from the retrieved current subscription period.
- Rollback can drop only the new constraint, but that reintroduces failure; prefer forward repair.

### Risk-Matched Verification
| Risk | Evidence | Acceptance threshold |
|---|---|---|
| Historical duplicates | Service-role preflight | Zero duplicated `user_id` values |
| Missing conflict target | Catalog check after linked push | Unique single-column key exists |
| Replay failure | Existing event replay + logs/DB | HTTP 2xx; claim processed; one updated row |
| Double credits | Grant/history inspection | One grant per subscription period |
| Clover invoice lacks legacy field | Focused resolver tests + original invoice replay | Current parent shape resolves and replay processes |

## Architecture Improvement Opportunities
- Database-enforced one-row ownership: selected. Atomic concurrency safety; boundary `subscriptions` schema.
- Guarded duplicate preflight: selected. Prevents silent billing-row deletion; migration may require manual cleanup.
- Shared invoice subscription resolver: selected. Keeps Stripe-version compatibility testable outside route logic.
- Invoice/current-period replay guard: selected. Prevents historical invoices from being credited using current plan state; mismatches need deliberate reconciliation.
- Multi-subscription redesign: rejected as over-engineering for current checkout/product model.
- New analytics event: rejected. Existing `checkout_completed` trusted transition already represents successful sync.

## Plan
1. Add guarded migration and invoice compatibility resolver with red-green tests.
2. Run focused Stripe tests, typecheck, diff check, migration dry run.
3. Preflight and apply linked Supabase migration.
4. Replay existing failed checkout and invoice events in chronological order; verify saved state without new checkout.
5. Record review, security findings, backend history, completion metadata.

## Milestones
- Schema contract repaired locally and remotely.
- Existing subscription sync succeeds on replay.
- Recovery evidence documented.

## Validation
- Stripe helper tests, typecheck, migration list/dry run, linked catalog probe, existing webhook replay.
- UI evidence is secondary because defect is trusted backend persistence; billing page may confirm post-replay plan.

## Risks And Mitigations
- Duplicates: fail closed; never auto-delete.
- Wrong environment: inspect link/history before push; never print secrets.
- Replay duplication: reuse original event/idempotency keys; never create a subscription.
- Multiple real Stripe subscriptions remain a deferred product risk; current checkout guard intends one.

## Rollback Or Recovery
Drop `subscriptions_user_id_key` only if product model changes. Preserve rows. Replay failed events after forward repair.

## Open Decisions
None.

## Critique

### Software Architect
Schema drift caused runtime failure. Constraint is smallest durable repair.

### Product Manager
Fix restores paid entitlement; multi-subscription behavior is outside scope.

### Customer Or End User
Existing payer gets correct plan without another checkout or charge.

### Engineering Implementer
Committed migration alone is insufficient; linked apply and replay prove recovery.

### Risk, Security, Or Operations
Service-role path remains server-only. No secrets enter source. Replay targets existing event only.

## Implementation Checklist
- [x] Add migration and Clover invoice resolver.
- [x] Confirm no duplicate users.
- [x] Run local verification.
- [x] Apply linked migration.
- [x] Replay existing failed checkout and invoice events; verify sync and grant.
- [x] Complete review/history artifacts.
