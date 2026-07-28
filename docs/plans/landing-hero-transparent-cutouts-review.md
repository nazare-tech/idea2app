# Landing Hero Transparent Cutouts Review

## Outcome

The ten shortlisted landing hero phones now render as transparent, consistently
scaled device cutouts. Their original white canvases and baked shadows are gone;
the hero supplies one restrained CSS drop shadow that follows each phone's alpha
silhouette.

## Implementation

- Preserved all ten original mobile crops.
- Used the built-in image editor once per source to replace only the exterior
  with a flat magenta chroma key and remove the source shadow.
- Converted chroma to alpha with an edge-connected flood, so similarly colored
  UI pixels inside the phone remain opaque.
- Neutralized partially transparent bezel-edge RGB to remove chroma fringe.
- Normalized each result to an 8-bit 576×1008 RGBA PNG with an exact 880 px
  visible-device height, centered horizontally at y=28.
- Added `scripts/normalize-hero-reel-cutouts.mjs` with input size/dimension
  checks, ImageMagick resource/time limits, all-output validation before
  publication, rollback of only files created by a failed publication, and
  refusal to overwrite existing outputs.
- Swapped the hero manifest to versioned `*-cutout.png` URLs.
- Removed the card border/fill/box-shadow; changed image fitting from `cover` to
  `contain`; added an alpha-aware CSS `drop-shadow`.
- Kept the twenty cards nearest the initial crown eager and the remaining thirty
  lazy, covering the above-fold arc without eagerly decoding the full wheel.

## Image Edit Prompt Contract

Each source used the same built-in edit contract:

> Isolate the single complete phone on a perfectly flat `#ff00ff` background.
> Change only the area outside the phone and remove the cast/contact shadow.
> Preserve every screen pixel, word, icon, color, bezel detail, status bar,
> geometry, and alignment. Do not redraw, resize, crop, rotate, add, or remove
> phone content.

No external image API or runtime API was added. The landing page serves static
assets through the existing Next.js image pipeline.

## Verification

- Image audit: 10/10 are 8-bit RGBA, 576×1008, transparent on every canvas edge,
  with one connected alpha component and exact 880 px alpha-bound height.
- Edge audit: every semi-transparent edge pixel is neutral (`R=G=B`); no magenta
  halo remains.
- Payload: final ten cutouts total 4,102,787 bytes (3.91 MiB), reduced from the
  17.8 MiB 16-bit intermediate set.
- Reproducibility: a clean normalizer rerun produced byte-identical assets.
- Unit suite: 656 tests passed.
- TypeScript: passed.
- ESLint: passed.
- Production build: passed, including the chunky/vendor regression guard.
- Browser: desktop and mobile-width landing checks showed no white rectangles,
  complete phone silhouettes, restrained shadows, transparent card surfaces,
  and zero horizontal overflow.
- Browser computed styles confirmed `background: transparent`,
  `box-shadow: none`, `object-fit: contain`, and the alpha-aware drop shadow.

Authoritative visual evidence:

- `ui-evidence/2026-07-26/landing-hero-transparent-cutouts/desktop-1440x1000.jpg`
- `ui-evidence/2026-07-26/landing-hero-transparent-cutouts/mobile-390x844.jpg`

## Review Findings Remediated

- **P2 payload/loading:** changed output from 16-bit to 8-bit and reduced eager
  elements from fifty to the twenty-card crown neighborhood.
- **P2 local-tool resource bounds:** added file, dimension, pixel, timeout,
  buffer, memory, map, disk, thread, and time limits.
- **P2 partial publication:** stage and validate all ten first; remove only
  destinations created by the failed publication attempt.
- **P3 plan mismatch:** corrected shipped geometry to 576×1008 / 880 px.
- **P3 evidence MIME mismatch:** authoritative captures now use `.jpg`.
- **P3 chroma fringe:** neutralized semi-transparent outer-edge RGB and
  revalidated all ten cutouts against dark backgrounds.

## Security Review

No authentication, user data, network calls, server routes, or runtime input
handling changed. The only executable addition is a local maintainer script; its
caller-supplied images are bounded before processing and ImageMagick runs under
explicit resource and wall-clock limits.

## Residual Risk

The hero still contains fifty DOM image elements by design, but only ten unique
asset URLs. The existing compositor-only wheel animation and reduced-motion
behavior are unchanged.
