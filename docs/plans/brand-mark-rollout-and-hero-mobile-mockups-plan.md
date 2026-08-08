# Brand Mark Rollout + Hero Mobile Mockups Plan
Adopt the 2026-07-30 brand kit's bearing-wedge symbol and weight-break wordmark across the app, swap exact-match utility icons to the brand icon set, and replace the hero build map's desktop mockups with the clipped mobile mockups.
Status: implemented 2026-08-02, verified (typecheck, 693 tests pass, Playwright screenshots in ui-evidence). Implementer: claude. Cross-model eval: complete, all findings folded.
Scope: brand asset swap (logo SVG, favicon, CompassMark), wordmark restyle, 10 utility icon swaps, hero build map Design node imagery.
Out of scope: brand/brand.md promotion, marketing surfaces, PDF artifacts, non-hero landing sections.
Evidence: ui-evidence/2026-08-02/brand-mark-rollout/.
Rollback: git revert of the single feature commit set; old assets retained under public/ until verified.

## Goal

Three user-visible changes, one commit set:

1. **New symbol + wordmark everywhere.** The bearing wedge (solid wedge, 32° off vertical, notched tail, Action Red `#DC2626`) replaces the old arc-compass mark (`#FF4000`) in the app header, auth header, footer, favicon, and the landing `CompassMark` glyph. The wordmark adopts the brand kit's structural weight break: `Maker` at 800 against `Compass` at 500, tracking `-0.045em`, set solid.
2. **Utility icons on brand.** The 10 lucide glyphs with exact brand-icon equivalents render the brand geometry (24×24, 1.5px stroke, butt caps, miter joins) instead of lucide's rounded style.
3. **Hero build map Design node shows mobile mockups.** The three desktop browser screenshots (`mockup-option-{a,b,c}.png`, purple UI, off-brand) are replaced by three of the clipped mobile mockups already in `public/landing/hero-reel/*-cutout.png` (576×1008, transparent background). Strictly the hero build map; no other section changes.

## Assumptions

- Source of truth for brand geometry: `brand/generated/2026-07-30-maker-compass/` (symbol `geometry.json` + SVG masters, icons/, brand.md measurements). User approved this kit explicitly.
- "Everywhere" = every in-app render of the mark/wordmark. Grep-driven inventory: `APP_BRAND_LOGO_SRC` consumers (header-logo, brand-wordmark → header, auth-header, site-footer, info-page-shell, project-header, header-profile-menu), `src/app/favicon.ico`, `CompassMark`. The old `hero-reel-arc.tsx` is unreferenced and untouched.
- Brand name in running copy stays "Maker Compass" (two words). Only the *wordmark rendering* sets it solid as MakerCompass per the kit. `APP_BRAND_NAME` remains "Maker Compass" for aria-labels, alt text, and plain-copy uses.
- The app already loads Hanken Grotesk, so the wordmark can be text, not an image.
- Mobile cutout images are illustrative sample content, same standing as the desktop shots they replace; no content-matching to scenario copy is required beyond picking three visually distinct, clean frames.

## Decisions (A selected per Recommendation A policy)

### D1 — Wordmark: styled text vs SVG asset
- **A (selected): styled text.** Two spans inside the existing `BrandWordmark`: `Maker` weight 800, `Compass` weight 500, tracking `-0.045em`, no gap. Pros: scales freely, inherits color for dark/light contexts, no asset pipeline, screen-reader text unchanged. Cons: font-loading flash can show fallback weights briefly.
- B: embed `wordmark-{color}.svg` (outlined paths). Pixel-exact but needs a color variant per context and hurts the truncating header case.

### D2 — Symbol asset: replace file in place vs new path
- ~~A: replace `public/maker-compass-logo.svg` content in place.~~ **Revised by eval finding (cache-busting): B (selected) — ship at a NEW path `public/maker-compass-mark.svg` and repoint `APP_BRAND_LOGO_SRC` plus both `layout.tsx` icon entries.** New URL means no stale-cache window forward, and keeping the old file on disk during verification makes rollback resolution exact. The SVG is authored from `geometry.json` coordinates (true vector, Action Red), square viewBox so 32px square slots render correctly (old file was 48×34 letterboxed).

### D3 — Utility icons: exact-match swap vs global lucide restyle
- **A (selected): shared `src/components/icons/brand-icons.tsx` exporting the 12 brand glyphs as React components (same props surface as lucide: `size`, `className`, `strokeWidth` default 1.5), then swap the 10 exact-match lucide imports app-wide (`Check`, `X`, `Plus`, `Menu`, `Search`, `User`, `Settings`, `Bell`, `Info`, `ArrowRight`; also `ArrowUpRight` stays lucide, no equivalent). Non-matching lucide glyphs (Loader2, Trash2, CreditCard, …) stay as-is: brand book blesses Lucide as the extension library.
- B: wrap every lucide usage to force 1.5px stroke and butt caps globally. Touches 38 files for a subtle change lucide cannot fully express (caps are baked per-path); rejected as over-engineering.

