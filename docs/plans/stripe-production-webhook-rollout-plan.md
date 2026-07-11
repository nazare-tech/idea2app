---
implemented: false
implemented_at:
implementation_summary:
---

# Plan: Stripe Production Webhook Rollout

## Goal

Deploy the verified live-billing code to the existing Vercel production app, configure production live Stripe credentials, register a durable live Stripe webhook at `https://makercompass.com/api/stripe/webhook`, and prove signed production delivery without creating another customer charge.

## Assumptions

- `https://makercompass.com` is the canonical production origin and currently serves from Vercel.
- Existing Vercel project is connected to `nazare-tech/idea2app` main; pushing the seven committed local changes triggers production deployment.
- User authorized production deployment and Stripe/Vercel configuration by asking to complete remaining rollout work.
- Uncommitted streaming changes belong to another task and must not be deployed or committed.

## Clarifying Questions

1. Which production hostname should own Stripe redirects and webhooks?
   - Recommendation A: Use apex `https://makercompass.com`.
   - Trade-off: Already returns HTTP 200 with valid TLS; stable customer-facing origin.
   - Recommendation B: Use Vercel deployment URL.
   - Trade-off: Avoids custom-domain dependence but changes per deployment and is unsuitable for a durable webhook.
   - Selected: Recommendation A. `www` is rejected because current TLS validation fails.
2. How should checkout remain safe during configuration?
   - Recommendation A: Disable paid checkout rows before env/deploy changes; re-enable only after signed delivery passes.
   - Trade-off: Brief maintenance window; prevents live purchases during mixed-version state.
   - Recommendation B: Leave checkout enabled throughout.
   - Trade-off: No maintenance window but risks purchases while webhook secret/code are inconsistent.
   - Selected: Recommendation A.
3. How should production deploy?
   - Recommendation A: Use existing GitHub-to-Vercel main deployment after production env is ready.
   - Trade-off: Preserves established deployment ownership and audit trail; deploy includes all seven committed main changes.
   - Recommendation B: Create an independent CLI-linked Vercel project.
   - Trade-off: Faster if dashboard linkage is unavailable but risks duplicate project/domain ownership.
   - Selected: Recommendation A.

## Recommended First Step

Authenticate Vercel CLI against the existing account, locate the project owning `makercompass.com`, and inventory production env names without reading values.

## Runtime And Change-Impact Analysis

### Repeated Work

- Stripe sends webhook events on Checkout, subscription changes/deletion, paid invoices, and full refunds; retries failed deliveries with duplicate event IDs.
- Each request verifies the raw-body signature, durably claims the event, retrieves bounded Stripe data when required, mutates one subscription/grant boundary, then marks the claim processed.
- Expected volume is low at launch. Worst case is Stripe retry traffic during a dependency outage; durable claims and grant/reversal keys bound duplicate effects.

### Ownership, Scope, And Lifetime

- Vercel owns production runtime and environment variables.
- Stripe owns endpoint registration, endpoint-specific signing secret, delivery attempts, and live billing objects.
- Supabase owns durable webhook claims, subscription snapshots, and grant/reversal ledgers.
- `makercompass.com` is the stable public boundary; preview/immutable deployment URLs are not webhook authorities.

### Boundary And Cache Semantics

- `NEXT_PUBLIC_APP_URL` must be exactly `https://makercompass.com` so Checkout and Portal return to production.
- Production `STRIPE_SECRET_KEY` must be live and possess required read/write permissions.
- Production `STRIPE_WEBHOOK_SECRET` must be the Dashboard endpoint secret, never the local CLI listener secret.
- Vercel env changes require a new deployment. Mixed-version state is protected by disabled checkout rows.

### Failure And Recovery

- Partial configuration cannot accept purchases because checkout is disabled first.
- Duplicate/delayed webhook delivery remains idempotent through `stripe_webhook_events`, period grant keys, and refund reversal metadata.
- Failed deployment leaves previous production deployment active; checkout remains disabled until forward repair.
- Endpoint can be disabled in Stripe; production can roll back to a prior Vercel deployment; checkout rows are the immediate kill switch.

### Risk-Matched Verification

| Risk | Evidence | Acceptance threshold |
|---|---|---|
| Wrong production origin | HTTPS probes and deployed redirect/session URLs | Apex valid TLS; generated return URLs use apex |
| Wrong/missing secrets | Vercel env-name inventory plus deployed signed delivery | No secret output; signed webhook returns 2xx |
| Wrong Stripe mode | Live endpoint/object reads and event metadata | `livemode = true` |
| Missing handler event | Endpoint enabled-event inventory | All five required types registered, including `charge.refunded` |
| Signed delivery | Temporary no-charge live event plus durable claim/logs | Vercel 2xx; one live processed claim; no error |
| Broken deployment | Vercel deployment status, production health, logs | Build success; apex HTTP 200; webhook route reachable |

## Architecture Improvement Opportunities

- Fail-closed checkout maintenance window: selected; bounded blast radius, reversible DB flags.
- Stable apex endpoint: selected; avoids per-deployment webhook churn.
- Endpoint-specific secret rotation: selected; local CLI secret remains separate.
- Ownership enforcement at the trust boundary: selected; customer IDs are service-written and Stripe customer metadata must match the authenticated user.
- Automated webhook failure alerts: selected if existing Sentry/Vercel facilities permit without new paid infrastructure; otherwise documented follow-up.
- Distributed Redis rate limiting: deferred; important before traffic growth but not required to establish signed Stripe delivery.
- `www` TLS repair: deferred; apex works and webhook must not depend on broken alias.

