# Plan: Hide User-Facing Credits And Preserve Future Credit Entitlements

## Goal
Remove credits/tokens from the customer-facing Maker Compass experience for the current project-based pricing launch, while preserving the backend credit infrastructure for future usage-based AI capabilities such as chatting with generated outputs, editing documents with AI, add-on usage, promotional grants, and internal cost controls.

The short-term product model should be simple: users understand projects, included outputs, plan limits, and upgrade tiers. The backend should not be destructively stripped of credits because credits are still a plausible future entitlement model for interactive AI work.

## Updated Direction
- Do not drop backend credit tables, credit RPCs, queue credit fields, Stripe credit-grant compatibility, or generated database types in this phase.
- Do remove customer-facing credit/token UI, token math, balance displays, credit badges, insufficient-credit upgrade prompts, and pricing copy that sells tokens instead of projects.
- Do audit every backend path that still subtracts credits. If users cannot see credits, normal included product flows must not fail with "Insufficient credits."
- Keep credits as a hidden/internal ledger and future entitlement mechanism, not as the primary current pricing surface.
- Build a central entitlement/policy layer so the app can clearly distinguish project allowance, plan gates, rate limits, internal usage accounting, and future paid credit usage.

## Current Understanding
Maker Compass currently has two overlapping access models:

- Project allowance model: project creation is gated through `src/lib/project-allowance.ts`. Free users get a limited project allowance; paid plans get plan-based monthly/project-period allowances.
- Credit balance model: several older/manual AI routes still call `consume_credits`, and Stripe webhooks still grant monthly credits through `add_credits`.

That overlap is the main risk. A user can buy or see a plan framed as "projects included" while the backend still has paths that can reject work because the hidden credit balance is empty.

## Current Backend Credit Behavior
Yes, the backend is currently capable of subtracting credits as users use the product.

Active or relevant credit paths:
- `src/app/api/chat/route.ts`: charges 1 credit per chat message before saving/generating the response, then refunds on save/stream failures.
- `src/app/api/analysis/[type]/route.ts`: charges `getTokenCost(type, model)` for direct Market Research, Product Plan, First Version Plan, and Tech Spec generation after active-document skip checks.
- `src/app/api/launch/plan/route.ts`: charges 5 credits for Launch Plan generation after active-document skip checks.
- `src/app/api/generate-app/route.ts`: charges by app type: static 50, dynamic 100, SPA 150, PWA 200.
- `src/app/api/generate-all/execute/route.ts`: charges non-onboarding queue items based on `src/lib/token-economics.ts`, but bundled onboarding items from the new project flow are treated as zero-cost.
- `src/app/api/generate-all/cancel/route.ts` and `src/app/api/generate-all/status/route.ts`: refund previously charged queue items when cancelled/stale.
- `src/app/api/stripe/webhook/route.ts`: grants `plans.credits_monthly` on checkout completion and subscription renewal through `add_credits`.
- `src/lib/credits.ts` and `src/lib/generation-queue-billing.ts`: central refund helpers.
- `src/types/database.ts`: still contains `credits`, `credits_history`, `plans.credits_monthly`, credit RPCs, and queue credit fields.

Important nuance:
- The new onboarding/project creation path is intended to be bundled. Queue items with onboarding source/run id are charged `0`.
- Manual/legacy routes can still drain credits and return `402 Insufficient credits`.
- Mockup generation currently has a base token cost of `0` in `src/lib/token-economics.ts`, but OpenRouter image generation still has real internal cost.

## Customer Confusion Risks
- Hidden balance failure: if credit UI is removed but `consume_credits` remains active for included flows, users can run out of credits without knowing credits exist.
- Mixed promises: pricing can say "5 projects" or "15 projects" while backend gates a document, chat, launch plan, or app generation on credits.
- Different generation paths behave differently: bundled onboarding may be free, while manual retry/direct generation may be credit-billed.
- Old UI surfaces can disable buttons based on credits or show "N credits" labels even if the main workspace no longer sells credits.
- Stripe may continue granting monthly credits silently. That is technically okay for compatibility, but it should not be required for normal project-bundled flows unless the product clearly exposes it.
- Low-trust errors: "Insufficient credits" is the wrong message for a project-based plan. If an action is not included, the error should say which plan feature or usage limit applies.

