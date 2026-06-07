# Plan: Remove User-Facing Credits And Keep Internal Usage Accounting

## Goal
Decide and plan how to remove credits/tokens from the user-facing product experience in the short term while preserving useful internal usage accounting for cost visibility, abuse controls, and future pricing flexibility. The recommended path is to remove customer-facing balances and credit-based gating, stop treating `consume_credits` as the normal access-control mechanism, and keep the old credit database/RPC infrastructure dormant rather than destructively deleting it.

## Assumptions
- Maker Compass is moving toward project-based pricing: Free gets a limited project allowance, paid plans get monthly/project-period allowances, and bundled onboarding document generation should feel included.
- "Delete the UI-facing credits system" means users should not see credit/token balances, "N credits" labels, token usage tables, insufficient-credit messages, or credit-based upgrade prompts.
- Backend tables/functions named `credits`, `credits_history`, `consume_credits`, `add_credits`, and `refund_credits` can remain for now for history, rollback, and compatibility, but they should not be the primary control path for normal included user actions.
- Existing subscriptions and historical accounting data should not be deleted.
- Legacy/manual generation routes may still contain credit charging today; the plan should replace visible credit failures with project/plan/rate-limit behavior.
- Because credits may come back later, reversible changes and feature flags are preferable to destructive migrations.
- Internal usage accounting should use cost/usage units conceptually, even if some existing code and database fields still say "credits" until a later cleanup.

## Clarifying Questions
1. Should public landing/pricing remove token/credit language too, or is this first pass limited to the authenticated product UI?
   - Recommended answer: remove it from public pricing too, because public pricing should match the product experience and sell projects/outcomes.
2. Which actions should be plan-gated after credit gating disappears?
   - Recommended answer: project creation is project-allowance gated; app generation, custom domains, and consulting/support are plan-feature gated; ordinary document generation inside an allowed project is included.
3. Should we add a feature flag for credit visibility and credit enforcement, or make a direct code change?
   - Recommended answer: use server-side constants or env-driven policy for enforcement while making frontend removal direct, because UI should not keep dead branches unless rollback is likely within days.
4. Should Stripe continue granting monthly credits invisibly?
   - Recommended answer: stop relying on new grants for product behavior, but leave existing webhook/RPC compatibility in place until plan records and webhooks are deliberately migrated.
5. What should internal accounting be called in new code: credits, usage units, or cost units?
   - Recommended answer: use `usage units` or `estimated cost units` in new code/docs, while leaving old database column names unchanged for now.

## Recommended First Step
Choose the reversible short-term strategy: remove all user-facing credit/token UI and stop using credit balance as the normal gate for included flows, while keeping historical credit tables/RPCs and internal usage metrics intact. This avoids hidden customer-balance failures without ripping out billing infrastructure while the pricing model is still evolving.

## Recommendation
Do not fully remove the backend credit infrastructure right now. Also do not keep using `consume_credits` as invisible customer gating after the frontend stops explaining credits.

Separate the system into three layers:
- User-facing credits: remove now.
- User-balance enforcement through `consume_credits`: stop using for normal included flows.
- Internal usage/cost accounting: keep and gradually rename away from "credits" where new code touches it.

Keep internal usage accounting because it still provides:
- AI cost observability per feature and per user.
- A throttle/safety valve if a route becomes expensive or abused.
- A migration path for future add-ons, overages, trials, promotional grants, or enterprise pools.
- Historical metrics continuity.
- Less risk than deleting database functions and queue billing state across a live product.

Remove credits from user-facing surfaces because:
- Credits conflict with project-based pricing and make the product feel more complicated.
- Users buy outcomes: projects, plans, mockups, launch assets, and support, not internal token math.
- Current UI mixes "credits" and "tokens", which creates trust and comprehension problems.

