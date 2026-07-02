---
implemented: false
implemented_at:
implementation_summary:
---

# Plan: Writesonic-Style Pricing And Free Trials

## Goal

Redesign Maker Compass pricing so the public landing page feels like the Writesonic pricing section: monthly/annual toggle, paid plan cards, grouped feature bullets with checkmarks, clear savings labels, and trial-first CTAs. Keep Maker Compass' current visual language, remove the public Free pricing card, and make trial behavior deliberate before touching Stripe or entitlement logic.

## Reference

- Writesonic pricing reference checked on 2026-07-01: `https://writesonic.com/pricing`
- Relevant observed pattern: pricing headline plus monthly/annual toggle, annual savings, Starter/Basic/Growth/Enterprise cards, `Start free trial` CTAs on self-serve cards, grouped bullets such as AI Search Visibility, Content & SEO, Agentic Workflows, and Team, plus an Enterprise demo path.

## Current Facts

- Public landing pricing is hardcoded in `src/app/page.tsx` as a `plans` array with Free, Starter, and Pro, then rendered in the `#pricing` section.
- Authenticated billing is data-driven in `src/app/(dashboard)/billing/page.tsx`; it loads public `plans` and `plan_prices` from Supabase, then renders interval buttons per plan.
- Stripe checkout validates selected `plan_prices` rows and creates subscription Checkout sessions in `src/app/api/stripe/checkout/route.ts`.
- The backend already treats `trialing` subscriptions as active for checkout-blocking and project allowance, but the billing page currently only loads `active` subscriptions for the current-plan card.
- `PROJECT_CONTEXT.md` documents Starter and Pro as current self-serve production tiers, with Enterprise checkout disabled.

## Assumptions

- "Keep our visual theme" means keep the current Maker Compass palette, typography, squared/low-radius cards, dense editorial layout, and understated treatment rather than copying Writesonic's branding.
- "Similar to the website" means use the structure and interaction pattern, not copy text verbatim.
- The first implementation should be reversible and locally verifiable before any production Stripe configuration changes.
- Existing live Stripe Price IDs and secrets stay out of source code.

## Clarifying Questions

1. What should "rather than providing a free plan" mean in this change?
   - Recommendation A: Remove the Free card from public pricing and present all public plans as trial-first, while keeping the existing no-subscription fallback internally until a separate checkout-gating change is approved.
   - Trade-off: Lower risk and matches the requested pricing-section change, but a signed-in user with no subscription may still have internal Free-plan behavior until a deeper entitlement change.
   - Recommendation B: Fully remove the Free user path by requiring trial checkout before project creation.
   - Trade-off: Stronger business model alignment, but higher blast radius across auth handoff, `/projects/new`, project allowance, billing copy, Stripe trial lifecycle, and failed-payment handling.
   - Selected: Recommendation A for this pass, because the user asked to comment before a big change and because B changes the product gate, not just the pricing section.

2. Which plans should appear on the public pricing grid?
   - Recommendation A: Show Starter, Pro, and Enterprise. Starter/Pro use `Start free trial`; Enterprise uses `Book a demo` until Enterprise checkout is explicitly enabled.
   - Trade-off: Matches the existing backend reality and the Writesonic-style enterprise pattern, but "all plans start trial" applies only to self-serve paid plans.
   - Recommendation B: Show Starter, Pro, and a new higher self-serve tier such as Growth/Team, all with trial checkout.
   - Trade-off: Closer to Writesonic's three paid self-serve tiers, but requires product/pricing decisions, Stripe prices, plan records, allowance rules, and more QA.
   - Selected: Recommendation A for implementation unless you want to introduce a new self-serve tier now.

3. What trial duration should we use?
   - Recommendation A: 7-day free trial on Starter and Pro.
   - Trade-off: Common SaaS trial length, limits cost exposure for AI-heavy project generation, and is easy to message.
   - Recommendation B: 14-day free trial.
   - Trade-off: Friendlier for slower evaluators, but increases AI usage exposure before first payment.
   - Selected: Recommendation A unless you prefer a longer evaluation window.

