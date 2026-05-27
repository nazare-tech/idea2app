# Plan: Positioning Map Tufte Improvements

## Goal
Improve the Market Research positioning map so it is harder to misread, does not invent plotted positions for invalid data, communicates the 0-10 scoring scale, and gives future AI generations clearer output requirements.

## Assumptions
- The positioning map remains a custom React/Tailwind component, consistent with the existing Pencil-style document renderer.
- Existing saved market research content should continue rendering when it follows the old table shape.
- Invalid or missing point scores should not be plotted on the map.
- The prompt can be tightened without changing the stored document schema.

## Clarifying Questions
1. Should invalid/unscored competitors be shown in a separate list or hidden entirely from the map?
2. Should the visual treatment favor exact score readability or compact qualitative scanning?
3. Should the app eventually store evidence confidence as structured metadata?

## Recommended First Step
Add tests for header-aware positioning-map parsing and invalid-score handling, then implement the renderer changes against those tests.

## Plan
1. Add parser tests for reordered positioning-map columns and invalid score values.
2. Add renderer tests that assert unscored competitors are not plotted and that the scale/rationale context is present.
3. Update `parsePositioningMap` to derive columns from normalized headers and support confidence/source columns if present.
4. Update `PositioningMap` to render valid scored points only, use dot-plus-label marks, show 0/5/10 anchors and concise scale context, and keep invalid points in an explicit unscored list.
5. Tighten the competitive-analysis prompt to require 0-10 scoring definitions, evidence confidence, and no invented precision.
6. Run focused tests, full tests, lint/typecheck where practical, and review the diff.

## Milestones
- Parser integrity: malformed score cells no longer produce chart coordinates.
- Visual clarity: chart includes visible score anchors and lighter data marks.
- Generation quality: future market research asks for confidence/source rationale.

## Validation
- `npm test -- src/lib/competitive-analysis-v2.test.ts src/components/analysis/competitive-analysis-document.test.tsx`
- `npm test`
- `npm run lint`
- Visual/manual review of the chart component structure.

## Risks And Mitigations
- Risk: Existing content with old four-column tables breaks. Mitigation: fall back to positional columns when headers are incomplete.
- Risk: Text labels still collide for dense maps. Mitigation: reduce label footprint now; leave smarter collision layout as a later enhancement if needed.
- Risk: Prompt changes increase generated verbosity. Mitigation: require concise confidence/source text in the rationale column rather than adding a new large section.

## Rollback Or Recovery
Revert the branch or the focused files: `src/lib/competitive-analysis-v2.ts`, `src/components/analysis/competitive-analysis-document.tsx`, `src/lib/prompts/competitive-analysis.ts`, and their tests.

## Open Decisions
- Whether evidence confidence should become a first-class structured field in a future schema version.

## Implementation Status
- [x] Added parser tests for reordered columns and invalid scores.
- [x] Added render tests for scale labels, scored points, and unscored placements.
- [x] Updated parser to use normalized table headers and reject scores outside 0-10.
- [x] Updated chart to plot only valid scored points, show 0/5/10 anchors, and expose unscored placements.
- [x] Updated prompt requirements for score definitions and evidence confidence.
- [x] Ran focused tests, full tests, typecheck, and lint.
- [x] Recorded code review and security review notes.

## Critique

### Software Architect
- Good scoped change: parser, renderer, and prompt stay aligned. The main technical debt left is that a bespoke absolute-position chart still lacks full collision avoidance.

### Product Manager
- The highest-value product improvement is trust: users should know when a placement is evidence-backed versus inferred.

### Customer Or End User
- The chart should become easier to scan without losing the high-level positioning story.

### Engineering Implementer
- Tests need to pin the integrity behavior so future prompt or parser edits do not silently reintroduce fake plotted positions.

### Risk, Security, Or Operations
- No new secrets or external APIs. The primary risk is misleading user-facing output, handled by invalid-score exclusion and clearer evidence language.