## Assumptions
- Current launch pricing should be project/plan based, not credit/token based.
- Future interactive AI actions may become credit-based, especially chat-with-output, AI edits, revisions, exports, overage packs, or premium generation tools.
- Credits should remain available as backend infrastructure and historical ledger data.
- User-facing credits should be hidden until they are intentionally reintroduced with clear copy and plan terms.
- Backend routes for included project outputs should use project allowance, plan entitlement, active-document idempotency, rate limits, and abuse controls rather than hidden user balances.
- If a future action uses credits, it must be visible and explicit before the action is run.
- Stripe credit grants can remain for now as dormant compatibility, but plan access should not depend on users understanding the credit balance.
- Existing active-document skip/idempotency behavior must stay before any charge, entitlement check that spends user quota, or external AI call.

## Recommended First Step
Create a short-term policy decision and test around this rule:

> Credits are hidden from users and preserved internally. Included project flows must not fail because of hidden credit balance. Future credit-billed AI actions must be explicit before launch.

Then audit and patch the surfaces most likely to confuse users:
- remove visible credit/token UI and pricing copy;
- replace hidden `402 Insufficient credits` failures for included flows;
- keep backend credit tables/RPCs/Stripe compatibility intact.

## Recommended Architecture
Add a central policy layer, likely `src/lib/billing-policy.ts`, `src/lib/usage-policy.ts`, or `src/lib/plan-entitlements.ts`.

The policy should separate:
- `project_allowance`: can the user create another project?
- `plan_feature`: is this feature included in the current plan?
- `included_generation`: can this project output be generated without user-visible credits?
- `credit_billed_action`: is this future action explicitly charged to credits?
- `rate_limited`: is the action temporarily blocked for abuse/cost control?
- `internal_usage_accounting`: how should estimated cost be logged without affecting user-visible balance?

The resolver should return typed decisions, not booleans:
- `allowed`
- `included`
- `plan_gated`
- `credit_required`
- `rate_limited`
- `missing_subscription`
- `unknown_plan`

The client should receive safe access metadata:
- `access.state`
- `access.reason`
- `access.upgradePlan`
- `access.visibleProjectAllowance`
- `access.visibleOptions`
- `access.creditCost` only for future actions where credits are intentionally customer-visible

## Clarifying Questions
1. Which current actions are included inside an allowed project?
   - Recommendation A: Include onboarding outputs and core planning documents inside each allowed project.
   - Trade-off: simplest customer promise and best activation, but higher AI cost per project.
   - Recommendation B: Include only the onboarding bundle, then plan-gate optional/manual follow-up documents.
   - Trade-off: stronger cost control and upgrade moments, but users may feel the project promise is less complete.
2. Should manual regeneration of an already included document be included, plan-gated, or future credit-billed?
   - Recommendation A: Keep active-document singleton behavior for now; make explicit version/regeneration a later entitlement.
   - Trade-off: avoids hidden credit drain and controls cost, but gives users less flexibility to iterate.
   - Recommendation B: Allow manual regeneration as an explicit future credit-billed action.
   - Trade-off: gives users self-serve iteration and maps well to future credits, but requires clear cost UI and refund/retry handling.
3. Should chat-with-output and AI edits become the first explicit credit-billed actions?
   - Recommendation A: Yes, make chat-with-output and AI edits the first explicit credit-billed actions.
   - Trade-off: credits map naturally to ongoing usage, but require clear balance/usage UI when those features ship.
   - Recommendation B: Keep chat/edit plan-included at first and use rate limits instead of credits.
   - Trade-off: simpler launch UX, but less direct cost recovery for heavy interactive usage.
