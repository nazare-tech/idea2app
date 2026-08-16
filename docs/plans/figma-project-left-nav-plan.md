---
implemented: true
implemented_at: 2026-08-14T22:49:56-07:00
implementation_summary: Rebuilt the real desktop project rail from Figma node 485:36617, preserved exceptional document states and mobile behavior, and verified it on an authenticated existing project.
---

# Plan: Figma Project Left Navigation

> Plan evaluation was attempted before implementation, but the opposite-model evaluator could not reach its API (`ENOTFOUND`). This plan therefore remained explicitly unevaluated; implementation proceeded with local critique, tests, real-browser evidence, and an independent subagent review.

## Goal

Implement Figma node `485:36617` on the real desktop project workspace while preserving existing scroll synchronization, document generation/retry affordances, derived-document status handling, accessibility, and the separate mobile navigation.

## Assumptions

- The linked 300×1544 Figma node is authoritative for the completed desktop rail state.
- “Actual project page” means `/projects/[projectRef]` through `ProjectWorkspace` and `AnchorNav`, not the landing-page preview.
- User permission to simplify layers supports CSS branch connectors instead of committed connector SVGs.
- Existing dirty worktree changes are user-owned and must remain untouched except for narrow edits to files this task owns.

## Clarifying Questions

1. Should Figma styling replace existing desktop status/action behavior?
   - Recommendation A: Preserve Generate/Retry and non-ready status labels, but render the Figma-complete state exactly when documents are done.
   - Trade-off: Keeps product functionality; exceptional states necessarily differ from the all-done Figma frame.
   - Recommendation B: Remove desktop statuses/actions for literal static parity.
   - Trade-off: Closer only to this one frame; loses important recovery and generation controls.
   - Selected: Recommendation A, per repository product behavior and auto-selection policy.
2. Should the linked desktop design also change mobile navigation?
   - Recommendation A: Keep `MobileDocumentBar` unchanged; apply the 300px Figma rail at `lg+` only.
   - Trade-off: Preserves purpose-built mobile behavior; desktop and mobile remain intentionally different.
   - Recommendation B: Rebuild mobile around the desktop hierarchy.
   - Trade-off: Expands scope without a mobile Figma reference and risks regressions.
   - Selected: Recommendation A.
3. Should exact icon and connector assets be committed?
   - Recommendation A: Reuse installed Lucide icons whose paths match the Figma exports; draw repeated branch connectors with CSS.
   - Trade-off: Fewer assets and layers; CSS geometry must be visually checked.
   - Recommendation B: Download and commit every exported SVG.
   - Trade-off: Literal asset parity; unnecessary files and less adaptable connectors.
   - Selected: Recommendation A.

## Recommended First Step

Lock the Figma structure into a focused server-render contract test before changing `AnchorNav`.

## Runtime and Change-Impact Analysis

### Repeated Work

- Existing active-section effect runs on scroll-derived `activeSectionId` changes and may call `nav.scrollBy`; cadence and work remain unchanged.
- Expected frequency: one render/effect per active-section transition; worst case follows rapid user scrolling through document anchors.
- Work per update: one desktop-rail selector lookup plus geometry comparison; icon and connector rendering is static CSS/React output with no new timers, subscriptions, requests, or observers.

### Ownership, Scope, And Lifetime

- Changed state/resource: none; visual mapping from nav key to icon stays module-local to desktop `AnchorNav`.
- Narrowest owner: `src/components/layout/anchor-nav.tsx`; existing section registry, status primitives, scroll hook, and mobile bar retain ownership.
- Fan-out: desktop project workspace and landing preview reuse `AnchorNavTab`; styles must remain container-safe.
- Navigation, retry, reduced-motion, scroll restoration, and component disposal semantics remain unchanged.

### Boundary And Cache Semantics

- No API, client/server payload, persistence, cache, billing, generation queue, or analytics contract changes.
- Existing `DocumentNavItem`, status maps, and callback signatures remain compatible.
- Rollout is a CSS/component presentation change; rollback is the narrow `AnchorNav` diff.

### Failure And Recovery

- Main failures: title/action collision in non-ready states, wrapped subsection clipping, connector misalignment, or lost keyboard focus/scroll position.
- Blast radius: desktop workspace rail and any `AnchorNavTab` preview consumer; document content and generation remain unaffected.
- Recovery: revert nav component/test/doc changes; no data repair needed.

