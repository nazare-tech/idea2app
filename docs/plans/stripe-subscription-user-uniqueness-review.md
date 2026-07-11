# Review: Stripe Subscription Webhook Sync Repair

## Scope
- Guarded subscription uniqueness migration.
- Stripe invoice resolver, period validation, webhook integration, tests, and documentation.

## Verification
- Configured Supabase duplicate preflight: 1 row, 1 user, 0 duplicate users.
- Focused red-green tests: expected missing-helper failure, then 8/8 pass.
- Full `npm test`: 581/581 pass after final remediation.
- `npm run typecheck`: pass.
- Changed-file ESLint: pass.
- `git diff --check`: pass.
- Supabase migration history matched before apply; dry run contained only `20260711000000_add_subscriptions_user_unique.sql`; `db push` succeeded; local/remote history now matches.
- Original failed checkout event replayed first: claim became `processed`, error cleared, and one active subscription row had Stripe subscription, plan price, and valid period fields.
- Original failed invoice event replayed second: claim became `processed`, error cleared, exactly one positive `subscription_initial` grant existed, and duplicate subscription users remained zero.
- Trusted `checkout_completed` product event exists with `source = stripe_webhook`; no analytics contract change was needed.
- Local structured logs confirm both failed claims were reclaimed. Existing Next dev server and Stripe listener remained running.
- UI evidence: unavailable. Chrome Profile 1, extension, and native host passed health checks, but browser runtime exposed no Chrome instance after retry and approved new-window recovery. No alternate/bypassed UI evidence was fabricated.

## Fresh-Eyes Self Review
- Pass 1 found Clover invoice subscription compatibility failure. Added shared legacy/current resolver.
- Pass 2 found delayed replay could grant against current subscription period. Added fail-closed exact non-proration subscription-line match before any local subscription mutation.
- Post-remediation checks passed.

## Code Review Findings
- Medium, fixed: initial index probe could misidentify expression/invalid uniqueness. Replaced with exact `pg_constraint` `UNIQUE(user_id)` check.
- High, fixed during re-review: invoice top-level periods are collection windows, not service periods, and validation initially followed snapshot mutation. Guard now matches Clover subscription line identity/price/service period exactly once before any local write.
- Low, fixed: added expanded Clover and malformed/null resolver cases.
- Medium, fixed: legacy Stripe event retries preserve legacy invoice-line shapes. Added legacy/current line normalization with exact shared matching.
- Operational recovery, fixed: linked migration applied and original checkout/invoice events replayed successfully.

## Architecture Improvement Review
- Database-enforced one-row-per-user contract, shared invoice resolver, and replay guard landed.
- Multi-subscription redesign remains deferred; checkout and entitlement flows intentionally support one local subscription per user.
- No new duplication, brittle contract, authorization gap, or non-idempotent grant path found.
- Recovery evidence complete at Stripe webhook, claim, subscription, uniqueness, and credit-grant boundaries.
- Independent final re-review approved migration, Clover/legacy normalization, mutation ordering, replay safety, and security boundaries with no remaining code findings.

## Security Review Findings
- Signature verification unchanged; service-role remains server-only; RLS/grants unchanged.
- No secrets or customer data added.
- Migration fails closed and never auto-deletes billing rows.
- Replay must use original event IDs; existing claims and period grant keys keep retries idempotent.
- No analytics event added: repair restores existing trusted transitions.

## Remediation Checklist
- [x] Harden unique-constraint catalog check.
- [x] Support Clover invoice parent subscription shape.
- [x] Fail closed on invoice/current-period mismatch.
- [x] Add focused edge-case tests.
- [x] Apply linked migration.
- [x] Replay failed checkout, then invoice event.
- [x] Verify processed claims, one row per user, expected plan/period, exactly one credit grant.
