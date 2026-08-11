# Dashboard Project Card Spacing Review

## Change

Updated `/projects` grid from 20px to 32px gaps on both axes. Responsive auto-fill columns and card geometry remain unchanged.

## Verification

- Playwright checks computed `column-gap` and `row-gap` as 32px at desktop and narrow viewports.
- Real Chrome used 23 existing projects at a 1349×1191 viewport. Computed row/column gaps were 32px; physical card separation measured 31.99px on both axes after subpixel layout. No data mutation.
- Evidence: `ui-evidence/2026-08-09/project-card-32px-gap/projects-desktop.png`.

## Review

- No card internals, interactions, data, API, auth, or generation behavior changed.
- Subagent audit confirmed the old `gap-5` was 20px and `gap-8` is the correct shared 32px Tailwind utility.
