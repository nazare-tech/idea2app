---
implemented: true
implemented_at: 2026-08-10T05:47:49Z
implementation_summary: Rebuilt the project card around the Figma geometry, preserved responsive width and Version A thumbnail behavior, added bounded detail content, and verified navigation/delete stacking in real Chrome.
---

# Plan: Dashboard Project Card Figma Redesign

## Goal

Implement Figma node `435:5578` for the `/projects` card: 430px fixed height, 1px neutral outer stroke, padded centered preview, separate light-gray 188px description panel, tighter typography, and left-aligned italic creation date. Preserve the existing responsive grid, Version A thumbnail behavior, empty/unavailable states, navigation warmup, and deletion flows.

## Assumptions

- Figma node `435:5578` is the authoritative visual reference.
- The 420px Figma width is the reference measurement for internal geometry; the existing responsive grid remains page-level source of truth.
- Existing delete control and modal behavior remain even though the static Figma sample omits them.
- No Figma-exported thumbnail asset is added because card imagery is dynamic project data.

## Clarifying Questions

1. Should the production grid force every card to exactly 420px wide?
   - Recommendation A: Keep the existing responsive grid and reproduce the Figma internals at its 420px reference width.
   - Trade-off: Preserves good use of available space and narrow-screen behavior while matching the component design.
   - Recommendation B: Cap every card at 420px.
   - Trade-off: Matches the canvas width literally, but creates unused grid space and changes page-level layout beyond the selected component.
   - Selected: Recommendation A under the repository default-selection rule. Card internals match the selected Figma node at its 420px reference width; the page grid stays fluid.
2. Should the existing delete affordance be removed because it is absent from the sample?
   - Recommendation A: Preserve it as existing product behavior, positioned over the preview.
   - Trade-off: Maintains functionality without changing the Figma description panel.
   - Recommendation B: Remove it for literal visual parity.
   - Trade-off: Cleaner static match, but silently removes a paid-plan feature.
   - Selected: Recommendation A.

## Recommended First Step

Add focused markup assertions for the redesigned preview frame, then update the card and thumbnail layout classes together so the 430px total-height contract remains coherent.

## Runtime and Change-Impact Analysis

### Repeated Work

- No new timers, requests, effects, subscriptions, or image generation.
- Each card renders the same existing thumbnail and text once per `/projects` render.
- Only CSS layout and typography work changes; image loading remains lazy, async-decoded, and low priority.

### Ownership, Scope, And Lifetime

- Card height (`430px`) and panel height (`188px`) are owned by `DashboardProjectCard`; width remains owned by the existing responsive `/projects` grid. Repository search confirms `DashboardProjectCard` has one caller.
- Preview padding and image canvas remain owned by `ProjectCardThumbnail`.
- State lifetime, project fan-out, navigation, deletion, and image-error fallback are unchanged.

### Boundary And Cache Semantics

- No database, API, parser, prop, cache, persistence, or analytics contract changes.
- Existing thumbnail URLs, authenticated proxy behavior, and browser caching remain unchanged.
- Mixed deployments are safe because this is CSS/markup-only behavior.

### Failure And Recovery

- Long titles remain one line with full text in the DOM and a native title tooltip; descriptions keep the existing fallback copy and an explicit four-line visual clamp at every width. Visual truncation is intentional because the card opens the full project workspace.
- Missing or failed images retain existing empty/unavailable rendering inside the redesigned media frame.
- Rollback is limited to the card and thumbnail class changes plus documentation.

### Risk-Matched Verification

| Risk | Evidence | Acceptance threshold |
|---|---|---|
| Height/panel mismatch | Browser bounding-box inspection, the sole geometry gate | Card is 430px ±2px and lower panel is 188px ±2px at desktop and narrow widths |
| Image crop or distortion | Real existing Version A image at desktop and narrow widths | Image remains contained with natural dimensions loaded |
| Text layout regression | Real cards with varied titles/descriptions at desktop and narrow width | One-line title, four-line bounded/fallback description, italic date aligned left; no panel overflow |
| Grid spacing regression | Playwright computed style and real-Chrome screenshot | Row and column gaps both resolve to 32px |
| Wide-card behavior | Desktop bounding-box and screenshot inspection | Wider responsive cards keep the 200px-capped image centered without crop or panel drift |
| Interaction regression | Real card navigation and delete affordance inspection | Card link still opens workspace; delete remains separate |
| Empty-state regression | Focused component render tests | Empty and unavailable copy still render without `<img>` |

