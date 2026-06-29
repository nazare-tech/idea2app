# Review: Product Plan Persona Card Fix

## Scope
- Hardened current Product Plan persona parsing in `planning-document-blocks.tsx`.
- Added regression coverage for standalone bold persona labels in `planning-document-blocks.test.tsx`.
- Updated the PRD persona prompt contract and prompt assertions.
- Refined persona-card visual styling: square card corners, reduced elevation, numbered labels, tighter header typography, and square motivation panels.
- Refined metadata chips so separate fields show value-only labels, except age renders as `Age 26`.

## Verification
- `node --import tsx --test src/components/analysis/planning-document-blocks.test.tsx src/lib/planning-prompts.test.ts` - passed.
- `node --import tsx --test src/components/analysis/planning-document-blocks.test.tsx src/lib/prd-document.test.ts src/lib/planning-prompts.test.ts` - passed.
- `npm.cmd run typecheck` - passed.
- `npm run typecheck` was blocked by local PowerShell execution policy for `npm.ps1`; reran successfully with `npm.cmd`.
- Visual fallback check with local dev CSS and Puppeteer fixture preview - passed for square card radius, square motivation radius, `Persona 1` label, 26px persona name, and avatar-aligned label top.

## Code Review Findings
- No blocking findings.
- The parser change is intentionally explicit about known persona field labels so it recovers common Prompt Lab drift without treating arbitrary bold text as fields.
- Existing ideal persona format remains covered by tests.

## Security Review Findings
- No blocking findings.
- The change does not add data access, auth logic, secret handling, external API calls, or HTML injection paths.
- Parsed persona text is still rendered through React text nodes, preserving normal escaping.

## Remediation Checklist
- [x] Add regression test for standalone bold labels.
- [x] Keep metadata-only fields from becoming description or motivation fallbacks.
- [x] Update default PRD prompt persona format.
- [x] Run focused tests, affected tests, and typecheck.

## Notes
- Pre-existing unrelated worktree items were left untouched: `supabase/.temp/cli-latest` and `.superpowers/brainstorm/*`.
