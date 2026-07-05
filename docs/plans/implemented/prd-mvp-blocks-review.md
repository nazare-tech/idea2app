# Review: PRD/MVP Block Rendering

## Scope
- Added shared planning markdown parsing for headings, lists, paragraphs, and tables.
- Added PRD and MVP view models plus Pencil-style block renderers with markdown fallback.
- Wired completed PRD/MVP documents into the scroll workspace block renderer.
- Removed workspace PRD/MVP partial stream previews while keeping backend streaming compatibility.
- Updated PRD/MVP prompts and `PROJECT_CONTEXT.md`.

## Verification
- `node --import tsx --test src/lib/prd-document.test.ts src/lib/mvp-plan-document.test.ts`
- `node --import tsx --test src/components/analysis/planning-document-blocks.test.tsx`
- `node --import tsx --test src/lib/document-generation-display-status.test.ts src/components/analysis/planning-document-blocks.test.tsx`
- `npm.cmd test -- src/lib/prd-document.test.ts`
- `npm.cmd test -- src/lib/mvp-plan-document.test.ts`
- `npm.cmd test -- src/components/analysis/planning-document-blocks.test.tsx`
- `npm.cmd test -- src/components/analysis/planning-document-blocks.test.tsx` after PRD content-organization remediation
- `npm.cmd test -- src/lib/prd-document.test.ts` after PRD parser cleanup
- `npm.cmd test`
- `npm.cmd run lint`
- `npm.cmd run build` (required network-enabled retry because `next/font` fetches Google Fonts during production build)
- Final rerun: `npm.cmd test -- src/components/analysis/planning-document-blocks.test.tsx` and `npm.cmd run build` both pass after the PRD organization fix.
- Follow-up rerun: `npm.cmd test -- src/components/analysis/planning-document-blocks.test.tsx` passes after simplifying PRD labeled text and stacking table/list requirements vertically.
- Follow-up rerun: `npm.cmd run lint` passes with existing warnings only, and `npm.cmd run build` passes with the network-enabled Google Fonts retry.

## Code Review Findings
- Finding: PRD/MVP prompt examples initially used raw backticks inside template strings.
  - Severity: Medium
  - Status: Fixed by escaping markdown code spans in prompt constants.
- Finding: Workspace retained unused stream state after PRD/MVP preview removal.
  - Severity: Low
  - Status: Fixed by removing the dead state and no-oping stream token handlers.
- Finding: Parser strictness could cause legacy markdown to miss block rendering.
  - Severity: Low
  - Status: Mitigated with aliases and markdown fallback.
- Finding: Unlabeled PRD persona bullets were grouped as separate fake persona cards, causing fields such as demographics, goals, and pain points to appear as different users.
  - Severity: Medium
  - Status: Fixed by preserving unlabeled persona content as one `Target User Profile` section and adding regression coverage.
- Finding: MVP sections with direct content and no nested headings could be omitted from the block view.
  - Severity: Medium
  - Status: Fixed with fallback section cards for feature details and direct H2 content.
- Finding: PRD markdown artifacts (`---`, `>`) and flat numbered list rendering made context, positioning, value proposition, requirements, and user stories feel unorganized.
  - Severity: Medium
  - Status: Fixed by cleaning parser source content, grouping labeled bullets, adding PRD requirement/user-story specialized renderers, hiding empty optional cards, and tightening the PRD prompt contract.
- Finding: PRD labeled bullets were visually over-structured as mini-cards, and requirement categories were cramped in horizontal columns.
  - Severity: Low
  - Status: Fixed by rendering labeled narrative content as compact prose rows and stacking requirement categories vertically, including table-based requirement output.

## Security Review Findings
- Finding: No new auth, authorization, database writes, secrets, or external API calls were added.
  - Severity: Informational
  - Status: No action required.
- Finding: Rendering still uses the existing `MarkdownRenderer` for fallback and rich nested sections.
  - Severity: Informational
  - Status: No additional risk introduced beyond the existing markdown rendering surface.

## Residual Risk
- Interactive browser screenshot verification could not be completed in this session because the Browser Use Node REPL tool was unavailable and background dev-server startup was reaped. Production build and render tests passed.

## Remediation Checklist
- [x] Fix prompt template syntax.
- [x] Remove dead workspace stream state.
- [x] Document visual verification limitation.
- [x] Fix PRD unlabeled persona grouping.
- [x] Fix MVP direct-content fallback grouping.
- [x] Fix PRD messy markdown rendering and prompt structure.
- [x] Simplify PRD labeled text presentation and stack requirement categories vertically.