## Architecture Improvement Opportunities

1. **Selected — keep panel sizing in the card and media sizing in the thumbnail component.** Benefit: future card redesign stays modular. Trade-off: coordinated fixed heights across two files require real-browser geometry verification.
2. **Selected — use semantic project tokens where they match, exact Figma colors where no token exists.** Benefit: preserves design fidelity without changing global tokens. Trade-off: two local hex values remain component-specific.
3. **Deferred — introduce a formal project-card design variant.** Benefit: reusable variants. Trade-off: only one current production card design exists, so CVA would add abstraction without reuse.
4. **Rejected — commit the Figma sample image.** Real cards must continue showing dynamic Version A data; sample asset would be false content.
5. **Rejected — compose the generic `Card` primitive.** `DashboardProjectCard` is a navigable `<Link>` with sibling delete action and exact Figma border/panel structure; wrapping it in the generic div-based Card would add invalid or redundant nesting.

## Plan

- [x] Add focused thumbnail markup assertions for the padded, 200px-capped media layout; keep browser measurement as the sole geometry gate.
- [x] Implement Figma card structure, dimensions, 1px outer stroke, top-only details divider, surfaces, and typography.
- [x] Preserve the `/projects` responsive grid with 32px row and column gaps; confirm zero-project state remains intentionally separate and no loading/new-project tile exists.
- [x] Keep delete trigger as a `z-10` sibling outside the link and verify opening/canceling its modal does not navigate.
- [x] Add a free-tier Playwright smoke assertion in `e2e/smoke.spec.ts` for card/panel bounding boxes and delete-modal click routing.
- [x] Update `docs/systems/architecture.md`, `docs/systems/coding-conventions.md`, `docs/systems/directories-and-key-files.md`, and `docs/testing/test-inventory.md`.
- [x] Run focused tests, typecheck, targeted lint, and the full underlying unit suite.
- [x] Verify authenticated `/projects` in real Chrome at desktop and narrow widths; capture evidence.
- [x] Complete fresh-eyes, code, architecture, and security review; remediate findings.
- [x] Mark plan implemented and record evidence.

## Milestones

1. Static card and thumbnail contracts match Figma.
2. Existing card behavior remains green.
3. Real browser evidence confirms layout at both viewports.

## Test Strategy

- Component markup tests for thumbnail states plus media sizing/padding contract.
- Playwright assertions for 32px row/column grid gaps, 430px ±2px card height, 188px ±2px panel height, description containment, and delete trigger remaining clickable without navigation at desktop and narrow widths. With E2E credentials present, the retained account must contain a project; absence is an explicit failure rather than a fixture mutation.
- TypeScript and targeted ESLint for changed source/tests.
- Full unit suite because this card builds on the just-added thumbnail data path.
- Authenticated real-Chrome comparison against Figma node `435:5578`, using the existing 23-project account only. Capture desktop, narrow, and delete-modal states under `ui-evidence/<implementation-date>/project-card-figma-redesign/`. No generation or credit spend.

## Rollback Or Recovery

- Revert the card/thumbnail layout classes and related docs. No data, generated assets, cache, or migrations require cleanup.

## Open Decisions

- None.

## Critique

### Software Architect

- Fixed vertical regions preserve the explicit Figma geometry and density. Existing grid continues owning responsive width.

### Product Manager

- Stronger separation between visual preview and project description improves scanning without adding interaction scope.

### Customer Or End User

- Dates become easier to locate and descriptions denser. Long visual content is intentionally bounded; full DOM text remains available to assistive technology and the linked workspace.

### Engineering Implementer

