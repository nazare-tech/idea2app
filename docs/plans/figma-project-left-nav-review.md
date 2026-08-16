# Review: Figma Project Left Navigation

## Outcome

Implemented Figma node `485:36617` in the real desktop project workspace. The completed-document state now uses the measured 300px rail, six ordered Lucide glyphs, 17px document headings, 14px subsection rows, CSS branch connectors, and the dark active row. Existing Generate, Retry, queued, generating, derived-document, scroll-follow, and mobile behavior remain intact.

## Plan Evaluation

The required opposite-model plan evaluation was attempted before implementation. It failed because the reviewer endpoint was unreachable (`ENOTFOUND`); `figma-project-left-nav-plan-eval.md` records the outage. No self-review was represented as cross-model coverage.

## Verification

- Red/green render contract: the new Figma hierarchy test initially failed because the old rail lacked the requested structure, then passed after implementation.
- Final focused tests: 3 passed, 0 failed.
- Final full project tests: 761 passed, 0 failed.
- `npm run typecheck`: passed.
- Focused ESLint for the changed component and test: passed.
- `git diff --check`: passed.
- Sweep threshold check: net +718 lines across the current repository batch; sweep not due.

## Real Chrome Evidence

Verified with the connected Chrome `Plasma` profile on the authenticated existing project route:

`/projects/eb326898-98b6-4929-9c15-dd8b045b26ae-event-photographers-on-demand`

- Desktop rail measured 300px wide with 24px horizontal and 20px top padding.
- Document icon measured 20px; heading measured 17px/800; subsection text measured 14px/500.
- Exact icon order: briefcase, chart-bar, clipboard-list, rocket, brush, sparkles.
- The heading icon is inside the same button as its document label.
- Clicking Product Plan → Introduction & Overview updated the URL to `?tab=prd#prd-introduction-overview`, set `aria-current="location"`, and kept the rail usable.
- At a sub-`lg` CSS viewport, the desktop rail was hidden and the existing `Open document list` mobile control remained visible.
- Browser console contained only pre-existing Chrome-extension asynchronous-listener noise; no application error was observed.

Evidence:

- `ui-evidence/2026-08-14/figma-project-left-nav/desktop-full-rail-1440x1400.png`
- `ui-evidence/2026-08-14/figma-project-left-nav/desktop-overview-1440x1000.png`
- `ui-evidence/2026-08-14/figma-project-left-nav/mobile-regression-1000css.png`

The existing project was used to avoid generation or credit spend. Exceptional status/action states were not forced in the browser because that would mutate project state; their behavior remains covered by render tests.

## Fresh-Eyes Review And Remediation

Pass 1 checked spacing, type, connector continuity, active-row contrast, long-label wrapping, rail overflow, and responsive behavior. No blocker remained.

Pass 2 independently found two issues:

1. Design Mockups used `Paintbrush`, while the Figma export matches Lucide `Brush`.
2. The icon was visually adjacent to the document heading button but outside its clickable and focusable target.

Both were fixed. The render contract now asserts all six exact icons in order and confirms the Executive Summary icon sits inside its heading button. The final real-browser check confirmed both remediations.

## Architecture And Security

- Kept icon ownership local to the desktop rail through one typed mapping.
- Replaced repeated connector assets with a small CSS primitive that adapts to wrapped and filtered rows.
- No API, authentication, authorization, persistence, billing, analytics, or sensitive-data boundary changed.
- No new dependency or asset bundle was added.
