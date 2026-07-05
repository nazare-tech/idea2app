---
implemented: false
implemented_at:
implementation_summary: "Code implementation is complete for interval-aware Stripe checkout, hardened webhook subscription sync, production-safe billing docs, and focused tests. Operational live Stripe catalog creation, production Supabase Price ID updates, production env/webhook/portal setup, and live smoke testing remain manual rollout steps."
---

# Plan: Stripe Production Products Setup

## Goal
Move Maker Compass from test-mode Stripe products to production/live Stripe products and prices without hardcoding secrets or environment-specific live values in source code. The app should use live Stripe keys in production, live recurring Price IDs from production Supabase billing data, a live webhook endpoint/signing secret, and webhook logic that keeps subscription plan and billing-period data accurate when Checkout or the Customer Portal changes a subscription. Starter and Pro should support monthly, half-yearly, and annual billing, with half-yearly and annual priced slightly below the monthly equivalent. Enterprise should not be live/self-serve at this stage.

## Assumptions
- The runtime checkout source of truth is Supabase `plans.stripe_price_id`; product IDs are currently documented but not stored in the database.
- Live Stripe secret keys, publishable keys, and webhook signing secrets must be configured in the deployment environment, not committed.
- Existing local `.env.local` can remain test-mode for local development unless you explicitly want a separate local live-mode file.
- Stripe live-mode Products/Prices can be created manually in the Dashboard or with an API script; recurring Price amounts should be treated as immutable after creation and replaced with new Prices when changed.
- The production Supabase database is separate from local development data, and production plan rows already exist or can be upserted by stable plan names.
- Current webhook behavior works for a simple first checkout but has a production risk: it sets `current_period_end` to "now + 30 days" on checkout completion and does not remap `plan_id` when a customer changes plans in the Stripe Customer Portal.
- "Half-burly" is interpreted as half-yearly / every 6 months.
- Proposed self-serve prices: Starter monthly $19, half-yearly $105, annual $194; Pro monthly $49, half-yearly $270, annual $499. That makes half-yearly roughly 8% below monthly equivalent and annual roughly 15% below monthly equivalent.
- Supporting multiple billing intervals requires a billing price catalog rather than a single `plans.stripe_price_id` per plan. The existing monthly field can remain as a backward-compatible default while new interval rows become the checkout source of truth.

## Decisions
- Use Recommendation A for the original clarifying questions.
- Create/copy live Stripe Products and Prices manually in the Stripe Dashboard for first go-live, using Stripe CLI only for safe inspection/validation if needed.
- Keep Starter and Pro public/self-serve in production; keep Enterprise non-public or checkout-disabled for now.
- Update production Supabase billing rows directly rather than committing live `price_*` IDs into a schema migration.
- Harden webhook subscription syncing before allowing live traffic.
- Use the default live Customer Portal configuration in Stripe Dashboard.
- Use a low-dollar/couponed live smoke test if a real live end-to-end check is needed.
- Audit/clean production `profiles.stripe_customer_id` only if any test-mode customer IDs exist. Since no users have access yet, cleanup is lower risk.

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
Update the app to support an interval-aware billing price catalog and harden webhook subscription syncing. Then create the live Stripe catalog manually and update production Supabase with the resulting live Price IDs.

## Plan
1. Baseline the current billing configuration.
   - Read production-safe metadata only: plan names, prices, `stripe_price_id`, `is_public`, `checkout_enabled`, and subscription/customer counts.
   - Confirm `NEXT_PUBLIC_APP_URL` production domain and current Vercel environment variable names.
   - Validate no secret values are committed or printed.
2. Add interval-aware billing prices.
   - Add a normalized price catalog for monthly, half-yearly, and annual prices.
   - Keep `plans.stripe_price_id` as the legacy monthly/default field during migration.
   - Update billing UI to present monthly, half-yearly, and annual choices for Starter and Pro.
   - Update checkout to validate the selected Price ID against active, checkout-enabled interval price rows.
