# Review: Product Plan Functional Requirement Blocks

## Scope
- `src/components/analysis/planning-document-blocks.tsx`
- `src/components/analysis/planning-document-blocks.test.tsx`

## Verification
- `npm.cmd exec tsx -- --test src/components/analysis/planning-document-blocks.test.tsx` passed: 15 tests.
- `npm.cmd run typecheck` passed.
- `npm.cmd run lint` passed with 14 pre-existing warnings unrelated to this change.
- Browser verification was not completed because the in-app browser tool was not available in the loaded tool set; the renderer behavior is covered by server-rendered markup tests.

## Code Review Findings
- No blocking findings.
- Low risk: nested requirement display groups now intentionally bypass generic category labels for current PRD subsection cards. Existing category grouping remains as the fallback for legacy/table-based requirements.

## Security Review Findings
- No security findings. The change only transforms already-rendered markdown into display groups; it does not add data access, authentication, authorization, external calls, secret handling, or new HTML injection paths.

## Remediation Checklist
- [x] Add regression coverage for `Core requirements`, `States and errors`, and `Constraints` rendering as separate blocks.
- [x] Add coverage for deeper subsection headings under a wrapper `Functional requirements` heading.
- [x] Render requirement rows with ordinal labels like `01` and `02` instead of source IDs like `FR-001`.
- [x] Strip source IDs like `CR-001` and `SE-001` from row headings while preserving the actual requirement text.
- [x] Make the three-block requirement layout span `Core requirements` across two columns, with `States and errors` and `Constraints` side by side beneath it.
- [x] Preserve legacy Functional/Non-Functional/Integration behavior as fallback.
- [x] Remove newly introduced lint warning.
