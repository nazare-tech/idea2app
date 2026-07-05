---
implemented: true
implemented_at: 2026-06-28T21:13:45Z
implementation_summary: Completed durable per-option mockup draft persistence, recovery, draft image authorization, refresh recovery, and cleanup after canonical finalization.
---

# Plan: Durable Mockup Option Drafts

## Goal
Persist each completed mockup option to the database as soon as its image is uploaded, so a user who refreshes after seeing Concept 1 can recover that option without waiting for all three options to finalize.

## Assumptions
- The canonical `mockups` row should still require all three options.
- Partial options should live in a separate draft/progress table, not in the canonical document table.
- Draft image access should require both project ownership and a matching draft row.
- Existing localStorage run-id behavior remains useful as the pointer for recovery after refresh.

## Clarifying Questions
1. Should canonical finalization still require three options?
   - Recommendation A: Keep strict finalization.
   - Trade-off: Preserves renderer/document assumptions, but requires a separate draft table for progress.
   - Recommendation B: Allow partial canonical rows.
   - Trade-off: Simplifies persistence but risks breaking saved-document assumptions.
2. Should draft rows be deleted after finalization?
   - Recommendation A: Delete rows for the finalized run.
   - Trade-off: Keeps the table small, but removes post-hoc draft diagnostics.
   - Recommendation B: Keep rows after finalization.
   - Trade-off: Better debugging history, but creates redundant long-lived records.

## Recommended First Step
Add the draft table and server helper first, with pure tests for draft row validation/sorting before wiring routes.

## Plan
1. Add `mockup_option_drafts` migration with project/user ownership, option label uniqueness, RLS, indexes, and timestamp trigger.
2. Add a server helper for upserting, reading, authorizing, and cleaning draft rows.
3. Persist draft options from single-option generation, full mockup generation, and Generate All/onboarding generation.
4. Update recovery and image proxy routes to use draft rows before Storage fallback, and require a draft row for draft image proxy access.
5. Update the workspace recovery effect so refresh with a known run id pulls draft rows back into the UI.
6. Verify with focused tests, typecheck, lint, full tests, and UI preview.

## Milestones
- Database durability: completed option rows are upserted by project/run/label.
- Refresh recovery: `/api/mockups/recover-options` returns database-backed draft options.
- Authorization: draft image proxy access requires authenticated ownership plus a matching draft row.
- Finalization cleanup: successful canonical save removes draft rows for that run.

## Validation
- Unit tests for draft helper sorting, URL reconstruction, and draft path authorization.
- Existing mockup pipeline and renderer tests still pass.
- `npm run typecheck`, `npm run lint`, and `npm test` pass.
- Visual preview still shows one ready concept and two placeholders.

## Risks And Mitigations
- RLS mismatch blocks inserts: keep policies consistent with `mockups` and `prompt_lab_runs`.
- Generated DB types become stale: update local types manually for the new table shape or use tightly scoped Supabase casts.
- Draft proxy over-permits private storage: validate path shape and require a matching draft row before download.
- Browser refresh loses run id: retain existing localStorage run id and add recovery on mount.

## Rollback Or Recovery
Revert the migration/helper/route/UI changes. Existing canonical mockups and private storage objects remain compatible because draft rows are additive.

## Open Decisions
- Decision: Keep strict finalization and use draft rows for progressive recovery.
- Decision: Delete draft rows after successful finalization.

## Critique

### Software Architect
- A separate table is the cleanest boundary because it keeps partial progress out of canonical artifact contracts, but it introduces another persistence path that must stay in sync with image storage.

### Product Manager
- This reduces the frustrating case where users saw an image but lost it on refresh. The visible behavior remains simple: concepts appear as they finish.

### Customer Or End User
- The user should not need to understand draft rows. Refresh should restore generated concepts as long as the run id is still in localStorage or the queue run is active.

### Engineering Implementer
- The highest-risk integration point is background Generate All because generation happens in service code. A callback after each uploaded option keeps persistence close to the upload completion.

### Risk, Security, Or Operations
- Draft image proxying must not fall back to broad project ownership alone. The path should be exact and backed by a database row for the current user/project/run.
