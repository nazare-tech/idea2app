---
implemented: true
implemented_at: 2026-08-11T14:20:21Z
implementation_summary: Capped the responsive dashboard at two 648px desktop cards and matched the updated 500px Figma card proportions with a taller media region.
---

# Plan: Two-Column Project Dashboard Cards

## Goal

Update `/projects` so its fixed-width desktop content area renders at most two project cards per row, while preserving the existing responsive minimum-width behavior and increasing the card media height to match the updated Figma node `435:5578`.

## Assumptions

- `AppPageShell` provides a 1328px maximum inner desktop width (`1440px` shell minus `56px` padding per side).
- Current card minimum width is 420px; the Figma node is 647.336px wide and 500.039px tall.
- Updated Figma sub-layout is 338.447px media with a 298.447px padded image canvas, plus a 161.592px details panel. Existing title/action layout, description clamp, and date placement remain valid.
- `DashboardProjectCard` and `ProjectCardThumbnail` are dashboard-only components; no loading card or populated-grid sibling needs matching geometry.

## Clarifying Questions

1. How should the desktop two-column cap preserve responsive sizing?
   - Recommendation A: Preserve the existing `auto-fill`/`minmax(min(100%, ...), 1fr)` rule and raise its minimum from 420px to 430px. Three cards would require 1354px including gaps, so only two fit the 1328px content maximum; those two expand naturally to 648px each.
   - Trade-off: The minimum changes by 10px, so the one-column fallback occurs 20px earlier than today.
   - Recommendation B: Use explicit breakpoint-based one/two-column fractions.
   - Trade-off: Simpler classes, but card width can exceed the Figma master width and the existing minimum-width threshold becomes indirect.
   - Selected: Recommendation A. It directly reuses the current sizing logic and reaches the Figma width without a new hard maximum or breakpoint.

2. Which part of the 500px Figma height should grow?
   - Recommendation A: Match the updated Figma master: increase total card height from 430px to 500px, tighten the details panel from 188px to 162px, and raise the image canvas cap from 200px to 300px. Existing copy math fits within the 162px panel; the browser canvas resolves to roughly 296–298px after the 1px border and padding.
   - Trade-off: Details lose 26px of unused vertical space, while their content contract remains unchanged.
   - Recommendation B: Preserve the 188px details panel and put only the extra total height into media.
   - Trade-off: Taller media, but the overall proportions diverge from the updated Figma master.
   - Selected: Recommendation A. The supplied node is the explicit visual source and its details content already fits the tighter panel.

## Recommended First Step

Lock grid and card geometry in the existing browser contract before changing production classes, then implement the smallest class updates that satisfy it.

## Runtime and Change-Impact Analysis

### Repeated Work

- No polling, timers, network calls, or new render loops. CSS grid placement and card sizing run during normal browser layout.
- Expected frequency: initial render, viewport resize, and content reflow. Work per update is native layout for the existing card count.

### Ownership, Scope, And Lifetime

- Changed layout belongs to `/projects`; card height belongs to `DashboardProjectCard`; canvas cap belongs to `ProjectCardThumbnail`.
- State lifetime is the rendered dashboard route. No shared client state or data lifecycle changes.
- Fan-out is limited to project-card boxes, thumbnail canvases, and row wrapping.

### Boundary And Cache Semantics

- No client/server payload, persistence, cache, analytics, auth, billing, or API contract changes.
- Existing images, warmup behavior, actions, and responsive content remain unchanged.

### Failure And Recovery

- Main risks: accidental third desktop column, premature single-column fallback, stale 430px/188px/200px geometry in tests or docs, details/action-overlay drift, and content overflow.
- Blast radius: visual layout of `/projects` only.
- Recovery: revert grid/card/thumbnail classes plus matching test and architecture-doc assertions.

### Risk-Matched Verification