3. Create or copy live Stripe Products and recurring Prices.
   - Use Stripe live mode, not test mode.
   - Create Products for the approved public plans with clear names and descriptions.
   - Create monthly, 6-month, and annual USD recurring Prices for Starter and Pro.
   - Prefer stable `lookup_key` values such as `makercompass_starter_monthly`, `makercompass_starter_half_yearly`, and `makercompass_starter_annual` so future automation can validate prices without relying only on copied IDs.
4. Update production Supabase billing rows.
   - Set each public paid plan's monthly/default `stripe_price_id` to the matching live monthly `price_*` ID for backward compatibility.
   - Insert or update interval price rows with the live monthly, half-yearly, and annual `price_*` IDs.
   - Set `checkout_enabled = true` only for plans intended for self-serve live checkout.
   - Set `is_public` according to the billing-page display decision.
   - Keep Free with no Stripe Price ID and internal entitlement plans non-public and checkout-disabled.
5. Configure production Stripe/Vercel integration.
   - Set production `STRIPE_SECRET_KEY` to the live secret key.
   - Set production `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to the live publishable key if any client surface uses it now or later.
   - Set production `NEXT_PUBLIC_APP_URL` to the production app URL.
   - Create a live Stripe webhook endpoint for `/api/stripe/webhook`.
   - Subscribe at minimum to `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, and `invoice.paid`.
   - Set production `STRIPE_WEBHOOK_SECRET` to the live endpoint signing secret.
   - Configure the live Customer Portal for cancellation, payment methods, invoices, and approved plan switching.
6. Harden webhook subscription synchronization before or alongside go-live.
   - Add a small server-side helper that extracts subscription status, period dates, cancel-at-period-end, Stripe subscription ID, and item Price ID from Stripe subscription payloads.
   - On `checkout.session.completed`, retrieve or expand the Stripe subscription and store real `current_period_start`/`current_period_end` instead of synthetic 30-day dates.
   - On `customer.subscription.updated`, update `plan_id` by matching the active subscription item Price ID to `plans.stripe_price_id`, so Customer Portal upgrades/downgrades update app entitlements.
   - Preserve idempotency through `stripe_webhook_events` and avoid double-credit grants.
7. Add focused verification.
   - Unit test the pure subscription mapping helper with checkout, update, cancellation, and portal plan-change scenarios.
   - Run `npm test` and `npm run typecheck`.
   - If local Stripe CLI or live webhook testing is available, run a webhook replay/smoke test without exposing secrets.
   - Use the app billing page in a browser to confirm public plans, checkout redirects, portal redirect, and post-webhook subscription state.
8. Update documentation and release notes.
   - Update `PROJECT_CONTEXT.md` to remove or clearly label old test-mode Product/Price IDs and document the production-safe source of truth.
   - Update `docs/plans/manual-tasks-todo.md` or move completed production Stripe checklist items to a completed section.
   - Update `docs/plans/security-release-checklist.md` with completed or still-open production billing controls.
9. Roll out and monitor.
   - Deploy with live env vars.
   - Run the approved live smoke test.
   - Check Stripe webhook delivery logs, app structured webhook logs, `stripe_webhook_events`, `subscriptions`, and `credits_history`.
   - Keep test-mode local development documented separately from production live-mode config.

## Phased Implementation Checklist
- [x] Phase 0: Confirm public plan catalog and live setup method.
- [ ] Phase 1: Inventory production plan/customer state without printing secrets.
- [x] Phase 1.5: Add interval-aware billing price catalog and billing UI selection.
- [ ] Phase 2: Create/copy live Stripe Products and recurring Prices.
- [ ] Phase 3: Update production Supabase live interval Price IDs and checkout flags.
- [ ] Phase 4: Configure live Stripe webhook, Customer Portal, and production env vars.
- [x] Phase 5: Implement webhook subscription-period and portal plan-change hardening.
- [x] Phase 6: Add focused tests for pricing selection and subscription mapping, then run typecheck/tests.
- [ ] Phase 7: Verify billing UI, Checkout redirect, webhook fulfillment, and portal flow.
- [x] Phase 8: Update `PROJECT_CONTEXT.md`, `docs/plans/manual-tasks-todo.md`, and security checklist.

