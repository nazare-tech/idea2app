---
implemented: true
implemented_at: 2026-07-27T03:48:33Z
implementation_summary: Added ten shortlisted mobile screens to the taller landing hero reel and fixed equal-width A/B/C gallery stacking.
---

# Plan: Landing Hero Shortlisted Screens

## Goal

Replace the landing hero reel's placeholder rectangles with the ten user-selected mobile screens, make the reel cards tall enough to preserve the phone-screen crops, and make Options A, B, and C equally large in the standalone mobile-screen gallery.

## Assumptions

- “FUEL scribe” means FieldScribe.
- FieldScribe has no option or screen number in the request, so Option B, Screen 1 is selected.
- The existing 50-card wheel, 110-second rotation, responsive scale, and reduced-motion behavior stay intact.
- The ten selected images repeat five times around the wheel so spacing and motion geometry do not change.
- Existing generated crop assets are trusted inputs because their prior manifest, source hashes, dimensions, and visual QA already passed.

## Clarifying Questions

1. How should ten images fill the existing 50-card wheel?
   - Recommendation A: Repeat the ordered ten-image shortlist five times.
   - Trade-off: Preserves wheel density and proven animation geometry; repeated images eventually recur.
   - Recommendation B: Reduce the wheel to ten cards.
   - Trade-off: Every image is unique around the circle, but gaps become too large and the arc loses its reel effect.
   - Selected: Recommendation A, per repository auto-selection policy and existing geometry.
2. How should the taller cards fit the source crops?
   - Recommendation A: Use a crop-matched 168×294 frame with `object-fit: cover`.
   - Trade-off: Phone screens remain legible and nearly uncropped; hero band grows by 70px.
   - Recommendation B: Keep 168×224 and use `object-fit: contain`.
   - Trade-off: Hero height stays fixed, but large empty bars make screens substantially smaller.
   - Selected: Recommendation A, matching the user's request for taller rectangles.
3. Which FieldScribe screen should be used?
   - Recommendation A: Option B, Screen 1.
   - Trade-off: Fills the omitted choice without blocking; user can replace it later.
   - Recommendation B: Leave FieldScribe out until clarified.
   - Trade-off: Avoids an assumption, but produces only nine shortlisted screens.
   - Selected: Recommendation A.

## Recommended First Step

Verify all ten selected crop files exist and share the expected portrait geometry before copying them into the public landing asset tree.

## Runtime and Change-Impact Analysis

### Repeated Work

- Existing work: one infinite CSS transform animation on the 3000px wheel.
- Expected and worst-case frequency: browser compositor updates at display refresh rate while the hero is mounted; reduced-motion users receive no animation.
- Work per update: one transform update on the wheel layer. Images are static and do not add per-frame JavaScript, layout work, polling, network APIs, or state propagation.

### Ownership, Scope, And Lifetime

- New resource: ten public PNG files owned by the landing hero.
- Narrowest owner: `HeroReelArc`; image metadata is module-local and immutable.
- Fan-out: 50 rendered card instances reference ten cached URLs. Browser/Next image caching prevents 50 unique source downloads.
- Lifecycle: cards mount with the landing page, animate while mounted, and park at the starting angle under reduced motion.

### Boundary And Cache Semantics

- Contract changes: `HeroReelArc` changes from empty decorative frames to decorative `next/image` content.
- Cache behavior: stable public URLs are build assets; changing a selection requires replacing the referenced file or path in code.
- Compatibility: no API, database, auth, billing, or persisted data changes.

### Failure And Recovery

- Missing image: build or browser verification should expose a broken asset.
- Wrong selection: isolated to one module-local list and one copied file.
- Layout regression: isolated to hero reel CSS and the static gallery's grid CSS.
- Recovery: revert component/CSS/docs changes and remove only the newly added public asset directory.

### Risk-Matched Verification