| Risk | Evidence | Acceptance threshold |
|---|---|---|
| Third desktop column | Real authenticated UI at 1440px viewport | At most two distinct card `x` positions in the first three cards |
| Width rules drift | Computed card/grid geometry | Two desktop tracks resolve near 648px; minimum is 430px when space permits; gap stays 32px |
| Media height unchanged | Computed card/details/canvas boxes | Card 500px, details 162px, canvas between 294px and 300px |
| Narrow overflow | Real UI at 390×844 | One contained card, width no greater than grid width, no horizontal overflow |
| Details regression | Existing component and e2e checks | Four-line clamp, top-only divider, date containment, and actions remain valid |

## Architecture Improvement Opportunities

1. **Selected — adjust the existing minimum-width threshold instead of adding breakpoint columns or another maximum.** Benefit: responsive column count and fluid card width stay in one CSS rule. Trade-off: arbitrary-value Tailwind syntax remains dense. Files: `src/app/(dashboard)/projects/page.tsx`.
2. **Selected — keep the details and action-overlay heights synchronized at the Figma-derived 162px.** Benefit: action alignment and copy containment remain stable while media gets the intended space. Trade-off: the repeated local height still requires synchronized edits. Files: card and details components.
3. **Rejected as over-engineering — add a project-card dimension module or global design tokens.** Benefit: centralized numbers. Trade-off: these dimensions have one production surface and CSS classes are the clearest current owner.
4. **Deferred — container-query-driven card internals.** Benefit: richer future variants. Trade-off: no current multi-surface card reuse requires it.

## Critique

### Architecture

The change stays at the narrowest owners. A shared abstraction would add indirection without another consumer.

### Product And Customer

Two larger cards improve preview legibility and align with the supplied design. More vertical scrolling is expected; preserving the responsive one-card state avoids cramped cards.

### Engineering

Pure CSS changes are low risk, but geometry values are easy to drift. Browser assertions and system documentation must change with production classes.

### Risk, Security, And Operations

No security, data, entitlement, or production-operation changes. Authenticated UI verification uses existing projects only and spends no generation credits.

## Implementation Phases

1. [x] Update browser geometry expectations for two-column minimum-width behavior and 500px/162px/~298px card geometry.
2. [x] Update dashboard grid minimum, card/details/action-overlay height, and thumbnail canvas cap.
3. [x] Update architecture and test-inventory documentation describing the layout contract.
4. [x] Run focused unit/type/lint checks and authenticated UI verification at desktop and narrow viewports.
5. [x] Complete fresh-eyes code/security review, remediate findings, and mark this plan implemented.

## Milestones

- M1: Geometry contract fails against current three-column, 430px implementation.
- M2: Focused automated checks pass with two-column 500px cards and Figma-matched internal proportions.
- M3: Real UI evidence confirms desktop and narrow behavior.

## Test Strategy

- Focused component tests for thumbnail/details contracts.
- Typecheck and lint for touched files.
- Focused authenticated Playwright project-card flow if environment is available.
- Real Chrome at 1440px desktop and 390×844 narrow; save screenshots under `ui-evidence/<implementation-date>/project-card-two-column/`.

## Rollback Or Recovery

Restore the previous grid minimum (`420px`), card height (`430px`), details/action-overlay height (`188px`), thumbnail cap (`200px`), and synchronized test/doc assertions. No data rollback is needed.

## Open Decisions

- None. Recommendation A selected under repository policy and explicit user direction.

## Completion Notes

- Cross-model plan evaluation was attempted twice. Both Opus reviewer calls exited without output, so the plan is formally unevaluated; no cross-model coverage is claimed.
- Real Chrome at CSS 2000×1250 measured two 648.008px columns, 32px gaps, 500px cards, 161.992px details panels, and 296.758px media canvases. CSS 390×844 measured one contained 352.383px card with no horizontal overflow.
- Evidence: `ui-evidence/2026-08-11/project-card-two-column/projects-desktop.png` and `projects-narrow.png`.
- Verification and fresh-eyes findings are recorded in `docs/plans/dashboard-project-card-two-column-review.md`.