- Figma's generated flex dimensions are internally over-constrained; browser evidence, not blind class copying, determines the final faithful result.

### Risk, Security, Or Operations

- CSS-only change adds no trust boundary. Existing authenticated image proxy and delete authorization remain untouched.

## Cross-Model Plan Evaluation

- Reviewer: local Claude Code, Opus 5 via `opus`, effort medium.
- Accepted from first evaluation: measure geometry in real Chrome with a ±2px tolerance, add a full-name tooltip, and explicitly audit loading-skeleton ownership and generic Card reuse. Its rem-relative minimum-height proposal was superseded after the second evaluation exposed the need to choose literal versus fluid Figma geometry.
- Already satisfied: delete trigger is already a sibling outside the `<Link>`; null/empty descriptions already resolve to `No project context captured yet.`
- Rejected with evidence: no `/projects` loading skeleton or placeholder card exists in the current source tree, so there is no stale skeleton height to update.
- Confirmed: `/projects` uses the light `bg-background` dashboard main surface. Exact Figma `#c9c9c9` and `#f6f6f6` values can remain local without introducing incomplete dark-theme tokens.
- Second evaluation proposed literal 420px × 430px geometry and a 216px media cap. The later evaluation and implementation retained the responsive grid, fixed the card at 430px high, fixed the panel at 188px, and resolved the preview canvas to the 200px available after the updated 1px outer stroke and padding. Browser bounds are the geometry gate; class-string tests do not claim rendered-size coverage.
- Accepted from second evaluation: define wide-card behavior, use `z-10` for the sibling delete trigger and verify its modal interaction, audit the zero-project/new-project/loading states, name the exact evidence directory, and record local Figma color exceptions in coding conventions.
- Rejected with evidence: `/projects` has neither a loading-card skeleton nor a new-project tile in the populated grid. The zero-project state is a standalone callout and intentionally remains unchanged.
- Third evaluation restored Recommendation A: keep the responsive grid because the user supplied a component node, not an explicit page-column redesign. Repository search confirms the card has only the `/projects` caller.
- Accepted from third evaluation: add a permanent Playwright bounding-box check; document exact type and spacing math; keep the date bottom-anchored; use an implementation-date evidence path.
- Exact Figma panel math: `188px` border-box minus its `1px` top divider and `40px` padding leaves `147px`; title is `18px/21.6px`, and the description block starts after `8px` with a 72px layout slot containing an exact four-line `14px/16.8px` clip (`67.2px`). The date is `14px/18.2px`; `mt-auto` bottom-anchors it. The `430px` outer border-box leaves a `240px` preview flex region after its 1px outer stroke on both edges and 188px panel; 20px preview padding leaves a 200px media canvas.
- Rejected: changing fixed Figma pixel dimensions to rem/min-height would no longer implement the selected component. All text uses explicit pixel sizes; browser zoom scales the boxes and type together. Visual truncation is intentional and full text remains in the DOM.
- Accepted from the fourth evaluation: assert every detail panel contains its content, test delete-modal hit routing with `elementFromPoint`, and prove the thumbnail component has one production caller. The requested fixture row was rejected because the free verification policy forbids project/data mutation; the real retained E2E account supplied 23 projects and the test fails explicitly if credentials exist but no project does.

## Implementation Evidence

- Component tests: 9 passed.
- Full direct unit suite: 732 passed, 0 failed.
- Typecheck and targeted ESLint: passed.
- Playwright free smoke suite: 4 passed.
- Real Chrome: 23 cards; the original implementation confirmed card, detail, image, and interaction behavior at desktop and narrow widths. The later 1px-stroke adjustment is recorded in `dashboard-project-card-1px-stroke-review.md` with fresh evidence.
- Screenshots: `ui-evidence/2026-08-09/project-card-figma-redesign/projects-desktop.png`, `projects-narrow.png`, and `projects-delete-modal.png`.
- Limitation: the `npm test` wrapper stopped at an unrelated stale generated Pro Max catalog check. Running its underlying unit command directly produced the 732/0 result above; unrelated dirty catalog work was not overwritten.
