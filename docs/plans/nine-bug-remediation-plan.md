---
implemented: true
implemented_at: 2026-07-02T23:06:18Z
implementation_summary: "Fixed the remaining mockup recovery/cleanup/planner and landing accessibility gaps, confirmed existing renderer regressions, and completed focused tests, typecheck, lint, and UI evidence."
---

# Plan: Nine Bug Remediation

## Goal
Fix the nine reported renderer, mockup generation, recovery/status, planner-brief, and landing accessibility bugs without changing the product architecture or introducing new dependencies.

## Assumptions
- The bug report is accurate and covers the intended scope for this pass.
- Existing active finalized mockups must never be deleted as part of draft cleanup.
- Current branch is the correct branch for this work.
- UI-visible changes should be verified through tests first; browser evidence is only meaningful if the changed landing/workspace states can be reached locally without spending AI/image credits.

## Clarifying Questions
1. Should abandoned mockup draft cleanup run opportunistically in app code or require a scheduled job?
   - Recommendation A: Add bounded opportunistic cleanup to existing generation/finalization paths.
   - Trade-off: Fixes the leak now without infrastructure, but cleanup only happens when users revisit related flows.
   - Recommendation B: Add a cron or background worker.
   - Trade-off: More complete lifecycle management, but larger deployment and operations surface.
   - Selected: Recommendation A, because the bug batch should stay local and avoid new infrastructure.
2. Should renderer fixes preserve fallback markdown when structured extraction is incomplete?
   - Recommendation A: Preserve every generated subsection through fallback rendering when specialized cards do not cover it.
   - Trade-off: Output may be less custom-designed in edge cases, but content is not silently dropped.
   - Recommendation B: Expand each specialized card type to model every prompt subsection.
   - Trade-off: More polished but substantially broader and more brittle.
   - Selected: Recommendation A, because correctness is the immediate failure mode.
3. Should the landing marquee switch to `next/image` while fixing accessibility?
   - Recommendation A: Use the existing Next/Image pattern if it is a small scoped change.
   - Trade-off: Better consistency with the codebase; minor markup change risk.
   - Recommendation B: Only add ARIA fixes to the existing raw images.
   - Trade-off: Smallest diff, but leaves a cleanup issue behind.
   - Selected: Recommendation A unless it creates unnecessary churn.

## Recommended First Step
Add focused regression tests for the renderer failures so the high-impact content-drop and duplicate-table bugs are proven before and after implementation.

## Plan
1. Fix Product Plan team/milestone rendering so non-phase subsections render even when phase cards exist, and add a render-tree regression test for current 3.1-3.3 checkpoint content.
2. Fix First Version Plan legacy fallback and tactical shortcut rendering so consolidated flow content is not duplicated and prose shortcuts are not hidden behind an empty extraction state.
3. Fix mockup generation durability and cleanup: guard upload-complete callbacks, add draft row and Storage cleanup for stale drafts, avoid recovery clobbering richer live rows, preserve terminal option statuses, and improve planner brief fallback diversity.
4. Fix landing marquee accessibility so duplicate loop content is hidden from assistive tech and logo/text announcements are not redundant.
5. Run focused tests, then lint/typecheck as time allows. Record verification and review findings.

## Architecture Improvement Opportunities
- Mockup draft cleanup lifecycle: Selected. Centralize draft row and Storage cleanup in `src/lib/mockup-option-drafts.ts` so manual routes, queue generation, and finalize flows share canonical-path protection. Benefit: fewer leaked draft objects. Trade-off: more careful canonical reference checks before Storage deletion.
- Recovery idempotency: Selected. Keep `/api/mockups/recover-options` insert-only and re-read drafts after Storage backfill. Benefit: live richer rows win over placeholder rows. Trade-off: one extra draft query during recovery.
- Prompt/planner input diversity: Selected. Keep `Core User Flows` scoped to workflow and use distinct candidate sections/labels for capabilities and candidate screens. Benefit: better hidden planner signal. Trade-off: weaker fallback text when old plans only have one consolidated section.
- Renderer fallback safety: Selected where existing tests already cover it. Preserve generated Product Plan and First Version Plan content through fallback rendering instead of silently dropping unsupported subsections. Benefit: safer prompt evolution. Trade-off: some edge content may render less custom-designed.
- Landing marquee accessibility: Selected. Expose the visual marquee for focused testing and keep duplicate pass hidden from assistive tech. Benefit: regression coverage for screen-reader noise. Trade-off: small test-only export from the page module.

## Milestones
- Renderer regressions fixed: Product Plan checkpoints, First Version fallback, and tactical shortcuts are covered by tests.
- Mockup durability fixed: upload callbacks, recovery, cleanup, statuses, and brief extraction have focused coverage or documented validation.
- Landing accessibility fixed: duplicated marquee content is hidden and logo announcements are not repeated.
- Review complete: plan, review artifact, and backend history are updated where required.

## Validation
- `npm test -- src/components/analysis/planning-document-blocks.test.tsx src/lib/mvp-plan-document.test.ts` for renderer changes.
- Focused mockup/status tests identified or added by the backend worker.
- `npm run typecheck` and `npm run lint` if practical after integration.
- UI evidence: landing markup can be visually checked if a dev server is already available or can be started safely; mockup/image generation will not spend credits just to verify cleanup.

## Risks And Mitigations
- Draft cleanup might delete active in-flight assets: scope cleanup to stale abandoned drafts and exact draft paths, never canonical saved mockup paths.
- Recovery race fixes might make backfill too conservative: use insert-only/non-clobbering behavior and keep live richer rows authoritative.
- Renderer fallbacks might duplicate content: add assertions for both presence and single rendering.
- Broad bug batch might cause conflicts with worker edits: keep local and delegated write sets disjoint.

## Rollback Or Recovery
- Revert the touched files and remove the added tests if regressions appear.
- Draft cleanup changes are bounded to stale draft rows/objects; finalized canonical mockups remain untouched.
- If callback-guard behavior hides an important failure, logs should still record the callback failure while allowing uploaded options to be recovered.

## Open Decisions
- None. Recommendation A was selected for all open questions per repo policy.

## Critique

### Software Architect
- This is a focused remediation batch, not a redesign. The main architecture concern is keeping recovery/cleanup idempotent and scoped so it does not weaken durable generation guarantees.

### Product Manager
- The highest value is preventing generated content and paid images from disappearing. Low-impact cleanup should not delay the high-impact renderer and generation fixes.

### Customer Or End User
- Users should see the plan text they paid to generate, avoid unnecessary mockup re-generation, and get clearer failed-option states.

### Engineering Implementer
- Tests should pin the exact reported failures. Avoid overfitting renderers to one fixture; fallback rendering is the safer default when prompt shapes evolve.

### Risk, Security, Or Operations
- No secrets or auth policy changes are expected. Storage cleanup is operationally sensitive and must only target draft paths owned by the current project/user flow.
