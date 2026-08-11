# Dashboard Project Dot Field Review

## Change

Reused the landing-page `HeroDotField` behind `/projects`. Dashboard mode keeps the seeded interactive dot lattice but disables all micro compass wedges. `DashboardShell` owns a viewport-bounded layer only for the exact `/projects` route, keeping canvas memory and draw work independent of project count.

## Verification

- Component contract confirms compass wedges default on for landing and can be disabled explicitly.
- Playwright waits for the first measured draw, then confirms exactly one dashboard dot canvas, `data-compass-wedges="false"`, and `pointer-events: none` at desktop and narrow widths; `/projects/new` has no dashboard field.
- Real Chrome used 23 existing projects at a 1349×1191 viewport without data or generation mutations. The dot canvas matched the 1349×1127 visible dashboard region while scrollable content was 5644px high, confirming viewport-bounded work. It reported wedges disabled, zero compass SVG marks, and pointer events disabled.
- Evidence: `ui-evidence/2026-08-09/dashboard-project-dot-field/projects-desktop.png`.

## Review

- Reused existing field and lifecycle code; no duplicated renderer or new dependency.
- Canvas remains decorative and `aria-hidden`; no interaction, auth, data, API, or security boundary changes.
- Dashboard shell owns stacking and clipping without creating a content stacking context; existing card navigation and delete controls stay above the canvas.
