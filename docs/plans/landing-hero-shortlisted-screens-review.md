# Review: Landing Hero Shortlisted Screens

## Scope

- `src/components/landing/hero-reel-arc.tsx`
- `src/components/landing/hero-reel-arc.test.tsx`
- Hero reel rules in `src/app/globals.css`
- Hero placement in `src/app/page.tsx`
- Ten assets in `public/landing/hero-reel/`
- Gallery layout in `scripts/build-mobile-screen-gallery.mjs`
- Current generated `mobile-screens-gallery.html`
- System and test-inventory documentation

## Verification

- Focused red-green test:
  - Initial failure: missing `HERO_REEL_SCREENS`.
  - Final: `node --import tsx --test src/components/landing/hero-reel-arc.test.tsx` passed.
- Full unit suite: `npm test` passed, 655 tests.
- TypeScript: `npm run typecheck` passed.
- Focused lint: changed TypeScript/JavaScript files passed with zero warnings.
- Full lint remains blocked by unrelated existing files:
  - `src/components/layout/workspace-document-frame.tsx`: existing `react-hooks/set-state-in-effect` error.
  - Two unrelated unused-variable warnings in ignored output/evidence files.
- Focused e2e: landing smoke test passed in Chromium.
- `git diff --check` passed.
- Gallery static assertions passed:
  - Both generator and current HTML contain the desktop wide-column placement and mobile reset.
  - Current HTML contains 30 option groups.
- Asset integrity:
  - Ten copied public PNG hashes match the previously validated crop-manifest hashes.
- Real Chrome, `http://localhost:3000/`:
  - 50 reel cards and 50 images.
  - Ten unique screen labels.
  - Computed desktop card: 168×294, `object-fit: cover`.
  - Computed desktop band: 350px.
  - No desktop horizontal overflow.
  - Responsive override computed a 217px band at the narrow breakpoint, proving the 0.62 scale.
- Desktop evidence:
  - Route: `http://localhost:3000/`
  - Requested viewport override: 1440×1000; browser-reported CSS viewport: 1800×1250.
  - `ui-evidence/2026-07-26/landing-hero-shortlisted-screens/landing-desktop-1440x1000.jpg`
- Browser limitations:
  - Chrome returned no image bytes for the mobile screenshot twice; no mobile screenshot is claimed.
  - Browser security policy blocked refreshing the local `file://` gallery. No alternate browser or local-server workaround was used. Gallery verification is static, not a fresh rendered capture.

## Fresh-Eyes Self Review

### Pass 1

- Reviewed component, shortlist mapping, tests, geometry, page integration, generator CSS, generated HTML, public assets, and desktop screenshot.
- Found: Chrome screenshot bytes were JPEG despite a `.png` filename.
- Fixed: renamed evidence to `.jpg`.

### Pass 2

- Rechecked 10×5 repetition, exact paths, crop aspect ratios, responsive scale, reduced-motion ownership, decorative semantics, public-asset boundary, and A/B/C gallery placement.
- No product-code defects found.

## Code Review Findings

- P2, remediated: initial component test validated URL strings but not the public files. Added exact PNG signature, width, height, and SHA-256 assertions for every selected screen.
- P3, remediated: current and historical hero plans still described placeholder/pending imagery during review. Current plan is implemented; historical plan now points to this completed follow-up.
- No remaining P0–P2 findings.
- P3 verification limitation: current `file://` gallery could not be refreshed through browser automation. Static CSS proves the placement rule, but the user should refresh the already-open gallery tab to visually confirm it.
- Existing uncommitted landing and workspace changes were preserved. Task edits stayed inside the reel, landing height reservation, gallery generator/current HTML, tests, assets, and owning docs.

## Architecture Improvement Review

- Selected module-local shortlist landed.
- Selected public asset boundary landed.
- Selected durable generator fix landed.
- Responsive image variants remain deferred. `next/image`, lazy loading, ten reused URLs, and browser caching bound current cost.
- No new shared state, polling, API, persistence, duplication, or recovery gap introduced.

## Security Review Findings

- No auth, authorization, API, database, storage permission, user input, external request, secret, payment, or production-state changes.
- All image paths are compile-time local public assets.
- Gallery generator retains its existing path, hash, image-format, dimension, and overwrite protections.
- No security findings.

## Remediation Checklist

- [x] Correct evidence file extension.
- [x] Preserve reduced-motion behavior.
- [x] Verify exact shortlist and five repetitions per screen.
- [x] Verify public asset dimensions and hashes in the automated test.
- [x] Verify desktop rendered geometry and overflow.
- [x] Verify gallery CSS in generator and current output.
- [ ] User refreshes the existing local gallery tab for final visual inspection.
