# To-Do (Manual Tasks)

**Last Updated**: 2026-02-23

---

## Stripe Payments - Setup & Go-Live

### Immediate (Test Mode)

- [ ] **Test full checkout flow in browser**: Log in to the app at `http://localhost:3000`, navigate to `/billing`, click "Upgrade to Starter", and complete checkout using test card `4242 4242 4242 4242` (any future expiry, any CVC, any zip)
- [ ] **Verify subscription was created**: After checkout, check Supabase `subscriptions` table for a new row with `status: "active"` and correct `plan_id`
- [ ] **Verify credits were added**: Check Supabase `credits` table to confirm the plan's credits were added (e.g., 100 for Starter)
- [ ] **Test Customer Portal**: After subscribing, click "Manage Subscription" on the billing page to verify the Stripe portal opens for subscription management (cancel, upgrade, payment method changes)
- [ ] **Test subscription cancellation**: Cancel a subscription via the Customer Portal, then verify the webhook updates the `subscriptions` table to `status: "canceled"`

### Before Production

- [ ] **Switch to live Stripe keys**: Replace `sk_test_*` and `pk_test_*` in `.env.local` (or Vercel env vars) with your live keys from [Stripe Dashboard > API Keys](https://dashboard.stripe.com/apikeys)
- [ ] **Create live products & prices**: Recreate the Starter ($19/mo), Pro ($49/mo), and Enterprise ($199/mo) products and prices in live mode, then update the Supabase `plans` table with the new live `stripe_price_id` values
- [ ] **Set up production webhook endpoint**: In [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks), add your production URL: `https://yourdomain.com/api/stripe/webhook`. Select these events:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
- [ ] **Update STRIPE_WEBHOOK_SECRET**: Copy the signing secret from the production webhook endpoint and set it in your Vercel/production environment variables
- [ ] **Configure Stripe Customer Portal**: In [Stripe Dashboard > Settings > Billing > Customer Portal](https://dashboard.stripe.com/settings/billing/portal), customize the portal appearance, enable subscription cancellation/upgrades, and set the return URL to `https://yourdomain.com/billing`

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
- [ ] **Test credit renewal on invoice.paid**: The webhook handles `invoice.paid` with `billing_reason: "subscription_cycle"` to add monthly credits. This can't be easily tested locally - use Stripe's test clock feature or wait for a real renewal cycle
- [ ] **Add error logging/monitoring**: Consider adding structured logging or an error tracking service (e.g., Sentry) for webhook failures in production
