---
implemented: false
implemented_at: null
implementation_summary: null
---

# Shared Pricing Components + UI Performance Pass

## Goal

1. Make the landing page pricing grid and the billing page "Available Plans" render from the same components and the same plan display copy, so a future change updates both surfaces at once.
2. Sweep for other duplicated component patterns (same UI built twice) and consolidate the worthwhile ones.
3. Ship 5 to 6 concrete UI performance improvements.

## Assumptions

- The DB (`plans` + `plan_prices`) stays authoritative for checkout: plan ids, Stripe price ids, and actual charged amounts. The shared display config is authoritative for marketing copy: feature lists, "Everything in X plus:" labels, highlight treatment, CTA labels.
- Offered intervals are Monthly and Annual only (6-month `plan_prices` rows are deactivated; `is_active = false`). The billing page should filter on `is_active` and present a single Monthly/Yearly toggle exactly like the landing page.
- Landing prices stay statically configured (public page, no DB dependency); billing prices come from `plan_prices`. Both live at $19/$49 monthly with 15% yearly discount, so they match today; the shared config carries the static numbers.

## Clarifying Questions (self-answered, session is autonomous)

**Q1: Should the billing page card adopt the landing card design, or keep its dashboard Card look?**
- A: Adopt the shared landing-style card with a rounded-corner variant (design rule: sharp corners on landing, gently rounded inside `/(dashboard)`). One component, one `corners` prop. Trade-off: billing loses its icon-per-plan header, gains exact copy parity. **Selected: A.**
- B: Keep two visual designs and only share the data. Rejected: user explicitly asked for shared components, not just shared data.

**Q2: Where do billing feature lists come from, DB `plans.features` or shared config?**
- A: Shared config keyed by plan name (fallback to DB features for unknown plan names). Guarantees parity with landing. **Selected: A.**
- B: DB features on both. Rejected: landing is a public static page; adding a DB fetch there adds latency and a failure mode.

## Architecture Improvement Opportunities

- `src/lib/pricing-plans.ts`: single source of truth for plan display copy + yearly discount constant.
- `src/components/pricing/plan-card.tsx`: shared presentational plan card (landing design, corner variant).
- `src/components/pricing/billing-interval-toggle.tsx`: shared Monthly/Yearly segmented pill (currently built twice in different styles).
- Billing page drops `getPlanIcon`, per-plan 3-way price selector, and its ad-hoc feature row markup.

## Plan

### Phase 1: Shared pricing components
1. Add `src/lib/pricing-plans.ts` (YEARLY_DISCOUNT_PERCENT, PlanDisplay config for Free/Starter/Pro, `getPlanDisplay(name)` helper).
2. Add `PlanCard` (props: display, price line, bill note, badge, cta ReactNode, corners) and `BillingIntervalToggle`.
3. Rewrite landing `PricingSection` on top of them (visual output unchanged).
4. Rewrite billing "Available Plans": filter `plan_prices` to `is_active`, map monthly/yearly to the page-level toggle, render `PlanCard` with DB prices and checkout/current-plan/free CTAs.

### Phase 2: Duplicate-pattern sweep
- Consolidated by Phase 1: plan copy, plan card, feature check rows, segmented toggle, duplicated CTA button class strings inside `pricing-section.tsx`.
- Verify no other surface hardcodes plan copy (grep "Starter", "projects/mo", "Best Value", etc.).

### Phase 3: Performance improvements (6)
1. `next/dynamic` import of `MockupGenerationLoader` in `scrollable-content.tsx` (keeps `img-fx` + `three` out of the workspace bundle until mockup generation actually renders).
2. Hero artwork rAF loop: skip on <lg viewports (artwork is display:none there) and pause when the hero is off-screen and the scatter/parallax has settled (IntersectionObserver + settle check).
3. Cache the landing user count with `unstable_cache` (60s revalidate); waitlist gating already fails open, 60s staleness is acceptable.
4. Billing page: parallelize plans/subscription/allowance fetches with `Promise.all` (folded into the Phase 1 rewrite).
5. `React.memo` on `MarkdownRenderer` so scroll-driven `activeSectionId` changes stop re-parsing every large workspace document.
6. Preconnect to the Supabase origin in the root layout (first client-side auth/data call skips DNS+TLS setup).

## Milestones
- M1: Phase 1 complete, both surfaces render from shared components, commit.
- M2: Phase 2 sweep, commit (with Phase 1 if trivial).
- M3: Phase 3 perf items, commit.
- M4: Browser verification of landing pricing + billing page + workspace, lint/build green, push.

## Validation
- `npm run lint` and `npx tsc --noEmit` (or build) green.
- Browser: landing `#pricing` renders identically (toggle works, yearly math right); `/billing` shows the same plan copy with DB prices, interval toggle, checkout button states.
- Workspace still renders documents and mockup loader.

## Risks
- Billing checkout regression: interval mapping must select the correct `stripe_price_id`. Mitigated by keeping `isCheckoutReadyPlanPrice` logic and disabling CTA when no ready price.
- Plan-name drift between DB and config: unknown plan names fall back to DB description/features rather than disappearing.

## Rollback
- Each phase is a separate commit; revert individually.

## Open Decisions
- None blocking.

## Critique (five perspectives)
- **User**: Sees identical plan copy everywhere; billing gains the clearer landing card. Win.
- **Maintainer**: One config file to edit for plan copy changes. Win.
- **Performance**: three.js out of the workspace bundle is the single largest byte win; MarkdownRenderer memo is the largest interaction win.
- **Security**: No new endpoints; billing still validates checkout server-side.
- **Design**: Corner-variant respects the landing-sharp / dashboard-rounded idiom; Action Red usage unchanged.