## Plan

1. Authenticate/link Vercel; inventory production project/env names without exposing values.
2. Verify committed main history and production build; preserve unrelated dirty files.
3. Disable paid checkout in Supabase and record prior flags.
4. Set production apex/live Stripe environment values.
5. Push committed main changes; wait for successful Vercel production deployment.
6. Register live Stripe webhook with five required events; install endpoint-specific secret; redeploy.
7. Emit a temporary no-charge live verification event; verify HTTP 2xx, live durable claim, and production logs; delete the probe object and restore the five-event endpoint.
8. Verify production Checkout and Portal redirects without submitting another card payment.
9. Re-enable monthly/annual checkout; verify production Billing UI.
10. Complete review, security findings, backend history, checklist, context, and selective commit.

## Milestones

- Production code/env aligned with live Stripe.
- Durable live webhook registered and signed delivery proven.
- Checkout re-enabled only after end-to-end production verification.

## Validation

- `npm test`, typecheck, lint, production build, and diff check.
- Vercel production deployment/status/log evidence.
- Stripe endpoint/event inventory and signed resend.
- Supabase claim/subscription/grant assertions.
- Real Chrome production Billing/Checkout/Portal redirect smoke; no new payment.

## Risks And Mitigations

- Production outage: build before push; previous Vercel deployment remains rollback target.
- Secret leak: use process/stdin/browser secret fields only; never print, screenshot, or commit values.
- Missed purchases: disable checkout during transition.
- Wrong webhook secret: endpoint-specific signed resend before re-enable.
- Seven-commit deploy scope: verify commit list; dirty files remain excluded.

## Rollback Or Recovery

- Disable paid checkout immediately.
- Disable Stripe webhook endpoint if it floods/fails.
- Roll back Vercel to prior production deployment.
- Restore previous Vercel env version, redeploy, then replay failed Stripe events after forward repair.

## Open Decisions

- Production Checkout redirect smoke needs a normal Free/canceled account; the configured e2e account is Internal Dev and correctly cannot start Stripe Checkout.

## Critique

### Software Architect

- Git-connected deployment is correct durable ownership. Creating a second Vercel project would fragment domains, env, and logs.

### Product Manager

- Brief checkout maintenance is preferable to accepting a payment with uncertain fulfillment.

### Customer Or End User

- Customer-visible success means correct apex redirects, immediate entitlement, working portal, and durable cancellation/refund handling.

### Engineering Implementer

- Sequence matters: disable, configure, deploy, register secret, redeploy, prove, re-enable.

### Risk, Security, Or Operations

- Endpoint secret separation and no-secret-output handling are mandatory. Missing alerting remains visible operational debt, not hidden completion.

## Implementation Checklist

- [x] Confirm production origin and existing deployment.
- [x] Authenticate/link Vercel and inspect env names.
- [x] Run pre-deploy verification.
- [x] Disable checkout during transition.
- [x] Configure production live env.
- [x] Deploy current committed main.
- [x] Create live webhook and install secret.
- [x] Redeploy and verify signed delivery. Temporary `customer.created` probe returned HTTP 200 and produced processed live claim `evt_1Ts8lPRZYXj2bJrBmEMfi4ke`; probe customer was deleted and endpoint restored to five events.
- [ ] Verify production Billing/Checkout/Portal.
- [ ] Re-enable only the four previously enabled monthly/annual checkout rows after final remediation deploy.
- [ ] Review, security review, docs, commit.

## Implementation Progress

- Linked existing Vercel project `idea2app-root-v2`; `makercompass.com` is canonical production alias.
- Set production `NEXT_PUBLIC_APP_URL=https://makercompass.com`; user manually installed live Stripe server key and endpoint-specific signing secret without exposing values.
- Deployed commit `bd848278`, then redeployed with webhook secret. Vercel builds passed and apex alias moved successfully.
- Created live endpoint `we_1Ts8dNRZYXj2bJrBStpepAxz` with exactly five events: Checkout completed, subscription updated/deleted, invoice paid, and charge refunded.
- Stripe CLI resend lacked restricted-key permission. Used a temporary metadata-only live customer event instead; Vercel recorded `POST /api/stripe/webhook` 200 and Supabase recorded a live processed claim. Endpoint and customer were cleaned up afterward.
- Real production Billing exposed an Internal Dev user-flow bug: private non-Stripe subscription rendered generic `Active` and offered a Portal button backed by a stale test customer ID. Remediation now displays the resolved private plan name, hides Stripe management for non-Stripe subscriptions, validates Portal customers fail-closed, shares customer validation with Checkout, and makes Checkout customer creation retry-idempotent.
- Final security review found that browser roles could write `profiles.stripe_customer_id`, making a cross-customer substitution possible. Migration `20260711030000_protect_stripe_customer_ownership.sql` now removes that browser write path, Checkout persists through the service role, and both Checkout and Portal require matching `supabase_user_id` Stripe metadata. An authenticated database probe confirmed the protected write is denied while normal profile updates still work. Checkout was disabled again pending deployment of this remediation.
