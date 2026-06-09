---
implemented: false
implemented_at:
implementation_summary:
---

# Plan: Stripe Production Products Setup

## Goal
Move Maker Compass from test-mode Stripe products to production/live Stripe products and prices without hardcoding secrets or environment-specific live values in source code. The app should use live Stripe keys in production, live recurring Price IDs in the production Supabase `plans` table, a live webhook endpoint/signing secret, and webhook logic that keeps subscription plan and billing-period data accurate when Checkout or the Customer Portal changes a subscription.

## Assumptions
- The runtime checkout source of truth is Supabase `plans.stripe_price_id`; product IDs are currently documented but not stored in the database.
- Live Stripe secret keys, publishable keys, and webhook signing secrets must be configured in the deployment environment, not committed.
- Existing local `.env.local` can remain test-mode for local development unless you explicitly want a separate local live-mode file.
- Stripe live-mode Products/Prices can be created manually in the Dashboard or with an API script; recurring Price amounts should be treated as immutable after creation and replaced with new Prices when changed.
- The production Supabase database is separate from local development data, and production plan rows already exist or can be upserted by stable plan names.
- Current webhook behavior works for a simple first checkout but has a production risk: it sets `current_period_end` to "now + 30 days" on checkout completion and does not remap `plan_id` when a customer changes plans in the Stripe Customer Portal.

## Clarifying Questions
1. Should live Stripe Products/Prices be created through the Stripe Dashboard or through a repeatable script?
   - Recommendation A: Use Stripe Dashboard "Copy to live mode" or manual live Product creation for the first go-live.
   - Trade-off: Fastest and lowest code risk for three plans, but less repeatable unless we document the exact resulting Price IDs.
   - Recommendation B: Add a one-off admin script that creates/validates live Products and Prices from a checked-in catalog.
   - Trade-off: More repeatable and auditable, but requires handling live API credentials and more careful dry-run safeguards.
2. Which paid plans should be public in production checkout?
   - Recommendation A: Keep Starter and Pro public, keep Enterprise private/contact-sales or disabled for checkout.
   - Trade-off: Cleaner self-serve launch and avoids promising Enterprise automation before support processes exist.
   - Recommendation B: Keep Starter, Pro, and Enterprise public with live recurring Stripe Prices.
   - Trade-off: Matches the older documented table, but customers can buy Enterprise immediately and expect support, cancellation, and plan-change behavior to be production-ready.
3. Where should live Price IDs be applied?
   - Recommendation A: Update the production Supabase `plans` rows directly with live `price_*` IDs and keep code environment-neutral.
   - Trade-off: Best fit for the current architecture and avoids environment-specific code churn, but the production DB update must be done carefully.
   - Recommendation B: Commit a Supabase migration that updates plan rows to live `price_*` IDs.
   - Trade-off: More traceable in git, but mixes environment-specific live billing identifiers into schema history and can break test/staging databases unless guarded.
4. Should we add code hardening before switching production traffic to live Stripe?
   - Recommendation A: Fix webhook subscription syncing first: derive period dates and plan mapping from Stripe subscription/items and add tests around those helpers.
   - Trade-off: Safer production billing and portal changes, but adds implementation work before go-live.
   - Recommendation B: Do a minimal config-only switch first, then harden webhooks after a live smoke test.
   - Trade-off: Faster go-live, but the first production subscriptions can have inaccurate period dates or stale `plan_id` after portal plan changes.
5. How should the live Customer Portal be configured?
   - Recommendation A: Configure the default live Customer Portal in Stripe Dashboard and let the current route create sessions without an explicit configuration ID.
   - Trade-off: Minimal code change and matches current implementation, but portal behavior depends on Dashboard state.
   - Recommendation B: Add an optional `STRIPE_BILLING_PORTAL_CONFIGURATION_ID` env var and pass it when creating portal sessions.
   - Trade-off: More deterministic across environments, but requires managing one more live-mode identifier.
6. How should production verification handle real payments?
   - Recommendation A: Create a temporary live low-dollar internal plan or couponed live plan for smoke testing, then disable it.
   - Trade-off: Verifies the real live stack end to end with low financial exposure, but requires cleanup.
   - Recommendation B: Avoid real charges and verify through Stripe Dashboard object checks plus test-mode end-to-end tests.
   - Trade-off: No real payment exposure, but it does not prove live Checkout, webhooks, and production Supabase writes together.
7. Do we need to migrate or clean existing Stripe customer IDs in the production database?
   - Recommendation A: Audit production `profiles.stripe_customer_id` values and clear any `cus_*` values created with test-mode keys before live launch.
   - Trade-off: Prevents live Customer Portal failures caused by test customers stored in production, but requires production DB access and careful filtering.
   - Recommendation B: Leave existing customer IDs untouched and only create live customers for new checkouts.
   - Trade-off: Less invasive, but users with test-mode customer IDs in production can hit portal/checkout errors with live keys.

