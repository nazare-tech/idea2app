# Credits and Billing
Credit system and billing: credit cost table (document generation is project-bundled; a hidden legacy ledger may still record non-bundled paths) and management RPCs.
Consumption and refunds run through consume_credits, add_credits, get_credit_balance, and refund_credits; costs come from src/lib/token-economics.ts getTokenCost().
Subscription plans: Free 10 credits, Starter 100 ($19/mo, $105/6mo, $194/yr), Pro 500 ($49/mo, $270/6mo, $499/yr), Enterprise 2,500 with checkout disabled.
plan_prices.stripe_price_id is authoritative per billing interval; plans.stripe_price_id is a legacy monthly default; live IDs live in Supabase/Stripe, not source.
Stripe details: account acct_1TfXV9RZYXj2bJrB, API version 2026-01-28.clover, getStripeClient() singleton in src/lib/stripe/index.ts, profiles.stripe_customer_id linking.
Webhooks use SUPABASE_SERVICE_ROLE_KEY with stripe_webhook_events dedupe, grant_subscription_credits_once() and reverse_subscription_credits_once(); billing UI at /billing.
---

## 9. Credit System

### Credit Costs

| Action | Cost |
|--------|------|
| Chat message (general) | Not available |
| Prompt chat message (deprecated) | Not available |
| Inline document edit | Not available |
| Competitive Analysis | Included in project generation; hidden legacy ledger may still record non-bundled paths |
| Product Plan Generation | Included in project generation; hidden legacy ledger may still record non-bundled paths |
| First Version Plan Generation | Included in project generation; hidden legacy ledger may still record non-bundled paths |
| Mockup Generation | Included in project generation |
| Tech Spec Generation | Hidden legacy/internal accounting only |

### Credit Management

- **Consumption**: Atomic operation via `consume_credits()` stored procedure. Non-bundled generation costs come from `src/lib/token-economics.ts` (`BASE_ACTION_TOKENS`, model multipliers, and `getTokenCost()`).
- **Refund**: Via service-role-only `refund_credits()` through `src/lib/credits.ts` — called on generation failure in credit-billed analysis, prompt chat, and billable Generate All queue paths. Mockup generation is project-bundled and does not consume/refund credits.
- **Addition**: Via `add_credits()` (subscription refill, purchases)
- **Balance Check**: Real-time via `get_credit_balance()`
- **History**: All transactions logged in `credits_history`

### Subscription Plans

| Plan | Credits/Month | Public Checkout | Monthly | 6 Months | Annual |
|------|--------------|-----------------|---------|----------|--------|
| **Free** | 10 | No checkout | $0 | — | — |
| **Starter** | 100 | Yes | $19/mo | $105 every 6 months | $194/year |
| **Pro** | 500 | Yes | $49/mo | $270 every 6 months | $499/year |
| **Enterprise** | 2,500 | Disabled for now | Not public | Not public | Not public |

`plans.stripe_price_id` remains as a legacy/default monthly field. New checkout integrations should use `plan_prices.stripe_price_id` for the selected interval. Live production Product and Price IDs are environment data stored in Supabase/Stripe, not hardcoded in source.

### Stripe Integration Details

- **Account**: Makercompass (`acct_1TfXV9RZYXj2bJrB`); local development may use test mode, production must use live-mode keys and live `plan_prices`
- **API Version**: `2026-01-28.clover`
- **Singleton Client**: `src/lib/stripe/index.ts` — lazy-initialized Stripe instance via `getStripeClient()` with a `Proxy` export for ergonomic access
- **Customer Linking**: Stripe customer ID stored in `profiles.stripe_customer_id`; created on first checkout, reused only when Stripe metadata ownership matches the authenticated user, and replaced when stale test-mode/deleted IDs cannot be retrieved with the active Stripe key. Browser roles cannot write this protected column; Checkout persists it through the service-role client.
- **Checkout Flow**: Server-side redirect to Stripe-hosted checkout (no Stripe.js Elements needed); selected interval comes from `plan_prices`
- **Customer Portal Configuration**: The default live portal configuration supports invoice history, customer/payment-method updates, cancellation, and production return URL `https://makercompass.com/billing`.
- **Webhook Processing**: Uses `SUPABASE_SERVICE_ROLE_KEY` (service role) to bypass RLS for subscription and credit updates; `stripe_webhook_events` deduplicates processed events while allowing failed/stale processing rows to be retried, `stripe_credit_grants`/`grant_subscription_credits_once()` deduplicates credit grants per subscription period, and `reverse_subscription_credits_once()` records one full-refund reversal per paid invoice
- **Billing UI**: `src/app/(dashboard)/billing/page.tsx` — server-renders current subscription, project allowance usage, and initial plan data, then delegates interval selectors, checkout state, and upgrade/manage-subscription actions to client islands

---

