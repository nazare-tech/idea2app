---
implemented: false
implemented_at: null
implementation_summary: null
superseded_by: stripe-live-rollout-plan.md
---

# Stripe Live Mode Switch Plan

> Superseded: the live-mode switch shipped via `stripe-live-rollout-plan.md` / `stripe-live-rollout-review.md`. Kept for history; do not re-open.

## Goal

Switch the app from Stripe test mode to Stripe live (production) mode so real payments can be accepted: create the live-mode product/price catalog, point `plan_prices` at the live Price IDs, swap the local env to live keys, and wire live webhook delivery.

## Current State (verified 2026-07-06)

- Stripe CLI 1.42.1 is authenticated against the **Makercompass** account (`acct_1TfXV9RZYXj2bJrB`) with both test and live keys (CLI keys expire 2026-09-05).
- The live account is **fully activated**: `charges_enabled: true`, `payouts_enabled: true`, `details_submitted: true`, no outstanding requirements, Bank of America payout account attached, statement descriptor `MAKER COMPASS`.
- Test mode catalog: Starter ($19/mo `price_1TfXvFRZYXj2bJrBuC6JaIfj`, $192/yr `price_1TqLqfRZYXj2bJrBIoVTOdjX` lookup `starter_yearly`), Pro ($49/mo `price_1TfXvFRZYXj2bJrB8vg41zH0`, $504/yr `price_1TqLqhRZYXj2bJrBS9rqDpB0` lookup `pro_yearly`), Enterprise ($199/mo `price_1TfXvERZYXj2bJrB2Seb3YKh`, checkout disabled).
- **Live mode is completely empty**: 0 products, 0 prices, 0 webhook endpoints.
- `plan_prices` in Supabase holds one `stripe_price_id` per row, currently the test-mode IDs above (Starter plan `11f39e3f-613a-4b22-92b2-2fc9e204cb1e`, Pro plan `a9a61b4e-6b72-4342-9917-195da4c7acc6`, Enterprise plan `36a2fd54-ed86-4ab5-af83-de219d93b896`).
- `.env.local` holds test-mode `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
- **No production deployment exists**: `NEXT_PUBLIC_APP_URL=http://localhost:3000`, no `.vercel` link, no Vercel CLI installed, `www.makercompass.com` does not respond. Live payments will initially be taken from the local app.
- Webhook route handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`; events are claimed in `stripe_webhook_events` for idempotency.

## Assumptions

- One Supabase project serves both local dev and any future production; pointing `plan_prices` at live IDs intentionally retires the test-mode checkout path (old IDs recorded here for rollback).
- Real charges are desired; this is the explicit request.

## Clarifying Decisions

1. **App secret key source.**
   - A: Use the Stripe CLI's live restricted key (already on this machine, works immediately, expires 2026-09-05).
   - B: Ask the user to paste the dashboard `sk_live_...` key.
   - Trade-offs: A unblocks now with zero user action but must be replaced before the expiry / before any real deployment; B is the durable production posture but blocks on the user.
   - **Selected: A**, with an expiry comment in `.env.local` and a follow-up note to mint a proper restricted key in the dashboard before deploying.
2. **Live webhook delivery.**
   - A: `stripe listen --live --forward-to localhost:3000/api/stripe/webhook` (CLI print-secret becomes `STRIPE_WEBHOOK_SECRET`).
   - B: Dashboard webhook endpoint at a public URL.
   - Trade-offs: B requires a deployed app, which does not exist yet.
   - **Selected: A** for now; B is a documented pre-deploy step.
3. **Enterprise in live mode.** Create the product and $199/mo price to keep `plan_prices` parity (`checkout_enabled` stays false). Selected: yes.

## Plan

1. Back up `.env.local` to `.env.local.test-mode-backup` (gitignored via `.env*`).
2. Create live products Starter, Pro, Enterprise; create live prices mirroring test mode (amounts, intervals, `starter_yearly` / `pro_yearly` lookup keys).
3. `PATCH` the five `plan_prices` rows with the new live `stripe_price_id`s via the Supabase service role.
4. Update `.env.local`: live publishable key, CLI live restricted key (commented with expiry), live CLI webhook signing secret from `stripe listen --live --print-secret`.
5. Update `PROJECT_CONTEXT.md` Stripe section to reflect live-mode state.
6. Verify: live API resolves the new prices; app boots and `/billing` renders plans; creating a live Checkout Session succeeds (session creation charges nothing).

## Validation

- `stripe prices list --live` shows the five prices with correct amounts.
- `plan_prices` rows show live `price_...` IDs.
- Dev server: billing page loads plans; `POST /api/stripe/checkout` returns a live Checkout URL.

## Risks

- Real cards are now charged; refunds must go through the Stripe dashboard.
- CLI-issued live key expires 2026-09-05; app payments stop then unless replaced.
- Webhooks only arrive while `stripe listen --live` is running; a paid checkout completed while it is not running will sync on the next `customer.subscription.updated` or can be replayed with `stripe events resend --live`.

## Rollback

Restore `.env.local` from `.env.local.test-mode-backup` and re-point `plan_prices` to the test IDs listed in Current State. Live products/prices can be archived (not deleted) in the dashboard.

## Open Decisions

- Production hosting (Vercel) and a dashboard webhook endpoint remain TODO before public launch.
- Real support email for the Stripe business profile (`support_email` is null).

## Critique (five perspectives)

- **Correctness**: amounts/intervals copied from live test rows, not from memory; webhook mapping keys off `stripe_price_id`, so DB update is the critical step.
- **Security**: no secrets in this file; env stays gitignored; service-role usage is server-side only.
- **Operations**: biggest gap is webhook delivery being CLI-dependent; documented explicitly.
- **UX**: no UI change; pricing copy in `src/lib/pricing-plans.ts` already matches amounts.
- **Simplicity**: no code changes needed at all; this is catalog + config only.
