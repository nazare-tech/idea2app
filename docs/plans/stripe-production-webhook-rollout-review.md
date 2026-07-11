# Review: Stripe Production Webhook Rollout

## Scope

- Existing Vercel production project/domain/env configuration.
- Live Stripe endpoint registration and signed delivery.
- Checkout/Portal customer mode handling and Internal Dev billing UI.
- Fail-closed checkout maintenance and restoration.

## Verification

- Local production build passed before deployment and after customer/Portal remediation.
- Full suite: 598/598 tests passed; typecheck, changed-file ESLint, production build, and diff check passed.
- Initial deployment `dpl_9fHRK9u3mSt28pGxEbNhdSsGRzjB`, secret-bearing redeploy, and final ownership-hardening deployment `dpl_DuAiGHydAXhcvAbiic9YLPRmCv1Q` completed; the final Ready deployment owns the apex alias.
- Live endpoint `we_1Ts8dNRZYXj2bJrBStpepAxz` is enabled with exactly five handled events.
- Temporary metadata-only live customer emitted `customer.created`; production webhook returned HTTP 200 and durable claim `evt_1Ts8lPRZYXj2bJrBmEMfi4ke` is live, processed, and error-free. Probe customer deleted; temporary event subscription removed.
- Production Chrome Billing sign-in worked. Initial Portal attempt exposed stale test customer behavior; Vercel logs confirmed `resource_missing`. After remediation deployment, Billing showed `Internal Dev`, zero Manage Subscription/Manage plan actions, and two safe unavailable paid-plan CTAs. Evidence: `ui-evidence/2026-07-11/stripe-production-webhook-rollout/billing-internal-dev-safe.png`.
- Migration `20260711030000_protect_stripe_customer_ownership.sql` was applied. An authenticated e2e privilege probe received PostgreSQL `42501` when updating `stripe_customer_id`, while an allowed same-value `full_name` update succeeded.
- Final production checks: apex HTTP 200, webhook GET HTTP 405, endpoint enabled with exactly five handled events, signed probe claim live/processed/error-free, and no Vercel production error logs in the post-deploy window. Exactly four approved monthly/annual rows are checkout-enabled; legacy monthly and both six-month rows remain disabled.

## Fresh-Eyes Self Review

- Pass 1: found production Internal Dev plan rendered as generic `Active` with invalid Stripe management actions. Fixed plan-name fallback and gated Portal/plan-management actions on `stripe_subscription_id`.
- Pass 2: rejected automatic Portal customer creation because it would create an empty Stripe customer and hide split-brain subscription state. Shared active-mode customer validation; Portal now fails closed. Added deterministic customer-create idempotency for Checkout repair.
- Pass 3: security review found browser-writeable Stripe customer ownership. Revoked browser writes to the protected column, moved Checkout persistence to the service role, and bound customer reuse to Stripe `supabase_user_id` metadata.

## Code Review Findings

- Fixed, high: Portal trusted stale test-mode customer IDs and returned 500 in live production.
- Fixed, medium: Internal/private subscription UI offered Stripe management despite no Stripe subscription ID.
- Fixed, medium: Checkout customer repair could create duplicate customers on request retry; deterministic idempotency key now scopes creation to user and observed stale/null ID.
- Fixed, medium: Portal ignored Supabase profile lookup errors; now returns controlled 500.
- Fixed, critical: an authenticated browser could replace its `stripe_customer_id` with another customer's ID. Column privileges now block that mutation, and server routes independently verify Stripe metadata ownership.

## Architecture Improvement Review

- Landed: stable apex endpoint, fail-closed maintenance window, endpoint-specific secret, shared Stripe customer validator, deterministic customer creation, durable signed-delivery proof.
- Deferred: distributed rate-limit backend, automated Stripe failure alerts, `www` TLS repair, normal Free production QA account.
- No customer lookup by email, authorization weakening, duplicate webhook mutation path, or secret in source/logs. The prior customer-substitution trust gap is closed at both the database and Stripe boundaries.

## Security Review Findings

- Raw card data remains Stripe-hosted. No new charge was created.
- Secret values were entered manually by the user and never emitted, committed, or screenshotted.
- Endpoint signature verification precedes durable claim; probe proves deployed secret matches Stripe.
- Portal refuses stale/deleted customers and never repairs an active subscription by email or by creating an empty replacement.
- Checkout and Portal reject a retrieved customer whose `supabase_user_id` metadata does not equal the authenticated user; browsers cannot write the protected profile column.
- Remaining low-risk hardening: Vercel reports endpoint secret scoped to Preview and Production; prefer Production-only when it can be changed without deleting the production entry.

## Remediation Checklist

- [x] Share Stripe customer validation.
- [x] Add deterministic Checkout customer-create idempotency.
- [x] Fail Portal closed for stale/deleted customers.
- [x] Hide Stripe management for private/internal subscriptions.
- [x] Protect `profiles.stripe_customer_id` from browser writes and verify Stripe metadata ownership.
- [x] Deploy final remediation and recapture production Billing evidence.

## Remaining Verification Gap

- The available production QA user is intentionally Internal Dev, so it cannot start hosted Checkout. A normal Free/canceled production QA account is still needed for a no-charge Checkout redirect-only smoke. The real live-card Checkout/refund test and deployed signed-webhook proof cover the payment and fulfillment boundaries without bypassing the user-visible flow.
