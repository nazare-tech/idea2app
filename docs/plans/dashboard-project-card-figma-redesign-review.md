# Dashboard Project Card Figma Redesign Review

## Outcome

Implemented Figma node `435:5578` on `/projects`. Cards retain responsive grid width while using the Figma-inspired 1px outer stroke, 430px height, padded Version A preview, 188px description panel, exact local neutral colors, bounded copy, and bottom-aligned creation date. Existing empty/unavailable states, navigation warmup, and delete behavior remain intact.

## Plan And Design Inputs

- Source: MakerCompass Figma node `435:5578`.
- Plan: `docs/plans/dashboard-project-card-figma-redesign-plan.md`.
- Cross-model plan review: local Claude Code with Opus 5 and medium effort; four evaluation rounds were incorporated or explicitly rejected in the plan.
- Scope stayed at the card component. The page grid remains responsive because the selected Figma node describes the component rather than a page-column system.

## Verification

- Focused component tests: 9 passed.
- Full direct unit suite: 732 passed, 0 failed.
- TypeScript: passed.
- Targeted ESLint: passed.
- Free Playwright smoke suite: 4 passed.
- Contrast: `#4a4040` on `#f6f6f6` measured 9.26:1.
- `npm test` wrapper limitation: it stopped before unit execution because an unrelated dirty Pro Max generated catalog is stale. The wrapper's underlying unit command passed 732/0; that unrelated work was preserved.

## Real UI Evidence

Authenticated Chrome verification used existing retained projects and made no project, mockup, credit, or fixture mutations.

- Desktop: 23 cards; first card 430px high, detail panel 188px high, preview canvas 198px high; all panels contained content and visible Version A images loaded without crop. This records the initial 2px-stroke implementation.
- Narrow: effective CSS viewport 487px wide; card stayed 430px high, detail panel 188px high, and preview canvas 198px high with content contained. This records the initial 2px-stroke implementation.
- Delete flow: opening the paid/free modal did not navigate. The dismissal button was verified as the topmost hit target and closing it kept the `/projects` URL.
- Evidence directory: `ui-evidence/2026-08-09/project-card-figma-redesign/`.

## Fresh-Eyes Review

### Pass 1

Found a real stacking regression introduced by an initial `isolate` class on each card wrapper. A fixed delete modal was trapped in the first card's stacking context, allowing later cards to paint above the overlay and intercept clicks. Removed `isolate`, retained the delete trigger's local `z-10`, and added `elementFromPoint` coverage to the Playwright smoke test.

Also found plan drift between an early 216px media proposal and the browser's then-current 198px available canvas. A later Figma change reduced the outer stroke to 1px and expanded that canvas to 200px; its evidence is recorded separately.

### Pass 2

No remaining blocker, major, or minor findings in the redesigned card paths. Full title text remains available in the DOM and through a native title tooltip; descriptions and dates remain inside the fixed panel across inspected widths.

## Code, Architecture, And Security Review

- Code: visual ownership is split cleanly between `DashboardProjectCard`, `ProjectCardThumbnail`, and `ProjectCardDetails`; existing interaction and image-failure paths are preserved.
- Architecture: no new abstraction or dependency was warranted. The generic `Card` primitive would add an unnecessary div surface around a navigable link.
- Performance: no new requests or eager images. Existing authenticated thumbnails stay lazy, async-decoded, and low priority.
- Security: no auth, authorization, API, storage, database, or user-input boundary changed. The existing authenticated mockup image proxy remains in place.
- Documentation: architecture, coding conventions, key-file directory map, and test inventory were updated.

## Remediation Checklist

- [x] Remove modal-breaking card stacking context.
- [x] Add topmost hit-target regression coverage.
- [x] Align initial media cap with its measured 198px geometry; follow-up 1px-stroke change updates it to 200px.
- [x] Add full-title tooltip.
- [x] Preserve empty, unavailable, and image-error states.
- [x] Preserve unrelated dirty work.

## Remaining Limitation

The repository-wide `npm test` convenience wrapper remains blocked by the unrelated stale generated Pro Max catalog gate. This card implementation's complete direct unit suite, typecheck, lint, Playwright smoke test, and real-Chrome verification are green.
