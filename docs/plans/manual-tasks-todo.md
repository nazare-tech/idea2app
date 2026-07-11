# To-Do (Manual Tasks)

**Last Updated**: 2026-07-11

---

## Stripe Payments - Setup & Go-Live

### Immediate (Test Mode)

- [x] **Test full checkout flow in browser**: Test-mode checkout was verified, then superseded by a real live $19 Starter checkout on 2026-07-11.
- [x] **Verify subscription was created**: Live subscription synchronized with the correct plan, interval price, and Stripe period.
- [x] **Verify credits were added once**: One idempotent 100-credit initial grant was recorded for the live Starter period.
- [x] **Test Customer Portal**: The live portal opened from Billing and showed the current plan, invoice, payment method, and cancellation controls.
- [x] **Test subscription cancellation**: Portal cancellation and final immediate cancellation both synchronized through processed live webhooks.

### Before Production

- [x] **Switch local smoke environment to live Stripe key**: `.env.local` uses a live restricted key. Vercel/production environment setup remains separate and must not reuse a local CLI listener secret.
- [x] **Create live products & prices**: Live Starter and Pro monthly, 6-month, and annual Prices exist at $19/$105/$194 and $49/$270/$499. Enterprise remains non-public/checkout-disabled.
- [x] **Update shared Supabase billing rows**: Monthly/annual live Prices are checkout-enabled, 6-month rows are retained disabled, and legacy monthly mappings are aligned.
- [ ] **Set up production webhook endpoint**: In [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks), add your production URL: `https://yourdomain.com/api/stripe/webhook`. Select these events:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
- [ ] **Update STRIPE_WEBHOOK_SECRET**: Copy the signing secret from the production webhook endpoint and set it in your Vercel/production environment variables
- [x] **Configure live Stripe Customer Portal for smoke testing**: Live default portal supports invoice history, customer/payment-method updates, and cancellation. Confirm the final production return URL after deployment.

The 2026-07-11 live smoke test used a temporary local Stripe CLI listener. Public launch still requires the unchecked deployed webhook endpoint and production `STRIPE_WEBHOOK_SECRET` tasks above.

---

## Billing Page - UI Enhancements

- [ ] **Add success/canceled toast or banner**: The checkout redirects to `/billing?success=true` or `/billing?canceled=true` but there's no visual feedback for these states yet. Add a toast notification or banner.
- [ ] **Show subscription renewal date**: Display `current_period_end` from the subscription to show the user when their next billing cycle is
- [ ] **Add upgrade/downgrade flow**: Currently the billing page only shows "Upgrade to X" buttons. Consider handling plan changes (e.g., upgrading from Starter to Pro) which creates a subscription update via Stripe

---

## Environment Variables - Missing / Optional

- [ ] **ANTHROPIC_API_KEY**: Currently empty in `.env.local`. Needed for the app generation feature (Claude API direct calls)
- [ ] **VERCEL_TOKEN / VERCEL_TEAM_ID**: Currently empty. Needed if you want to deploy generated apps to Vercel from within the platform

---

## General

- [ ] **Review RLS policies for subscriptions table**: Ensure users can only read their own subscription records and that service-role inserts/updates from the webhook are not blocked
- [ ] **Test credit renewal on invoice.paid**: The webhook handles `invoice.paid` with `billing_reason: "subscription_cycle"` to add interval-scaled credits once per subscription period. Use Stripe test clocks or a controlled live smoke flow.
- [ ] **Add error logging/monitoring**: Consider adding structured logging or an error tracking service (e.g., Sentry) for webhook failures in production

---

## Project-Based Pricing Cleanup

- [ ] **Remove user-facing credit-based generation UX**: Audit workspace generation, billing copy, TODO/docs, and API responses so users no longer see credit costs for bundled project document generation.
- [ ] **Clean up remaining manual Generate All entry points**: Confirm the normal workspace flow has no idle public "Generate All" button while preserving backend queue/status routes needed for onboarding and durable generation.
- [ ] **Review legacy credit tables and RPCs**: Decide which credit tables/RPCs remain for historical accounting or internal tooling and which should be deprecated after the project-based pricing migration is complete.
