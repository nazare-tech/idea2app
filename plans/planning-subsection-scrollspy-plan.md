# Plan: Planning Document Subsection Scrollspy

## Goal
Make the Product Plan and First Version Plan left-rail sub-sections match the visible right-panel sections, highlight while scrolling, and scroll to the matching section when clicked. Reuse the existing Market Research scroll behavior rather than introducing a second navigation system.

## Assumptions
- The desired behavior is for the current numbered Product Plan and current 12-section First Version Plan layouts, plus any legacy planning layout that still uses the shared `SCROLLABLE_NAV_ITEMS` anchors.
- Section labels should match the rendered right-panel headings, not the raw prompt headings when the renderer intentionally renames them for the user interface.
- The existing scrollspy in `src/components/workspace/project-workspace.tsx` is the right mechanism to keep. It already tracks anchors from `SCROLLABLE_NAV_ITEMS` and drives left-rail highlight state.
- No database, prompt, or generation changes are needed.
- User clarification: use exactly the right-panel text for labels, keep Product Plan follow-through as one combined item, and only show sub-sections that actually render in the right panel.

## Clarifying Questions
1. Should the First Version left rail show `MVP` terminology where the right panel does, or should it continue using the product-facing `First Version` wording where possible?
2. For Product Plan follow-through content, should the left rail show one combined item (`Risks, Dependencies & Open Questions`) or split into separate `Risks`, `Dependencies`, `Assumptions`, and `Open Questions` targets?
3. Should hidden/missing generated sections still appear in the left rail, or should the nav remain a fixed contract even when a generated document omits a section?

## Recommended First Step
Add focused server-render tests that prove current Product Plan and First Version Plan blocks emit IDs matching the nav registry. This gives us a cheap red/green loop before touching scroll behavior.

## Plan
1. Update `src/lib/document-sections.ts` so Product Plan and First Version Plan sub-section labels and IDs mirror the current rendered right-panel section headings.
2. Update `src/components/analysis/planning-document-blocks.tsx` so every current Product Plan `DesignedSection` and First Version `FvpSection` receives a stable matching `id`.
3. Add a lightweight rendered-anchor filter for the left rail so missing/generated-empty sub-sections are hidden while preserving top-level document tabs and status actions.
4. Keep the existing `project-workspace.tsx` scroll candidate collection and `AnchorNav` click behavior unchanged unless tests reveal a real gap.
5. Add/adjust tests in `src/components/analysis/planning-document-blocks.test.tsx` and, if useful, `src/lib/workspace-scroll-sync.test.ts` to verify anchor parity and active-candidate behavior.
6. Run focused tests, then run the smallest broader checks available for the touched files.
7. Perform a short implementation review and security review, saving findings to `plans/planning-subsection-scrollspy-review.md`.
8. Visually verify the behavior in the Codex in-app browser if a local workspace can be loaded with existing e2e credentials or fixture data.

## Milestones
- [x] Anchor contract updated: `SCROLLABLE_NAV_ITEMS` names every right-panel Product Plan and First Version section.
- [x] Renderers anchored: every visible current planning section has a matching DOM `id`.
- [x] Scroll behavior verified by static-render and scroll-helper tests: left-rail items target the IDs the existing scrollspy can highlight.
- [x] Review complete: code and security review notes are written and no remediation fixes were required.
- [ ] Browser verification complete. Deferred because the Codex in-app browser tools were not exposed in this session.

## Validation
- Focused unit/static-render tests for `planning-document-blocks`.
- Existing scroll helper tests for `workspace-scroll-sync`.
- Type/lint check if practical within the repo's current constraints.
- Browser verification of Product Plan and First Version Plan left-rail click + scroll highlight behavior.

## Risks And Mitigations
- Risk: Fixed nav items may point to sections omitted by malformed generated content. Mitigation: preserve existing behavior; missing IDs simply do not scroll, and fallback markdown remains available.
- Risk: Changing nav labels could affect user expectations or tests. Mitigation: match visible right-panel headings and keep labels concise.
- Risk: IDs added to semantic `section` elements could create duplicate IDs if legacy wrappers also use them. Mitigation: audit rendered output and assign each ID once per document layout branch.

## Rollback Or Recovery
Revert the nav registry and section ID additions. The top-level Product Plan and First Version Plan navigation will continue to work as it does today.

## Open Decisions
- Product Plan follow-through will stay as one combined nav item.
- First Version Plan labels will use exactly the visible right-panel section text, including `MVP` where the panel uses it.
- Hidden/missing generated sections will not be shown in the left rail.
- Whether browser verification should use an existing local project, Prompt Lab preview, or a lightweight fixture route if no seeded project is available.

## Critique

### Software Architect
- This is best solved as an anchor contract change, not a new scroll observer. The scroll system is already generic and Market Research proves it works when IDs and nav entries line up.

### Product Manager
- Matching the left rail to the right panel reduces cognitive friction. The main product choice is terminology: `MVP` is visible in the document, but `First Version` is the app-facing label.

### Customer Or End User
- A founder scanning a long plan needs predictable jumps. Missing sections or labels that do not match what they see would make the rail feel unreliable.

### Engineering Implementer
- The implementation is small but easy to get subtly wrong because Product Plan and First Version have both legacy and current render branches. Tests should assert current-layout IDs explicitly.

### Risk, Security, Or Operations
- Security risk is low because this is client-side rendering and navigation only. The main operational risk is broken deep links or duplicate anchors, both covered by static-render tests and browser checks.
