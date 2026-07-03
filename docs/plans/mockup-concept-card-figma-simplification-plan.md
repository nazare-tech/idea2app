---
implemented: true
implemented_at: 2026-07-03T14:07:10-04:00
implementation_summary: Simplified OpenRouter storyboard concept cards to match the referenced Figma card while preserving saved mockup content compatibility.
---

# Plan: Mockup Concept Card Figma Simplification

## Goal
Update the OpenRouter storyboard Design Mockups concept cards to match the referenced Figma node: a simplified white bordered card with 24px internal spacing, compact concept label/title header, one Export Image action, one rounded wide image button, and a single design-rationale paragraph.

## Assumptions
- The target is the current OpenRouter image storyboard renderer, not the legacy Stitch or json-render fallback paths.
- Existing saved mockup JSON should remain compatible; generated `screens` metadata can stay stored even if it is no longer rendered as chips.
- No database migration is needed because the visible change can be handled in the renderer.

## Clarifying Questions
1. Should screen captions remain visible below each storyboard?
   - Recommendation A: Remove visible screen-caption chips from the concept cards and keep the metadata only.
   - Trade-off: Matches Figma and reduces clutter; screen-level metadata is no longer visible in the main workspace.
   - Recommendation B: Keep screen captions in a collapsed/details treatment.
   - Trade-off: Preserves information but does not match the simplified Figma node.
   - Selected: Recommendation A, because the Figma node explicitly removes those components.
2. Should this change alter the AI generation prompt or stored content shape?
   - Recommendation A: Avoid prompt/data changes unless the renderer cannot achieve the design.
   - Trade-off: Lowest regression risk and preserves old saved rows; generated rationales may keep their existing wording.
   - Recommendation B: Change the image-model system prompt to require a `Design rationale:` paragraph.
   - Trade-off: Tighter future copy, but it changes backend generation behavior and needs broader verification.
   - Selected: Recommendation A for this pass; UI can normalize/present the description without contract churn.

## Recommended First Step
Update the focused renderer test to fail on the removed screen-caption chips and assert the simplified card structure, then patch `OpenRouterImageMockupViewer`.

## Architecture Improvement Opportunities
- Preserve compatible typed content shape: Keep `screens` in `OpenRouterImageMockupOption` while removing only the presentation branch. Benefit: no migration or recovery impact. Trade-off: stored metadata is no longer surfaced in this component. Files: `src/components/ui/mockup-renderer.tsx`, `src/lib/openrouter-image-mockup-format.ts`. Status: selected.
- Extract a dedicated concept-card component: Benefit: clearer boundary for future visual changes. Trade-off: adds indirection for a small renderer branch. Files: `src/components/ui/mockup-renderer.tsx`. Status: deferred unless the patch gets noisy.
- Prompt-level rationale normalization: Benefit: future generated copy more consistently matches the card. Trade-off: backend/external-AI behavior changes and more test surface. Files: `src/lib/openrouter-image-mockup-pipeline.ts`. Status: deferred.

## Plan
1. Update `src/components/ui/mockup-renderer.test.tsx` for the simplified OpenRouter storyboard card.
2. Patch `src/components/ui/mockup-renderer.tsx` to remove the screen-caption grid, match Figma spacing, and keep image/lightbox/export behavior.
3. Update the dev preview fixture if needed so visual verification reflects the simplified design.
4. Run focused tests, type/lint where practical, and verify visually through `/dev/mockup-renderer-preview`.
5. Record review, security review, visual evidence, and final plan metadata.

## Milestones
- Renderer contract: focused test passes and no visible Option A/B/C labels return.
- Visual match: local preview shows simplified cards with no screen chips.
- Review complete: review artifact records verification, findings, and remediation.

## Validation
- `npm test -- src/components/ui/mockup-renderer.test.tsx`
- `npm run typecheck`
- `npm run lint` if focused changes do not expose unrelated lint churn.
- Real local UI verification at `/dev/mockup-renderer-preview` with screenshot evidence under `ui-evidence/`.

## Risks And Mitigations
- Risk: removing screen chips hides useful generated details. Mitigation: keep the underlying metadata and image captions inside the storyboard itself.
- Risk: visual drift from Figma due to project tokens. Mitigation: use existing Hanken/Fira styling and map Figma colors to current Tailwind/token classes where possible.
- Risk: unrelated dirty worktree changes complicate docs updates. Mitigation: keep edits scoped and avoid touching existing dirty files unless required.

## Rollback Or Recovery
Revert the renderer/test/preview edits and leave stored mockup content untouched. No database or generated-asset recovery is needed.

## Open Decisions
None.

## Critique

### Software Architect
- The selected path keeps the stable mockup content contract intact and narrows risk to presentation. If concept cards keep evolving, extracting an `OpenRouterConceptCard` component should be reconsidered.

### Product Manager
- The simplified card supports faster comparison of three concepts by reducing secondary details. The trade-off is less explicit explanation of each frame outside the image.

### Customer Or End User
- Users see the actual mockup image and the rationale first, which matches the task of choosing a concept. Export remains prominent and familiar.

### Engineering Implementer
- The focused branch is small, but the renderer file is large and has legacy paths. Avoid touching unrelated Stitch/json-render logic.

### Risk, Security, Or Operations
- No new auth, storage, RLS, or external API behavior is required. Download and proxy behavior remains unchanged.
