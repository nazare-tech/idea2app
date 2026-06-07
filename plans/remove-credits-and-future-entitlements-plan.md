# Plan: Remove Credits And Build Plan Entitlements

## Goal
Remove the credits/tokens system from Maker Compass before launch, including user-facing UI, backend credit enforcement, Stripe credit grants, credit tables/RPCs, queue credit fields, generated Supabase types, tests, and stale documentation. Replace it with a central plan entitlement resolver that can support current project allowance rules and future plan gates such as hiding Market Research, limiting visible mockup options, or blocking optional artifact generation for Free users.

## Updated Direction
- The product has not meaningfully launched yet, so the plan now favors a clean architectural removal instead of keeping the old credit backend dormant.
- Destructive cleanup is acceptable, but it should still be done through an explicit migration and verification path rather than ad hoc deletion.
- The replacement architecture should be designed before deleting credit gates so generation routes have one clear access-control model.
- Historical credit balances, credit history, and credit transaction data are not assumed to be product-critical unless we confirm there are alpha users, test accounts, or analytics that must be preserved.

## Assumptions
- Maker Compass is moving from credit/token pricing to project and plan based pricing.
- Free users should remain limited mainly by project allowance today; future tiers may restrict artifact visibility or generation capability.
- UI should not mention credits, tokens, token balances, token usage, credit refunds, or insufficient-credit upgrade prompts.
- Backend routes should not call `consume_credits`, `add_credits`, `refund_credits`, or `get_credit_balance` after this cleanup.
- Stripe subscriptions should grant plan access, not monthly credits.
- Future gating must be enforced server-side at artifact read/generation boundaries, not only by hiding React components.
- Existing active-document skip/idempotency behavior must stay intact before any AI calls.
- Internal cost observability is still needed, but it should use explicit operational metrics rather than user credit balances.

## Current Credit Touchpoints
- Public pricing: `src/app/page.tsx` shows token/month amounts, token value, and full-report token estimates.
- Billing: `src/app/(dashboard)/billing/page.tsx` fetches `credits.balance`, renders "Token Balance", and displays token usage costs.
- Account chrome: `src/app/(dashboard)/layout.tsx`, `src/components/layout/dashboard-shell.tsx`, `src/components/layout/header-profile-menu.tsx`, `src/components/layout/project-header.tsx`, and `src/components/workspace/project-workspace.tsx` pass and show credit balances.
- Workspace/API payloads: `src/app/api/projects/[id]/workspace/route.ts` returns `credits`.
- Active backend gates: `src/app/api/chat/route.ts`, `src/app/api/analysis/[type]/route.ts`, `src/app/api/launch/plan/route.ts`, `src/app/api/generate-app/route.ts`, and `src/app/api/generate-all/execute/route.ts` call credit consumption/refund paths or produce insufficient-credit failures.
- Queue recovery: `src/app/api/generate-all/cancel/route.ts`, `src/app/api/generate-all/status/route.ts`, and `src/lib/generation-queue-billing.ts` refund charged queue items.
- Billing/webhooks: `src/app/api/stripe/webhook/route.ts` grants `plans.credits_monthly` through `add_credits`.
- Internal policy/tests: `src/lib/token-economics.ts`, `src/lib/generate-all-helpers.ts`, `src/lib/generation-queue-service.ts`, `src/stores/generate-all-store.ts`, and related tests use credit-cost fields.
- Database/types: `src/types/database.ts` includes `credits`, `credits_history`, `plans.credits_monthly`, credit RPCs, and queue credit fields.
- Migrations: `supabase/migrations/20260425004000_security_hardening_followups.sql`, `migrations/005_create_refund_credits.sql`, metrics migrations, and queue migrations reference credit behavior.
- Docs: `PROJECT_CONTEXT.md`, `TOKENOMICS.md`, and older setup/context docs describe credit/token behavior.

## Clarifying Questions
1. Is there any real user, alpha, or investor-demo data in Supabase that must survive a destructive credit cleanup?
   - Recommendation A: Treat the database as resettable pre-launch.
   - Trade-off: Simplest cleanup and fewer compatibility paths, but any existing credit history/test balances disappear.
   - Recommendation B: Preserve non-credit production-like data and migrate only credit artifacts away.
   - Trade-off: Safer for demos/alpha data, but the migration needs more care and rollback testing.
