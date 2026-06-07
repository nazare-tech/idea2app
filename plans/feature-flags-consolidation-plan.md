# Plan: Feature Flags Consolidation

## Goal
Create a unified feature-access system for Maker Compass that consolidates existing environment gates, developer-only tools, paid-plan checks, and waitlist behavior while making room for future beta testing, plan-specific feature packaging, and deterministic A/B testing. The first implementation should be small enough to ship safely: centralize evaluation and migrate current gates without changing product behavior.

## Assumptions
- The first phase should not introduce a third-party flag vendor. The app already depends on Supabase and has simple gating needs that can be served by typed local code plus database-backed overrides.
- Security-sensitive gates must be enforced server-side. Client-side flags are only for hiding UI or selecting non-authoritative presentation variants.
- Existing behavior should be preserved during migration:
  - Prompt Lab stays local/dev-only.
  - Mockup fixture generation remains local/dev by default and production-only when explicitly enabled.
  - Project deletion remains paid-plan-only.
  - Waitlist mode remains based on the early-access user cap.
- `plans.features` can continue to support plan metadata, but should become structured enough for feature access instead of being parsed only for project allowance text.
- A/B testing should use stable deterministic assignment by user ID, anonymous ID, or project ID, not random assignment on every request.

## Current Flag-Like Gates Found
- `src/lib/dev-only.ts`: generic non-production guard using `NODE_ENV` and `VERCEL_ENV`.
- `src/lib/prompt-lab.ts` and `src/app/dev/prompt-lab/page.tsx`: Prompt Lab availability through `isPromptLabEnabled()`.
- `src/app/api/dev/prompt-lab/_utils.ts`: route-level Prompt Lab access and rate limiting.
- `src/app/api/mockups/fixture/route.ts`: local/dev fixture route with `ENABLE_MOCKUP_FIXTURE_GENERATION=true` production escape hatch.
- `src/lib/waitlist.ts` and `src/app/api/waitlist/route.ts`: waitlist mode based on `WAITLIST_LIMIT`.
- `src/lib/project-allowance.ts`: plan-derived project allowance from explicit plan fields, `plans.features`, and plan-name fallback.
- `src/app/(dashboard)/projects/page.tsx` and `src/app/api/projects/[id]/route.ts`: paid-plan project deletion checks based on `planName.toLowerCase() !== "free"`.
- `src/app/(dashboard)/billing/page.tsx`, Stripe checkout/webhook routes: public checkout visibility uses `plans.is_public` and `plans.checkout_enabled`.
- `src/app/(dashboard)/preferences/page.tsx`: internal developer account banner based on exact `internal dev` plan name.
- `src/app/dev/mockup-renderer-preview/page.tsx`, `src/app/dev/prd-render-preview/page.tsx`, and `src/app/dev/critical-path-preview/page.tsx`: additional `/dev` surfaces with inconsistent production guards; at least one appears unguarded.
- `src/app/api/prompt-chat/route.ts`: hardcoded deprecated Prompt Chat kill switch returning `410 Gone`.
- Credit/token gates in chat, analysis, launch plan, generate app, and mockup routes: entitlement-like usage gates that should remain separate from feature flags but should be documented as billing gates.

## Clarifying Questions
1. Where should beta assignments live first?
   - Recommendation A: Add a Supabase `feature_overrides` table keyed by `user_id` and `feature_key`.
   - Trade-off: Gives durable beta allowlists quickly with minimal schema. Less complete for org/team targeting later.
   - Recommendation B: Add a broader `feature_assignments` table supporting user, plan, project, and anonymous subjects from day one.
   - Trade-off: More future-proof for teams and anonymous landing-page experiments, but more migration and API surface now.

2. How should plan-specific feature access be represented?
   - Recommendation A: Use structured keys inside existing `plans.features`, for example `{ "features": { "project.delete": true, "mockups.generate": true } }`.
   - Trade-off: Minimal database change and easy admin updates, but overloaded with marketing-facing feature lists unless clearly documented.
   - Recommendation B: Add `plans.feature_access Json` or a separate `plan_feature_access` table.
   - Trade-off: Cleaner long-term contract and less parsing ambiguity, but requires migration, type updates, and billing admin changes.

3. Should A/B tests be implemented in this first pass?
   - Recommendation A: Build deterministic experiment evaluation now, but migrate no UI experiment yet.
   - Trade-off: Establishes the correct architecture without product risk. Harder to prove end-to-end until a real experiment is added.
   - Recommendation B: Include one low-risk experiment, such as landing CTA copy or onboarding loading text.
   - Trade-off: Validates analytics and assignment immediately, but adds product decision overhead to a platform refactor.

4. Should feature evaluation be request-scoped or globally imported?
   - Recommendation A: Use a request-scoped `getFeatureAccessContext()` for user/plan/env plus pure `evaluateFeature()` helpers.
   - Trade-off: Works for server routes and RSC, keeps auth/plan data explicit, but requires async call sites.
   - Recommendation B: Use simple synchronous `featureFlags` constants for env-only flags and separate entitlement helpers for user gates.
   - Trade-off: Faster initial migration, but likely recreates fragmentation for beta and plan gates.

