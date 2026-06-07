# Plan: Restore Nazarework Developer Account Project Capacity

## Goal
Let `nazarework@gmail.com` keep using this app as a developer account under the new project-based limits by assigning it the existing unmetered `Internal Dev` project allowance behavior. This should be a one-time Supabase-only internal entitlement, not a public pricing change, not a Stripe enrollment, and not a runtime email exception in application code.

## Assumptions
- The account already exists in Supabase Auth and has a matching `profiles` row.
- The current blocker is the monthly project allowance checked by `canCreateProject()` in `src/lib/project-allowance.ts`, not the credit balance.
- The existing allowance resolver already treats an `Internal Dev` plan name as unmetered by returning `allowance: null`.
- Credits are out of scope for this fix; only project allowance should change.
- This should be handled through Supabase plan/subscription data, not Stripe checkout/webhooks and not hardcoded application branching.
- Prefer applying the entitlement only in local or staging data stores. If the app currently has no meaningful staging/production separation, apply it in production as a narrowly scoped internal entitlement for this account.

## Confirmed Decisions
1. Use the existing unmetered `Internal Dev` behavior instead of creating a new exact 100-project tier.
2. Scope to local/staging when those environments are separate.
3. If there is no current staging/production distinction, apply the same internal entitlement in production for `nazarework@gmail.com`.
4. Do not change credits.
5. Do not use Stripe for this fix.
6. Make this a one-time Supabase admin data fix, not a reusable admin product feature.
7. Keep the entitlement out of public pricing and customer-facing plan cards.

## Recommended First Step
Verify the account's current resolved project entitlement before changing anything. Query the profile, active subscription, joined plan, current monthly project count, and the result that `getProjectAllowanceStatus()` would compute for the account. The concrete output should be: `user_id`, active subscription status, plan name, current period window, resolved allowance, used project count, and remaining projects.

## Plan
1. Inspect the current account state.
   - Check Supabase Auth/Profile for `nazarework@gmail.com`.
   - Check active `subscriptions`, joined `plans`, `current_period_start`, and `current_period_end`.
   - Count projects created by that user in the active allowance window.
   - Validation: confirm whether the app is falling back to Free, resolving a low plan allowance, or counting against the wrong period.

2. Confirm the environment boundary.
   - If local/staging Supabase instances are separate from production, apply this only to the local/staging database used for development.
   - If the project currently points development and production at the same Supabase project, apply the internal entitlement in production but keep it limited to `nazarework@gmail.com`.
   - Validation: the target Supabase project is identified before any admin data write.

3. Use the existing `Internal Dev` entitlement model.
   - Create or reuse a private `plans` row named `Internal Dev`.
   - Do not create Stripe product IDs or price IDs for this plan.
   - Do not surface the plan in customer-facing billing/pricing UI.
   - Rely on the existing `PLAN_NAME_PROJECT_ALLOWANCES` fallback in `src/lib/project-allowance.ts`, where `"internal dev"` resolves to `allowance: null`.
   - Validation: the selected plan resolves through `resolveProjectAllowance()` as `allowance: null`, `source: "plan_name"`, and `planName: "Internal Dev"`.

4. Apply the entitlement safely as a one-time Supabase data fix.
   - Use Supabase SQL editor or a trusted local service-role script to attach the account to the private `Internal Dev` plan.
   - Set an active subscription-like row with a valid current period if this is managed outside Stripe.
   - Do not hardcode `nazarework@gmail.com` in `src/lib/project-allowance.ts` or API routes.
   - Do not touch credit balance or credit history.
   - Keep the executed SQL/script output or admin notes as the audit trail for this one-time change.
   - Validation: a fresh entitlement check reports `canCreate: true`, `allowance: null`, and `remaining: null`.

5. Verify the new-project flow.
   - Run the focused allowance tests in `src/lib/project-allowance.test.ts`.
   - Exercise `/api/projects/create-from-intake` with the developer account, ideally once through the UI and once by inspecting the API response if it still fails.
   - Validation: project creation succeeds while normal low-plan accounts are still blocked at their configured limits.

6. Document the operational result.
   - If no code or architecture changes are made, do not update `PROJECT_CONTEXT.md`.
   - If any plan visibility logic or entitlement semantics change in code, update `PROJECT_CONTEXT.md`.
   - Record which Supabase environment was changed, which user was entitled, which plan was attached, and the current period used.
   - Validation: the next developer can understand how the account gets its higher project allowance.

## Milestones
- Current state verified: account, subscription, plan, allowance, and project count are known.
- Environment chosen: local/staging only when possible, production only if no separation exists.
- Entitlement applied: the account resolves to `Internal Dev` with unmetered project allowance.
- Flow verified: `nazarework@gmail.com` can create a new project through `/projects/new`.
- Regression checked: normal users still receive the correct monthly project limit errors.

