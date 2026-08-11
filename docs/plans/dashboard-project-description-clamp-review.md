# Dashboard Project Description Clamp Review

## Root Cause

Description line-height is 16.8px (`14px × 1.2`). The previous 72px text box was 4.8px taller than four lines, allowing the top pixels of a fifth line to enter the clipped region. Real Chrome also showed the `line-clamp-4` class had no emitted clamp properties, so height clipping was the only active guard.

## Fix

Keep the 72px description layout slot, cap its inner text at exactly 67.2px, and apply the four-line WebKit box clamp explicitly alongside `overflow-hidden`. Card, details-panel, and date spacing remain unchanged.

## Verification

- Component contract requires a 72px reserved slot around `max-h-[67.2px]` text with explicit four-line WebKit clamp properties.
- Playwright verifies every real card description box has an active four-line clamp and stays at or below four computed line-heights within 0.5px at desktop and narrow widths.
- Real Chrome checked all 23 existing descriptions without data mutation. Every box had active four-line clamp properties and stayed within four line-heights; the longest 786-character description rendered in a 67.19px box at 16.8px line-height.
- Evidence: `ui-evidence/2026-08-09/project-description-four-line-clamp/projects-desktop.png`.

## Review

- Text remains in the DOM; only visual overflow is clipped.
- No card height, panel height, navigation, data, API, auth, or security behavior changed.