4. Should Stripe continue granting invisible monthly credits during the transition?
   - Recommendation A: Leave grants intact for compatibility, but stop using them as the gate for included flows.
   - Trade-off: fewer billing migration risks, but hidden balances can drift unless documented.
   - Recommendation B: Stop new invisible grants while preserving old balances and RPCs.
   - Trade-off: cleaner future billing semantics, but webhook changes need focused tests and migration care.
5. Should public pricing remove token/credit language now?
   - Recommendation A: Remove token/credit language from public pricing now.
   - Trade-off: pricing matches the project-based product, but future credits need a separate relaunch with clear copy.
   - Recommendation B: Keep a small "future AI usage credits" note only if credits will ship soon.
   - Trade-off: preserves pricing continuity, but risks confusing users before credits are actually visible/useful.
6. Should existing `plans.credits_monthly` stay in the database?
   - Recommendation A: Keep it for now as reserved/future or compatibility data.
   - Trade-off: safest technically, but stale schema naming remains until a later cleanup.
   - Recommendation B: Add a new structured entitlement field and stop reading `credits_monthly` in new code.
   - Trade-off: better long-term model, but increases schema and validation scope.
7. Should `consume_credits` calls be feature-flagged instead of removed from routes?
   - Recommendation A: Use a central server policy so included flows bypass balance checks, while future explicit credit actions can still call the RPC.
   - Trade-off: more policy plumbing, but much safer than route-by-route ad hoc conditionals.
   - Recommendation B: Directly remove `consume_credits` calls from currently included routes and leave future credit wiring for later.
   - Trade-off: faster short-term cleanup, but easier for route behavior to drift.
8. What should happen if a user has zero credits but an active paid plan with project allowance remaining?
   - Recommendation A: Included project flows should work; only explicitly credit-billed actions should be blocked.
   - Trade-off: aligns with project pricing, but spend controls must rely on plan gates/rate limits rather than balance exhaustion.
   - Recommendation B: Block only expensive optional actions when credits are zero.
   - Trade-off: adds a cost safety valve, but risks reintroducing hidden-credit confusion unless the UI explains it.
9. Should app generation be included, plan-gated, hidden, or future credit-billed?
   - Recommendation A: Hide or paid-plan-gate app generation until core planning is stable.
   - Trade-off: lowers cost and product risk, but narrows the launch promise.
   - Recommendation B: Make app generation an explicit future credit-billed action.
   - Trade-off: preserves the roadmap and pays for high-cost usage, but requires upfront pricing, balance UI, and strong abuse controls.
10. Should credits be renamed internally now?
    - Recommendation A: Do not rename schema now; use clearer terms only in new policy code/docs.
    - Trade-off: avoids churn, but internal naming remains messy.
    - Recommendation B: Start a gradual rename toward `usage_units` or `cost_units` in new tables/types.
    - Trade-off: improves conceptual clarity, but adds migration and compatibility work before the model is proven.

## Plan
1. Inventory and classify every credit/token touchpoint.
   - Classify hits as public UI, authenticated UI, legacy UI, backend balance enforcement, internal metrics, Stripe grant, database compatibility, or docs.
   - Validation:
     - `rg -n "credit|credits|token|tokens|consume_credits|add_credits|refund_credits|get_credit_balance|credit_cost|credit_status" src PROJECT_CONTEXT.md plans`
2. Define the short-term billing/usage policy.
   - Add or plan a central policy helper that answers whether an action is included, plan-gated, explicit-credit-billed, or rate-limited.
   - Default policy:
     - show credits to users: false
     - charge hidden credits for included project outputs: false
     - preserve backend credit infrastructure: true
     - allow explicit future credit-billed actions: true, behind clear UI and tests
   - Validation: focused policy tests for included generation, future credit-billed action, unknown plan, and zero-credit active-plan states.
3. Remove user-facing credit/token UI.
   - Edit public pricing and authenticated surfaces such as Billing, account menus, workspace headers, legacy analysis panels, chat footers, content editor labels, and generation buttons.
   - Desired behavior: no "Token Balance", "N credits", "credits remaining", "tokens/month", or credit-cost badges in normal UI.
   - Validation: browser-check `/`, `/billing`, `/projects`, and a workspace with the Codex in-app browser.
