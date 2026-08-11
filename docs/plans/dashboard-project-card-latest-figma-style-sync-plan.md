---
implemented: true
implemented_at: 2026-08-11
implementation_summary: Synced the dashboard project card to Figma node 435:5578 while retaining the existing accessible overflow control and two-column grid behavior.
---

# Plan: Latest Figma Project Card Style Sync

## Goal

Implement every intentional visual change in MakerCompass Figma node `435:5578` on `/projects`, while preserving the existing responsive two-column sizing, real project thumbnail source, and accessible overflow menu implementation. Ignore the Figma-exported overflow image asset as explicitly requested.

## Assumptions

- Figma node `435:5578` is the current visual source of truth: 647.336×500.039px, 339.447px media region, 299.447px padded canvas, and 160.592px details region.
- Current 430px minimum track, two-column cap, 32px gaps, 500px total card height, project navigation, mockup loading, rename/delete menu behavior, focus handling, and data contracts remain unchanged.
- Existing Lucide `Ellipsis` inside the Radix menu trigger replaces Figma asset node `457:15016`; only its default size/color/position may change.
- Figma variables map directly to existing tokens: `bg-card`, `text-text-primary`, `text-text-secondary`, `rounded-lg`, and 8px spacing.

## Clarifying Questions

1. How closely should structural styling follow the updated Figma node?
   - Recommendation A: Match every visible default-state change: borderless transparent card shell, isolated 24px-rounded white media surface, transparent details, 8px horizontal/20px vertical details padding, 160.6px details height, medium title, natural-line-height description inside a hard 72px clip, and inline-positioned existing overflow control.
   - Trade-off: Removes the previous gray panel and outline completely; dotted dashboard background becomes visible around/beneath text.
   - Recommendation B: Apply only typography and radius changes while retaining the previous bordered gray card shell.
   - Trade-off: Lower regression risk, but visibly contradicts the supplied design and explicit “find all changes” request.
   - Selected: Recommendation A. User explicitly requested deep, complete implementation.

2. Should static Figma styling replace interactive accessibility states?
   - Recommendation A: Match default state exactly while preserving current keyboard focus ring, menu hit target, hover feedback, and sibling-button structure.
   - Trade-off: Hover/focus states are application-owned because the supplied Figma node shows only the resting state.
   - Recommendation B: Remove focus/hover treatments to mirror only the static frame.
   - Trade-off: Reduces usability and accessibility without design evidence for interactive states.
   - Selected: Recommendation A. Existing interaction semantics stay; only resting geometry and styling change.

## Recommended First Step

Encode the new Figma surface, spacing, typography, and geometry as failing component/E2E assertions before changing production classes.

## Runtime and Change-Impact Analysis

### Repeated Work

- No timers, polling, network calls, queues, generation, or new render loops. Changes affect native layout/paint during route render and resize only.
- Existing hover/focus workspace warmup remains unchanged; no extra work or fan-out is added.

### Ownership, Scope, And Lifetime

- Shell and menu-trigger styling remain in `DashboardProjectCard`.
- Details typography/spacing remain in `ProjectCardDetails`.
- Media surface/radius remain in `ProjectCardThumbnail`.
- Lifetime is one mounted `/projects` route; no shared state or persisted resource changes.

### Boundary And Cache Semantics

- No client/server payload, API, cache, auth, billing, analytics, persistence, thumbnail selection, or URL contract changes.
- Existing thumbnail failure/empty states render inside the new media surface without behavior changes.

### Failure And Recovery

- Risks: stale outer border/background, gray panel remnants, wrong 24px media radius, text/action misalignment, long-title overlap, details overflow at 161px, incorrect line-height clamp, narrow horizontal overflow, or interaction regression.
- Blast radius: visual layout and menu placement on `/projects` only.
- Recovery: revert card/details/thumbnail classes and synchronized assertions/docs; no data rollback.

### Risk-Matched Verification

| Risk | Evidence | Acceptance threshold |
|---|---|---|
| Old surface styling survives | Computed Chrome styles | Card border 0px and transparent background; details border 0px and transparent background |
| Media treatment drifts | Computed geometry/styles | Media radius 24px, white background, 20px padding; canvas 298–300px |
| Typography/spacing drifts | Computed styles | Title 18px/500 inside a 21.6px clipped row; details 8px x-padding and 20px y-padding; description 14px with natural leading inside 72px clip |
| Details/action overflow | Browser containment and bounding boxes | 160.6px details; every date contained; long title ends before existing action hit area |
| Responsive regression | Real UI at desktop and 390×844 | Two desktop columns, one narrow column, no horizontal overflow |
| Interaction regression | Focused authenticated Playwright | Rename/delete menu, focus restoration, persistence/restore, and touch tap-through still pass |

