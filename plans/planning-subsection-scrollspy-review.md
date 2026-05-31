# Review: Planning Document Subsection Scrollspy

## Scope
- `src/lib/document-sections.ts`
- `src/components/analysis/planning-document-blocks.tsx`
- `src/components/layout/anchor-nav.tsx`
- `src/components/workspace/project-workspace.tsx`
- Focused tests for planning document anchors and nav filtering.

## Verification
- Passed: `node --import tsx --test src\components\analysis\planning-document-blocks.test.tsx`
- Passed: `node --import tsx --test src\lib\document-sections.test.ts src\lib\workspace-scroll-sync.test.ts`
- Passed: `npm.cmd run typecheck`
- Not clean: `npm.cmd run lint` fails on pre-existing `.tmp/anthropic-design-v2/...` extracted files with unresolved component names and React ref rule errors. The touched app files did not introduce lint errors.
- Browser verification was not run because the Codex in-app browser tools were not exposed in this session.

## Code Review Findings
- None requiring code changes. The implementation reuses the existing scrollspy and only adds stable anchors plus nav filtering.
- Residual risk: sub-section visibility is collected from the rendered DOM. There can be a brief initial state where sub-sections are hidden until the document pane renders and the mutation observer collects anchors.

## Security Review Findings
- No security concerns found. The change does not add data fetching, auth logic, external calls, user input evaluation, or secret handling.

## Remediation Checklist
- [x] Match Product Plan nav labels to visible right-panel headings.
- [x] Match First Version Plan nav labels to visible right-panel headings.
- [x] Keep Product Plan follow-through as one combined nav item.
- [x] Hide sub-section nav items when their anchors are not rendered.
- [x] Preserve existing Market Research scrollspy behavior.
