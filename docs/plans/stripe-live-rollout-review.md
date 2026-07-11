# Stripe Live Rollout Review

## Outcome

Passed. Maker Compass completed a real live $19 Starter subscription through hosted Checkout, processed the required signed webhooks, granted the entitlement once, opened the live Customer Portal, synchronized a period-end cancellation, canceled the QA subscription immediately, and issued a successful full refund.

## Verification

- Stripe: live subscription `sub_1Ts7pZRZYXj2bJrBqVoszqa0`; paid invoice `in_1Ts7pWRZYXj2bJrB3xIyqOVP`; $19 charge `ch_3Ts7pWRZYXj2bJrB1U9ypJ9m`; full succeeded refund `re_3Ts7pWRZYXj2bJrB1UTK2ma9`.
- Required webhook claims: `checkout.session.completed` and `invoice.paid` processed with `livemode = true` and no error. Portal update, subscription deletion, `charge.refunded`, and `refund.created` also processed without error.
- Supabase: one active-period Starter snapshot existed after checkout; one 100-credit `subscription_initial` grant was keyed to the subscription period; trusted `checkout_completed` analytics was stored.
- Real entitlement: a fresh project was created after payment. After remediation, Billing showed Starter and `1 of 5 projects used`.
- Portal: opened from the real Billing UI. A repeated real cancellation flow proved the `cancel_at` compatibility repair, set local `cancel_at_period_end = true`, and stored `subscription_cancel_requested`.
- Cleanup: final Stripe subscription status and local snapshot are canceled; charge is fully refunded; Billing returned to Free.
- Refund accounting: the matching 100-credit period grant was reversed exactly once; the second RPC call returned false, the balance moved from 750 to 650, and one -100 `subscription_refund_reversal` history row exists.
- Automated checks: 593/593 full tests passed; final focused allowance/subscription sync tests passed 26/26; typecheck, changed-file ESLint, and `git diff --check` passed.
- UI evidence: `ui-evidence/2026-07-11/stripe-live-rollout/billing-live-monthly.png`, `checkout-live-starter-card-form.png`, and `billing-active-starter-1-of-5.png`. Portal screenshots were intentionally omitted because the page displayed personal billing details.

## Code Review Findings

- Fixed: public Starter copy promised five projects while fallback enforcement granted three.
- Fixed: linked migration history claimed the explicit allowance migration was applied while the column was absent. The corrective migration defensively adds the column before setting Starter to five.
- Fixed: Stripe Portal scheduled period-end cancellation through `cancel_at`; local sync only read `cancel_at_period_end`. Normalization now accepts `cancel_at` only when it matches the current item period end, avoiding mislabeling earlier custom cancellations.
- Fixed: cancellation-request analytics now detects both Stripe previous-attribute shapes.
- Fixed: full refund events previously reached the default branch and left the legacy credit grant intact. `charge.refunded` now resolves the invoice through Stripe Invoice Payments and calls a service-role-only idempotent reversal RPC.
- No unresolved correctness finding at handoff.

## Security Review

- Raw card data stayed entirely on Stripe-hosted Checkout/Portal; no card details entered app code or logs.
- Live API and webhook secrets remained in ignored local/process environment only and were never committed or copied into documentation.
- Checkout and portal URLs remained Stripe-hosted HTTPS origins. Webhook signatures, durable claims, service-role-only writes, grant idempotency, and existing RLS boundaries remained intact.
- Migration is additive/idempotent and does not change RLS or browser permissions.
- Refund reversal is invoice-keyed, event-audited, row-locked, and service-role-only. Non-invoice and non-subscription invoice refunds are ignored; ambiguous mappings or a missing grant for a confirmed subscription invoice fail for retry instead of silently losing accounting.
- Remaining operational risk: there is no deployed production webhook endpoint. The local CLI listener is smoke-test infrastructure only.

## Architecture Improvement Review

- Landed: stable live lookup keys, fail-closed Supabase catalog switch, explicit Starter allowance, portal cancellation-shape normalization, and idempotent refund-ledger reversal.
- Deferred: deployed HTTPS webhook endpoint and production environment configuration, required before public traffic.
- Deferred: checked-in Stripe catalog provisioning automation; current catalog is small and now recorded, so adding an operator script is not yet justified.
- No new authorization gap, duplicate grant path, or non-idempotent subscription write was found.
- Remaining operational follow-up: alert and reconcile late older-period `invoice.paid` failures. The current mismatch guard fails closed, which prevents a wrong grant but requires operator recovery if Stripe delivers an old paid invoice after the subscription advances.
- Verification gap: the live historical refund was reconciled through the same RPC and proved idempotent, but the new signed `charge.refunded` route branch did not receive a second real event after implementation. Add a signed route-level harness or test-mode replay when practical.

## Recovery

- Disable paid `plan_prices.checkout_enabled` to stop new purchases immediately.
- Restore test-mode local environment and recorded test Price mappings only if intentionally returning to test mode.
- Revert application helpers and apply a forward migration if the five-project Starter contract changes; never change UI copy and enforcement independently.
- Keep live Products, Prices, invoices, charge, and refund history intact for auditability.
