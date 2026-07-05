---
implemented: true
implemented_at: 2026-07-03T17:55:35Z
implementation_summary: Matched the Figma top-level document chrome by removing masthead eyebrows, adding explanatory subheadings, tightening container padding, and applying the Executive Summary lead paragraph style.
---

# Plan: Figma Executive Suburbia UI Alignment

## Goal
Update the workspace document UI to match the Figma `Executive Summary` container treatment: tighter Figma-matched card padding, no top eyebrow labels, a short explanatory subheading under every top-level topic title, and a distinct lead paragraph style for the first Executive Summary paragraph.

## Assumptions
- The Figma node `344:7542` is the source of truth for the top-level document container and Executive Summary section style.
- "Market Research, etc. Product Plan, etc." refers to top-level workspace document sections, not every nested subsection label or numbered row.
- Existing uncommitted changes in unrelated landing/navigation files should be preserved and avoided.

## Clarifying Questions
1. Should nested subsection kickers like `Product Brief`, `Handoff`, and `Deep Analysis` also be removed?
   - Recommendation A: Remove only top-level document eyebrows/masthead kickers and keep nested subsection labels where they clarify dense content.
   - Trade-off: Matches the visible Figma/top-level request while preserving scanability in long documents.
   - Recommendation B: Remove all nested kickers too.
   - Trade-off: Cleaner but risks making complex sections harder to scan and expands the visual change.
   - Selected: Recommendation A, because the prompt names eyebrows above top-level topics and the current nested labels support readability.
2. Should the Executive Summary lead paragraph style apply to all document first paragraphs?
   - Recommendation A: Apply the 22px medium lead style only to the first Executive Summary paragraph.
   - Trade-off: Matches the specific Figma change without making every document feel oversized.
   - Recommendation B: Apply it to each topic's first body paragraph.
   - Trade-off: More uniform but can distort dense Product Plan and First Version content.
   - Selected: Recommendation A, because the user specifically called out the first paragraph in the Executive Summary design.

## Recommended First Step
Patch the shared workspace frame and renderer header helpers, then update focused render tests to lock the no-eyebrow and subheading behavior.

## Architecture Improvement Opportunities
- Shared top-level header helper: Benefit is consistent no-eyebrow title/subheading treatment across competitive and planning renderers; trade-off is a small abstraction in already large renderer files; likely files are `competitive-analysis-document.tsx` and `planning-document-blocks.tsx`; selected.
- Scoped lead paragraph flag: Benefit is precise Figma alignment without global typography side effects; trade-off is another optional prop on a local helper; likely file is `competitive-analysis-document.tsx`; selected.
- Broader document chrome component shared across analysis and planning files: Benefit is less duplication; trade-off is larger extraction across complex renderer boundaries; deferred as disproportionate for this visual update.
- Update project architecture docs: Benefit is keeping source-of-truth current; trade-off is unnecessary churn because no architecture, dependency, backend, or data-flow change is planned; rejected for this task.

## Plan
1. Update `WorkspaceDocumentFrame` to match the Figma container padding and width behavior.
2. Replace top-level competitive and planning masthead eyebrows with title plus explanatory subheading.
3. Apply the Figma 22px medium lead paragraph style to the first Executive Summary paragraph only.
4. Update focused render tests for container padding, removed eyebrows, subheadings, and lead paragraph class.
5. Run focused tests and, if practical, local UI verification with screenshot evidence.

## Milestones
- Renderer patch: top-level topic chrome matches the Figma node.
- Test patch: existing render tests capture the requested no-eyebrow and subheading expectations.
- Verification: focused tests pass and UI evidence is captured or a blocker is documented.

## Validation
- Passed focused component tests for workspace document frame, competitive analysis document, and planning document blocks.
- Passed `npm run typecheck`.
- Passed `npm run lint` with one unrelated existing warning in `output/playwright/prod-full-flow.mjs`.
- Started the real local dev server at `http://127.0.0.1:3001`, signed into the authenticated workspace through Chrome using hidden e2e credentials, and captured screenshots for Executive Summary, Market Research, and Product Plan. See `docs/plans/figma-executive-suburbia-ui-review.md`.

## Risks And Mitigations
- Risk: Removing labels from nested sections could reduce scanability. Mitigation: remove only top-level eyebrows.
- Risk: Lead paragraph style could apply too broadly. Mitigation: use a scoped helper prop for Executive Summary only.
- Risk: Visual verification may require a signed-in local workspace with generated documents. Mitigation: use existing e2e credentials if available and report blockers rather than faking the flow.

## Rollback Or Recovery
Revert the focused changes in `WorkspaceDocumentFrame`, `CompetitiveAnalysisDocument`, `PlanningDocumentBlocks`, and their tests. No backend data, dependencies, or migrations are involved.

## Open Decisions
None.

## Critique

### Software Architect
- A shared top-level header component across files would be cleaner, but a local helper per renderer is lower risk given the current renderer size and different term-button needs.

### Product Manager
- The change makes generated reports feel more like polished documents and less like internal analysis cards, while preserving section descriptions for orientation.

### Customer Or End User
- Users should see less redundant labeling and clearer explanations of each document area before scanning dense outputs.

### Engineering Implementer
- Tests need to assert absence of the old eyebrow strings, not just presence of new titles, because the title text overlaps with old labels.

### Risk, Security, Or Operations
- The change is visual-only. No auth, persistence, secrets, billing, or production operations behavior should change.
