---
implemented: true
implemented_at: 2026-06-28T20:59:47Z
implementation_summary: Added authenticated draft mockup image access and progressive Concept 1/2/3 rendering for completed options before canonical finalization.
---

# Plan: Progressive Mockup Image Reveal

## Goal
Show mockup option images as soon as each option completes instead of waiting for all three options to be finalized into one saved mockups document. Preserve the canonical three-option document for completed mockups, but add a draft-safe UI path for partially generated options.

## Assumptions
- The desired behavior applies to both manual workspace generation and new-project/onboarding generation when the workspace is visible.
- The canonical saved `mockups` row should still require all three options, so existing renderer/export/navigation behavior remains stable after completion.
- Draft option images should only be visible to the owning user and project.

## Clarifying Questions
1. Should partial options appear as full concept cards or inside the existing generation loader?
   - Recommendation A: Render three placeholder concept sections and replace each placeholder with the finished image.
   - Trade-off: Best user clarity and matches the requested Concept 1/2/3 model, but touches more UI.
   - Recommendation B: Keep the current loader and only feed it finished images.
   - Trade-off: Smaller change, but less obvious which concept finished and less useful for inspection.
2. Should finalization still require all three options?
   - Recommendation A: Keep finalization strict.
   - Trade-off: Preserves current artifact contract and avoids partial canonical documents.
   - Recommendation B: Allow canonical mockups rows with fewer than three options.
   - Trade-off: Simpler progressive persistence, but risks breaking assumptions in renderer/navigation/tests.

## Recommended First Step
Add a draft option image proxy and a partial mockup preview component, then wire manual generation to show completed option cards immediately.

## Plan
1. Add or adjust focused tests for mockup image proxy authorization so draft run paths owned by a project can be served safely before finalization.
2. Add a draft-safe image URL path for generated/recovered options before finalization.
3. Add a progressive mockup preview UI with three stable concept sections, loading placeholders, and finished image cards.
4. Wire `ProjectWorkspace` display state so `mockupDraftOptions` and option statuses render during generation.
5. Add onboarding/server-side support for incremental option progress if feasible without destabilizing the queue; otherwise document remaining backend limitation.
6. Run focused tests, lint/type checks where feasible, and perform code/security review.

## Milestones
- Manual generation: Option A appears as soon as its request returns, while B/C placeholders remain.
- Finalization: Completed three-option mockups still render through the normal saved document path.
- Authorization: Draft image paths are scoped to owner/project/run and cannot expose unrelated storage paths.

## Validation
- Unit tests for draft image path authorization and/or URL building.
- Focused component/type checks for progressive preview props.
- Manual or browser verification if a local dev server and credentials are available.

## Risks And Mitigations
- Risk: Draft image proxy could expose private Supabase storage paths.
  - Mitigation: Validate project ownership, path prefix, expected option filename, and run id shape before download.
- Risk: Onboarding still uses the all-options `Promise.all` path and may not stream partial state to the workspace.
  - Mitigation: Prefer reusing the option-invocation path or persist recoverable draft metadata if scope allows.
- Risk: Existing finalized mockup renderer regresses.
  - Mitigation: Leave finalized `mockups.content` contract unchanged.

## Rollback Or Recovery
Revert the progressive preview wiring and draft proxy changes; the existing strict finalization path will continue to render completed mockups after all three options are ready.

## Open Decisions
- Use concept-card partial UI as the default because the user explicitly allowed Concept 1/2/3 placeholders.
- Keep canonical finalization strict unless later product direction changes.

## Critique

### Software Architect
- The cleanest stable contract is a separate draft preview surface, not a partial canonical `mockups` row. This avoids breaking downstream consumers that expect three options.

### Product Manager
- Progressive reveal improves perceived latency, but users still need clear labels that remaining options are in progress.

### Customer Or End User
- Seeing one finished concept immediately is valuable only if it is inspectable at normal size, not hidden in a decorative loader.

### Engineering Implementer
- The highest-risk detail is image proxy authorization for draft files, because generated option URLs currently depend on saved `mockups.content`.

### Risk, Security, Or Operations
- Draft image access must remain project-owner scoped and should not become a generic storage downloader.