## Validation
- Unit test: `src/lib/project-allowance.test.ts` still passes.
- Data check: `getProjectAllowanceStatus()` reports `allowance: null`, `remaining: null`, and `canCreate: true` for the developer account.
- Product check: creating a project through the Idea Intake Wizard succeeds for `nazarework@gmail.com`.
- Guard check: a Free user with one project in the month is still blocked.
- Pricing check: the `Internal Dev` plan does not appear as a public/customer-facing plan.

## Risks And Mitigations
- Risk: Production gets changed when a local/staging-only change would have been enough.
  - Mitigation: identify the target Supabase project first; only use production if no separate local/staging entitlement store exists.
- Risk: A Stripe webhook overwrites or conflicts with a manual subscription edit.
  - Mitigation: do not attach Stripe subscription IDs to the internal entitlement; keep the `Internal Dev` plan Supabase-only.
- Risk: An unmetered internal plan hides project-limit bugs.
  - Mitigation: use this only for `nazarework@gmail.com`, keep normal Free/Starter/Pro tests intact, and verify regular users still hit limits.
- Risk: The current subscription period is invalid or stale, causing the app to count the wrong project window.
  - Mitigation: set `current_period_start` and `current_period_end` deliberately, even though unmetered allowance is not blocked by count.
- Risk: A hardcoded email exception becomes a privacy and maintenance problem.
  - Mitigation: keep entitlement in data, not in application branching.
- Risk: The internal plan becomes visible in public pricing.
  - Mitigation: do not add Stripe price IDs or public billing copy; if billing reads plans dynamically, mark/filter the internal plan so users cannot select it.
- Risk: Service-role access leaks or gets committed.
  - Mitigation: run the one-time SQL/admin script only from a trusted environment and never commit service-role credentials or generated secrets.

## Resolved Implementation Decisions
- The current target database was updated with the available Supabase service-role admin credentials: `meahkrbbmmytntzzlguk.supabase.co`.
- A private `Internal Dev` plan row already existed and was reused.
- Billing reads plans dynamically, so the implementation now excludes `Internal Dev` at query time and marks the plan inactive in Supabase.

## Implementation Result
- Implemented on 2026-04-25 UTC using a trusted local service-role Supabase admin session.
- Reused the existing `Internal Dev` plan row and marked it private by setting `is_active = false` and `stripe_price_id = null`.
- Attached `nazarework@gmail.com` to an active Supabase-only `Internal Dev` subscription with `current_period_start = 2026-04-25T05:21:31.879+00:00` and `current_period_end = 2027-04-25T05:21:31.879+00:00`.
- Did not change credit balance or credit history.
- Removed callback-time email-specific entitlement and credit mutation from application code.
- Hardened Stripe checkout/webhook handling so inactive/internal plans cannot be assigned through customer checkout metadata.

## Verification Result
- `getProjectAllowanceStatus()` resolves `nazarework@gmail.com` to `planName = "Internal Dev"`, `canCreate = true`, `allowance = null`, and `remaining = null`.
- The active allowance window is the Supabase-only subscription period from `2026-04-25T05:21:31.879+00:00` to `2027-04-25T05:21:31.879+00:00`.
- The account currently has 1 project in that active allowance window.
- The `Internal Dev` plan row is inactive and has no Stripe price ID, so it is not customer-checkout eligible.
- The active public plan query returns `Free`, `Starter`, `Pro`, and `Enterprise`; it does not return `Internal Dev`.
- Focused allowance tests pass: `node --import tsx --test src/lib/project-allowance.test.ts`.
- Lint passed for the touched files and `npx tsc --noEmit` passed.
- A live `/projects/new` UI submission was not run to avoid adding a throwaway project to the developer account; the entitlement gate that previously blocked creation has been verified directly.

## Likely Files To Inspect If Implementing
- `src/lib/project-allowance.ts`
- `src/lib/project-allowance.test.ts`
- `src/app/api/projects/create-from-intake/route.ts`
- `src/app/(dashboard)/billing/page.tsx`
- `PROJECT_CONTEXT.md`

## Critique

### Software Architect
- The plan accounts for the architecture concern by using the existing data-driven plan/subscription path and the existing `Internal Dev` allowance fallback. No email-specific runtime branch should be added.

### Product Manager
- The user need is developer velocity, not a public pricing change. The plan keeps `Internal Dev` private, Supabase-only, and unavailable through customer checkout or public plan cards.

### Customer Or End User
- Regular users should still see consistent limits that match their plan. The internal entitlement must not alter customer-facing copy, plan availability, or normal limit behavior.

### Engineering Implementer
- Implementation should be a small operational data change after inspecting the current subscription join. Do not build an admin UI or generalized entitlement workflow for this one-time fix; add code only if billing visibility filtering is needed.

### Risk, Security, Or Operations
- Use service-role credentials only from a trusted local/admin environment. Do not commit credentials, do not expose a public entitlement endpoint, avoid Stripe identifiers for the internal plan, and keep an audit trail of the account, environment, plan, and period changed.