4. Replace hidden insufficient-credit failures for included flows.
   - Audit:
     - `src/app/api/chat/route.ts`
     - `src/app/api/analysis/[type]/route.ts`
     - `src/app/api/launch/plan/route.ts`
     - `src/app/api/generate-app/route.ts`
     - `src/app/api/generate-all/execute/route.ts`
   - For each route, decide whether the action is included, plan-gated, hidden, or explicitly credit-billed.
   - Included flows should not call `consume_credits`.
   - Non-included flows should return plan/feature/rate-limit language, not hidden balance language.
   - Future credit-billed flows should show the cost before spending credits.
   - Validation: route tests or local API requests confirm included flows do not return `402 Insufficient credits`.
5. Keep credit infrastructure intact.
   - Do not drop:
     - `credits`
     - `credits_history`
     - `consume_credits`
     - `add_credits`
     - `get_credit_balance`
     - `refund_credits`
     - `plans.credits_monthly`
     - `generation_queue_items.credit_cost`
     - `generation_queue_items.credit_status`
   - Keep refund helpers while any route can still charge credits.
   - Keep generated database types stable unless a later dedicated migration changes them.
6. Preserve Stripe compatibility while decoupling plan access from credits.
   - Let webhook credit grants remain until a dedicated billing migration.
   - Make subscription/plan status the source of plan access and project allowance.
   - Add tests or review notes for checkout completion and invoice renewal so hidden credit grants do not break runtime behavior.
7. Add future credit entitlement requirements.
   - Future credit-billed features must have:
     - visible balance/cost UI;
     - explicit confirmation or clear action label;
     - server-side `consume_credits` enforcement;
     - refund behavior on failed generation;
     - ledger entries users or support can understand;
     - tests for zero balance, refund failure, and repeated/retry attempts.
8. Update docs.
   - Update `PROJECT_CONTEXT.md` once implementation starts.
   - Keep this plan clear that credits are hidden/preserved, not deleted.
   - Reconcile or supersede older credit-removal docs so future searches do not revive the destructive cleanup path.

## Future Entitlement System Requirements
- A central resolver that takes user, project, subscription, plan, action, and route context, then returns a typed allow/deny/credit decision.
- Plan capabilities should be structured and server-enforced; `plans.features` should remain display-only.
- Project allowance must remain separate from credit balance.
- Included artifact generation should not consume hidden user credits.
- Future credit-billed actions must be explicit in the UI before any backend debit.
- Downgrade/cancellation rules must state whether existing projects retain outputs and whether future chat/edit credits remain usable.
- Direct API reads, private mockup image access, PDF/export routes, and future share routes must enforce plan visibility rules without leaking gated content.
- Internal usage metrics should record estimated cost without pretending the user spent visible credits unless the action is truly credit-billed.

## Milestones
- Decision milestone: included project outputs, app generation posture, and first future credit-billed action are chosen.
- Policy milestone: central billing/usage/entitlement policy exists with focused tests.
- UI milestone: no active page shows credits, tokens, token balance, token usage, or credit costs.
- Behavior milestone: included project flows no longer fail with hidden insufficient-credit errors.
- Compatibility milestone: credit tables/RPCs/Stripe grants remain intact and runtime-safe.
- Future-credit milestone: chat/edit credit requirements are documented before those features ship.
- Documentation milestone: `PROJECT_CONTEXT.md` describes hidden/internal credits accurately.

## Validation
- Search validation:
  - `rg -n "Credits:|credits remaining|Token Balance|Token Usage|credits/month|tokens/month|Insufficient credits|Generate \\([0-9]+ credits\\)" src`
  - `rg -n "consume_credits|add_credits|refund_credits|get_credit_balance|credits_history|plans\\.credits_monthly|credit_cost|credit_status" src supabase migrations`
  - Remaining visible-language hits must be removed or justified as inaccessible legacy/dev/internal-only.
  - Remaining backend credit hits are expected, but must be classified as future explicit billing, dormant compatibility, refund support, or internal accounting.
