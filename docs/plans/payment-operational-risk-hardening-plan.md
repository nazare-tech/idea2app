---
implemented: true
implemented_at: 2026-07-11T23:23:44Z
implementation_summary: Hardened webhook finalization, enabled Stripe failure email alerts, provisioned and verified an isolated Free production QA account, restricted the webhook signing secret to Vercel Production, rotated and expired the former secret, proved a fresh signed delivery returned HTTP 200 after redeploy, and repaired secure www-to-apex redirect behavior.
---

# Plan: Payment Operational Risk Hardening

## Goal

Reduce live-payment operational risk by alerting on webhook failures, provisioning a separate Free production QA account for no-charge Checkout redirect tests, limiting the production webhook signing secret to Vercel Production, and repairing secure `www.makercompass.com` redirect behavior.

## Assumptions

- `https://makercompass.com` remains the canonical production origin.
- Existing live Stripe products, prices, endpoint, and customer entitlements remain unchanged.
- QA stops at Stripe-hosted Checkout before card entry; no charge or subscription is created.
- Existing unrelated intake/UI worktree changes remain untouched.
- Production dashboard mutations are authorized by this task, but require an authenticated Vercel/Sentry/Stripe session or API token.

## Clarifying Questions

1. How should webhook failures notify the operator?
   - Recommendation A: Use production-filtered Sentry alerts for handler failures plus Stripe endpoint delivery-failure notifications.
   - Trade-off: Uses existing providers and covers both app failures and delivery failures; dashboard configuration is required.
   - Recommendation B: Add a new paid monitoring provider and heartbeat service.
   - Trade-off: More independent coverage, but adds cost, secrets, and another operational dependency.
   - Selected: Recommendation A with the user's constraint that no new Sentry account be created. Stripe email now covers API integration, webhook delivery, and webhook event-generation failures; existing structured logger/Sentry SDK events remain available if an existing Sentry account is connected later.
2. How should the Free production QA identity be created?
   - Recommendation A: Create a separate admin-confirmed plus-address identity derived from the controlled e2e mailbox, with no subscription row or Internal Dev entitlement; store credentials in a new ignored local env file.
   - Trade-off: Fast, repeatable, isolated from developer entitlements; depends on plus-address delivery behavior for future mail flows.
   - Recommendation B: Reuse the Internal Dev account and temporarily change its plan.
   - Trade-off: No new identity, but risks corrupting the trusted developer account and invalidating repeatable QA.
   - Selected: Recommendation A.
3. How should the webhook secret be scoped?
   - Recommendation A: Preserve the current Production value, remove Preview access, then prove a signed non-charge production delivery still succeeds.
   - Trade-off: Smallest exposure area; previews cannot process production webhook signatures.
   - Recommendation B: Keep one shared Preview/Production entry.
   - Trade-off: Simpler configuration, but unnecessarily exposes production webhook credentials to preview functions.
   - Selected: Recommendation A.
4. How should `www` behave?
   - Recommendation A: Bind `www.makercompass.com` to the Vercel project, issue a matching certificate, and permanently redirect it to apex.
   - Trade-off: One canonical URL with valid TLS; requires Vercel domain configuration and possibly DNS confirmation.
   - Recommendation B: Serve the app independently on both apex and `www`.
   - Trade-off: Avoids a redirect, but creates duplicate canonical surfaces and SEO ambiguity.
   - Selected: Recommendation A.

## Recommended First Step

Fix webhook durable-status finalization before adding alerts: a successful handler must not return HTTP 200 if the `stripe_webhook_events` row could not be marked `processed`.

## Runtime and Change-Impact Analysis

### Repeated Work

- Stripe invokes the webhook for five configured event types and retries non-2xx deliveries.
- Expected frequency: low, event-driven billing traffic. Worst case: Stripe retry bursts or invalid-signature scanning.
- Work per delivery: signature verification, idempotency claim, Stripe/Supabase reads and writes, one final durable status write, structured logging/Sentry capture on warnings or errors.
- Sentry and Stripe alert evaluation is provider-managed. Alerts should notify immediately for processing/claim failures; signature failures should use a small threshold/window to avoid bot-noise pages.

### Ownership, Scope, And Lifetime

- Webhook event status belongs to one durable `stripe_webhook_events` row keyed by Stripe event ID.
- Free QA credentials belong to one dedicated production auth identity and a local ignored credential file, never source control.
- Webhook signing secret belongs only to Vercel Production runtime.
- `www` certificate and redirect belong to the Vercel project/domain boundary, not application middleware.

### Boundary And Cache Semantics

- Stripe-to-app contract remains raw-body signature verification before database mutation.
- Processed status must be persisted before acknowledging success. Duplicate, failed, or stale events remain reclaimable through existing claim logic.
- Preview functions must not possess the production signing secret. Production runtime behavior remains compatible.
- DNS may cache old records; certificate issuance begins only after Vercel validates domain ownership/routing.

### Failure And Recovery

- Failed final durable write returns 500 so Stripe retries; stale claim reclaim remains recovery path.
- QA provisioning is idempotent by target email and must refuse to alter an existing non-QA identity.
- Secret-scope change preserves Production first, then removes Preview. Rollback restores Preview scope only if an explicit preview webhook use case is later approved.
- `www` rollback removes redirect/domain binding only after confirming apex remains healthy.

### Risk-Matched Verification

