# Plan: Product Plan Functional Requirement Blocks

## Goal
Fix Product Plan workspace rendering so nested markdown subsections under `## Functional requirements`, such as `Core requirements`, `States and errors`, and `Constraints`, appear as separate screenshot-style requirement blocks with their original subsection names and item counts.

## Assumptions
- The affected run is a current numbered Product Plan prompt document rendered by `CurrentPrdDocumentBlocks`.
- The markdown structure is `## 5. Functional requirements` with nested `###` subsections.
- The correct visual treatment is the existing `RequirementShowcase` card style: bordered white blocks, icon square, subsection title, request count, and numbered rows.
- This should not regress older Product Plan documents that use Functional, Non-Functional, and Integration group names.

## Clarifying Questions
1. Should subsection titles preserve exact markdown casing, or is title-cased display acceptable?
2. Should `Core requirements`, `States and errors`, and `Constraints` always use separate cards even if one subsection only has one item?
3. If a subsection has no list items, should it fall back to markdown inside that card or be hidden?

## Recommended First Step
Add a focused server-rendered component test that reproduces the Wear It Now AI Mirror shape: three nested Functional Requirements subsections with list items. Confirm the current output collapses or renames them, then update the requirement grouping logic.

## Plan
1. Add a failing test in `src/components/analysis/planning-document-blocks.test.tsx` for nested current Product Plan requirement sections named `Core requirements`, `States and errors`, and `Constraints`.
2. Refactor requirement grouping in `src/components/analysis/planning-document-blocks.tsx` so `RequirementShowcase` can render display groups from nested `###` headings while preserving the existing category grouping fallback for legacy/table content.
3. Keep the screenshot-style card markup stable and only change the labels/groups feeding it.
4. Run the focused planning document block tests.
5. Visually verify the Prompt Lab/workspace preview with the Codex browser if a local dev session and credentials/context are available; otherwise document why code-level verification was the strongest practical check.

## Milestones
- Reproduction: Completed. Test fixture demonstrates the missing subsection blocks.
- Implementation: Completed. Requirement display groups preserve nested subsection names.
- Verification: Completed. Focused tests pass without breaking existing PRD/MVP renderer expectations.
- Review: Completed. Code and security review notes are written and no remediation findings remain.

## Validation
- `node --test` or the repo's existing focused test command for `src/components/analysis/planning-document-blocks.test.tsx`.
- Static markup assertions for all three requested subsection names and absence of unwanted collapsed-only output.
- Optional browser verification of `/dev/prompt-lab` against the referenced Prompt Lab run if local Supabase/dev credentials permit.

## Risks And Mitigations
- Risk: Changing requirement grouping could affect legacy Functional/Non-Functional/Integration rendering. Mitigation: preserve `getRequirementGroups` and add a separate display-group adapter for nested current sections.
- Risk: Exact casing expectations may differ. Mitigation: preserve markdown casing after removing numbering prefixes.
- Risk: Prompt Lab run data may be remote and unavailable in the sandbox. Mitigation: reproduce the same markdown structure in a deterministic renderer test.

## Rollback Or Recovery
Revert the renderer/test changes in `planning-document-blocks.tsx` and `planning-document-blocks.test.tsx`; the previous generic category grouping behavior will return.

## Open Decisions
- Decision from user feedback: preserve the source markdown subsection names as three separate blocks, specifically `Core requirements`, `States and errors`, and `Constraints`, instead of showing generic `Functional` and `Integration` category cards.
- Browser verification against the exact saved Prompt Lab run is useful if the local dev data is reachable, but the core acceptance condition will be covered by a deterministic renderer test.

## Critique

### Software Architect
- The cleanest fix is not to widen the core category enum into arbitrary strings everywhere. A small display adapter keeps legacy categorization stable while allowing current prompt subsections to be faithfully represented.

### Product Manager
- This is important because the workspace preview should reflect prompt output structure. If users see markdown subsections disappear, they will not trust Prompt Lab iteration.

### Customer Or End User
- The desired outcome is scannability: users should see three clear cards matching the source document, not one generic Functional bucket.

### Engineering Implementer
- The main implementation risk is hidden coupling between `RequirementsContent` and `RequirementShowcase`. Keep the change local to the current Product Plan display path unless tests show legacy rendering needs the same behavior.

### Risk, Security, Or Operations
- This is a rendering-only change. It should not touch authentication, authorization, database access, external APIs, or secrets.