### D4 — Design node layout for portrait mockups
- **A (selected): keep the node geometry, render the phone cutout `object-contain`, centered, full node height with slight bottom crop allowed by the panel's existing `overflow-hidden`.** The cutouts have transparent backgrounds, so the node's existing paper/secondary backdrop shows around the phone. Crossfade mechanism (`data-bm-mock` opacity writes) unchanged.
- B: redesign the node to a two-phone staggered composition. More art direction than the ask; rejected.
- Mockup selection: 3 of the 10 cutouts chosen at implementation time by visual QA (distinct hues, clean top frame). Scenario→mockup index mapping in `landing-hero-build-map.ts` unchanged.

### D5 — CompassMark (landing CTA glyph)
- **A (selected): re-author with the wedge.** Single path from `geometry.json`, Action Red `#DC2626`, entrance = fade + small overshoot landing (reuses existing IntersectionObserver + reduced-motion fallback structure). The two-arc animation dies with the old mark.
- B: drop the glyph entirely. It anchors the CTA section; removal is a design regression.

### D6 — Color correction
- **A (selected): `#FF4000` is retired wherever it renders the mark** (CompassMark, old SVG). Brand red is `#DC2626` (`--color-action-red`, already in tokens). Grep confirms no other `#FF4000` consumers.

## Implementation phases

