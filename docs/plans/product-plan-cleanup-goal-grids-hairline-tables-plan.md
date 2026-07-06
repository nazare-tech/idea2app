---
implemented: true
implemented_at: 2026-07-05
implementation_summary: >-
  All beige-gap planning grids converted to a white-container hairline pattern
  (cells own -1px offset top/left borders) so partial last rows stay white;
  FVP MVP Summary paragraphs now span full section width; Functional
  Requirements, User Stories, and Technical Considerations removed from the
  Product Plan view (technical-considerations.md added as an AI Prompts file);
  business/user goals share one numbered goal-card UI labeled "Proposed
  Business Goals" / "User Goals" with no stat headline or tick marks; the
  Product Plan masthead stat strip and ~600 lines of now-dead
  requirement/user-story parsing code were deleted; the PRD system prompt
  frames business goals as proposed targets and drops the file-output
  instruction block. Verified with 396 passing tests, tsc, eslint, and a
  server-render check against the real Influencer Growth Loop AI documents.
---

# Product Plan Cleanup: Hairline Grids, Goal UI, Section Moves, Prompt Simplification

## Goal

Second workspace feedback round:

1. Multi-column "table" grids (Suggested Metrics, Suggested Build Approach, and every other beige-gap grid) show the beige container background when the last row is not full. Empty area should be white. Fix everywhere.
2. First Version Plan MVP Summary body text is capped at `max-w-[70ch]`; it should span the full section width (matching the "MVP Summary 01/07" header row).
3. Remove Functional Requirements, User Stories & Acceptance Criteria, and Technical Considerations from the Product Plan view (they belong to AI Prompts). Add `technical-considerations.md` as a prompt file.
4. Goals section: label business goals as "Proposed Business Goals", drop the big made-up stat headline (e.g. "100"), and render business and user goals with the same UI, using 01/02/03 mono numbers instead of tick marks (reusing the numbered-badge idiom from Non-goals).
5. Delete the masthead stat strip under the Product Plan H1 ("Scoped / Planned / User Stories / Requirements") — it renders fallback junk because the current prompt has no "Project estimate" data.
6. Simplify the Product Plan system prompt where it duplicates or emits dead content.

## Assumptions

- FR / US / Technical Considerations must stay in the *generated markdown* (the AI Prompts files are parsed from it); only the Product Plan *view* drops them.
- `UserStoryShowcase`, `RequirementShowcase`, `TechnicalShowcase`, `getCurrentPrdMetaItems` and their parsing helpers have no call sites outside `product-plan-blocks.tsx` (verified by grep), so they can be deleted with their render blocks.
- The stat strip's "Scoped"/"Planned" values are hardcoded fallbacks that fire because the current prompt contract has no "Project estimate" subsection: the strip is dead weight, not a data bug.

## Clarifying Questions

### Q1: How to keep hairline dividers without beige leaking into empty grid cells?

- **A (selected): Negative-margin hairline pattern.** Container becomes `border bg-white`; each cell gets `-mt-px -ml-px border-t border-l` in the container's hairline color. Works for any column count and breakpoint, no fillers or spacer math; empty remainder is plain white.
- **B: Keep `gap-px bg-beige` and add breakpoint-specific white spacer cells.** Fragile across `sm:2 / lg:5` responsive columns.
- **Selected: A**, applied to all grids found by sweep: FvpScopeGrid, FvpStack, FvpMetricGrid, FvpCuts, role-access grid, assumptions grid, non-goals grid. Single-column grids are converted too for consistency where touched; the business-goals flex strip is replaced by the new goal UI.

### Q2: What prompt simplifications are safe?

- **A (selected):** Remove the "File output instruction" block (an artifact of a file-based workflow; the app saves documents itself), and reframe §2.1 as proposed starting targets so generated business goals stop pretending to be commitments. Keep the `### 2.1 Business goals` heading text so parsing is unchanged. Keep FR/US/Technical sections generated (prompt files need them).
- **B:** Also strip the intro "plan map" paragraph — rejected: the orientation-first contract is deliberate and renderer-visible.

## Plan

### Phase 1: Product Plan renderer (`product-plan-blocks.tsx`)

1. Masthead: title only; delete stat strip + `getCurrentPrdMetaItems`.
2. Remove User Stories, Functional Requirements, Technical Considerations sections; delete now-dead showcases and parsing helpers.
3. `GoalsShowcase`: shared `GoalGrid` (mono `01` badge cards, md 2-col) for "Proposed Business Goals" and "User Goals"; no stat headline, no ticks.
4. Convert role-access, assumptions, and non-goals grids to the hairline pattern.

### Phase 2: First Version Plan + AI Prompts

5. `FvpSummary`: drop `max-w-[70ch]`.
6. Convert FvpScopeGrid (drop odd spacer), FvpStack, FvpMetricGrid, FvpCuts to the hairline pattern.
7. `ai-prompt-files.tsx`: add `technical-considerations.md` from the Product Plan section.

### Phase 3: Nav, prompt, docs, tests

8. `document-sections.ts`: drop the `prd-technical-considerations` nav child.
9. `prd.ts`: proposed-goals framing; remove File output instruction.
10. Update tests (`product-plan-blocks.test.tsx`, `first-version-plan-blocks.test.tsx`), PROJECT_CONTEXT.md; run suite + typecheck + lint.

## Validation

- Full test suite, tsc, eslint; server-render spot check against the real Influencer Growth Loop AI Product Plan/FVP markdown.

## Risks

- Deleting ~500 lines of dead parsing code: mitigated by grep-verified call sites and the full test suite.
- Hairline conversion changes 1px visual details; colors match existing hairlines so diffs are minimal.

## Rollback

Revert the commit(s); prompt change only affects future generations.

## Open Decisions

- None; heading rename for "AI Prompts" still awaiting the user's pick from the prior round.

## Critique (five perspectives)

- **Product:** View now matches the story "plan here, build files in AI Prompts"; tentative goals stop overpromising.
- **Design:** One hairline idiom everywhere; no more beige voids; goal lists become consistent and scannable.
- **Engineering:** Large dead-code removal shrinks the biggest component file; prompt keeps parser-compatible headings.
- **QA:** Existing tests updated rather than deleted; real-data render check.
- **Security/Privacy:** No data-flow changes.