### Risk-Matched Verification

| Risk | Observable evidence or test | Acceptance threshold |
|---|---|---|
| Figma structure drifts | Static-render contract plus desktop screenshot | Six ordered icons, 300px rail, 17px titles, 14px rows, branch connectors, black active row |
| Dynamic actions regress | Existing and extended render tests | One Retry for real failed item; none for derived incomplete item |
| Interaction breaks | Authenticated real-page click/scroll check | Clicking a subsection updates visible section/hash and rail position remains usable |
| Responsive regression | Desktop and sub-`lg` browser checks | Desktop rail visible at 1440px; mobile rail remains hidden and existing mobile chrome remains available |
| Runtime errors | Focused tests, typecheck, browser console | Zero test/type errors; zero new console errors |

## Architecture Improvement Opportunities

- Selected: one typed nav-icon map inside `AnchorNav`, reusing installed Lucide components. Benefit: clear design mapping without widening shared document contracts. Trade-off: desktop-only mapping remains separate from generic document definitions. Likely file: `src/components/layout/anchor-nav.tsx`.
- Selected: CSS connector primitive generated per subsection. Benefit: adapts automatically to filtered/wrapped rows and removes repeated SVG assets. Trade-off: requires real-browser visual verification. Likely file: `src/components/layout/anchor-nav.tsx`.
- Deferred: add icons to `DocumentNavItem`. Benefit: one registry for every navigation surface. Trade-off: mobile currently does not use these icons and changing the shared contract expands scope.
- Rejected: change polling, document state, analytics, or mobile navigation. No benefit to requested visual outcome.

## Plan

1. Add a failing `AnchorNav` render contract covering Figma icon order, connector structure, active treatment, and preserved dynamic actions.
2. Restyle `AnchorNavTab` and `AnchorNav` to the measured Figma geometry using existing semantic tokens and exact matching Lucide glyphs.
3. Run focused tests, typecheck, and lint for touched source.
4. Update `docs/systems/architecture.md` with the desktop rail’s current Figma behavior.
5. Verify the authenticated real project workspace in Chrome at desktop and narrow widths; capture evidence under `ui-evidence/2026-08-14/figma-project-left-nav/`.
6. Complete two fresh-eyes passes, code/security review artifact, remediation, and plan metadata.

## Milestones

- Contract locked: focused test fails for missing Figma structure, then passes after implementation.
- Visual parity: real project rail matches linked frame at desktop width.
- Safe completion: interactions, responsive behavior, typecheck/lint, review, and evidence complete.

## Validation

- `node --import tsx --test src/components/layout/anchor-nav.test.tsx`
- `npm run typecheck`
- Focused ESLint on touched TypeScript/TSX files.
- Authenticated real Chrome on an existing project; no new project generation or credit spend.
- Screenshot plus route, viewport, state, and interaction notes in review artifact.

## Risks And Mitigations

- Dirty worktree overlap: inspect diff before every patch and edit only narrow task-owned sections.
- Figma shows only done state: preserve existing exceptional-state logic and test it explicitly.
- Long labels wrap: use content-driven row heights and visually inspect `Risks, Dependencies & Open Questions`.
- Landing preview reuse: keep `AnchorNavTab` width-flexible and avoid assumptions about outer 300px rail.

## Rollback Or Recovery

- Revert this task’s `anchor-nav.tsx`, focused test additions, architecture paragraph, plan, and review artifacts. No schema, API, data, cache, or billing rollback exists.

## Open Decisions

- None.

## Critique

### Software Architect

- Local icon mapping duplicates some semantic document identity, but expanding the shared registry for one desktop visual would be premature. Preserve callbacks and state boundaries.

### Product Manager

- Literal removal of recovery actions would make failed documents harder to fix. Exact parity should apply to the all-done state, not erase product states absent from the frame.

### Customer Or End User

- New hierarchy is calmer and easier to scan. Active state must remain obvious, focus-visible, and reachable without rail scroll jumps.

### Engineering Implementer

- Branch geometry and long wrapping labels are the high-risk details. Tests can lock structure, but real-browser evidence must decide final spacing.

### Risk, Security, Or Operations

- No sensitive boundary changes. Main operational risk is accidental overlap with existing dirty files; keep patches narrow and verify final diff provenance.