## Implementation Progress
- Added `plan_prices`, subscription price tracking, and idempotent `stripe_credit_grants` support in `supabase/migrations/20260609000000_stripe_interval_prices.sql`.
- Updated checkout to validate selected interval prices against `plan_prices`.
- Updated webhooks to derive plan, price, period dates, and credit grants from actual Stripe subscription items.
- Tightened checkout/webhook ownership consistency by requiring persisted `profiles.stripe_customer_id` before Checkout and verifying Checkout metadata user ids against the resolved Stripe customer.
- Fixed review findings: failed/stale Stripe webhook claims can be retried, existing subscribers are blocked from creating duplicate Checkout subscriptions, stale test-mode Stripe customer IDs are replaced on checkout, cancellation events update by Stripe subscription ID first, and initial credits are granted from paid subscription invoices instead of Checkout completion.
- Adjusted the migration so Starter/Pro monthly rows are created at `$19/$49` but disabled without live Price IDs, avoiding accidental checkout against old test Prices after the visible amount changes.
- Updated billing and landing pricing UI for Starter/Pro public self-serve pricing and Enterprise disabled for now.
- Added focused tests for subscription mapping and annual subscription monthly allowance behavior.
- Verified the public landing pricing section in-browser: Free, Starter `$19/mo`, Pro `$49/mo`, no Enterprise card, and 6-month/annual savings copy visible.
- Authenticated `/billing` shell loads locally, but local plan-card verification is blocked until the new `plan_prices` migration is applied to the local database.
- Remaining work is operational: apply migrations, create live Stripe Products/Prices, update production Supabase `plan_prices` live IDs, configure live env/webhook/portal, and run live checkout/webhook/portal smoke verification.

## Milestones
- Catalog confirmed: final list of public live plans, prices, and checkout flags is agreed.
- Interval billing supported: Starter and Pro expose monthly, half-yearly, and annual checkout options while Enterprise remains non-public or checkout-disabled.
- Live Stripe catalog exists: approved Products and recurring interval Prices exist in Stripe live mode.
- Production DB aligned: production billing rows point to live Price IDs and only approved plan intervals are checkout-enabled.
- Production env aligned: live Stripe keys and webhook signing secret are configured in the deployment environment.
- Subscription sync hardened: webhook code stores real Stripe subscription periods and maps portal plan changes back to app plans.
- End-to-end verified: a live or approved smoke flow proves Checkout, webhook fulfillment, Supabase writes, and portal access.

## Validation
- Stripe Dashboard: live Products and Prices are active, recurring monthly, correct currency/amount, and attached to the approved catalog.
- Supabase: public checkout plan intervals have live `price_*` IDs, correct `is_public`, correct `checkout_enabled`, and Free/internal/Enterprise plans cannot create Checkout sessions.
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
- Exact live Stripe Product/Price IDs after manual Dashboard creation.
- Whether to create a temporary live smoke-test price/coupon or skip real live charge testing.
- Whether production contains test-mode Stripe customer IDs that need cleanup.

## Critique

### Software Architect
- The existing architecture is good because checkout is DB-driven and the route revalidates `planId` plus `priceId` server-side. The weak point is subscription lifecycle correctness: portal updates need to map active Stripe item prices back to plans, and checkout completion should not invent billing periods. The new interval requirement also means a single `plans.stripe_price_id` is no longer a sufficient long-term source of truth.

### Product Manager
- The go-live decision is not just technical. Making Enterprise self-serve changes customer expectations around support, cancellation, invoicing, and onboarding. Starter/Pro-only self-serve is the cleaner launch unless Enterprise operations are already ready.

### Customer Or End User
- Customers care that the billing page, Checkout amount, portal plan, and app entitlement all agree. Any mismatch between displayed pricing, charged pricing, and project allowance will feel like a trust issue.

### Engineering Implementer
- The safest implementation is a narrow helper around Stripe subscription payload normalization plus tests. Avoid broad billing refactors while changing production payment configuration.

### Risk, Security, Or Operations
- The highest-risk actions are live secret handling and production DB updates. Every step should use redacted output, dry-run validation where possible, and an immediate rollback path through `checkout_enabled = false`.