If we bypass `consume_credits` and also stop recording internal estimated usage, then there is little reason to keep an active credit backend. In that case the old system should be treated as dormant compatibility only, and a later cleanup should remove it once Stripe, queue, metrics, and database dependencies are replaced.

## Plan
1. Inventory and classify every credit/token surface.
   - Frontend display: profile menus, Billing page balance card, plan features, token usage table, legacy sidebar, chat footer, legacy generation badges.
   - Frontend gating: disabled generate buttons, insufficient-credit labels, Generate All credit estimates.
   - Backend charging: chat, analysis, launch plan, app generation, manual Generate All.
   - Backend accounting: Stripe credit grants, metrics, queue billing state, refund RPCs, database types.
   - Validation: `rg -n "credit|credits|token|tokens|consume_credits|refund_credits|credit_cost|credit_status"` and manually classify each hit.
2. Add a product-level billing/usage policy.
   - Likely file: `src/lib/billing-policy.ts` or `src/lib/usage-policy.ts`.
   - Define flags or constants such as `showCreditsToUsers`, `chargeCreditsForManualGeneration`, and `showTokenUsageTable`.
   - Default recommendation: `showCreditsToUsers = false`; `chargeCreditsForManualGeneration = false` only after confirming abuse/cost controls are covered elsewhere.
   - Validation: typecheck and simple unit tests for policy helpers.
3. Remove user-facing balance display.
   - Edit likely files:
     - `src/components/layout/header-profile-menu.tsx`
     - `src/components/layout/dashboard-shell.tsx`
     - `src/components/layout/header.tsx`
     - `src/components/layout/project-header.tsx`
     - `src/components/layout/sidebar.tsx`
     - `src/app/(dashboard)/layout.tsx`
     - `src/components/ui/credit-balance.tsx` may remain unused or become internal-only.
   - Desired behavior: account menus show Profile, Settings, Subscriptions, Log out, with no credit row.
   - Validation: browser screenshots of `/projects`, `/billing`, and one workspace profile menu.
4. Rewrite Billing page from credit balance to plan/value model.
   - Edit `src/app/(dashboard)/billing/page.tsx`.
   - Remove "Token Balance" card and "Token Usage" section.
   - Show current plan, project allowance, included outputs, subscription management, and upgrade cards.
   - Normalize plan features away from `credits/month`; update Supabase plan data separately if needed.
   - Validation: authenticated `/billing` visual check and checkout button smoke check without completing checkout.
5. Remove visible credit costs and insufficient-credit copy from legacy generation UI.
   - Edit likely files:
     - `src/components/layout/content-editor.tsx`
     - `src/components/analysis/analysis-panel.tsx`
     - `src/components/chat/chat-interface.tsx`
     - `src/lib/document-definitions.ts` only if labels/config leak to UI.
   - Desired behavior: generation buttons say "Generate", "Retry", or plan-tier messaging, not "Generate (10 credits)".
   - Validation: inspect legacy surfaces if still reachable; otherwise keep tests/typecheck and record inaccessible legacy paths.
6. Replace user-balance credit charging with explicit product gates.
   - Preferred short-term backend option: do not call `consume_credits` for normal included actions.
   - Keep or add internal estimated usage logging that does not mutate user credit balances.
   - Use project allowance, plan feature checks, rate limits, and abuse controls as the real product gates.
   - Edit likely files if disabling user balance enforcement:
     - `src/app/api/chat/route.ts`
     - `src/app/api/analysis/[type]/route.ts`
     - `src/app/api/launch/plan/route.ts`
     - `src/app/api/generate-app/route.ts`
     - `src/app/api/generate-all/execute/route.ts`
     - `src/app/api/generate-all/cancel/route.ts`
     - `src/app/api/generate-all/status/route.ts`
   - Keep internal metrics `creditsConsumed` or rename later to `estimatedCostUnits` only in a larger cleanup.
   - Validation: route tests or manual requests confirm no 402 "Insufficient credits" for included flows; expensive/non-included actions return plan-based or rate-limit errors instead.