- Automated validation:
  - `npm run typecheck`
  - `npm run lint`
  - focused tests for billing policy, project allowance, route access decisions, queue helpers, and Stripe webhook compatibility.
- API validation:
  - Create project still checks project allowance.
  - Bundled onboarding generation remains zero-cost.
  - Included manual/document flows do not return hidden `402 Insufficient credits`.
  - Future explicit credit-billed action tests verify credit debit/refund behavior.
- Browser validation with the Codex in-app browser:
  - `/` pricing has no token/credit math.
  - `/billing` shows plan/value/subscription info without token balance.
  - `/projects` and a workspace profile menu have no credit row.
  - Generation failures show plan/rate-limit/product language, not insufficient credits.

## Risks And Mitigations
- Risk: hiding credits while backend still blocks users creates confusing failures.
  - Mitigation: audit every `consume_credits` path and bypass/replace hidden credit gates for included flows.
- Risk: removing backend credits now eliminates a useful future pricing and abuse-control mechanism.
  - Mitigation: preserve tables/RPCs/Stripe compatibility and document future explicit credit usage.
- Risk: keeping invisible monthly Stripe credit grants creates stale data.
  - Mitigation: treat grants as compatibility only until a dedicated billing migration; do not use hidden balance for included access.
- Risk: included generation without credit charging increases AI cost exposure.
  - Mitigation: keep project allowance, active-document singleton checks, rate limits, internal usage metrics, and plan gates for expensive optional features.
- Risk: legacy routes continue to display or depend on credits.
  - Mitigation: search all credit/token UI and browser-check reachable legacy surfaces.
- Risk: future credit reintroduction feels like a surprise downgrade.
  - Mitigation: only apply credits to new ongoing AI usage surfaces, with clear pricing and UI before launch.
- Risk: route-by-route decisions drift.
  - Mitigation: centralize policy decisions and add tests that cover zero-credit active-plan users.

## Rollback Or Recovery
- If UI removal causes confusion, restore selected explanatory plan copy, not the old token economy wholesale.
- If included generation cost spikes, temporarily plan-gate or rate-limit expensive routes through the central policy.
- If Stripe webhook credit grants break, restore the prior webhook path because backend credit infrastructure is preserved.
- If a future credit feature ships, reintroduce balance/cost UI only for that explicit feature and keep project-bundled outputs separate.

## Open Decisions
- Exact list of included outputs inside each allowed project.
- App generation posture: included, paid-plan gated, hidden for launch, or explicit future credit-billed action.
- Whether manual regeneration/versioning becomes plan-gated or credit-billed.
- Whether chat-with-output and AI edits are the first future credit-billed actions.
- Whether Stripe should keep granting invisible monthly credits until the future credit feature launches.
- Whether to add `plans.entitlements` JSONB now or use typed code config first.
- Whether future credits expire monthly, roll over, or attach to subscription periods.
- Whether future credit packs can be purchased separately from subscriptions.

## Critique

### Software Architect
The revised approach is lower risk than backend deletion. Credits are entangled with queues, Stripe, metrics, refunds, and generated types. The key architectural fix is not deleting them; it is preventing hidden balance checks from acting as the access-control model for project-based pricing.

### Product Manager
Project-based pricing is easier to sell now. Credits can still make sense later for ongoing AI edits and chat because those are usage-shaped features. The product must avoid promising "projects included" while secretly failing on a separate balance.

### Customer Or End User
Users should not need to understand credits during the current core workflow. They should know how many projects they can create and which outputs/features their plan includes. If credits return for chat/edit usage, the cost must be visible before they spend.

### Engineering Implementer
The highest-risk implementation work is finding all backend `consume_credits` paths and deciding which ones are included, plan-gated, hidden, or future credit-billed. UI cleanup alone is not enough if routes still return `Insufficient credits`.

### Risk, Security, Or Operations
Keeping internal metering is useful because AI usage has real cost and abuse risk. The system should preserve rate limits, operational metrics, refund mechanics for true credit-billed actions, and server-side entitlement checks for any future gated content.
