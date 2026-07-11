---
implemented: true
implemented_at: 2026-07-11T14:35:00-07:00
implementation_summary: "Audited every NAZ-15 child issue; NAZ-38 and NAZ-74 are complete, while NAZ-39/40/42 are partial, NAZ-41 is not implemented, and NAZ-126 remains intentionally post-launch."
---

# Plan: NAZ-15 Code Audit

## Goal

Determine which NAZ-15 child issues are actually complete in current code, migrations, tests, documentation, and recorded QA; separate repository implementation from external Stripe production configuration.

## Assumptions

- “Done” requires evidence for each stated acceptance outcome, not merely related code.
- NAZ-74 is Done by explicit owner instruction.
- No issue besides NAZ-74 will be changed during this audit.

## Clarifying Questions

1. Should partial implementation count as complete?
   - Recommendation A: No; report partial separately. Trade-off: stricter, launch-safe result.
   - Recommendation B: Yes, when core code exists. Trade-off: fewer open tickets, hidden operational gaps.
   - Selected: Recommendation A.
2. Should production Stripe dashboard configuration be inferred from code?
   - Recommendation A: No; require configuration or verification evidence. Trade-off: external work remains open without access.
   - Recommendation B: Infer readiness from env contracts and routes. Trade-off: may falsely claim go-live readiness.
   - Selected: Recommendation A.

## Recommended First Step

Map each ticket’s acceptance statement to concrete repository and Linear evidence.

## Runtime and Change-Impact Analysis

- Read-only audit; no runtime state, cache, queue, billing data, or code changes.
- Billing runtime risks inspected: webhook retries/idempotency, subscription state propagation, renewal grants, RLS boundaries, redirect feedback, entitlement analytics.
- External Stripe state cannot be proven from repository code; absence of saved verification remains an explicit unknown.

### Risk-Matched Verification

| Risk | Evidence | Acceptance threshold |
|---|---|---|
| False completion | File/line or saved QA evidence per criterion | Every criterion supported |
| Hidden production dependency | Env/config documentation and Linear evidence | Verified configuration, not inferred |
| Stale ticket status | Compare ticket text with current source/tests | Current behavior wins |

## Architecture Improvement Opportunities

- Central launch-readiness evidence checklist: reduces code/config ambiguity; documentation cost; deferred because audit is read-only.
- Billing contract tests spanning checkout, webhook, subscription snapshot, and allowance: stronger regression safety; test setup cost; evaluate from audit findings.
- Structured webhook alerting: improves incident detection; operations dependency; evaluate under NAZ-42.

## Plan

1. Inspect every child issue and comments.
2. Audit billing UI and user-facing copy.
3. Audit Stripe routes, migrations, RLS, renewal logic, logging, and tests.
4. Audit mockup entitlement analytics and post-launch decision prerequisites.
5. Classify Done, Partial, Not Done, or Not Yet Actionable; record evidence and gaps.

## Validation

- Cross-check findings with targeted searches and relevant tests where useful.
- Require exact source locations or durable external evidence.

## Audit Result

- NAZ-38: Done. Real live Checkout, subscription sync, Customer Portal, cancellation, refund, and UI allowance evidence supersede its earlier incomplete test-account QA note.
- NAZ-39: Partial. Live catalog, portal, and local live smoke exist; deployed webhook endpoint and production endpoint secret do not.
- NAZ-40: Partial. Billing/pricing surfaces use project allowance language, but reachable manual analysis still exposes and enforces an insufficient-credit error.
- NAZ-41: Not implemented. Checkout writes return parameters; Billing reads neither them nor the fetched renewal date.
- NAZ-42: Partial. RLS policy code, renewal handling, idempotency, durable event state, structured logging, and Sentry forwarding exist. Production RLS audit, controlled renewal-cycle proof, and failure alert rules remain.
- NAZ-74: Done by explicit owner direction; Linear readback verified.
- NAZ-126: Intentionally incomplete. Instrumentation exists; cohort threshold, real-data comparison, plan recommendation, and rollout/rollback decision remain post-launch.

## Rollback Or Recovery

- Audit adds documentation only. Remove this plan if unwanted; no runtime rollback needed.

## Critique

### Software Architect

- Billing correctness spans Stripe, database, UI, analytics, and external dashboard state; ticket-level claims must respect those boundaries.

### Product Manager

- NAZ-126 is intentionally post-launch; treating it as a launch blocker would contradict its non-goal.

### Customer Or End User

- Pricing copy, redirect feedback, and renewal visibility directly affect trust even when payment processing works.

### Engineering Implementer

- Legacy credit internals may remain valid; audit must distinguish internal accounting from user-facing copy.

### Risk, Security, Or Operations

- Live webhook secret, endpoint events, portal settings, RLS, idempotency, and failure alerts require separate evidence.
