# Review: Positioning Map Tufte Improvements

## Scope
- `src/lib/competitive-analysis-v2.ts`
- `src/components/analysis/competitive-analysis-document.tsx`
- `src/lib/prompts/competitive-analysis.ts`
- Focused parser, renderer, and prompt tests.

## Verification
- `npm test -- src/lib/competitive-analysis-v2.test.ts src/components/analysis/competitive-analysis-document.test.tsx src/lib/competitive-analysis-prompt.test.ts` passed. Because the project test script expands all tests before appended args, this ran the full suite: 258 passing, 0 failing.
- `npm run typecheck` passed.
- `npm run lint` passed with 13 pre-existing warnings outside the changed chart files.
- `npm test` passed: 258 passing, 0 failing.
- Browser visual verification was not run because the relevant workspace screen is auth/data gated and there is no existing fixture route for this market-research component. Static React render tests assert the changed markup, scale labels, ARIA labels, and unscored state.

## Code Review Findings
- No blocking findings.
- Residual risk: the dot-plus-label layout reduces label footprint but still does not implement true collision avoidance for dense maps. This is acceptable for the current 3-5 competitor prompt shape.
- Residual risk: invalid/out-of-range scores are now excluded from plotting, but the generation prompt still relies on the model to provide concise evidence confidence text.

## Security Review Findings
- No new secrets, authentication paths, authorization checks, external calls, or data mutations were introduced.
- User-visible strings come from existing generated markdown and continue to be rendered through React escaping.

## Remediation Checklist
- [x] Stop plotting fallback coordinates for invalid positioning scores.
- [x] Parse positioning table columns by normalized header.
- [x] Preserve optional evidence confidence/source text.
- [x] Add visible 0/5/10 score anchors.
- [x] Replace large label boxes with smaller data marks and labels.
- [x] Add regression tests for parser, renderer, and prompt behavior.