5. How much should existing plan-name fallback be preserved?
   - Recommendation A: Preserve fallbacks only as backward compatibility and prefer explicit structured plan features.
   - Trade-off: Safer rollout and fewer billing surprises while moving toward a durable contract.
   - Recommendation B: Remove plan-name fallback once structured plan data exists.
   - Trade-off: Cleaner, but risky if production plan records are incomplete or manually created.

6. Should feature access decisions be logged?
   - Recommendation A: Log only experiment assignments and denied server-side access for protected features.
   - Trade-off: Good operations signal without creating noisy logs for every UI flag render.
   - Recommendation B: Log every evaluation to metrics.
   - Trade-off: Strong analytics, but high volume and unnecessary complexity before a real experimentation pipeline exists.

7. Should hardcoded product constants become flags now?
   - Recommendation A: Move only rollout/ops-sensitive constants into the feature-access layer, such as waitlist forced mode and Prompt Chat disabled state; leave `WAITLIST_LIMIT` as domain config for now.
   - Trade-off: Avoids turning every constant into a flag, but waitlist cap still needs a code change unless later moved to env/database config.
   - Recommendation B: Make `WAITLIST_LIMIT`, Prompt Chat disabled state, and all `/dev` page availability configurable immediately.
   - Trade-off: More flexible for operations, but increases the first migration's scope.

## Recommended First Step
Build a typed feature registry and pure evaluator in `src/lib/feature-access.ts`, with tests that lock current behavior. Start by migrating only the current gates that are already scattered: Prompt Lab, mockup fixtures, project deletion, and waitlist mode. This proves the consolidation without changing database shape yet.

## Plan
1. Inventory and codify feature keys.
   - Define stable keys such as `dev.promptLab`, `mockups.fixtureGeneration`, `projects.delete`, `landing.waitlistMode`, `experiments.landingCta`.
   - Mark each feature with category, default value, exposure type, and whether it requires server enforcement.
   - Validation: unit tests for key registration and unknown-key rejection.

2. Create a pure evaluator.
   - Add `src/lib/feature-access.ts` with `evaluateFeature(key, context)` and helpers for env, user, plan, explicit overrides, and deterministic experiment buckets.
   - Keep specialized billing logic in `project-allowance.ts`; feature access should ask for resolved plan context rather than duplicating subscription queries everywhere.
   - Validation: tests for dev-only flags, production override behavior, plan feature allow/deny, beta override precedence, and deterministic experiment assignment.

3. Add request-context helpers.
   - Add a server helper such as `getFeatureAccessContext(supabase, user, options)` that loads active subscription/plan once and normalizes plan data.
   - Include a no-user context for landing/waitlist and anonymous A/B tests.
   - Validation: focused tests with mocked Supabase-like clients.

4. Migrate current gates without behavior changes.
   - Replace `isPromptLabEnabled()` internals with `evaluateFeature("dev.promptLab", context)`, keeping the public function for compatibility.
   - Put all `/dev` preview pages behind the same dev-only feature helper, including currently inconsistent renderer/critical-path previews.
   - Replace the mockup fixture route env helper with `evaluateFeature("mockups.fixtureGeneration", context)`.
   - Replace direct `planName.toLowerCase() !== "free"` checks with `canAccessFeature("projects.delete", context)` in both UI and DELETE route.
   - Keep `isWaitlistMode(userCount)` as domain logic, but expose it through `landing.waitlistMode` so future overrides can force waitlist on/off.
   - Keep the deprecated Prompt Chat kill switch hard-disabled, but represent it as `promptChat.enabled: false` in the registry so future retired features have an explicit pattern.
   - Document credit/token checks as billing gates, not feature flags, unless a feature needs to be fully hidden or beta-limited before billing is evaluated.
   - Validation: existing tests plus new regression tests that prove behavior stayed the same.

5. Add database-backed beta overrides.
   - Add a Supabase migration for either `feature_overrides` or `feature_assignments`, depending on the decision above.
   - Recommended minimal table: `feature_overrides(id, feature_key, user_id, enabled, variant, reason, starts_at, ends_at, created_at, created_by)`.
   - RLS: users cannot read or write overrides directly; server/service role owns writes. Server route reads are ownership-scoped through authenticated user ID.
   - Validation: migration review, generated `src/types/database.ts` update, evaluator tests for active/expired overrides.

6. Normalize plan feature access.
   - Support structured plan features while preserving existing plan allowance parsing.
   - Recommended shape if using existing `plans.features`:
     ```json
     {
       "marketing": ["3 projects per month", "Design mockups"],
       "access": {
         "projects.delete": true,
         "mockups.generate": true,
         "exports.pdf": true
       },
       "limits": {
         "projects.monthly": 3
       }
     }
     ```
   - Validation: tests for legacy array/string features and structured access keys.