## Recommended First Step
Confirm the production billing catalog decisions: public paid plans, whether Enterprise is self-serve, and whether to create live Products/Prices manually or with a script. In parallel, inventory production Supabase `plans` rows and confirm whether any production `profiles.stripe_customer_id` values point to test-mode customers.

## Plan
1. Baseline the current billing configuration.
   - Read production-safe metadata only: plan names, prices, `stripe_price_id`, `is_public`, `checkout_enabled`, and subscription/customer counts.
   - Confirm `NEXT_PUBLIC_APP_URL` production domain and current Vercel environment variable names.
   - Validate no secret values are committed or printed.
2. Create or copy live Stripe Products and recurring monthly Prices.
   - Use Stripe live mode, not test mode.
   - Create Products for the approved public plans with clear names and descriptions.
   - Create monthly USD recurring Prices that match production pricing.
   - Prefer stable `lookup_key` values such as `makercompass_starter_monthly` and `makercompass_pro_monthly` so future automation can validate prices without relying only on copied IDs.
3. Update production Supabase plan rows.
   - Set each public paid plan's `stripe_price_id` to the matching live `price_*` ID.
   - Set `checkout_enabled = true` only for plans intended for self-serve live checkout.
   - Set `is_public` according to the billing-page display decision.
   - Keep Free with no Stripe Price ID and internal entitlement plans non-public and checkout-disabled.
4. Configure production Stripe/Vercel integration.
   - Set production `STRIPE_SECRET_KEY` to the live secret key.
   - Set production `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to the live publishable key if any client surface uses it now or later.
   - Set production `NEXT_PUBLIC_APP_URL` to the production app URL.
   - Create a live Stripe webhook endpoint for `/api/stripe/webhook`.
   - Subscribe at minimum to `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, and `invoice.paid`.
   - Set production `STRIPE_WEBHOOK_SECRET` to the live endpoint signing secret.
   - Configure the live Customer Portal for cancellation, payment methods, invoices, and approved plan switching.
5. Harden webhook subscription synchronization before or alongside go-live.
   - Add a small server-side helper that extracts subscription status, period dates, cancel-at-period-end, Stripe subscription ID, and item Price ID from Stripe subscription payloads.
   - On `checkout.session.completed`, retrieve or expand the Stripe subscription and store real `current_period_start`/`current_period_end` instead of synthetic 30-day dates.
   - On `customer.subscription.updated`, update `plan_id` by matching the active subscription item Price ID to `plans.stripe_price_id`, so Customer Portal upgrades/downgrades update app entitlements.
   - Preserve idempotency through `stripe_webhook_events` and avoid double-credit grants.
6. Add focused verification.
   - Unit test the pure subscription mapping helper with checkout, update, cancellation, and portal plan-change scenarios.
   - Run `npm test` and `npm run typecheck`.
   - If local Stripe CLI or live webhook testing is available, run a webhook replay/smoke test without exposing secrets.
   - Use the app billing page in a browser to confirm public plans, checkout redirects, portal redirect, and post-webhook subscription state.
7. Update documentation and release notes.
   - Update `PROJECT_CONTEXT.md` to remove or clearly label old test-mode Product/Price IDs and document the production-safe source of truth.
   - Update `TODO.md` or move completed production Stripe checklist items to a completed section.
   - Update `docs/SECURITY_RELEASE_CHECKLIST.md` with completed or still-open production billing controls.
8. Roll out and monitor.
   - Deploy with live env vars.
   - Run the approved live smoke test.
   - Check Stripe webhook delivery logs, app structured webhook logs, `stripe_webhook_events`, `subscriptions`, and `credits_history`.
   - Keep test-mode local development documented separately from production live-mode config.

## Phased Implementation Checklist
- [ ] Phase 0: Confirm public plan catalog and live setup method.
- [ ] Phase 1: Inventory production plan/customer state without printing secrets.
- [ ] Phase 2: Create/copy live Stripe Products and recurring Prices.
- [ ] Phase 3: Update production Supabase `plans` live Price IDs and checkout flags.
- [ ] Phase 4: Configure live Stripe webhook, Customer Portal, and production env vars.
- [ ] Phase 5: Implement webhook subscription-period and portal plan-change hardening.
- [ ] Phase 6: Add focused tests for subscription mapping and run typecheck/tests.
- [ ] Phase 7: Verify billing UI, Checkout redirect, webhook fulfillment, and portal flow.
- [ ] Phase 8: Update `PROJECT_CONTEXT.md`, `TODO.md`, and security checklist.