## Architecture Improvement Opportunities

1. **Selected — keep style ownership split across existing three card components.** Benefit: Figma layers map to current component boundaries; no new abstraction. Trade-off: card/details height stays synchronized across two files plus tests.
2. **Selected — reuse semantic tokens now identical to Figma variables.** Benefit: removes obsolete hard-coded `#c9c9c9`/`#f6f6f6` exceptions. Trade-off: none; token values match exactly.
3. **Selected — preserve existing sibling overflow trigger.** Benefit: valid HTML, keyboard behavior, larger hit target, and explicit user direction. Trade-off: absolute positioning must track title geometry.
4. **Rejected as over-engineering — introduce a card-style variant or dimension module.** Benefit: central values. Trade-off: one production surface and no active alternate style.
5. **Deferred — add Storybook/visual-diff infrastructure.** Benefit: automated screenshot comparison. Trade-off: repository already has focused authenticated Playwright and real-Chrome evidence; infrastructure expansion exceeds scope.

## Implementation Phases

1. [x] Add failing assertions for borderless/transparent surfaces, 24px media radius, 160.6px details, token usage, medium title, natural-line-height hard clipping without CSS ellipsis, and action positioning.
2. [x] Update card shell, media surface, details panel, typography, clipping, and existing overflow-control geometry.
3. [x] Update architecture, coding-convention, and test-inventory documentation to remove retired style claims.
4. [x] Run focused tests, typecheck, lint, full unit suite, and focused authenticated Playwright. Real-browser screenshot capture was attempted but blocked by browser URL security policy after local authentication; no bypass was used.
5. [x] Run independent Figma/code/layout audits, record findings/security scope, remediate, and mark plan implemented.

## Milestones

- M1: Old card fails new style contract.
- M2: Automated geometry/style assertions pass.
- M3: Real UI visually matches Figma while overflow interactions still work.

## Test Strategy

- Component markup assertions for details and thumbnail classes.
- Authenticated Playwright computed-style/geometry assertions plus existing rename/delete/touch flows.
- `npm run typecheck`, touched-file ESLint, full `npm test`.
- Real Chrome with existing projects only at desktop and 390×844; screenshots under `ui-evidence/<implementation-date>/project-card-latest-figma-style/`.
- No project creation, generation, provider calls, or credit spend.

## Rollback Or Recovery

Restore the previous card border/background, media radius, details surface/padding/height, title weight, description leading/clamp, and action wrapper geometry with matching tests/docs. No migration or data recovery.

## Open Decisions

- None. Recommendation A selected under explicit user direction and repository policy.

## Critique

### Software Architect

Existing boundaries already match Figma layers. Adding variants or shared constants would create abstraction without another consumer.

### Product Manager

New borderless composition feels lighter and lets the dot-field background participate in the card. Existing larger overflow hit target must remain discoverable despite Figma's smaller visual glyph.

### Customer Or End User

Preview gains emphasis; details feel less boxed-in. Long names, empty previews, narrow screens, and menu access need explicit verification.

### Engineering Implementer

Main risk is thinking this is only a color change. Figma also changed radius, panel structure, padding, height allocation, title weight, line-height, clipping, and action placement.

### Risk, Security, Or Operations

No trust boundary changes. Security review is expected to be not applicable beyond confirming no interaction/data logic drift.

## Completion Notes

- Exact resting-state changes implemented: transparent borderless shell/details, white 24px-rounded media surface, 160.6px details height, 8px/20px details insets, 18px medium title, natural 14px description in a 72px hard clip, and 16px-by-18px existing Lucide overflow glyph alignment.
- Preserved: 500px card height, max-two-column grid, responsive widths, thumbnail source/empty states, focus ring, 32px overflow hit target, Rename/Delete dialogs, navigation warmup, and touch tap-through protection.
- Verification: 10 focused component tests, typecheck, touched-file ESLint, 746-test full suite, two authenticated Chromium E2E tests, and `git diff --check` all passed.
- Cross-model plan evaluation was unavailable twice due reviewer API DNS failure; the two evaluation artifacts record the outage and do not claim coverage.
- Real Chrome and in-app browser inspection both redirected to local auth; after test-account submission the browser security policy blocked further inspection. Per policy, no workaround or alternate screenshot capture was attempted. Computed-style and bounding-box coverage remains in authenticated Playwright.
