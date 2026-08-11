# Dashboard Project Card 1px Stroke Review

## Change

Updated Figma follow-up: project-card outer stroke changed from 2px to 1px. Card height remains 430px and details panel remains 188px. Auto-layout now leaves 200px for the padded thumbnail canvas.

Second Figma follow-up: details/text panel now uses only a 1px top divider. Left, right, and bottom edges come solely from the card's outer stroke.

## Verification

- Playwright contract: computed outer stroke is 1px at desktop and narrow widths; details panel borders resolve to 1px top and 0px on every other edge; card is 430px, details panel is 188px, thumbnail canvas is 200px, content stays contained, and delete modal does not navigate.
- Focused component tests cover the updated 200px thumbnail cap.
- Real Chrome: 23 existing cards loaded at a 1349×1191 effective viewport; details-panel computed borders were top-only with right/bottom/left all 0px. First card measured 430px high, details panel 188px, thumbnail canvas 200px, and all detail panels contained their content. Screenshot: `ui-evidence/2026-08-09/project-card-1px-stroke/projects-desktop.png`.

## Review

- No data, API, auth, or interaction behavior changed.
- Existing Version A, empty, unavailable, and image-error states remain unchanged.
- Subagent audit confirmed no other live 2px outer-card declaration.