2. Should we use forward migrations only, or is it acceptable to squash/rebaseline Supabase migrations before launch?
   - Recommendation A: Add forward migrations that drop credit objects and update types.
   - Trade-off: More representative of production deploys, but old migration history still contains credit setup.
   - Recommendation B: Rebaseline migrations because the product has not launched.
   - Trade-off: Cleaner long-term schema history, but riskier if any remote environments already depend on existing migration order.
3. Should the entitlement resolver be implemented in this same cleanup or planned as a separate follow-up?
   - Recommendation A: Implement a minimal resolver in the same cleanup.
   - Trade-off: Prevents scattered access checks immediately, but increases this work's scope.
   - Recommendation B: Remove credits first and add the resolver later.
   - Trade-off: Faster credit removal, but generation routes may temporarily drift into ad hoc plan logic.
4. Should current Free users receive full generated artifacts for their one project?
   - Recommendation A: Yes, Free gets one complete project for now.
   - Trade-off: Best onboarding value and simplest entitlement rules, but higher AI cost per Free signup.
   - Recommendation B: No, Free gets one project with selected previews or gated artifacts.
   - Trade-off: Stronger upgrade prompt and lower cost, but more product/design complexity before launch.
5. What should the first future gate restrict?
   - Recommendation A: Gate optional mockup value, such as showing one mockup option on Free and three on paid.
   - Trade-off: Clear upgrade moment with lower risk to core planning usefulness.
   - Recommendation B: Gate Market Research depth or full visibility.
   - Trade-off: Higher perceived value, but riskier because Market Research powers Overview and downstream planning.
6. Should gated artifacts be generated and redacted, or not generated until the user upgrades?
   - Recommendation A: Do not generate gated artifacts until access is granted.
   - Trade-off: Controls AI cost and avoids storing hidden content, but gives users less preview.
   - Recommendation B: Generate and store full content, then redact the workspace/API response.
   - Trade-off: Better preview/upsell, but more expensive and much easier to leak through APIs.
7. Should entitlements live in database fields, code config, or both?
   - Recommendation A: Start with typed code config keyed by plan name/id plus existing subscription rows.
   - Trade-off: Fast and testable pre-launch, but changes require deploys.
   - Recommendation B: Add `plans.entitlements` JSONB now.
   - Trade-off: More flexible for admin edits and Stripe plan mapping, but needs stronger schema validation.
8. Should `plans.features` continue to drive any enforcement?
   - Recommendation A: No, keep it display-only.
   - Trade-off: Avoids fragile text parsing and makes gates auditable.
   - Recommendation B: Continue parsing feature text temporarily.
   - Trade-off: Less schema work, but brittle and dangerous for artifact access.
9. How should downgrades and cancellations affect already-created projects?
   - Recommendation A: Entitlements are evaluated live from current subscription.
   - Trade-off: Simple and monetizable, but paid content can disappear after downgrade.
   - Recommendation B: Snapshot project entitlements at creation/generation time.
   - Trade-off: More predictable for users, but more schema and lifecycle complexity.
10. Should project deletion remain paid-only after credits are removed?
    - Recommendation A: Keep paid-only deletion as a separate entitlement.
    - Trade-off: Preserves current monetization gate, but may feel odd if Free users cannot delete their only project.
    - Recommendation B: Make deletion available to all users.
    - Trade-off: Simpler and more user-friendly, but removes an existing upgrade lever.
11. Should app generation be included, plan-gated, or removed from the first launch surface?
    - Recommendation A: Plan-gate app generation behind paid tiers.
    - Trade-off: Protects expensive generation while keeping the roadmap intact.
    - Recommendation B: Remove or hide app generation until the core planning flow is stable.
    - Trade-off: Lower operational risk, but narrows the launch promise.
12. Should we keep internal AI cost metrics after deleting user credits?
    - Recommendation A: Yes, replace credit metrics with operational cost/usage metrics.
    - Trade-off: Keeps spend observability and abuse detection, but requires renaming/migration work.
    - Recommendation B: Remove cost metrics for now.
    - Trade-off: Simpler cleanup, but weaker operational visibility after launch.
13. Should Stripe webhook tests be added before touching credit grants?
    - Recommendation A: Yes, add focused webhook tests or a local webhook verification script first.
    - Trade-off: More upfront work, but billing regressions are expensive.
    - Recommendation B: Rely on typecheck and manual review for now.
    - Trade-off: Faster, but subscription access bugs can slip through.