| Risk | Observable evidence or test | Acceptance threshold |
|---|---|---|
| Handler returns 200 without durable processed state | Focused finalization unit test with injected update error | Update error rejects; success writes `processed`, timestamp, and null error |
| Webhook failure is unseen | Controlled non-charge failure events plus dashboard notification receipt | Sentry app-processing alert and Stripe delivery alert each notify configured operator |
| Preview can verify production signatures | Vercel env scope inventory without value reads | `STRIPE_WEBHOOK_SECRET` exists in Production and not Preview |
| QA account gains wrong entitlement | Auth/admin and Billing checks | Auth user confirmed; profile exists; zero subscription rows; Billing shows Free |
| QA smoke creates a charge | Real production UI redirect check and Stripe/local state check | Hosted `checkout.stripe.com` reached; no card entered; no subscription or charge created |
| `www` remains insecure or duplicates content | DNS, TLS SAN, and HTTP redirect checks | Valid SAN includes `www.makercompass.com`; HTTPS returns one permanent redirect to apex |

## Architecture Improvement Opportunities

- Checked webhook finalizer: prevent false 200 acknowledgements when durable processed-state persistence fails. Files: webhook route plus focused helper/test. Selected.
- Provider-layer alert pairing: combine Sentry handler errors with Stripe delivery failures so both received failures and transport failures are visible. Dashboard config. Selected.
- Webhook silence heartbeat/reconciliation job: detect total delivery silence independent of Stripe notifications. Adds schedule/state and may false-positive during quiet billing periods. Deferred until payment volume justifies a baseline.
- Dedicated QA provisioning helper: create an isolated Free identity without altering Internal Dev and keep secrets ignored. Script/local credential boundary. Selected.
- Audit live Stripe API key Preview scope: useful adjacent hardening, but changing it could affect preview Checkout testing beyond requested webhook-secret scope. Inventory selected; mutation deferred unless clearly safe.

## Plan

1. [x] Add failing focused tests for webhook final-status persistence errors; implement checked lease-owned finalization and rerun tests.
2. [x] Add a guarded production-QA provisioning helper, create the separate Free account, and verify no subscription/Internal Dev entitlement.
3. [x] Enable Stripe email notifications for API integration, webhook delivery, and webhook event-generation failures. Do not create a Sentry account.
4. [x] Change Vercel `STRIPE_WEBHOOK_SECRET` to Production-only, phone-verify and roll the old value, redeploy Production, and verify signed delivery.
5. [x] Add `www.makercompass.com` to Vercel as a 308 redirect to apex; confirm certificate SAN and permanent HTTPS redirect.
6. [x] Finish full verification, two fresh-eyes passes, code/security review, remediation, and documentation/history updates after secret-roll proof.

## Milestones

- Webhook durability: false acknowledgements impossible under tested finalization failure.
- QA readiness: dedicated Free production user can reach hosted Checkout without charge.
- Alert readiness: operator receives both application-processing and endpoint-delivery failures.
- Secret isolation: production signing secret absent from Preview.
- Domain health: `www` has valid TLS and redirects to apex.

## Validation

- Focused Node tests, then lint/typecheck/full test suite/build as proportionate.
- Supabase admin read checks for QA user/profile/subscription state without printing identity or credentials.
- Real Chrome production Billing/Checkout redirect smoke; stop before payment entry.
- Vercel/Sentry/Stripe dashboard state checks without reading secret values.
- `dig`, `openssl s_client`, and `curl -I` for final DNS/TLS/redirect proof.

## Risks And Mitigations

- Production alert tests could create noise: use invalid signatures or metadata-only/non-charge event paths and label the test window.
- Secret scope edits can break webhook delivery: create/preserve Production scope before removing Preview; immediately resend a safe event.
- QA identity could inherit Internal Dev behavior: create a new auth identity and assert no subscription row.
- `www` DNS propagation can delay certificate issuance: keep apex untouched and verify provider-recommended record before waiting.
- Existing dirty worktree can contaminate review: scope diff review to task-owned files and preserve unrelated modifications.

## Rollback Or Recovery

- Revert checked finalizer code if unexpected route regression appears; existing claim reclaim logic remains intact.
- Delete only the newly created QA auth/profile identity if provisioning is wrong; do not alter Internal Dev.
- Restore prior Vercel env scope only if production delivery fails and no safer correction exists.
- Remove the `www` redirect binding only if domain validation breaks apex; never delete apex configuration.
- Disable noisy alert rules while retaining Sentry events and Stripe delivery logs.

## Open Decisions

- No Sentry account will be created. Stripe provider email notifications are the active alert path; app-processing alert rules can be added only if an existing Sentry account is connected later.

## Critique

### Software Architect

- Provider configuration is the right boundary for secret scope, alert routing, certificate issuance, and redirect canonicalization. Application code should only close the false-acknowledgement durability gap.

### Product Manager

- Work reduces severe low-frequency failures. QA redirect smoke catches UI regressions but does not replace periodic full paid/refund testing.

### Customer Or End User

- No intended UI change. Customers benefit from faster entitlement-sync recovery and a valid secure `www` entry point.

### Engineering Implementer

- Biggest integration risk is dashboard access, not code complexity. Tests must isolate task changes from the dirty intake/UI worktree.

### Risk, Security, Or Operations

- Never expose secret values, QA credentials, raw webhook payloads, or customer data in logs/artifacts. Production changes need immediate read-back verification and reversible ordering.