7. Add deterministic A/B experiment support.
   - Implement stable hashing from `experimentKey + subjectId` into buckets.
   - Store experiment definitions in code first, with optional env kill switch.
   - Return a typed variant, for example `{ enabled: true, variant: "control" | "variantA" }`.
   - Validation: tests proving stable assignment, configured weights, and fallback when no subject exists.

8. Update documentation.
   - Update `PROJECT_CONTEXT.md` because this is an architecture change.
   - Add a short docs section explaining how to add a flag, when to use feature access vs plan allowance, and how to enforce server-side gates.
   - Validation: docs mention current migrated gates and future beta/plan/A-B usage.

## Milestones
- Registry and evaluator: typed feature keys exist with pure unit coverage.
- Current behavior migration: Prompt Lab, mockup fixtures, project deletion, and waitlist use the same access layer with no product behavior change.
- Dev surface hardening: every `/dev` page and `/api/dev/*` route uses the same production-safe gate.
- Beta-ready: durable per-user overrides can enable/disable a feature without deploy.
- Plan-ready: paid-plan features are represented by structured access keys, not plan-name string checks.
- Experiment-ready: deterministic A/B assignment can be used by landing or onboarding surfaces.
- Documented: `PROJECT_CONTEXT.md` reflects the new architecture.

## Validation
- Unit tests:
  - `src/lib/feature-access.test.ts`
  - updated `src/lib/prompt-lab.test.ts`
  - updated `src/lib/project-allowance.test.ts` if structured plan features touch allowance parsing
  - updated/new tests for mockup fixture gating and project deletion access helpers
- Typecheck:
  - `npm run typecheck` if available, otherwise `npx tsc --noEmit`
- Lint:
  - `npm run lint`
- Route behavior:
  - Prompt Lab returns 404 in production-like env.
  - All `/dev` preview pages return 404 in production-like env.
  - Mockup fixture route returns 403 unless local/dev or explicit production flag is enabled.
  - Free users cannot delete projects through UI or API.
  - Paid users can delete projects through UI and API.
  - Deprecated Prompt Chat still returns `410 Gone`.
- Visual/UI check:
  - Projects page still shows delete affordance only when access allows it.
  - Landing page still switches signup/waitlist CTAs as before.

## Risks And Mitigations
- Risk: Flags become a second billing system.
  - Mitigation: Keep project allowance, credits, Stripe checkout, and subscription lifecycle in existing billing modules. Feature access consumes normalized plan facts; it does not own billing.
- Risk: Client-side flags are treated as authorization.
  - Mitigation: Registry marks server-enforced features, and API routes must call server access checks.
- Risk: Plan feature parsing breaks existing public billing UI.
  - Mitigation: Preserve marketing feature arrays or add a separate `marketing` key; tests cover legacy shape.
- Risk: A/B tests produce unstable user experiences.
  - Mitigation: Deterministic subject hashing and explicit experiment definitions with stable weights.
- Risk: Environment flags and database overrides conflict.
  - Mitigation: Define precedence: hard production safety guard, explicit env kill switch, beta override, plan access, experiment/default.

## Rollback Or Recovery
- Keep existing wrapper functions (`isPromptLabEnabled`, `isWaitlistMode`, project allowance helpers) so call sites can be reverted one by one.
- Make database-backed overrides additive. If the override table is unavailable, evaluator should fail closed for protected features and use current defaults for non-sensitive UI flags.
- Preserve current env variables, especially `ENABLE_MOCKUP_FIXTURE_GENERATION`, during migration.
- Keep plan-name fallbacks until production plan records are verified.

## Open Decisions
- Choose beta assignment table shape: minimal `feature_overrides` vs broader `feature_assignments`.
- Choose plan feature storage: structured `plans.features` vs new `plans.feature_access`/join table.
- Choose whether the first A/B test is architecture-only or includes a real landing/onboarding experiment.
- Choose whether admins need a UI for overrides now, or whether database-managed overrides are acceptable initially.

## Critique

### Software Architect
- The right boundary is not "feature flags everywhere." The useful boundary is "feature access decisions in one evaluator, domain-specific accounting elsewhere." Project allowance should remain specialized because it counts resources over time; the feature-access layer should only decide whether capabilities are available.

### Product Manager
- This unlocks beta access and paid packaging, but only if feature keys map to product concepts users understand. Keys like `projects.delete` and `mockups.generate` are better than implementation names like `route.mockups.fixture`.

### Customer Or End User
- Feature flags should not create confusing UI where buttons appear but API calls fail. The same server-derived access decision needs to drive both UI affordances and API enforcement for paid features.

### Engineering Implementer
- The first pass should migrate wrappers rather than rewrite every call site. Keeping `isPromptLabEnabled()` and `isWaitlistMode()` as compatibility functions reduces blast radius while still moving the logic under the new evaluator.

### Risk, Security, Or Operations
- Beta and paid-plan gates are authorization-adjacent. They must default to deny for protected features when context is missing, and the implementation should avoid exposing beta assignment tables directly to browser clients.
