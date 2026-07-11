# Review: Payment Operational Risk Hardening

## Scope

- Stripe webhook durable-status finalization.
- Dedicated Free production billing QA provisioning and no-charge Checkout redirect smoke.
- Stripe webhook/API email notification preferences.
- Vercel webhook-secret environment scope and signing-secret rotation.
- `www.makercompass.com` TLS certificate and canonical apex redirect.

## Verification

- Focused webhook claim/finalizer tests: 14 passed after remediation, including missing lease timestamps, database errors, zero-row durable writes, and stale-owner compare-and-set filters.
- Full test suite: 608 passed, 0 failed.
- TypeScript: `npm run typecheck` passed.
- Task-file ESLint passed.
- Full ESLint is blocked by an unrelated existing `react-hooks/set-state-in-effect` error in `src/components/layout/workspace-document-frame.tsx:52` plus an unrelated unused-variable warning in `output/playwright/prod-full-flow.mjs:28`.
- Free production QA user: confirmed auth identity, profile present, zero subscription rows, ignored credential file mode `0600`.
- Production Billing UI: Current Plan = Free, allowance = 0 of 1 lifetime projects, Starter/Pro upgrade actions enabled.
- No-charge Checkout smoke: Starter action reached `checkout.stripe.com`; no card entered; follow-up admin check still showed zero subscription rows.
- Stripe communication preferences: API integration errors, webhook delivery failures, and webhook event-generation failures all have Email enabled.
- Vercel environment read-back: `STRIPE_WEBHOOK_SECRET` changed from Production + Preview to Production only.
- `www` live proof: certificate CN/SAN is `www.makercompass.com`; HTTPS returns HTTP 308 with `Location: https://makercompass.com/`; apex remains untouched.
- Production signing-secret rotation: completed. The new value is Vercel Production-only, the former secret was expired, the post-update production redeployment reached Ready, and a fresh signed live delivery returned HTTP 200 at Jul 11, 2026 4:22:51 PM PDT. The temporary `customer.created` probe subscription was removed afterward, restoring the exact five-event production set.
- Production build: passed outside the sandbox after the sandboxed run failed because Turbopack could not bind its internal worker port.

## Fresh-Eyes Self Review

- Pass 1: found successful Supabase updates could match zero durable event rows without returning an error. Added returned-row verification for both processed and failed finalization plus two tests.
- Pass 2: found stale workers could finalize by event ID after a newer worker reclaimed the event. Carried the claim `received_at` lease token through `WebhookClaim` and compare-and-set processed/failed writes against that token plus `status = 'processing'`. Also pinned the QA provisioner to the exact production Supabase host.

## Code Review Findings

- Fixed, high: webhook route previously returned HTTP 200 even when marking the durable event `processed` failed.
- Fixed, medium: final status helpers initially checked only Supabase errors, not zero-row updates.
- Fixed, high: stale webhook workers could overwrite a reclaimed worker's durable status because finalization filtered only by event ID.
- Fixed, medium: QA production guard accepted any remote `*.supabase.co` target instead of the exact production project.
- Accepted, low: QA provisioner derives only from a controlled Gmail e2e mailbox unless `PRODUCTION_QA_EMAIL` is explicitly supplied; this is deliberately fail-closed for other domains.
- Accepted, low: no forced production alert test was generated because intentionally breaking a live endpoint or signature during public operation adds avoidable risk. Provider preference read-back is the verification used.

## Architecture Improvement Review

- Landed: checked webhook finalization; one durable event row must be returned before success acknowledgement.
- Landed: paired Stripe transport/API notification coverage without adding a new monitoring vendor or Sentry account.
- Landed: isolated, repeatable Free QA identity and guarded provisioner; Internal Dev remains unchanged.
- Landed: provider-owned Production-only secret scope and provider-owned `www` certificate/redirect.
- Deferred: volume-based webhook silence heartbeat/reconciliation job. Quiet billing periods make a naive heartbeat noisy; Stripe generation/delivery alerts cover current traffic level.
- New risk found: Vercel `STRIPE_SECRET_KEY` is still available to all environments. This was inventoried but not changed because replacing preview with a test key is a separate billing-environment decision; previews should not run live Checkout.

## Security Review Findings

- No hardcoded key, signing secret, QA password, customer email, or raw webhook payload was added to source, logs, screenshots, or review artifacts. The nonsecret expected Supabase project hostname is pinned in the provisioner to prevent wrong-project admin mutation.
- QA credentials live only in `.env.production-qa.local`, ignored by Git and mode `0600`.
- QA user is confirmed but has no subscription/Internal Dev entitlement; real UI stopped before card entry.
- Production signing secret is absent from future Preview deployments, and the former signing secret has been expired so old Preview deployments cannot verify new live deliveries.
- Webhook signature verification still precedes all database mutation; idempotent claim/reclaim remains unchanged.
- Failed final-status persistence logs a separate sanitized Sentry/Vercel event while preserving the original 500 retry response.
- `www` repair uses Vercel certificate/domain controls; no TLS key material entered the repo or browser automation output.

## Remediation Checklist

- [x] Reject processed-state write errors.
- [x] Reject zero-row processed-state writes.
- [x] Compare-and-set finalization with the owned claim lease token.
- [x] Report failed-state persistence errors without masking the original webhook failure.
- [x] Pin QA provisioning to the exact production Supabase host.
- [x] Create and verify isolated Free production QA account.
- [x] Prove hosted Checkout redirect with no charge/subscription.
- [x] Enable Stripe webhook/API failure email notifications.
- [x] Scope `STRIPE_WEBHOOK_SECRET` to Production only.
- [x] Complete phone-verified signing-secret roll, update Vercel Production, redeploy, and resend a safe event.
- [x] Bind `www`, issue certificate, and verify permanent apex redirect.
- [x] Record final build result.
- [x] Close plan metadata after signing-secret rotation proof.
