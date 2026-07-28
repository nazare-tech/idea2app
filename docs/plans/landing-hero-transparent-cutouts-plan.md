# Landing Hero Transparent Cutouts Plan

## Goal

Replace the ten shortlisted landing hero reel images with transparent, consistently scaled phone cutouts. Preserve the original crops, remove baked white backgrounds and cast shadows, and restore depth with CSS so the cutouts blend into the landing page.

## Recommendation A

Use the built-in image editor to place each unchanged phone on a flat chroma-key background, remove that key locally, then normalize every alpha cutout onto the same canvas.

- Preserve the original ten PNGs.
- Create versioned `*-cutout.png` siblings.
- Use a 576×1008 transparent canvas.
- Normalize the visible phone to an 880 px height, horizontally centered with
  28 px above it and extra room below for the CSS shadow.
- Keep the runtime fully local: the landing page loads static PNGs and makes no image/API calls.
- Use `filter: drop-shadow(...)` on the transparent image instead of a rectangular card shadow.

## Alternatives Considered

### B — Overwrite the current crops

Rejected because it removes the easiest rollback path and makes visual comparison harder.

### C — Remove near-white pixels directly from the originals

Rejected as the primary approach because near-white UI and antialiased phone edges can be damaged. It remains a validation/fallback technique only if an image edit cannot preserve the device.

### D — Keep the white canvas and match the page background

Rejected because responsive surfaces and future theme changes would expose the rectangle again.

## Phases

1. Inspect the ten source images and record visible phone bounds.
2. Edit each source to a flat chroma-key background while preserving the phone UI and geometry.
3. Convert the chroma key to alpha and normalize all cutouts to the shared canvas/device height.
4. Add a repeatable local normalizer script and document it.
5. Update the hero asset manifest, CSS treatment, integrity test, and system docs.
6. Run focused tests, lint/typecheck, build where feasible, and real-browser visual verification at desktop and mobile widths.
7. Review the final diff for visual regressions, asset integrity, accessibility, and accidental unrelated changes.

## Verification Contract

- Exactly ten hero sources, each repeated five times across fifty decorative cards.
- Every generated asset is an 8-bit 576×1008 RGBA PNG.
- Canvas corners are transparent.
- The non-transparent phone bounds have the same 880 px height.
- No rectangular border, fill, or baked image shadow appears around a reel card.
- A CSS drop shadow follows the phone silhouette.
- The landing page remains usable with motion reduced and at mobile/desktop breakpoints.
- Original crop files remain unchanged.

## Risks and Mitigations

- **Image-editor drift:** compare every generated phone against its source; retry any altered UI or geometry before integration.
- **Magenta spill:** use soft matte/despill, then visually inspect edges at high contrast.
- **Inconsistent optical size:** normalize the alpha bounds after background removal, not the source canvas.
- **Shadow clipping:** keep reel cards transparent and allow the image filter room inside the normalized canvas.
- **Large asset payloads:** strip metadata during normalization and preserve PNG integrity checks.

## Scope Guard

This change touches only the ten landing hero reel assets and their local integration. It does not alter generated project mockups, gallery crops, runtime mockup generation, or external API configuration.
