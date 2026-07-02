---
implemented: true
implemented_at: 2026-07-02T22:42:01Z
implementation_summary: Fixed the confirmed planning-renderer, mockup-durability, recovery/status, cleanup, and landing-marquee accessibility defects from the architecture review.
---

# Plan: Architecture Review Remediation

## Goal
Fix the confirmed defects from the architectural review report after checkpointing and pushing the current `main` state. The outcome should preserve generated content, harden mockup draft persistence and recovery, improve failed mockup status display, remove landing-page accessibility duplication, and update the required review/history docs.

## Assumptions
- The five "Top Architectural Improvements" in the report describe already-landed strengths; the implementation scope is the nine confirmed bugs plus minor cleanup that is safe and closely related.
- Current branch `main` is the intended working branch.
- Recommendation A defaults apply unless a choice would delete data, weaken auth/RLS, require credentials, or make an irreversible production change.
- No production data cleanup job will be run from this task; any cleanup will be represented as code paths or a safe migration/helper only.

## Clarifying Questions
1. Should abandoned mockup draft cleanup include a database TTL mechanism now?
   - Recommendation A: Add safe code-level cleanup helpers for draft rows plus their Storage objects, wire cleanup to known success/recovery paths, and document TTL/cron as a follow-up if no scheduler exists.
   - Trade-off: Reduces leaks in normal flows without introducing operational scheduler assumptions; abandoned runs may still need a later cron/manual cleanup.
   - Recommendation B: Add a database migration and scheduled cleanup function now.
   - Trade-off: More complete, but requires deployment/runtime scheduler decisions and can delete production artifacts if retention policy is wrong.
   - Selected: Recommendation A because the repo does not expose a scheduler contract and deletion of abandoned production artifacts needs explicit retention policy.
2. How should transient draft-upsert failures affect expensive mockup generation?
   - Recommendation A: Treat option image upload as authoritative for generation success, log draft callback failures, and rely on recover-options to backfill from Storage.
   - Trade-off: Avoids wasting paid image generations; recovery must be robust and visible.
   - Recommendation B: Keep failing the whole batch when a draft row cannot be written.
   - Trade-off: Simpler transactional semantics, but reintroduces paid-image loss from transient DB errors.
   - Selected: Recommendation A because it matches the durable Storage-first recovery architecture.
3. Should dead landing BuildMap code be deleted?
   - Recommendation A: Only remove it if no imports/usages remain and the deletion is narrow, otherwise keep this task focused on accessibility.
   - Trade-off: Avoids unrelated churn while still allowing obvious dead-code cleanup.
   - Recommendation B: Always delete the component and CSS now.
   - Trade-off: Cleaner tree, but higher risk of removing a reusable asset outside the reported bug.
   - Selected: Recommendation A.

## Recommended First Step
Add focused tests that demonstrate the confirmed failures where practical: PRD timeline H3 preservation, MVP alias de-duplication, tactical shortcut prose handling, mockup option callback resilience, recovery non-clobbering, failed-state option statuses, and landing marquee accessibility.

## Plan
1. Planning document renderers:
   - Preserve Product Plan Team and Milestones H3 checkpoint content in `TimelineShowcase`.
   - Prevent legacy First Version Plan fallback from rendering the same `Core User Flows` section as scope, feature summary, and user flow.
   - Avoid empty Tactical Shortcuts cards when generated prose is not a bullet list.
2. Mockup persistence and recovery:
   - Guard `onOptionGenerated` callback failures after Storage upload.
   - Add cleanup support for Storage objects when deleting draft rows where safe.
   - Make recover-options avoid overwriting richer draft option content with placeholders during live-generation races.
   - Preserve option statuses for mockup error/cancelled states so the UI can show failed/retry context.
3. Landing accessibility and minor cleanup:
   - Hide duplicated marquee items from assistive tech.
   - Avoid redundant image alt plus visible text announcements.
   - Remove dead BuildMap code only if usage search proves it is unreachable and deletion is narrow.
4. Documentation and review:
   - Update `PROJECT_CONTEXT.md` if runtime architecture changes.
   - Add `docs/plans/architecture-review-remediation-review.md` with verification, fresh-eyes review, code-review findings, security-review findings, and remediation status.
   - Update `docs/plans/backend-change-history.md` for mockup draft persistence/recovery behavior.

## Milestones
- Renderer correctness: Current and legacy planning documents keep generated content without duplicate fallback blocks.
- Mockup durability: Uploaded options are not discarded by transient draft persistence failures, and recovery does not degrade richer rows.
- Accessible landing marquee: Screen readers see one logical list of tool names without duplicated announcements.
- Review complete: Tests, typecheck/lint/build where feasible, code review, security review, and backend history are recorded.

## Validation
- Focused Node tests for touched parser/render/status/recovery helpers.
- `npm run typecheck`
- `npm test`
- `npm run lint`
- `npm run build` if time and local environment allow.
- UI-visible landing accessibility should be validated by rendered markup/test coverage; no authenticated UI path is meaningful for backend-only mockup recovery helpers unless a real generation flow is run.

## Risks And Mitigations
- Risk: Cleanup code could delete canonical saved mockup images.
  - Mitigation: Scope cleanup only to draft rows/run IDs and draft option storage paths; do not run broad deletion.
- Risk: Renderer fixes could display duplicate Product Plan content.
  - Mitigation: Add tests for preserved H3 content and non-duplicated legacy fallback.
- Risk: Swallowing draft callback errors could hide persistent DB failures.
  - Mitigation: Log structured warnings/errors and rely on recovery backfill from Storage.
- Risk: Recovery non-clobbering could miss updating stale placeholders.
  - Mitigation: Only prevent lower-fidelity placeholder overwrites when a matching richer row exists; still allow missing-label backfill.

## Rollback Or Recovery
Revert the remediation commit to restore prior behavior. For mockup draft cleanup changes, rollback is code-only unless a later explicit production cleanup job is added; no broad data deletion is planned.

## Open Decisions
None. Recommendation A defaults are selected for all open choices.

## Critique

### Software Architect
- The mockup flow needs a clear source-of-truth hierarchy: Storage upload success should survive DB draft failures, DB drafts should preserve metadata richness, and canonical `mockups` finalization should remain the stable output.

### Product Manager
- Fixing invisible generated planning content matters because users trust the AI output less when promised sections disappear. Mockup durability reduces paid wait-time frustration.

### Customer Or End User
- Users should see clear failed/retry state for mockup options instead of indefinite waiting, and assistive-tech users should not hear duplicated landing-page content.

### Engineering Implementer
- Keep changes local to render helpers, mockup draft helpers, recovery routes, and landing markup. Avoid pulling unrelated prompt rewrites into this remediation.

### Risk, Security, Or Operations
- Do not weaken ownership checks or RLS. Any Storage cleanup must use already-owned project/run context and should not introduce unauthenticated deletion paths.
