---
implemented: true
implemented_at: 2026-07-02T22:57:08Z
implementation_summary: "Fixed scoped mockup backend recovery, cleanup, status, and planner brief fallback bugs with focused regression coverage."
---

# Plan: Mockup Backend Bugfixes

## Goal
Fix the scoped backend/mockup bugs from the pasted report: preserve uploaded option images when progress callbacks fail, clean stale draft rows and draft Storage objects without deleting finalized mockups, make recovery insert-only and non-clobbering, keep terminal mockup option statuses visible, and avoid repeating Core User Flows across all mockup planner brief fallbacks.

## Assumptions
- Work stays on the current branch and avoids out-of-scope UI files.
- Existing concurrent edits are user/other-agent work and should be preserved.
- Storage cleanup may delete draft objects only when their run is not referenced by canonical mockups.
- Bug 2 and bug 7 appear already partially fixed in the current branch; focused tests should preserve those behaviors.

## Clarifying Questions
1. Should successful canonical finalize remove draft Storage objects for that same run?
   - Recommendation A: Remove draft rows and their draft Storage objects after canonical save, while protecting canonical references by path.
   - Trade-off: Prevents orphaned Storage objects while requiring cleanup to run only after the canonical row is durable.
   - Recommendation B: Delete only draft rows on successful finalize and rely on aged cleanup for Storage.
   - Trade-off: Less immediate risk, but leaves Storage clutter on every happy-path run.
   - Selected: Recommendation A because the bug explicitly calls out Storage cleanup and canonical rows still reference the same paths.
2. How should recovery handle Storage-only placeholder options during live generation races?
   - Recommendation A: Insert placeholders only when missing, then re-read drafts before returning so live richer drafts win.
   - Trade-off: Adds one extra read but avoids stale response content and database clobbering.
   - Recommendation B: Keep returning the in-memory merge after insert-only backfill.
   - Trade-off: Fewer reads but can return stale placeholder content even when DB rows are richer.
   - Selected: Recommendation A because recovery is called while generation can still be in flight.

## Recommended First Step
Add focused regression tests for the missing failure modes before changing implementation: happy-path draft Storage cleanup, recovery re-read semantics where feasible, and distinct planner brief fallback fields.

## Plan
1. Strengthen tests for draft cleanup, callback isolation, terminal statuses, recovery non-clobbering, and planner brief fallback diversity.
2. Update `mockup-option-drafts` so draft deletion can optionally remove unreferenced draft Storage objects, while retaining aged abandoned cleanup protections.
3. Update finalize/generation cleanup call sites to use Storage cleanup after canonical save.
4. Update recovery to backfill insert-only and re-read draft rows before merging/returning options.
5. Update mockup brief extraction so `mvpCapabilities` and `candidateScreens` prefer distinct sections/labels before falling back to any workflow-derived text.
6. Run focused tests and typecheck where feasible.

## Milestones
- Regression coverage: focused tests fail for at least the missing cleanup/fallback behavior before implementation where practical.
- Implementation: scoped source changes only in the named backend/mockup files.
- Verification: focused tests pass and broader static validation is attempted.

## Validation
- `npm test -- src/lib/mockup-option-drafts.test.ts src/lib/mockup-design-plan.test.ts src/lib/document-generation-display-status.test.ts src/lib/openrouter-image-mockup-pipeline.test.ts`
- `npm run typecheck`

## Risks And Mitigations
- Risk: Storage cleanup could remove canonical mockup images.
  - Mitigation: Only remove paths from validated draft rows for the current run after canonical insert, and exclude any paths referenced by canonical rows.
- Risk: Recovery adds latency.
  - Mitigation: Re-read only one run's draft rows after attempted backfill.
- Risk: Planner fallback changes reduce context when new headings are absent.
  - Mitigation: Use targeted fallback labels and keep generic fallback text when no distinct section exists.

## Rollback Or Recovery
Revert the scoped source and test changes. Existing canonical mockup rows remain intact because cleanup only runs after save and protects canonical paths.

## Open Decisions
- None.

## Critique

### Software Architect
- The safest fix is centralized cleanup in `mockup-option-drafts` so API routes and queue generation share one protected behavior.

### Product Manager
- The change improves reliability after timeouts and refreshes without changing the visible mockup generation flow.

### Customer Or End User
- Users should see already-generated mockups recovered more reliably instead of paying latency/cost for full regeneration after partial failures.

### Engineering Implementer
- Mocked Supabase builders are brittle; keep tests focused on helper behavior and avoid large API-route harnesses unless necessary.

### Risk, Security, Or Operations
- No secret handling changes. Storage deletion must stay project/run scoped and avoid finalized canonical mockup paths.