7. Keep database and Stripe credit infrastructure intact.
   - Keep tables/functions:
     - `credits`
     - `credits_history`
     - `consume_credits`
     - `add_credits`
     - `get_credit_balance`
     - `refund_credits`
     - `generation_queue_items.credit_cost`
     - `generation_queue_items.credit_status`
   - Do not delete historical balances or migrations.
   - Optionally stop showing `plans.credits_monthly` in UI and stop relying on it for public plan copy.
   - Treat this layer as dormant compatibility unless a specific internal ledger path still needs it.
   - Validation: Stripe webhook tests or code review confirm existing subscriptions still process without runtime errors.
8. Update pricing and documentation.
   - Edit `src/app/page.tsx` and `PROJECT_CONTEXT.md`.
   - Public pricing should describe projects/month, included artifacts, mockups, app generation, support, and consulting/review, not credits/tokens.
   - Documentation should explicitly say credits are hidden/internal usage accounting during the project-based pricing phase.
   - Validation: `rg` confirms remaining "credit" text is internal-only or historical docs.
9. Add a rollback path.
   - If credits need to return, flip the policy flag and restore UI rows from preserved components/config.
   - Keep `CreditBalance` and `token-economics` around unless a future cleanup proves they are dead.
   - Avoid database migrations that drop data or functions until at least one billing/pricing cycle has passed without credit-based needs.

## Frontend: Edit Vs Keep
Edit:
- `src/app/(dashboard)/billing/page.tsx`: remove Token Balance, Token Usage, credit/month plan features.
- `src/components/layout/header-profile-menu.tsx`: remove "Credits:" dropdown row.
- `src/components/chat/chat-interface.tsx`: remove credits remaining footer.
- `src/components/layout/content-editor.tsx`: remove credit-cost labels and insufficient-credit UI.
- `src/components/analysis/analysis-panel.tsx`: remove credit badges and credit-based disabled states if reachable.
- `src/components/layout/sidebar.tsx`: remove legacy credit/low-balance CTA if the sidebar can still render.
- `src/app/page.tsx`: remove public token math if pricing should be fully project/outcome-based.

Keep:
- `src/components/ui/credit-balance.tsx` initially, but stop importing it from user-facing surfaces.
- `src/lib/token-economics.ts` as internal cost policy.
- Legacy document credit metadata if only used internally, then clean it later when usage is proven dead.

## Backend: Edit Vs Keep
Edit:
- API routes that call `consume_credits` for normal included flows. Replace this with plan/project/rate-limit checks and internal usage logging.
- API routes that currently return `402` for insufficient credits. Replace with no error for included flows, or a clear plan-based error for non-included flows.
- Stripe webhook copy/logic only if new plan grants should stop adding credits; otherwise leave grants as dormant compatibility until a dedicated billing-data cleanup.
- Metrics labels later if "credits" becomes misleading in dashboards.

Keep:
- Supabase tables, RPCs, migrations, and generated database types.
- Queue `credit_cost` and `credit_status` columns.
- Refund code paths until all `consume_credits` charge paths are disabled or replaced.
- `creditsConsumed` in metrics as an internal unit until a deliberate metrics rename.

Do not keep:
- Invisible user balance enforcement. If users cannot see a balance or understand how it works, `consume_credits` should not decide whether normal included product actions succeed.

## Full Removal Option
Fully removing credits would mean:
- Database migrations to drop or ignore `credits`, `credits_history`, credit RPCs, queue credit columns, plan `credits_monthly`, and metrics credit fields.
- Removing refund logic from every generation route.
- Reworking Stripe webhooks and plan records.
- Updating generated Supabase types and all tests.
- Replacing cost/abuse controls with project limits, rate limits, quota tables, or plan feature gates.

This is not recommended now. It is high-blast-radius work that removes useful optionality while the product is still settling on pricing. It becomes worth considering only after project-based limits have been stable for a few months and no roadmap item needs usage-based controls, add-ons, overages, trials, or per-feature internal cost reporting.

