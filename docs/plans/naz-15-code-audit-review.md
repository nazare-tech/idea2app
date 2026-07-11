# Review: NAZ-15 Code Audit

## Scope

- NAZ-38, NAZ-39, NAZ-40, NAZ-41, NAZ-42, NAZ-74, and NAZ-126.
- Billing UI, Stripe checkout/portal/webhook routes, subscription and webhook migrations, analytics contracts/views, QA plans, security checklist, and Linear evidence.

## Verification

- Read every child issue and its comments.
- Inspected current code and migrations with targeted searches.
- Cross-checked `stripe-live-rollout-review.md`, `manual-tasks-todo.md`, `security-release-checklist.md`, and mockup analytics implementation evidence.
- No runtime changes made; no UI verification required for this read-only audit.

## Findings

### Complete

- NAZ-38: Real live $19 flow proved Checkout, initial webhook sync, Portal, cancellation, allowance update, and full refund. Automated suite recorded 593/593 passing.
- NAZ-74: Marked Done per owner instruction and verified by Linear readback.

### Partial

- NAZ-39: Code and live catalog smoke are complete. Public deployment webhook registration, production `STRIPE_WEBHOOK_SECRET`, and durable signed production delivery are missing.
- NAZ-40: Billing plan features filter credit/token language and project allowance is primary copy. `POST /api/analysis/[type]` still returns `Insufficient credits. Please upgrade your plan.`, which manual workspace generation can expose.
- NAZ-42: Repository security and renewal implementation are strong, but acceptance also calls for verification/monitoring. Production RLS audit, subscription-cycle renewal proof, and Sentry alert rules remain missing.

### Not Implemented

- NAZ-41: Checkout redirects include `success` and `canceled`, but Billing renders neither. `current_period_end` is queried but not displayed.

### Intentionally Post-Launch

- NAZ-126: Mockup/prompt engagement instrumentation and comparison views exist. No real cohort analysis, minimum sample rule, tier recommendation, cost/conversion assessment, or experiment rollout/rollback criteria exist yet.

## Architecture Improvement Review

- Existing Stripe event claims, subscription-period grant keys, service-role boundaries, and structured logs reduce duplicate and authorization risk.
- Production configuration remains a separate trust boundary and cannot be inferred from code.
- Reachable user-facing credit errors show incomplete separation between legacy accounting and project-based entitlement policy.

## Security Review Findings

- No new security change introduced.
- NAZ-39 remains launch-blocking because local CLI webhook delivery is not a durable production endpoint.
- NAZ-42 remains open because policy code has not replaced production RLS verification and alerts are absent.

## Remediation Checklist

- [ ] Complete deployed production webhook rollout and signed-delivery proof (NAZ-39).
- [ ] Remove reachable user-facing credit gating/copy from bundled/manual document generation (NAZ-40).
- [ ] Add Billing success/cancel feedback and renewal/end-date display (NAZ-41).
- [ ] Run production RLS audit, controlled renewal-cycle test, and configure webhook failure alerts (NAZ-42).
- [ ] After sufficient production traffic, complete entitlement analysis and decision record (NAZ-126).