14. Should Prompt Lab remain explicitly "no credits" in copy?
    - Recommendation A: Remove the phrase entirely and say it does not create production artifacts.
    - Trade-off: Keeps developer copy aligned with the new model.
    - Recommendation B: Leave dev-only copy alone.
    - Trade-off: Less work, but stale terminology stays visible to developers.
15. Should we archive old credit docs or delete them?
    - Recommendation A: Delete/replace stale credit docs before launch.
    - Trade-off: Cleaner source of truth.
    - Recommendation B: Move them to an archive folder.
    - Trade-off: Historical context remains, but search results may keep surfacing obsolete guidance.

## Recommended First Step
Before implementation, decide the migration posture: forward migration versus pre-launch rebaseline, data preservation versus resettable database, and whether the minimal entitlement resolver ships in the same cleanup. The technical first step after approval should be a failing test suite around the new entitlement resolver contract and credit-free generation behavior, then the code/schema cleanup can proceed in phases.

## Recommended Architecture
- Replace credit checks with `src/lib/plan-entitlements.ts` or a similarly named module.
- Keep `src/lib/project-allowance.ts` either as a dependency of the resolver or fold it into a broader entitlement service.
- The resolver should expose pure helpers for unit tests and server helpers for Supabase-backed subscription lookups.
- The resolver should return typed decisions, not booleans:
  - `allowed`
  - `gated`
  - `preview`
  - `rate_limited`
  - `missing_subscription`
  - `unknown_plan`
- The client should receive safe access metadata, never hidden content:
  - `access.state`
  - `access.reason`
  - `access.upgradePlan`
  - `access.visibleOptions`
  - `access.previewKind`
- Artifact read endpoints and generation endpoints should both call the resolver.

## Plan
1. Lock decisions and write tests for the replacement policy.
   - Decide database reset/rebaseline versus forward migration.
   - Decide current Free-plan artifact access.
   - Add tests for project allowance, paid plan lookup, internal/unlimited plan, unknown plan fallback, and representative future artifact gates.
   - Validation: focused policy tests fail before the resolver exists.
2. Add the central entitlement resolver.
   - Create a typed resolver for project creation, project deletion, artifact generation, artifact viewing, mockup option visibility, and app generation.
   - Keep enforcement server-safe and avoid client-only logic.
   - Validation: focused tests pass for Free, paid, internal, canceled, trialing, and missing subscription states.
3. Remove user-facing credit/token UI.
   - Edit public landing pricing, billing, dashboard shell, account menu, project header/workspace, workspace payload consumers, and dev copy.
   - Billing should show current plan, project allowance, included outputs, and subscription management.
   - Remove active `CreditBalance` imports from user-facing components.
   - Validation: search for user-facing credit/token phrases and browser-check `/`, `/billing`, `/projects`, and one project workspace.
4. Replace credit enforcement in generation routes.
   - Remove `consume_credits` and `refundCreditsServerSide` flows from chat, analysis, launch plan, app generation, Generate All, cancel, and status routes.
   - Use entitlement decisions or no gate for included flows.
   - Preserve active-document skip checks before external AI calls.
   - Validation: route tests or local API requests confirm no included flow returns insufficient-credit errors.
5. Simplify generation queue state.
   - Remove new writes to `credit_cost` and `credit_status`.
   - Update queue helpers, frontend stores, display status helpers, and tests to use entitlement/generation states instead of billing states.
   - Decide whether old queue credit columns are dropped in a forward migration or removed through a migration rebaseline.
   - Validation: Generate All/onboarding tests cover queued, waiting, skipped, failed, cancelled, and retried items.
6. Remove Stripe credit grants.
   - Update checkout/webhook logic so Stripe creates/updates subscriptions only.
   - Remove `plans.credits_monthly` from selected types and plan UI assumptions.
   - Add or run webhook verification for checkout completion, subscription update, subscription deletion, and invoice renewal.
   - Validation: subscription status still drives plan access with no credit RPC calls.
7. Clean database schema and generated types.
   - Drop `credits`, `credits_history`, credit RPCs, `plans.credits_monthly`, queue credit columns, and metrics credit fields if they are not replaced by cost metrics.
   - Remove or rebaseline old migrations depending on the chosen migration posture.
   - Regenerate `src/types/database.ts`.
   - Validation: typecheck catches stale references; search confirms no credit RPC/table references remain in runtime code.