## Milestones
- Decision milestone: choose "hide UI, keep backend" or "full removal."
- UI milestone: no visible credit/token copy in authenticated app or public pricing.
- Behavior milestone: included user flows no longer fail with insufficient-credit messaging.
- Accounting milestone: internal usage metrics continue to record estimated consumption safely.
- Documentation milestone: `PROJECT_CONTEXT.md` accurately describes the hidden/internal credit posture.

## Validation
- Search validation:
  - `rg -n "Credits:|credits remaining|Token Balance|Token Usage|credits/month|tokens/month|Insufficient credits|Generate \\([0-9]+ credits\\)" src`
  - Remaining hits must be internal-only, tests, database types, or historical docs.
- Automated validation:
  - `npm run typecheck`
  - `npm run lint`
  - focused tests around `project-allowance`, `token-economics`, and any new billing policy helpers.
- Browser validation:
  - `/projects` profile menu has no credit row.
  - Workspace profile menu has no credit row.
  - `/billing` shows plan/value/subscription info, not token balance or token usage.
  - Public landing pricing has no token/credit math if that decision is approved.
- API validation:
  - Creating a project still checks project allowance.
  - Included onboarding generation remains bundled/no-credit.
  - Manual generation either succeeds without credit checks or returns plan-based gating, not insufficient-credit errors.

## Risks And Mitigations
- Risk: Hiding credits while backend still blocks users creates confusing failures.
  - Mitigation: audit all `402 insufficient_credits` paths and either bypass or replace with plan-based messages.
- Risk: Removing all backend credits breaks Stripe webhooks, queue refunds, or metrics.
  - Mitigation: keep backend infrastructure until there is a replacement quota/accounting model.
- Risk: Internal team forgets credits still exist and plan data drifts.
  - Mitigation: document hidden/internal metering in `PROJECT_CONTEXT.md` and centralize policy flags.
- Risk: Unlimited usage creates unexpected AI cost spikes.
  - Mitigation: keep internal metering, add rate limits/project allowances, and preserve emergency charge/gate toggles.
- Risk: UI cleanup misses legacy surfaces.
  - Mitigation: use search-based validation plus browser checks of known legacy pages if reachable.

## Open Decisions
- Public pricing scope: remove token/credit language from landing/pricing now, or only authenticated UI in the first pass.
- Plan gates: decide exactly which actions are included inside a project versus gated by tier. The biggest open item is app generation.
- Enforcement policy: use direct code changes or server-side feature flags for credit enforcement removal.
- Stripe transition: leave monthly credit grants dormant for now or stop granting them for new plan purchases in the same release.
- Terminology: start using "usage units" / "estimated cost units" in new internal code and docs, or keep "credits" until a larger rename.

## Critique

### Software Architect
- The reversible approach is the best fit. The current credit system is entangled with queues, refunds, Stripe, metrics, and route error handling. Removing UI copy is low risk; deleting backend accounting is a large migration with little immediate payoff.

### Product Manager
- User-facing credits are probably hurting pricing clarity. Project-based tiers map better to the buyer's goal: "How many ideas can I turn into useful plans?" The pricing page should sell outcomes and plan limits, not token math.

### Customer Or End User
- Removing credits will make the app feel more generous and less transactional. The danger is hidden limits: if users suddenly hit a vague plan gate or generation failure, trust drops quickly. The UI must clearly explain project limits and included outputs.

### Engineering Implementer
- The hardest part is not hiding the text; it is finding every backend path that can still return insufficient-credit errors. A central policy helper is worth it because it prevents scattered conditional logic across generation routes.

### Risk, Security, Or Operations
- Keeping internal metering is operationally valuable. AI generation has real cost and abuse risk. The system should retain a private usage ledger and emergency brake even if users no longer see balances.