| Risk | Observable evidence or test | Acceptance threshold |
|---|---|---|
| Wrong shortlist mapping | Unit/static markup assertion plus file inventory | Exactly ten expected paths, every path exists |
| Screens clipped or too small | Real Chrome desktop screenshot | All visible cards use tall portrait frames; no placeholder rectangles |
| Responsive overflow | Real Chrome desktop and mobile viewport screenshots | No horizontal page scrollbar or card-layout break |
| Motion/accessibility regression | Source/test review plus reduced-motion CSS assertion | Reel remains decorative; reduced motion disables spin |
| Option B remains narrow | Gallery DOM/CSS inspection and rendered screenshot when browser route is available | A, B, C share the same wide grid column |

## Architecture Improvement Opportunities

- **Selected: module-local shortlist data.** Centralizes image order, labels, and paths in `hero-reel-arc.tsx`; small, typed, easy to revise.
- **Selected: durable gallery generator fix.** Patch both the current HTML and its generator so later galleries preserve equal option sizing.
- **Selected: public asset boundary.** Copy chosen crops into `public/landing/hero-reel/` rather than coupling production UI to ignored run output.
- **Deferred: responsive image variants.** Current crops are roughly 400–620 KiB each and reused from cache. Dedicated AVIF/WebP variants could reduce transfer, but would add a conversion pipeline beyond this selection task.
- **Rejected: JavaScript carousel state.** Existing compositor-only CSS wheel already provides the required motion; client state would add runtime work without product value.

## Plan

1. [x] Verify and copy the ten selected crop images into a dedicated public asset directory.
2. [x] Add a focused HeroReelArc markup test, confirm it fails against placeholder cards, then implement image-backed cards and taller geometry.
3. [x] Patch gallery grid CSS in both the generator and the current HTML.
4. [x] Update system documentation and plan status.
5. [x] Run focused tests, typecheck, lint, real-Chrome visual verification, two fresh-eyes reviews, code/security review, and sweep check. Browser-specific evidence limits are recorded in the review artifact.

## Milestones

- Shortlist materialized: ten stable public assets with exact source mapping.
- Hero complete: all 50 positions display repeated shortlisted screens in tall frames.
- Gallery complete: Options A, B, and C render at equal large width.
- Verified: automated checks pass and real UI evidence is captured or a specific browser blocker is recorded.

## Validation

- Focused `node:test` coverage for card count, selection set, decorative semantics, and image rendering.
- `npm` typecheck/lint commands documented by the repo.
- Real Chrome landing route at desktop and mobile viewports.
- Static gallery source/layout verification; rendered evidence through an already-authorized route only.

## Risks And Mitigations

- Existing landing work is uncommitted: patch only the reel component/CSS lines and preserve all unrelated modifications.
- PNG weight: ten URLs repeat from cache; use `next/image` lazy loading and `sizes` rather than 50 raw `<img>` elements.
- FieldScribe ambiguity: record B1 assumption in plan and final handoff.
- Cropped phone shadows: retain full crop frame and match card aspect ratio closely.

## Rollback Or Recovery

Revert the focused reel component/CSS/gallery/docs edits. Remove only `public/landing/hero-reel/` if the new asset set is no longer wanted. No data migration or external state needs recovery.

## Open Decisions

- FieldScribe can be swapped if the user supplies a different option/screen.

## Critique

### Software Architect

Keeping data module-local is correct for ten curated marketing assets. A reusable content service would be needless indirection. Stable public assets avoid coupling production behavior to an ignored research-output directory.

### Product Manager

Real outputs prove product value better than neutral placeholders. Repetition is acceptable because the visual communicates breadth and motion, not a browsable catalog.

### Customer Or End User

Taller cards improve legibility, but the phone UIs remain decorative at hero scale. Full-screen inspection belongs in the gallery, not the hero.

### Engineering Implementer

The existing 50-card geometry should remain untouched. Only card content, height-related CSS tokens, and the generator's grid placement need changes.

### Risk, Security, Or Operations

No secrets, APIs, auth, data access, user input, or production mutations are involved. Main operational risk is asset weight and a visual regression, covered by caching, `next/image`, focused tests, and browser evidence.