8. Replace internal cost accounting.
   - Rename user-credit concepts to operational usage/cost metrics where useful.
   - Keep enough tracking to answer "which routes are expensive?" and "which users/projects are causing high AI spend?"
   - Validation: metrics names no longer imply user balances or purchasable credits.
9. Add future artifact gate integration points without necessarily enabling gates.
   - Add typed entitlement keys for Market Research, mockup options, Launch Plan, app generation, and project deletion.
   - Workspace payloads should be shaped so future gated states can be returned without leaking content.
   - Validation: tests simulate a gated artifact and verify the direct API response contains no hidden full content.
10. Update documentation and review artifacts.
    - Update `PROJECT_CONTEXT.md`.
    - Delete, rewrite, or archive `TOKENOMICS.md`.
    - Record review/security notes after implementation.
    - Validation: docs no longer describe credits as product behavior.

## Future Entitlement System Requirements
- A central resolver that takes `userId`, `projectId`, subscription status, plan record, and artifact/action type, then returns a typed allow/deny/preview result.
- Structured plan capabilities stored outside marketing copy. `plans.features` must be display-only.
- Server-side enforcement in workspace payloads, artifact generation routes, direct document routes, private mockup image proxy, mockup recover/finalize routes, PDF export, and any future share/export endpoint.
- Redaction rules for previews if the app stores content the user cannot fully view.
- Generation prevention rules for artifacts that should not be produced until upgrade.
- Subscription lifecycle rules for trialing, active, past_due, canceled, incomplete, and internal-dev states.
- Downgrade/cancellation rules for already-created projects and generated artifacts.
- Plan fallback behavior for unknown/missing plan records.
- Upgrade CTA metadata that is safe to expose to the client and does not leak hidden content.
- Audit/logging for entitlement denials, upgrade CTA impressions, expensive-generation attempts, and direct API bypass attempts.
- Tests for stale client payloads, direct URL/API bypasses, private image access, PDF/export access, and mockup option redaction.

## Milestones
- Decision milestone: data/migration posture, Free artifact access, entitlement storage, and first future gate are chosen.
- Resolver milestone: typed entitlement resolver exists with focused tests.
- UI milestone: no active page shows credits, tokens, token balance, token usage, or credit costs.
- Behavior milestone: included generation no longer returns insufficient-credit errors.
- Schema milestone: credit tables/RPCs/fields are dropped or removed through a rebaseline, and generated types are clean.
- Stripe milestone: subscriptions grant plan access without monthly credit grants.
- Security milestone: future gated artifact checks are enforced server-side in read and generation paths.
- Documentation milestone: `PROJECT_CONTEXT.md` reflects plan entitlements and credit removal.

## Validation
- Search validation:
  - `rg -n "Credits:|credits remaining|Token Balance|Token Usage|credits/month|tokens/month|Insufficient credits|Generate \\([0-9]+ credits\\)" src`
  - `rg -n "consume_credits|add_credits|refund_credits|get_credit_balance|credits_history|plans\\.credits_monthly|credit_cost|credit_status" src supabase migrations`
  - Remaining hits must be intentionally archived docs, old migration history if not rebaselined, or external prompt text unrelated to billing.
- Automated validation:
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
  - Focused tests for entitlement policy, project allowance, queue helpers, generation display status, Stripe webhook handling, and workspace payload access metadata.
- Database validation:
  - Run migrations locally from a clean database.
  - If preserving data, rehearse migration against a sanitized copy.
  - Regenerate Supabase types and verify no runtime code references dropped objects.
- Browser validation with the Codex in-app browser:
  - `/` pricing has no token/credit math.
  - `/billing` shows plans and subscription status without token balance/usage.
  - `/projects` and a workspace profile menu have no credit row.
  - Workspace generation failures show plan/rate-limit language, not insufficient credits.
  - A simulated gated artifact state cannot be bypassed by direct workspace/API reads.

## Risks And Mitigations
- Risk: The app loses its only cost-control mechanism when credits are removed.
  - Mitigation: replace credits with plan entitlements, project allowance, rate limits, and operational cost metrics before launch.
- Risk: Database rebaseline breaks remote Supabase environments or teammates' local setup.
  - Mitigation: choose rebaseline only after confirming deployment state; otherwise use forward migrations.
- Risk: Dropping credit columns breaks generated TypeScript types and many route imports at once.
  - Mitigation: remove code references first, then regenerate types, then run typecheck.