## Milestones
- Catalog confirmed: final list of public live plans, prices, and checkout flags is agreed.
- Live Stripe catalog exists: approved Products and recurring Prices exist in Stripe live mode.
- Production DB aligned: production `plans` rows point to live Price IDs and only approved plans are checkout-enabled.
- Production env aligned: live Stripe keys and webhook signing secret are configured in the deployment environment.
- Subscription sync hardened: webhook code stores real Stripe subscription periods and maps portal plan changes back to app plans.
- End-to-end verified: a live or approved smoke flow proves Checkout, webhook fulfillment, Supabase writes, and portal access.

## Validation
- Stripe Dashboard: live Products and Prices are active, recurring monthly, correct currency/amount, and attached to the approved catalog.
- Supabase: public checkout plans have live `price_*` IDs, correct `is_public`, correct `checkout_enabled`, and Free/internal plans cannot create Checkout sessions.
- API: `/api/stripe/checkout` rejects mismatched `planId`/`priceId` pairs and returns a Stripe-hosted live Checkout URL for approved plans.
- Webhook: signed live webhook events insert into `stripe_webhook_events`, update `subscriptions`, and do not double-process duplicate event IDs.
- Portal: authenticated paid users can open Stripe Customer Portal and any allowed plan change updates `subscriptions.plan_id`.
- Commands: `npm test` and `npm run typecheck`.
- Browser: `/billing` shows the intended public plans and starts Checkout only for live-enabled paid plans.

## Risks And Mitigations
- Risk: Live secret keys or webhook secrets leak into git or logs.
  - Mitigation: Configure secrets only in Vercel/secure env stores; print only redacted names or presence checks.
- Risk: Test-mode Price IDs remain in production `plans`.
  - Mitigation: Validate live mode by querying Stripe with the live key before enabling checkout.
- Risk: Customer Portal plan changes do not update app entitlements.
  - Mitigation: Map subscription item Price IDs back to `plans.stripe_price_id` in `customer.subscription.updated`.
- Risk: Synthetic billing periods drift from Stripe truth.
  - Mitigation: Store actual Stripe subscription `current_period_start` and `current_period_end`.
- Risk: Existing production profiles contain test-mode customer IDs.
  - Mitigation: Audit and clear only confirmed test-mode customer IDs before live launch.
- Risk: Live smoke tests create real charges or unwanted subscriptions.
  - Mitigation: Use a temporary internal live plan, coupon, or immediate cancellation/refund procedure.
- Risk: Public Enterprise checkout creates support obligations before operations are ready.
  - Mitigation: Keep Enterprise non-public/contact-sales until support and contract workflows are ready.

## Rollback Or Recovery
- Disable checkout quickly by setting `plans.checkout_enabled = false` for all paid public plans.
- Revert production env vars to test mode only for non-production deployments; do not mix live keys with test Price IDs.
- In Stripe Dashboard, deactivate newly created live Prices or Products for future purchases; existing subscriptions must be canceled or migrated explicitly.
- If webhook processing misbehaves, keep the endpoint enabled for retries after deploying a fix; Stripe can replay failed events.
- If wrong live Price IDs were stored, update `plans.stripe_price_id` to the correct live IDs and verify no incorrect subscriptions were created.

## Open Decisions
- Dashboard/manual live catalog creation versus scripted creation.
- Public self-serve plan list for launch, especially Enterprise.
- Whether live Price IDs should be updated directly in production Supabase or through a guarded migration/script.
- Whether to add `STRIPE_BILLING_PORTAL_CONFIGURATION_ID` for deterministic portal configuration.
- Whether to run a real live smoke payment and how to limit/refund it.
- Whether production contains test-mode Stripe customer IDs that need cleanup.

## Critique

### Software Architect
- The existing architecture is good because checkout is DB-driven and the route revalidates `planId` plus `priceId` server-side. The weak point is subscription lifecycle correctness: portal updates need to map active Stripe item prices back to plans, and checkout completion should not invent billing periods.

### Product Manager
- The go-live decision is not just technical. Making Enterprise self-serve changes customer expectations around support, cancellation, invoicing, and onboarding. Starter/Pro-only self-serve is the cleaner launch unless Enterprise operations are already ready.

### Customer Or End User
- Customers care that the billing page, Checkout amount, portal plan, and app entitlement all agree. Any mismatch between displayed pricing, charged pricing, and project allowance will feel like a trust issue.

### Engineering Implementer
- The safest implementation is a narrow helper around Stripe subscription payload normalization plus tests. Avoid broad billing refactors while changing production payment configuration.

### Risk, Security, Or Operations
- The highest-risk actions are live secret handling and production DB updates. Every step should use redacted output, dry-run validation where possible, and an immediate rollback path through `checkout_enabled = false`.

