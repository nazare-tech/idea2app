# Stripe Production Products Implementation Review

## Scope
- Implemented interval-aware self-serve billing for Starter and Pro.
- Kept Enterprise non-public and checkout-disabled for this launch.
- Hardened Stripe webhook subscription sync around actual subscription item Price IDs and Stripe periods.
- Added production rollout documentation without committing live Stripe IDs or secrets.

## Fresh-Eyes Code Review
- Finding: Checkout metadata user ids needed an ownership check against the Stripe customer before webhook writes. Fixed in `src/app/api/stripe/webhook/route.ts` by verifying `profiles.id` plus `profiles.stripe_customer_id`.
- Finding: Checkout could create a Stripe customer and continue even if the customer id was not persisted locally. Fixed in `src/app/api/stripe/checkout/route.ts` by failing checkout when the billing profile is missing or cannot store `stripe_customer_id`.
- Finding: Failed Stripe webhook rows were treated as permanent duplicates on retry. Fixed by reclaiming failed or stale processing `stripe_webhook_events` rows before processing.
- Finding: Checkout could create another Stripe subscription for a user who already had an active local subscription. Fixed by returning `409` and directing active/trialing/past-due subscribers to the billing portal.
- Finding: Stored test-mode or deleted Stripe customer IDs could break live checkout. Fixed by retrieving the stored customer with the active Stripe key and replacing it when Stripe reports it missing or deleted.
- Finding: Cancellation events could be marked processed even when profile lookup failed. Fixed by canceling via `stripe_subscription_id` first, then falling back to profile lookup with explicit error handling.
- Finding: Initial credits were granted from Checkout completion while renewals were granted from paid invoices. Simplified to grant initial and renewal subscription credits from `invoice.paid`, using the existing subscription-period idempotency key.
- Finding: The interval migration could carry old test monthly Price IDs forward while the visible Starter/Pro prices changed. Fixed by creating Starter/Pro monthly rows at `$19/$49` disabled and without Stripe Price IDs until live IDs are inserted.
- No remaining code-level blocker found in the changed Stripe checkout, webhook, allowance, migration, or billing UI paths.

## Security Review
- No Stripe secrets, webhook secrets, or live Price IDs were committed.
- Checkout still validates `planId` plus `priceId` server-side against active, checkout-enabled `plan_prices` and public checkout-enabled `plans`.
- Checkout blocks active subscribers from creating a second subscription and recreates stale/deleted Stripe customers before starting Checkout.
- Webhooks verify Stripe signatures, claim Stripe event ids with failed/stale retry support, derive entitlements from actual Stripe subscription item Price IDs, and grant credits through an idempotent service-role RPC.
- `stripe_credit_grants` has no browser-readable RLS policy, and `grant_subscription_credits_once` is revoked from `anon` and `authenticated`.
- Remaining live risk is operational: production must not mix live Stripe keys with test Price IDs.

## Verification
- Passed: `node --import tsx --test src/lib/stripe-subscription-sync.test.ts src/lib/project-allowance.test.ts`.
- Passed: `npm run typecheck`.
- Passed: targeted ESLint on touched Stripe, billing, allowance, and database type files.
- Public browser check passed on `http://localhost:3000/`: Free, Starter `$19/mo`, Pro `$49/mo`, 6-month/annual savings copy visible, and Enterprise absent.
- Project-wide `npm run lint` still fails on pre-existing generated/design-system files under `Design System/`; touched files pass targeted lint.

## Remaining Rollout Work
- Apply `supabase/migrations/20260609000000_stripe_interval_prices.sql` before deploying code that depends on `plan_prices`.
- Create live Stripe Products and recurring Prices for Starter/Pro monthly, 6-month, and annual intervals.
- Update production Supabase `plan_prices.stripe_price_id` values with live `price_*` IDs and enable checkout only for approved live intervals.
- Configure live Stripe webhook endpoint, webhook signing secret, live keys, `NEXT_PUBLIC_APP_URL`, and the live Customer Portal.
- Run a live or approved low-risk smoke test through Checkout, webhook fulfillment, subscription rows, credits history, and portal plan changes.