- Risk: Stripe webhooks silently stop granting useful access if credit grants are removed without replacing plan resolution.
  - Mitigation: make subscription rows the sole source of access and test webhook events.
- Risk: Queue cancellation/status paths assume a refund exists.
  - Mitigation: remove refund state from queue helpers and test failed/cancelled/stale generation transitions.
- Risk: Future artifact gating leaks hidden content through workspace payloads, direct document APIs, image proxy, PDF export, or mockup recovery.
  - Mitigation: enforce entitlements at every server read boundary and test direct access paths.
- Risk: Gating Market Research can corrupt downstream artifacts that depend on Market Research content.
  - Mitigation: distinguish generation prerequisites from user visibility; if Market Research is gated, downstream server generation may still need internal access.
- Risk: Redaction creates confusing or low-trust UX.
  - Mitigation: use clear "included with paid plan" states and avoid generating long waits before showing a gate.
- Risk: Removing token-economics erases useful model cost estimation.
  - Mitigation: keep a renamed internal cost estimator if operational cost visibility is needed.
- Risk: Docs drift because `PROJECT_CONTEXT.md` currently lists credit-related architecture.
  - Mitigation: update docs in the same implementation and search for stale credit language.
- Risk: Plan names are currently used as fallbacks and can be brittle.
  - Mitigation: prefer stable plan ids or structured entitlement config over display names for enforcement.
- Risk: Internal developer plans get accidentally exposed in checkout or entitlement UI.
  - Mitigation: preserve `is_public` / `checkout_enabled` separation and test internal plan behavior.
- Risk: Downgrades/cancellations make previously visible artifacts disappear unexpectedly.
  - Mitigation: decide live access versus entitlement snapshots before enabling artifact gates.
- Risk: Existing e2e credentials or local fixtures assume large credit balances.
  - Mitigation: update fixtures and e2e setup to use plan/entitlement state instead.
- Risk: Removing legacy credit migrations makes historical debugging harder.
  - Mitigation: archive a short ADR explaining the removal and the new entitlement model.

## Rollback Or Recovery
- If code changes fail before database cleanup, revert route/UI changes and keep the current schema.
- If a forward migration drops credit objects, rollback requires restoring from database backup or applying a reverse migration that recreates dropped objects; this is why local migration rehearsal matters.
- If a migration rebaseline is chosen, rollback is a git-level operation plus database reset, not a production-style down migration.
- If Stripe access breaks, restore the prior webhook route while keeping the entitlement resolver disabled.
- If generation cost spikes after credits are removed, temporarily gate expensive actions through the resolver or disable specific manual generation buttons.

## Open Decisions
- Forward migration or migration rebaseline.
- Resettable database or preservation of selected alpha/demo data.
- Minimal entitlement resolver in the same cleanup or separate follow-up.
- Free plan receives one complete project or one project with gated artifacts.
- First future gate: mockup options, Market Research, Launch Plan, app generation, or project deletion.
- Gated artifacts generated later or generated and redacted.
- Entitlements stored in code config, `plans.entitlements` JSONB, or both.
- Live subscription access or per-project entitlement snapshots.
- App generation included, paid-only, or hidden for launch.
- Internal usage/cost metrics retained and renamed, or removed for the first launch.
- Stripe webhook test depth before changing billing code.
- Old credit docs deleted, rewritten, or archived.

## Critique

### Software Architect
- Pre-launch status makes full credit deletion reasonable, but only if the replacement access model exists first. The biggest architectural risk is removing one central-ish balance system and replacing it with scattered `if free then block` checks. The entitlement resolver should be the new boundary.

### Product Manager
- Project and artifact entitlements map better to customer value than credits. The product decision still matters: a generous complete Free project improves activation, while artifact gates may improve conversion but can weaken trust if users discover them too late.

### Customer Or End User
- Users should never need to understand tokens. They should understand what their plan includes. If content is gated, the workspace must make that feel intentional and plan-based, not like a generation failure or missing document.

### Engineering Implementer
- This is a cross-cutting refactor touching UI, API routes, queues, Stripe, database types, tests, and docs. The safest implementation order is tests/resolver first, then route cleanup, then schema cleanup. Dropping database objects before stale references are gone will create noisy failures.

### Risk, Security, Or Operations
- Entitlement gating is an authorization problem. If future Market Research or mockup options are hidden, every server path that can return the content or associated private images must enforce the same policy. Operationally, credits also doubled as a cost brake, so rate limits and cost metrics need to replace that role before launch.
