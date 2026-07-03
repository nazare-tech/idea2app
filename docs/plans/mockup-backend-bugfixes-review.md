# Review: Mockup Backend Bugfixes

## Scope
- Reviewed changes in `src/lib/mockup-option-drafts.ts`, `src/lib/mockup-design-plan.ts`, `src/lib/document-generation-service.ts`, `src/app/api/mockups/generate/route.ts`, `src/app/api/mockups/finalize/route.ts`, and `src/app/api/mockups/recover-options/route.ts`.
- Reviewed focused tests in `src/lib/mockup-option-drafts.test.ts`, `src/lib/mockup-design-plan.test.ts`, `src/lib/document-generation-display-status.test.ts`, and `src/lib/openrouter-image-mockup-pipeline.test.ts`.

## Verification
- `npm test -- src/lib/mockup-option-drafts.test.ts src/lib/mockup-design-plan.test.ts src/lib/document-generation-display-status.test.ts src/lib/openrouter-image-mockup-pipeline.test.ts` passed. Because the repo test script expands to `src/**/*.test.ts src/**/*.test.tsx`, this ran 345 tests.
- Follow-up validation in `docs/plans/nine-bug-remediation-review.md` fixed the `src/app/page.tsx` export issue and passed `npm run typecheck`.

## Fresh-Eyes Self Review
- Pass 1: Re-read the cleanup helper and route call sites. Fixed a TypeScript narrowing issue in the Storage path filter after typecheck caught it.
- Pass 2: Re-read the recovery route and planner fallback changes. Adjusted indentation in the recovery re-read branch; no behavior changes needed.

## Code Review Findings
- No unresolved findings in the scoped backend/mockup diff.
- Note: Bug 2 callback isolation and bug 7 terminal option-status preservation were already present in the current branch before this pass; tests now continue to cover bug 7, and the callback is guarded in `src/lib/openrouter-image-mockup-pipeline.ts`.

## Security Review Findings
- No new auth/RLS weakening found.
- Storage cleanup remains project/run scoped, validates draft option paths through existing normalization, and skips paths referenced by canonical mockup rows.
- Recovery backfill remains insert-only and now re-reads drafts before returning merged options.

## Remediation Checklist
- [x] Preserve uploaded options when draft callback fails.
- [x] Add Storage-aware draft cleanup without deleting finalized canonical mockups.
- [x] Make recovery response prefer fresh non-clobbered draft rows after insert-only backfill.
- [x] Preserve terminal mockup option statuses.
- [x] Avoid reusing Core User Flows for every mockup planner brief fallback.
