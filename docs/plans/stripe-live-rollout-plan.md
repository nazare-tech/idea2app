---
implemented: true
implemented_at: 2026-07-11T21:13:44Z
implementation_summary: Live Starter/Pro catalog and portal configured; a real $19 Starter checkout, entitlement, fresh-project creation, cancellation, and full refund were verified end to end. Real-flow defects in Starter allowance and portal cancel_at synchronization were repaired and verified.
---

# Plan: Stripe Live Rollout And Real-Card Smoke Test

## Goal
Move the current local Maker Compass environment and shared Supabase billing catalog from Stripe test mode to live mode, then prove one real Starter subscription end to end through hosted Checkout, signed webhooks, local entitlement sync, credit grant, Billing Portal, cancellation, and refund.

## Assumptions
- User explicitly authorized live Stripe catalog/config changes and one real-card smoke test.
- No public deployment exists; live webhook delivery temporarily depends on the local Stripe CLI listener.
- Starter and Pro are the only self-serve plans. Enterprise remains private and checkout-disabled.
- Card details must be entered only on Stripe-hosted Checkout by the user; app and Codex never handle raw card data.

## Clarifying Questions
1. Which live catalog should launch?
   - Recommendation A: Create Starter and Pro monthly, 6-month, and annual Prices; enable monthly/annual only because current UI exposes those intervals.
   - Trade-off: Catalog is ready for future 6-month UI without exposing a hidden choice now.
   - Recommendation B: Create monthly and annual only.
   - Trade-off: Smaller catalog, but later 6-month launch needs another live setup pass.
   - Selected: Recommendation A.
2. Which annual amounts should become live truth?
   - Recommendation A: Use the approved production plan amounts: Starter $194/year and Pro $499/year.
   - Trade-off: Matches current go-live documentation; differs from old test Prices ($192/$504).
   - Recommendation B: Mirror old test amounts exactly.
   - Trade-off: No amount drift, but conflicts with the approved production catalog.
   - Selected: Recommendation A.
3. How should real-card verification work?
   - Recommendation A: Buy Starter monthly for $19, verify all boundaries, cancel immediately, then refund the charge.
   - Trade-off: Proves a real charge and refund with limited exposure; still creates a real transaction and Stripe fees may not be returned.
   - Recommendation B: Use a 100% coupon or setup-only card validation.
   - Trade-off: Lower spend but does not prove a real captured charge.
   - Selected: Recommendation A because the user explicitly requested a real charge.

## Recommended First Step
Create the empty live Stripe catalog with stable lookup keys, validate every Price in live mode, then atomically switch Supabase IDs and local env only after the catalog is complete.

## Runtime And Change-Impact Analysis

### Repeated Work
- Stripe CLI listener receives live webhook deliveries while running; Stripe may retry failed events.
- Each event performs signature verification, durable event claim, Stripe subscription retrieval, one subscription upsert, and at most one idempotent period credit grant.
- Expected smoke volume: one Checkout event set, one cancellation event set, and one refund; worst case includes duplicate/reordered webhook retries.

### Ownership, Scope, And Lifetime
- Stripe owns live Products, Prices, Customers, subscriptions, invoices, charges, and refunds.
- Supabase owns the local plan-price mapping, subscription entitlement snapshot, webhook claims, and credit-grant ledger.
- CLI listener is temporary and local. A public production webhook endpoint is required before public launch.

### Boundary And Cache Semantics
- `plan_prices.stripe_price_id` must match the live Stripe account using the active live secret key.
- Checkout validates plan/Price pairs server-side; webhooks map actual subscription items back through the same table.
- Existing test Customer IDs are repaired lazily by checkout when absent under the active live key.
- No cache change. Dev server must restart after env mode changes because Stripe client is process-cached.

### Failure And Recovery
- Catalog creation is additive. Prices can be deactivated but not edited after creation.
- Supabase switch is recoverable using the recorded prior test IDs and checkout flags.
- Live checkout remains disabled until all selected mappings validate.
- Duplicate/reordered webhook deliveries are reclaimed/idempotent; credit grants use one key per subscription period.
- Immediate kill switch: set paid `plan_prices.checkout_enabled = false`.