4. How should annual pricing be handled on the landing page?
   - Recommendation A: Add a page-level monthly/annual toggle and show monthly-equivalent annual pricing with savings labels, matching the current `plan_prices` concept.
   - Trade-off: Familiar and similar to Writesonic, but the landing page must either hardcode marketing prices carefully or share a pricing model with billing.
   - Recommendation B: Keep landing static and route users to `/billing` for exact interval choices after signup.
   - Trade-off: Less implementation work, but it misses the requested monthly/annual toggle and weakens conversion.
   - Selected: Recommendation A.

## Recommended First Step

Build the landing pricing section as a reusable client component with static Maker Compass marketing copy and a monthly/annual toggle. Do not change Stripe behavior until the visual plan is approved, because the visual redesign can be reviewed safely without triggering billing side effects.

## Plan

1. Prepare pricing content and structure.
   - Replace the landing `plans` array with a richer pricing model: plan name, monthly price, annual monthly-equivalent price, savings label, summary, CTA, featured flag, and grouped feature sections.
   - Proposed groups adapted to Maker Compass:
     - Strategy & Research: market research, competitor/pricing scan, audience segments.
     - Planning Artifacts: product plan, first-version plan, tech spec/export where applicable.
     - Mockups & Handoff: three UI directions, AI build-tool recommendation, coding-agent handoff.
     - Capacity & Support: projects per month, users/team support, priority support.

2. Implement the public pricing UI.
   - Likely files:
     - `src/app/page.tsx`
     - optionally `src/components/landing/pricing-section.tsx` if the section becomes large enough to deserve extraction.
   - Add a monthly/annual segmented toggle.
   - Render checkmark bullets instead of plain paragraphs.
   - Keep Pro or the highest self-serve plan visually emphasized, but keep the styling within Maker Compass' restrained theme.
   - Remove the Free marketing card.
   - Use `Start free trial` CTAs for Starter/Pro and route to signup/auth with enough intent to preserve selected plan/interval if practical.
   - Use `Book a demo` or contact CTA for Enterprise unless you approve enabling Enterprise self-serve checkout.

3. Decide and implement trial checkout behavior only after pricing-section approval.
   - Add a constant or config for trial length.
   - Update `src/app/api/stripe/checkout/route.ts` to create subscription Checkout sessions with a Stripe subscription trial for eligible plans.
   - Preserve server-side validation through `plans` and `plan_prices`; do not trust landing-page plan names.
   - Ensure existing subscribers cannot start another trial because the route already blocks `active`, `trialing`, and `past_due` local subscriptions.
   - Update `src/app/(dashboard)/billing/page.tsx` to treat `trialing` as a current subscription state, not only `active`.
   - Confirm webhook syncing handles trialing subscriptions through `checkout.session.completed` and `customer.subscription.updated`.

4. Align plan data and docs.
   - If no database schema change is needed, avoid adding one.
   - If trial duration should become plan-specific, add a migration only after approval.
   - Update `PROJECT_CONTEXT.md` for public pricing/trial behavior.
   - If checkout/trial behavior changes, update `docs/plans/backend-change-history.md`.
   - If production Stripe configuration changes, update `docs/plans/security-release-checklist.md` and `docs/plans/manual-tasks-todo.md` as needed.
   - Create a review artifact after implementation with verification, code review, and security review.

5. Verify end to end.
   - Run focused type/lint checks available in the repo.
   - Run targeted tests for project allowance and Stripe subscription sync if changed.
   - Use the real local UI for the public pricing section and authenticated billing page.
   - Capture screenshots under `ui-evidence/<date>/writesonic-style-pricing-trials/` for desktop and mobile pricing states.
   - For actual Stripe checkout trial behavior, use test-mode/local verification or stop for explicit approval before any live/production Stripe trial smoke test.

