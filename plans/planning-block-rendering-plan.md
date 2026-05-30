# Plan: Planning Document Block Rendering

## Goal
Render Product Plan and First Version Plan artifacts as structured block views when they use the current prompt heading formats, while preserving fallback markdown for truly loose legacy documents.

## Assumptions
- The existing block UI in `src/components/analysis/planning-document-blocks.tsx` is the desired visual language because it already matches the Market Research Pencil-style renderer.
- The primary bug is parser/view-model recognition, not missing UI components.
- Existing generated legacy documents should remain supported.

## Clarifying Questions
1. No blocking questions. The user approved parser compatibility plus parity with Market Research.

## Recommended First Step
Add focused tests that reproduce current Product Plan and First Version Plan prompt output failing block-render recognition.

## Plan
1. [x] Add PRD parser and renderer tests for current numbered PRD sections.
2. [x] Add MVP parser and renderer tests for current numbered First Version Plan sections.
3. [x] Update PRD parser aliases and extraction to support H2 current prompt sections where H3 aliases are not present.
4. [x] Update MVP parser aliases and extraction to support H2 current prompt sections and preserve important direct content.
5. [x] Update current prompt-shaped documents to render with current prompt section labels instead of legacy block labels.
6. [x] Upgrade current Product Plan and First Version Plan rendering from generic section cards to richer purpose-built visual modules.
7. [x] Run focused tests, then broader relevant tests if needed.
8. [x] Perform code and security review, record findings, and remediate issues.

## Milestones
- Reproduction tests: Current prompt-shaped documents fail before parser changes.
- Parser compatibility: Current and legacy headings both produce `canRenderModules: true`.
- UI verification: Rendered static markup shows purpose-built block headers, persona/feature/step card labels, and no warning for current prompt-shaped documents.

## Validation
- `npm test -- src/lib/prd-document.test.ts src/lib/mvp-plan-document.test.ts src/components/analysis/planning-document-blocks.test.tsx`
- Optional full `npm test` if focused tests reveal shared parser risk.

## Risks And Mitigations
- Risk: Broad aliases may misclassify unrelated sections. Mitigation: Use exact normalized heading aliases first and keep fallback mapping scoped to known prompt section numbers/names.
- Risk: H2 extraction could include nested H3/H4 markdown in cards. Mitigation: Use existing markdown renderer for rich direct sections and parse tables/lists where useful.
- Risk: Visual parity degrades if we create a separate design. Mitigation: Reuse the Market Research/Pencil visual language and current planning block primitives while adding only prompt-specific modules.

## Rollback Or Recovery
- Revert changes in `src/lib/prd-document.ts`, `src/lib/mvp-plan-document.ts`, and their tests. Existing markdown fallback behavior remains available.

## Open Decisions
- None blocking.

## Critique

### Software Architect
- The cleanest fix is to make the parser tolerant of both prompt generations rather than duplicating renderer components.

### Product Manager
- Users care that completed artifacts look complete and comparable across sections; removing the warning is necessary but not sufficient, so tests should assert visible block headings.

### Customer Or End User
- A founder scanning these docs should see structured sections immediately, not a raw markdown wall or an alarming warning.

### Engineering Implementer
- Keep the change local to parser/view-model helpers unless tests prove the renderer cannot express a current prompt section.

### Risk, Security, Or Operations
- This is client-side rendering/parsing of existing markdown. No new data access, secrets, API routes, or dependencies are needed.
