# Review: Nine Bug Remediation

## Scope
- Renderer regressions for Product Plan and First Version Plan blocks.
- Mockup draft lifecycle, recovery, terminal status, and planner brief behavior.
- Landing marquee accessibility and focused render coverage.
- Documentation updates for the plan, project context, and backend change history.

## Verification
- `npm test -- src/components/analysis/planning-document-blocks.test.tsx src/lib/mvp-plan-document.test.ts` passed.
- `npm test -- src/lib/mockup-option-drafts.test.ts src/lib/mockup-design-plan.test.ts src/lib/document-generation-display-status.test.ts src/app/page.test.tsx` passed.
- `npm test -- src/app/page.test.tsx src/lib/mockup-option-drafts.test.ts src/lib/mockup-design-plan.test.ts src/lib/document-generation-display-status.test.ts src/components/analysis/planning-document-blocks.test.tsx src/lib/mvp-plan-document.test.ts` passed.
- `npm run typecheck` passed.
- `npm run lint` passed with one existing warning in `output/playwright/prod-full-flow.mjs`.
- `git diff --check` passed.
- Real local UI check: `http://localhost:3020`, 1440x1000 viewport. Browser assertion found 34 marquee items, 17 duplicate items hidden from assistive tech, and all marquee images with empty alt text.
- UI evidence: [landing-marquee-1440.png](/Users/Mukul/Documents/GitHub/2026 projects/5_idea2app/ui-evidence/2026-07-02-nine-bug-remediation/landing-marquee-1440.png).

## Fresh-Eyes Self Review
- Pass 1: Reviewed mockup cleanup and recovery changes for canonical Storage deletion risk. Confirmed cleanup checks canonical mockup content and metadata before deleting Storage paths.
- Pass 2: Reviewed landing page extraction after typecheck failed on exporting a component from `page.tsx`. Fixed by moving the marquee to `src/components/landing/tool-logo-marquee.tsx` and retesting.

## Architecture Improvement Review
- Durability/idempotency: Selected improvements landed in draft cleanup and recovery re-read behavior.
- Ownership/security validation: Existing project/user/run scoping and draft image path validation were preserved. Storage deletion uses service role only after owner-scoped route/service work identifies draft paths.
- Contract sync: Existing Product Plan and First Version Plan renderer tests already covered the reported renderer bugs; no extra renderer code churn was needed.
- Structured-output validation and repair bounds: No parser repair changes were needed.
- Recovery behavior: Recovery remains insert-only and now returns rows after a fresh draft read when it backfills Storage-only options.
- Shared abstractions or intentionally retained duplication: Draft cleanup stayed centralized in `mockup-option-drafts`; landing marquee was extracted into a reusable component rather than exported from an App Router page.
- Follow-up risks: A future scheduled cleanup job could make abandoned draft cleanup independent of user-triggered generation.

## Code Review Findings
- Medium, fixed: Exporting `ToolLogoMarquee` directly from `src/app/page.tsx` broke Next App Router typecheck. Moved the component to `src/components/landing/tool-logo-marquee.tsx`.
- Low, accepted: `deleteMockupOptionDrafts` now has an optional Storage deletion mode. It is guarded by canonical reference checks and covered by tests for referenced and unreferenced paths.

## Security Review Findings
- No auth/RLS changes.
- No secrets were added.
- Storage deletion remains limited to validated draft paths and skips canonical references.
- Recovery backfill stays insert-only to avoid clobbering richer live generation rows.

## Remediation Checklist
- [x] Fix App Router page export issue.
- [x] Verify focused tests.
- [x] Verify typecheck and lint.
- [x] Capture landing-page UI evidence.