## Milestones

- Plan approved: decisions on Free-path meaning, displayed plans, trial length, and Enterprise CTA are settled.
- Pricing UI complete: landing page shows monthly/annual pricing cards with grouped checkmark bullets and no Free card.
- Trial checkout complete: Stripe Checkout creates trialing subscriptions for eligible paid plans and billing recognizes trialing status.
- Verification complete: local UI screenshots, focused tests, code review, security review, and docs updates are recorded.

## Validation

- Public landing page:
  - Desktop and mobile screenshots show pricing cards with monthly/annual toggle, checkmarks, grouped feature categories, savings labels, trial CTAs, and no Free card.
  - Toggle does not cause layout shift or text overflow.
- Billing page:
  - Existing active and trialing subscriptions render as current plan states.
  - Interval controls still select valid `plan_prices`.
- Checkout:
  - Invalid or disabled plan/price pairs still fail server-side.
  - Eligible Starter/Pro checkout sessions include trial behavior only after approval.
  - Existing active/trialing/past-due subscribers cannot create duplicate trial subscriptions.
- Docs:
  - `PROJECT_CONTEXT.md` reflects any pricing/trial architecture change.
  - Backend history is updated if checkout, subscription, or entitlement behavior changes.
  - Production Stripe checklist/manual-task docs are updated if live configuration work is required.

## Risks And Mitigations

- Risk: A visual "Start free trial" CTA promises behavior Stripe does not yet implement.
  - Mitigation: Implement visual copy and checkout trial behavior in separate phases, and do not ship trial wording without the backend path.
- Risk: Removing Free from marketing while keeping internal Free fallback creates product ambiguity.
  - Mitigation: Treat this as a deliberate phased choice and document it; full checkout gating gets its own approval.
- Risk: Trial users consume expensive AI generation before payment.
  - Mitigation: Start with 7 days and keep project allowance enforcement active during `trialing`.
- Risk: Enterprise trial copy conflicts with current disabled Enterprise checkout.
  - Mitigation: Keep Enterprise as `Book a demo` unless you explicitly approve self-serve Enterprise.
- Risk: Billing page misses trialing subscriptions.
  - Mitigation: Update subscription loading to include `trialing` and verify the current-plan UI.

## Rollback Or Recovery

- UI rollback: revert the landing pricing component/array to the current Free/Starter/Pro cards.
- Checkout rollback: remove trial parameters from Stripe Checkout session creation, or disable checkout quickly through Supabase `plans.checkout_enabled = false` for public paid plans.
- Data recovery: trial subscriptions are Stripe-owned; use the Stripe Dashboard/portal flow for cancellation or conversion issues, and rely on webhook retry records for local sync recovery.

## Open Decisions

- Confirm whether Recommendation A is acceptable for "no Free plan" in this pass, or whether you want the full project-creation checkout gate now.
- Confirm 7-day vs 14-day trial.
- Confirm whether Enterprise should remain demo-only.
- Confirm whether the landing page should stay static or share pricing data with billing in a later refactor.

## Critique

### Software Architect

- The visual pricing section can be safely isolated, but true free-trial behavior crosses Stripe, subscriptions, project allowance, and billing UI. Keep those as a second phase behind explicit approval.

### Product Manager

- Trial-first pricing is clearer than a Free plan for a high-value AI workflow, but the product must not show "Start free trial" if the next step only creates a normal free account.

### Customer Or End User

- Users will expect the selected plan and interval to survive signup. If that is not implemented, the CTA feels weaker and users may have to reselect the plan in billing.

### Engineering Implementer

- The landing pricing markup in `src/app/page.tsx` is already large. Extracting a `PricingSection` component is likely cleaner than growing the page further.

### Risk, Security, Or Operations

- No secrets should be hardcoded. Stripe trial behavior should be configured through code constants or plan data, while live price IDs remain in Supabase/Stripe. Any live checkout smoke test needs explicit approval.