### Phase 1 — Assets
1. Author `public/maker-compass-mark.svg` (new path per revised D2): square viewBox 0 0 1024 1024, single `<path>` from `geometry.json` notched-wedge coordinates, `fill="#DC2626"`. Repoint `APP_BRAND_LOGO_SRC` and `layout.tsx` `metadata.icons`. Old `/maker-compass-logo.svg` stays on disk until verified.
2. Regenerate `src/app/favicon.ico` from the kit's `symbol-red-{16,32,48?}.png` exports (16+32+48 via ImageMagick; 16/32 use the simplified silhouette per kit rule).
3. Copy the 3 chosen `*-cutout.png` files to `public/landing/samples/` as `mockup-mobile-{a,b,c}.png` (keeps the samples dir the single home for build-map imagery; hero-reel dir remains the retired arc's asset store).

### Phase 2 — Components
4. `BrandWordmark`: replace the single label span with the weight-break pair; preserve `label`/`labelClassName` overrides for the app-header preset (uppercase truncating variant keeps its current treatment — it is chrome, not the wordmark; confirm with visual QA).
5. `CompassMark`: new wedge path + landing animation, `#DC2626`.
6. `src/components/icons/brand-icons.tsx`: 12 components generated from `brand/generated/.../icons/*.svg` markup (inline paths, `currentColor`, props-compatible with lucide call sites).
7. Swap the 10 exact-match lucide imports across the app (mechanical; keep per-site size/className props).

### Phase 3 — Hero build map
8. `landing-hero-build-map.ts`: `BUILD_MAP_MOCKUPS` → the three mobile files, alt text "Mobile design mockup preview".
9. `hero-build-map.tsx` DesignNode: image styling from full-bleed cover to contained portrait (centered, `object-contain`, height-bound). Verify both WIDE and TALL canvases.
10. Update `hero-build-map.test.tsx` expectations if they reference mockup srcs/alts.

### Phase 4 — Verification
11. `npm run lint` + typecheck + existing test suites (`hero-build-map.test.tsx`, any icon-adjacent tests).
12. UI verification per `ui-verification` skill: real Chrome against local dev server; screenshots of header (light + dashboard), auth page, footer, CTA CompassMark, hero build map wide + tall breakpoints, favicon tab check at true size. Evidence under `ui-evidence/2026-08-02/brand-mark-rollout/`.
13. Self-healing docs: update `docs/systems/` doc that describes landing hero or branding if one exists (grep at implementation time).

## Test strategy

- Unit: hero-build-map test updated for new mockup srcs; add a brand-icons smoke test (renders, 24×24 viewBox, stroke width 1.5, `currentColor`).
- Visual: QA screenshots above; favicon inspected at 16px true size (kit rule: never a scaled-down large export — regenerated ICO uses the dedicated 16px silhouette).
- Regression greps post-change: `#FF4000` (0 hits expected outside retired hero-reel-arc if it embeds none), `mockup-option-` (0 hits in src/), old arc path signature (0 hits outside hero-reel-arc history).

## Runtime and Change-Impact Analysis

- Pure client-rendered presentation change. No API, no data shape, no billing, no auth, no queue/polling surface touched. No product-analytics event changes (no new flow; existing events untouched).
- Payload impact: three new PNGs (~150-400KB each) replace three of similar weight; `loading="lazy"` semantics in DesignNode unchanged, first mockup stays eager.
- Font-weight flash risk (D1-A): Hanken variable font already in the critical path; weight 800 already used by headings, so no new font fetch.
- Favicon caching: browsers cache ICO aggressively; stale favicon in returning sessions is cosmetic and self-heals.
- Icon swap risk: brand icons must be drop-in for size/className call sites; the shared module mirrors lucide's prop contract, and typecheck catches misses.

## Architecture Improvement Opportunities

- **Selected: single brand-icon module** (`brand-icons.tsx`) generated from the kit SVGs, so future icon edits land in one file and the kit stays the source of truth. Benefit: no drift; trade-off: one more indirection layer over lucide.
- **Selected: symbol swapped in place at a stable path** — every consumer inherits the rebrand with zero import churn.
- **Deferred: global lucide re-cap to butt terminals** (D3-B). Revisit only if design review flags mixed terminal styles at small sizes.
- **Deferred: deleting `hero-reel-arc.tsx` + unused hero-reel PNGs.** The cutouts are now referenced again; the retired component itself stays until a cleanup pass, since deletion needs an explicit ask.
- **Rejected: image-based wordmark pipeline** (D1-B) — over-engineering for a text-expressible mark.

## Critique

- **Architecture:** low risk; the only structural addition is the icon module, which mirrors an existing contract. The in-place SVG swap is invisible to consumers by design.
- **Product:** the hero Design node is the money shot of the graph; portrait phones read "app" faster than browser chrome and kill the purple off-brand UI. Risk: a portrait image in a landscape node wastes horizontal space — mitigated by visual QA on both canvases before sign-off.
- **Customer:** returning users may briefly see the old favicon (cache). Wordmark weight break is subtle; header still reads "Maker Compass".
- **Engineering:** the 10-icon swap is the widest diff (≈20 files) but mechanical and typechecked. The riskiest single edit is DesignNode styling across two canvases; the test file plus screenshots cover it.
- **Risk/Security:** none — static assets and presentation components only.

## Eval Response Addendum (2026-08-02, all findings accepted)

- **MAJOR inventory:** repo-wide grep completed. Full render inventory of the retired mark: `src/lib/app-brand.ts` (`APP_BRAND_LOGO_SRC`), `src/app/layout.tsx:36-37` (`metadata.icons.icon` + `shortcut` both point at `/maker-compass-logo.svg`), `src/app/favicon.ico`, `src/components/landing/compass-mark.tsx` (inline old-arc paths, `#FF4000`). No manifest file, no apple-touch-icon, no og:image carrying the mark, no other inline SVG wordmarks. Text renders of "Maker Compass" (layout metadata, footer, auth copy, legal pages) are name copy, not the mark; unchanged.
- **MAJOR cache-busting (forward):** the new symbol ships at a NEW path, `public/maker-compass-mark.svg`; `APP_BRAND_LOGO_SRC` and both `layout.tsx` icon entries repoint to it. New URL = no stale-cache window for the logo. `favicon.ico` is regenerated in place as the legacy-convention fallback only; the SVG icon entry precedes it, so stale ICO exposure is limited to clients that ignore SVG icons.
- **MAJOR cache-busting (rollback):** revert restores the old constants/paths; the old URL `/maker-compass-logo.svg` is retained on disk during the verification window, so rollback resolution is exact. New-URL cached copies become unreferenced, not conflicting.
- **MAJOR icon prop contract:** call-site inventory shows every exact-match usage passes `className` only. The module still types as `React.SVGProps<SVGSVGElement> & { size?: number }` and spreads rest props onto `<svg>`, superset of observed usage; typecheck guards misses.
- **MINOR export surface:** module exports only glyphs with confirmed callers after the import inventory (Check, X, User, Bell, ArrowRight confirmed; Plus/Menu/Search/Settings/Info exported only if the import sweep finds callers). `scope`/`build-map` stay in the kit, not in the app module.
- **MINOR icon tests:** per-icon assertions compare rendered path data against the kit SVG source strings (not just generic attributes), plus an import-inventory test asserting the swapped files no longer import those lucide names.
- **MINOR D4 acceptance criteria:** phone cutout occupies ≥70% of the Design node height with the full top frame (notch/status bar) visible, on both WIDE and TALL canvases; a panel reading as mostly empty fails QA.
- **MINOR docs:** `docs/systems/product-overview.md` named as an update target: hero artwork description changes from desktop browser mockups to clipped mobile mockups in the Design node.

Mockup selection (visual QA over all 10 cutouts): `scopesignal-a1` (scenario 1, product change-request UI), `venueturn-c2` (scenario 2, booking-adjacent venue app, dark theme for contrast), `evidencedeck-b1` (scenario 3, checkout/conversion metrics UI).
