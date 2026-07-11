# Production Security / Config Checklist

## Scope
Close pre-release gaps around:
- RLS policies (`subscriptions`, `credits_ledger` / related credit tables)
- Billing price catalog and Stripe credit grant idempotency
- Env key hygiene
- Stripe webhook observability

## 1) RLS audit — subscriptions + credits

### subscriptions
- [ ] Confirm RLS enabled on `subscriptions`
- [ ] `SELECT` restricted to owning `auth.uid() = user_id`
- [ ] `INSERT/UPDATE/DELETE` blocked for anon/authenticated user roles unless explicitly required
- [ ] Service role paths only used in server-side webhook/admin flows

### credits / ledger tables
- [ ] Confirm RLS enabled on credit balance + ledger tables
- [ ] Users can only read their own credit rows
- [ ] Direct user writes to ledger are blocked (writes should come from trusted RPC/server path)
- [ ] `add_credits` RPC is security-definer and validates caller path
- [ ] `stripe_credit_grants` has no browser access and grants can only be inserted through trusted service-role webhook paths
- [ ] `grant_subscription_credits_once` is service-role-only and deduplicates grants by `idempotency_key`

### billing price catalog
- [x] `plan_prices` exposes only active public-plan prices to browser clients
- [x] Disabled or null-`stripe_price_id` prices cannot create Checkout sessions
- [x] Enterprise plan rows remain non-public or checkout-disabled until sales/support workflows are ready

## 2) Env hygiene
- [ ] `SUPABASE_SERVICE_ROLE_KEY` never exposed client-side
- [x] `STRIPE_WEBHOOK_SECRET` set in prod env and rotated on incident
- [x] `STRIPE_WEBHOOK_SECRET` scoped to Vercel Production only
- [ ] Rotate the formerly Preview-exposed webhook secret and expire the old value after production proof
- [ ] `NEXT_PUBLIC_*` contains only non-sensitive values
- [ ] Add CI check to fail if service secrets appear in client bundles

## 3) Webhook monitoring
- [x] Structured webhook logs include `event_id`, `event_type`, timestamp
- [x] Route webhook logs to centralized sink (Datadog/Logflare/Sentry)
- [x] Stripe email alerts enabled for API integration errors, webhook delivery failures, and webhook event-generation failures
- [ ] Add alert for repeated signature verification failures
- [ ] Add alert for repeated processing failures by event type

## Notes
- Structured webhook logging was added in `src/app/api/stripe/webhook/route.ts`.
- Stripe webhook event claims now allow failed or stale processing rows to be retried; duplicate processed events remain ignored.
- Interval billing adds `plan_prices`, `subscriptions.plan_price_id`, and `stripe_credit_grants`; include these in the production RLS audit.
- 2026-06-16: Milestone 1 repo-side cleanup removed Stitch/app-generation/chat credit-charging surfaces and re-homed root metrics/prompt-chat SQL into `supabase/migrations`. Section 1 remains unchecked until the production Supabase RLS audit is run with project access.
- 2026-06-19: Milestone 2 added Sentry via `@sentry/nextjs` and routed Stripe webhook structured logs through `src/lib/logger.ts`. Alert rules for repeated signature/processing failures still need to be created in the Sentry dashboard.
- 2026-07-11: Live catalog validation and a real $19 smoke test proved Checkout, signed webhook claims, subscription/credit sync, Customer Portal cancellation, immediate cancellation, and full refund. Secrets stayed in ignored local/process environment only. This does not replace the unchecked deployed webhook endpoint, production secret, or RLS audit tasks.
- 2026-07-11: Full-refund reconciliation is service-role-only and idempotent by invoice/grant row; the real 100-credit grant reversed once and replay made no second ledger entry.
- 2026-07-11: Production endpoint `we_1Ts8dNRZYXj2bJrBStpepAxz` at the apex domain received a signed live no-charge event; Vercel returned 200 and Supabase stored a processed live claim. Secret values were transferred manually and never logged or committed. Vercel currently reports the endpoint secret scoped to Preview and Production; reducing it to Production-only remains recommended when Vercel can split the shared entry without deleting Production.
- 2026-07-11: Operational hardening enabled Stripe email notifications for webhook delivery and event-generation failures plus API integration errors; Vercel now reports `STRIPE_WEBHOOK_SECRET` as Production-only. The old value still requires phone-verified rotation so existing Preview deployments cannot retain useful access. No Sentry account was created.