### Risk-Matched Verification
| Risk | Evidence | Acceptance threshold |
|---|---|---|
| Mixed test/live objects | Retrieve every mapped Price using active live key | Every enabled ID resolves live with exact amount/interval/product |
| Missed webhook | CLI delivery log + `stripe_webhook_events` | Required events receive HTTP 2xx and claims become processed |
| Wrong entitlement | `subscriptions` read after checkout | Exactly one active row with selected live Price and valid period |
| Double credits | `stripe_credit_grants`/credit history read | Exactly one positive initial period grant |
| Broken portal/cancel | Real Billing Portal flow + webhook state | Portal opens; cancellation state syncs |
| Real payment proof | Stripe live charge/invoice read | One successful $19 Starter charge, then one refund |

## Architecture Improvement Opportunities
- Stable Stripe lookup keys: selected. Easier catalog validation and future automation; applies to live Stripe Prices.
- Fail-closed catalog switch: selected. Validate all live objects before enabling checkout; small rollout script complexity.
- Durable production webhook endpoint: deferred because no public deployment exists; mandatory before public traffic.
- Checked-in catalog provisioning script: deferred. First live catalog is small; avoid storing operational credentials or one-off complexity.
- New analytics event: rejected. Existing trusted checkout/subscription events cover rollout.
- Explicit Starter allowance contract: selected. The public five-project promise is now enforced in code and `plans.monthly_project_allowance`, with an idempotent corrective migration.
- Portal `cancel_at` normalization: selected. Stripe Portal's period-end `cancel_at` shape now maps to the existing local cancellation flag and trusted cancellation-request analytics.
- Idempotent refund ledger reversal: selected after the real refund exposed that processed refund events left the legacy period grant intact. Full invoice-payment refunds now reverse the matching grant once through a service-role-only RPC.

## Plan
1. Commit verified pre-live webhook repair.
2. Inventory live Stripe, local env mode, and Supabase mappings without printing secrets.
3. Create and validate live Starter/Pro Products and six recurring Prices.
4. Back up local test env, switch local keys/webhook secret to live mode, restart/reuse dev server and listener.
5. Update Supabase live Price mappings; enable monthly/annual and keep 6-month disabled.
6. Verify billing UI and create a live Starter Checkout Session.
7. Pause for user to enter card details on Stripe-hosted Checkout.
8. Verify charge, webhook claims, entitlement, credits, billing UI, and portal; cancel and refund.
9. Record review, security findings, backend history, UI evidence, rollback data, and completion metadata.

## Milestones
- Live catalog complete and validated.
- Local app and webhook listener operate entirely in live mode.
- Real $19 smoke transaction processed, synchronized, canceled, and refunded.

## Validation
- Full tests/typecheck for pre-live code.
- Stripe CLI live object reads and signed webhook delivery evidence.
- Read-only Supabase assertions with secrets suppressed.
- Real Chrome billing/Checkout/portal flow and screenshots under `ui-evidence/2026-07-11/stripe-live-rollout/` when Chrome control is available.

## Risks And Mitigations
- Real money: use lowest public monthly plan, cancel immediately, refund after proof.
- Secret exposure: mutate env programmatically; never print or commit secret values.
- Local listener outage: do not complete card payment until listener is confirmed running.
- No durable production endpoint: do not treat local rollout as public-launch readiness.

## Rollback Or Recovery
- Disable all paid checkout rows immediately.
- Restore `.env.local.test-mode-backup`, restart app/listener, and restore prior test Price mappings if returning to test mode.
- Keep live Products/Prices inactive rather than deleting billing history.
- Replay failed live events after forward repair.

## Open Decisions
- None before catalog/config work. User card entry remains an intentional human checkpoint.

## Critique

### Software Architect
Local CLI webhook delivery is valid smoke-test infrastructure, not production architecture. Public launch still needs deployed HTTPS and a Dashboard-managed live endpoint.

