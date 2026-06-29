---
implemented: true
implemented_at: 2026-06-18T07:08:02Z
implementation_summary: Updated the homepage hero, CTAs, proof points, and pricing copy to make the landing page more outcome-led and entitlement-aligned.
---

# Plan: Maker Compass Homepage Conversion Update

## Goal
Integrate the conversion analysis into the public Maker Compass homepage by making the promise more concrete, sharpening signup CTAs, adding stronger proof directly under the hero and near the closing CTA, and simplifying pricing comprehension without changing the auth, waitlist, or project intake architecture.

## Assumptions
- The page should keep its current visual structure, hero artwork, idea-input pattern, auth modal flow, and waitlist behavior.
- The proof numbers can be framed as product/outcome claims rather than live database metrics unless real traction metrics are provided.
- Pricing should reflect the current project-allowance model first and keep token details secondary for extra manual-generation paths.
- No new dependency is needed; this should stay inside existing Next.js, React, Tailwind, lucide, and shared UI patterns.

## Clarifying Questions
1. Should proof use real traction numbers or conservative product capability numbers?
   - Recommendation A: Use conservative product capability numbers such as "4 build artifacts", "under 5 minutes to first plan", and "one intake, one project context" if real usage stats are not available.
   - Trade-off: Honest and immediately shippable, but less persuasive than true customer traction.
   - Recommendation B: Use real traction numbers such as ideas validated, reports generated, active builders, or customer outcomes if you can provide them.
   - Trade-off: Stronger conversion proof, but requires accurate source data and ongoing maintenance.
2. Should we replace the existing single animated testimonial band or keep it and add a separate proof strip?
   - Recommendation A: Keep the testimonial band, add a compact proof strip immediately under the hero, and add one compact proof point near the final CTA.
   - Trade-off: Lowest implementation risk and preserves current branded motion.
   - Recommendation B: Replace the testimonial band with a richer multi-testimonial section.
   - Trade-off: Stronger social proof if real quotes exist, but needs more copy assets and more layout work.
3. How direct should the CTA language be?
   - Recommendation A: Use "Get my build plan" for the hero input and "Turn my idea into a plan" for the final CTA.
   - Trade-off: Clear outcome language and matches the conversion note, though it simplifies the broader artifact set into "plan."
   - Recommendation B: Use "Generate my startup plan" everywhere.
   - Trade-off: More consistent, but a little more generic and less personal.
4. Should the headline itself change or should the current emotional headline stay?
   - Recommendation A: Keep the current headline and strengthen the subheadline to name market research, product plan, design mockups, and a first-version build plan.
   - Trade-off: Preserves the page's current brand voice while making the outcome concrete.
   - Recommendation B: Replace the headline with a more literal outcome headline.
   - Trade-off: Potentially clearer, but loses the memorable "weekend, not someday" positioning.

## Recommended First Step
Make a narrow copy and layout update in the existing homepage files, using conservative proof claims unless real traction metrics are supplied.

## Plan
1. Update hero copy and primary idea-submit CTA.
   - Change the supporting hero paragraph to explicitly name market research, product plan, design mockups, and a first-version build plan.
   - Change the `LandingIdeaCapture` idle button from "Validate idea" to "Get my build plan" while preserving loading and auth handoff behavior.
2. Add a proof strip under the hero.
   - Add a compact three-column proof row in `src/app/page.tsx`, before `BuildMap`.
   - Use values that are truthful without requiring live analytics if no real numbers are available.
3. Improve pricing comprehension.
   - Adjust `plans` data so the first point leads with current project capacity per plan.
   - Move token details out of the primary pricing explanation because bundled onboarding generation is project-based.
4. Sharpen the final CTA and add a late proof cue.
   - Replace generic final non-waitlist CTA text with "Turn my idea into a plan."
   - Add a concise proof/outcome line near the final CTA.
5. Verify.
   - Run `npm run typecheck` and `npm run lint` if feasible.
   - Start `npm run dev` and use the Codex in-app browser workflow to visually inspect the homepage desktop and mobile states, including non-overlap and CTA text.

## Milestones
- Copy milestone: Hero, CTA, pricing, and final CTA strings reflect the conversion recommendations.
- Proof milestone: A proof strip is visible directly after the hero and a second proof cue appears near the final CTA.
- Verification milestone: Type/lint checks pass or any failures are explained, and the homepage is visually checked.

## Validation
- `npm run typecheck`
- `npm run lint`
- Local browser check of `/` at desktop and mobile widths, confirming the proof strip appears under the hero, the hero input button reads "Get my build plan", pricing leads with project capacity, and the final CTA reads "Turn my idea into a plan."

## Risks And Mitigations
- Risk: Invented traction stats would damage trust.
  - Mitigation: Use capability/progress claims unless you provide real usage numbers.
- Risk: Adding proof content could make the first viewport too dense.
  - Mitigation: Place proof below the hero section rather than inside the hero card/input.
- Risk: Pricing copy could drift from billing entitlements.
  - Mitigation: Use the current project allowance fallbacks from `src/lib/project-allowance.ts` rather than token-derived report estimates.
- Risk: Waitlist mode could receive mismatched CTA language.
  - Mitigation: Keep waitlist-specific CTA branches intact and only change non-waitlist signup copy where appropriate.

## Rollback Or Recovery
Revert the changes in `src/app/page.tsx` and `src/components/landing/landing-idea-capture.tsx`. No database, API, auth, billing, or dependency changes are planned.

## Open Decisions
- Decision: Use Recommendation A for all clarifying questions.
- Use conservative product capability proof instead of unsourced traction metrics.
- Keep the existing animated testimonial band and add a compact proof strip under the hero plus a late proof cue near the final CTA.
- Use "Get my build plan" for the hero idea CTA and "Turn my idea into a plan" for the final non-waitlist CTA.
- Keep the current emotional headline and strengthen the subheadline with concrete artifacts.
- Avoid promising the archived Launch Plan artifact; use "first-version plan" and "build plan" in public copy.

## Critique

### Software Architect
- The update should stay as copy/data changes in existing landing components. Introducing analytics fetching or new shared primitives would be unnecessary for this conversion pass.

### Product Manager
- The biggest product risk is proof credibility. If real usage numbers exist, they should replace conservative claims before this becomes paid acquisition copy.

### Customer Or End User
- A solo founder needs to understand exactly what they get before signing up. The new copy should emphasize deliverables and outcomes, not internal token mechanics.

### Engineering Implementer
- The page is mostly server-rendered with one client idea-capture component. The implementation should avoid changing the intake handoff and should keep visual changes small enough for focused browser verification.

### Risk, Security, Or Operations
- This is low security risk if it remains presentational. Avoid adding user-count or usage-stat claims from private data unless intentionally aggregated and approved.
