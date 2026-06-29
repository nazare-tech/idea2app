# Plan: PRD/MVP Block Rendering

## Goal
Render completed PRD and MVP documents as organized Pencil-style blocks that match the Market Research design family, while showing only loading/generating states until generation is complete.

## Assumptions
- Work is on branch `feat/prd-mvp-blocks`.
- Existing saved PRD and MVP markdown must keep rendering without a database migration.
- Workspace PRD/MVP streaming previews should no longer appear, but backend streaming compatibility can remain.
- The visual language should be adapted from Market Research rather than copied section-for-section.

## Clarifying Questions
1. No remaining blocking questions; implementation will use the approved defaults from the planning discussion.

## Recommended First Step
Add focused parser and render tests first so the block organization has a stable contract before wiring it into the workspace.

## Plan
1. [x] Create shared planning-document parsing helpers for sections, paragraphs, lists, markdown tables, and labeled fields.
2. [x] Add PRD and MVP view-model modules with graceful fallback for incomplete legacy markdown.
3. [x] Build PRD and MVP block renderers using reusable Pencil-style cards, tables, lists, and summary modules.
4. [x] Replace saved PRD/MVP markdown rendering in `ScrollableContent` with the new renderers.
5. [x] Remove PRD/MVP stream preview usage from workspace generation calls and display-state inputs.
6. [x] Update PRD/MVP prompts to produce stable block-friendly markdown.
7. [x] Update `PROJECT_CONTEXT.md`.
8. [x] Run tests, lint/build checks, visual verification where practical, then write review/security notes and remediate findings.

## Milestones
- Parser milestone: PRD/MVP parser tests pass for normal and fallback content.
- Renderer milestone: render tests prove block modules and anchors render.
- Workspace milestone: PRD/MVP generation shows loading only until saved content is available.
- Documentation milestone: project context and review notes are current.

## Validation
- `npm test`
- Focused TypeScript/ESLint checks where practical.
- Manual or browser verification of PRD/MVP workspace sections after generation/loading.

## Risks And Mitigations
- Legacy markdown may be inconsistent: keep fallback behavior and avoid strict metadata requirements.
- Parser may overfit prompt wording: parse by heading aliases and common markdown structures rather than exact prose.
- Removing stream previews may leave stale state paths: clear PRD/MVP stream-preview inputs at workspace display-state boundaries.
- UI blocks may become too dense on mobile: use responsive grids, overflow-safe tables, and compact text sizing.

## Rollback Or Recovery
- Revert renderer wiring in `ScrollableContent` to `MarkdownDocumentSection`.
- Keep parser/render files isolated so a rollback does not affect generation or database state.
- Backend streaming route remains compatible, reducing recovery risk.

## Open Decisions
- None. Backend streaming remains in place for compatibility.

## Implementation Notes
- Interactive browser screenshot verification was attempted but blocked because the in-app browser Node REPL tool was not available and the dev server could not be kept alive as a background process in this session.
- Static render tests and a production build were used as the visual/rendering safety net.
- Follow-up visual feedback found that unlabeled PRD persona bullets were being promoted into separate fake persona cards. The PRD parser now keeps unlabeled persona/profile fields in one target-user profile block, while named nested persona headings still render as separate persona cards.
- MVP nested section parsing now preserves direct H2/H3 content as fallback cards, so feature details, user flow, timeline, metrics, and assumptions do not disappear when a generated document lacks deeper headings.
- Follow-up PRD screenshots showed horizontal rules, blockquotes, flat numbered lists, loose requirement labels, and inline user-story acceptance criteria rendering poorly. The parser now strips legacy horizontal rules/blockquotes, the PRD renderer presents labeled bullets as compact prose rows instead of nested mini-cards, stacks functional/non-functional/integration requirements vertically, and renders user stories into dedicated story cards with acceptance criteria. The PRD prompt now asks for table/H4 structures that match the block renderer.

## Critique

### Software Architect
- The parser/view-model boundary is worth the added files because PRD/MVP need structured rendering without a data migration.

### Product Manager
- Removing partial PRD/MVP previews is a cleaner experience if the completed output is substantially easier to scan.

### Customer Or End User
- Users should see a stable loading state instead of half-written requirements, then a polished document once complete.

### Engineering Implementer
- The main implementation risk is heading variance. Use aliases and fallbacks instead of strict all-or-nothing parsing.

### Risk, Security, Or Operations
- This is primarily rendering and prompt work. No new auth, secrets, external APIs, or database privileges should be introduced.