### Product Manager
First live proof should exercise the cheapest actual customer offer, then remove the internal subscription so future billing tests start clean.

### Customer Or End User
Displayed amount, Stripe Checkout amount, entitlement, credits, portal state, and refund must all agree.

### Engineering Implementer
Create catalog first; validate; switch mappings/env last. Never mix a live key with test Price IDs.

### Risk, Security, Or Operations
Main risks are real spend, secret handling, and listener availability. Raw card data stays on Stripe Checkout. Checkout kill switch and mapping rollback remain ready.

## Implementation Checklist
- [x] Commit pre-live webhook repair.
- [x] Inventory live catalog, env mode, and Supabase mappings.
- [x] Create and validate live catalog.
- [x] Switch local app key and signed listener. User supplied the direct live restricted key through `.env.local`; listener secret remains process-only.
- [x] Switch Supabase mappings and checkout flags.
- [x] Verify real UI to Checkout. Live Starter Checkout reached the real $19/month card form.
- [x] User completes real-card payment.
- [x] Verify, cancel, and refund.
- [x] Complete review/history/evidence.

## Implementation Progress
- Created live Starter and Pro Products with six validated live Prices and stable lookup keys.
- Switched shared Supabase `plan_prices` and legacy monthly plan mappings to live IDs using a fail-closed checkout disable/update/re-enable sequence. Monthly and annual are enabled; 6-month rows remain inactive and checkout-disabled.
- Saved and CLI-verified the default live Customer Portal with invoice history, customer/payment-method updates, and end-of-period cancellation enabled.
- Started the real local app and a live signed Stripe listener on `localhost:3000` without writing secrets to disk.
- Real billing UI verified at $19/$49 monthly and $194/$499 annual; evidence saved under `ui-evidence/2026-07-11/stripe-live-rollout/`.
- Stripe CLI's expiring live key works through CLI but is rejected by the direct Stripe SDK. User supplied the existing direct live restricted key through `.env.local`; live Checkout now succeeds.
- Live Starter Checkout card form is open for user-controlled payment. Screenshot: `ui-evidence/2026-07-11/stripe-live-rollout/checkout-live-starter-card-form.png` at 1939×1215.
- Real Starter payment completed: live invoice paid $19, Checkout and invoice webhooks processed, one initial 100-credit grant recorded, and trusted `checkout_completed` analytics persisted.
- The paid account created a fresh project through the real intake flow. Billing then showed `1 of 5 projects used`; screenshot: `ui-evidence/2026-07-11/stripe-live-rollout/billing-active-starter-1-of-5.png`.
- Real-flow remediation: Starter fallback and linked `plans.monthly_project_allowance` now equal the advertised five projects. Migration `20260711010000_align_starter_project_allowance.sql` defensively restores the missing explicit column before backfill.
- Real-flow remediation: Stripe Portal scheduled cancellation with `cancel_at` rather than `cancel_at_period_end`. Subscription normalization now recognizes a `cancel_at` matching the item period end; a repeated real portal flow synced `cancel_at_period_end = true` and emitted `subscription_cancel_requested`.
- Cleanup complete: subscription `sub_1Ts7pZRZYXj2bJrBqVoszqa0` was canceled immediately after portal verification; refund `re_3Ts7pWRZYXj2bJrB1UTK2ma9` succeeded for the full $19. Deleted/refund webhook claims processed without error and the billing page returned to Free.
- Refund-ledger remediation: migration `20260711020000_reverse_credits_on_subscription_refund.sql` adds reversal metadata and a service-role-only idempotent RPC. The real refund grant reversed once (-100); a second invocation returned false without changing balance/history.
- Public launch remains blocked on a deployed HTTPS webhook endpoint and production environment variables; the verified listener is local and temporary.
- Operations follow-up: alert and reconcile delayed older-period `invoice.paid` events that no longer match the current subscription snapshot; the existing guard correctly fails closed instead of granting the wrong period.
