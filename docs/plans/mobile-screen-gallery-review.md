# Review: Individual Mobile Screen Gallery

## Scope

- `scripts/build-mobile-screen-gallery.mjs`
- `scripts/README.md`
- `output/maker-compass-skill-runs/2026-07-22/mobile-screen-crops.json`
- `output/maker-compass-skill-runs/2026-07-22/mobile-screens-gallery.html`
- `output/maker-compass-skill-runs/2026-07-22/mobile-screens-gallery-manifest.json`
- `output/maker-compass-skill-runs/2026-07-22/mobile-screens-gallery-assets/`

## Verification

- `node --check scripts/build-mobile-screen-gallery.mjs`
- `npx eslint scripts/build-mobile-screen-gallery.mjs`
- Full builder run against an isolated ten-run clone: 10 ideas, 30 storyboards, 60 screens
- Custom-output test: matching asset/manifest names and correct relative `sourceRoot`
- Failure tests: overwrite refusal, crop-map mismatch, symlink escape, stale source hash, overlapping rectangles, clipped rectangles, and zero final outputs after rejection
- Static gallery audit: 60 unique relative image sources, 60 existing files, no external or `file:` URLs
- Image audit: 60 unique hashes; source SHA matches; decoded PNG pixels exactly match each declared source crop
- Full contact-sheet visual QA: `ui-evidence/2026-07-26/mobile-screen-gallery/mobile-screens-contact-sheet.png`
- Repository sweep check: net 977 lines, threshold 1000, sweep not due

## Fresh-Eyes Self Review

### Pass 1

Found recovery weakness in direct-to-final generation and custom-output naming drift. Added isolated staging, create-once output checks, derived names from the HTML stem, custom relative source roots, rollback of newly published outputs, and failed-run cleanup.

### Pass 2

Found unsafe manifest symlink handling, stale validated hashes, unrestricted input formats/dimensions, and malformed crop geometry acceptance. Added realpath containment, regular-file checks, PNG signature/IHDR validation, manifest SHA enforcement, exact supported sizes, source/output limits and timeouts, minimum crop geometry, non-overlap, and output-bound checks.

### Pass 3

Independent final audit found no remaining P1/P2 issues. Checked-in map, source mappings, output pixels, labels, HTML paths, hashes, and asset inventory pass.

## Code Review Findings

- **P1, fixed:** manifest-controlled symlinks could escape a run directory. Realpath containment and regular-file checks now reject them.
- **P1, fixed:** ImageMagick source inspection could parse a decompression bomb without limits. Native PNG header checks run first; identify/crop both have memory, map, disk, time, process-timeout, and output-size bounds.
- **P2, fixed:** stale `status`/`visualQa` could bless replaced source images. Builder now requires the source SHA to match the validated manifest.
- **P2, fixed:** malformed crop maps could produce overlapping, one-pixel, or clipped outputs. Geometry contracts now enforce useful minimums, non-overlap, supported dimensions, and output bounds.
- **P2, fixed:** partial failures could leave final-looking assets and block recovery. All outputs stage together, publish only after success, and roll back newly published files on failure.
- **P2, fixed:** custom output names produced mismatched asset/manifest naming and source roots. All derived names and relative references now follow the output stem/location.
- **P3, accepted:** real browser desktop/narrow screenshots could not be captured because browser security policy rejected new local `file://` navigation. Static HTML validation and a full 60-screen contact sheet were used; no policy bypass attempted.

## Architecture Improvement Review

- Selected reusable builder landed with explicit crop-map data rather than embedding batch-specific title cutoffs in code.
- Canonical Maker Compass manifests remain unchanged; crops are presentation derivatives.
- Automatic caption detection remains deferred. Current inspected crop map is more reliable for this fixed batch.
- Existing outputs remain create-once. Replacement requires explicit removal approval or a new `--out` path.

## Security Review Findings

- No network, APIs, credentials, model calls, external page assets, or client-side JavaScript.
- Manifest and design-plan paths are treated as untrusted and contained to real run directories.
- HTML-derived text is escaped. Image sources are relative and validated.
- ImageMagick receives argument arrays, never shell-expanded input.
- Resource exhaustion is bounded before and during decoding.

## Remediation Checklist

- [x] Preserve originals and canonical manifests
- [x] Produce exactly sixty standalone crops
- [x] Remove titles without clipping phone frames
- [x] Preserve shadows and bottom breathing room
- [x] Validate hashes, formats, dimensions, and crop bounds
- [x] Reject traversal, symlinks, malformed maps, and stale sources
- [x] Stage outputs and clean failed publication
- [x] Build separate responsive static gallery
- [x] Inspect all crops through contact sheet
- [x] Record browser-policy verification limitation
