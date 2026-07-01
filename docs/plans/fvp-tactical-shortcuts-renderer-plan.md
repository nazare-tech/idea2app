---
implemented: true
implemented_at: 2026-07-01T14:10:37Z
implementation_summary: Rendered nested tactical-shortcuts subsections below the First Version Plan Suggested Build Approach stack grid, with focused renderer coverage and UI screenshot evidence.
---

# Plan: First Version Tactical Shortcuts Rendering

## Goal
Show the generated `Tactical shortcuts for speed to market` subsection inside the First Version Plan `Suggested Build Approach` UI when it exists in saved markdown.

## Assumptions
- The generated markdown is the source of truth; no prompt or regeneration change is needed.
- The subsection should remain inside `Suggested Build Approach`, not move to AI Prompts.
- Existing legacy rendering should continue to work.

## Clarifying Questions
1. Should tactical shortcuts appear in the current First Version Plan body?
   - Recommendation A: Render them inside `Suggested Build Approach`.
   - Trade-off: Keeps the UI faithful to the generated section, with a small renderer change.
   - Recommendation B: Move them into a separate left-rail subsection.
   - Trade-off: More discoverable, but changes navigation and is larger scope.
   - Selected: Recommendation A, because the user asked to fix the missing UI content if it is supposed to show up.

## Recommended First Step
Add a focused renderer test proving a nested tactical-shortcuts subsection appears when present under `Suggested Build Approach`.

## Plan
1. Add a failing renderer test for nested tactical shortcuts. Done.
2. Update `FvpStack` to render stack rows plus tactical shortcut cards/lists from nested H3 content. Done.
3. Run focused tests and typecheck. Done.
4. Verify the existing project in the real local UI and capture screenshot evidence. Done.

## Milestones
- Test coverage: renderer test fails before the patch and passes after.
- UI evidence: current project shows the tactical shortcuts in First Version Plan.

## Validation
- `node --import tsx --test src/components/analysis/planning-document-blocks.test.tsx`
- `npm run typecheck`
- Browser verification on `/projects/d51b9e1e-0b97-424c-be90-286a2f7f4509-signal-road-product-intelligence#...`.

## Risks And Mitigations
- Risk: Rendering duplicated stack rows if the nested H3 content is parsed as part of the table.
  - Mitigation: Extract nested sections separately and render only the tactical subsection below the stack grid.
- Risk: Visual clutter.
  - Mitigation: Use compact cards consistent with existing First Version Plan blocks.

## Rollback Or Recovery
Revert the renderer/test changes. Saved documents remain unchanged.

## Open Decisions
- None.

## Implementation Notes
- `FvpStack` now renders stack table rows and recognized nested shortcut H3 sections.
- Shortcut headings preserve the generated heading text instead of title-casing it.
- UI evidence saved at `ui-evidence/2026-07-01-fvp-tactical-shortcuts/suggested-build-approach-tactical-shortcuts.png`.

## Critique

### Software Architect
- This should be a renderer-only fix because generation already emits the required content.

### Product Manager
- Showing tactical shortcuts is important because it captures the practical scope-cutting guidance that makes the plan actionable.

### Customer Or End User
- Users expect visible sections to include all generated subsections, especially when the nav points to `Suggested Build Approach`.

### Engineering Implementer
- The safest implementation is local to `FvpStack` and should not change parser contracts.

### Risk, Security, Or Operations
- No backend, auth, billing, data-shape, or secret-handling changes are expected.
