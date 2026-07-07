---
implemented: true
implemented_at: 2026-07-06
implementation_summary: >
  Hero rebuilt to Figma node 362:11946: new 68px heading with red italic
  "someday.", Light subheading moved above the input, 16 re-exported sticky
  note assets (362-*_note.png) in a 1920x720 HeroArtwork box, hero-enter-*
  entrance animations (text fades in place, input rises, notes slide from
  their side), LandingIdeaCapture collapsed one-line -> focus-expanded stacked
  layout, marquee section reduced to the single caption with ~3/4 of the logo
  row peeking above the fold, landing-only wider header (max-w 1368). Hanken
  Grotesk gained weight 300 + italics. Verified in browser at 1440x900 and
  375x812 (marquee 74% visible; expand/collapse and blur behavior checked);
  tsc, lint, and all 400 tests pass. Old 215-*.png assets left in place
  pending deletion approval.
  Follow-up 2026-07-06: user reported scroll lag and suspected the new
  assets; measurement showed the new 362-* files are the same imagery but 4x
  smaller (308KB vs 1.2MB), so they were kept. Actual regression fixed by
  switching hero-enter-* animation-fill-mode from `both` to `backwards` so
  the 16 finished entrance animations are no longer retained by the
  compositor; post-fix scroll sampling showed ~8.3ms median frame time.
---

# Landing Hero Figma Refresh (node 362:11946)

## Goal

Match the landing page hero to the updated Figma design and add the requested motion:

1. **Hero text**: new line split ("Build your startup idea" / "this weekend, not *someday.*"), 68px heading with red italic "someday." (no quotes), new 20px Light subheading moved **above** the idea input, new copy: "Get market research, a PRD, design mockups, and comprehensive prompts to convert your ideas into a working app in minutes."
2. **Idea input**: starts as a compact one-line row (textarea + Get Started button side by side, per Figma). On focus it animates open: textarea grows multi-line and the button moves below it (vertically stacked). Container is white, 6px radius, `#8A8480` border, 12px padding.
3. **Entrance motion (page load)**: idea input fades in rising from the bottom; left sticky notes fade in from the left; right sticky notes fade in from the right; heading + subheading fade in in place. Ease-out-expo, reduced-motion guarded.
4. **Sticky notes**: re-exported artwork (new content/stroke widths) at the new Figma positions on a 720px-tall hero.
5. **Marquee peek**: the "High quality prompts…" caption + tool logo marquee sit directly below the hero with roughly 3/4 of the logo row visible above the fold, so it invites scrolling. The old "Built to hand off clean…" heading/paragraph/kicker are replaced by the single caption line from the design.
6. **Header padding**: landing page header content becomes wider (Figma shows the header flush with the 1320px box, no 56px inset). Dashboard/project headers are separate components and stay untouched.

## Assumptions

- The Figma MCP asset URLs (valid 7 days) are acceptable sources for the new sticky-note PNGs at 1x, matching the existing 1x assets.
- "3/4 visible" means roughly three quarters of the marquee band peeks above the fold at the bottom of the viewport; exact pixel tuning happens in the browser.
- Old hero assets (`public/landing/hero/215-*.png`) are left in place for now (deletion needs explicit user approval per project rules).
- The collapsed input still submits the same intake flow; only presentation/animation changes.

## Clarifying Questions

**Q1: How should the expanded input collapse?**
- **A (recommended)**: Collapse back to one line on blur when empty; stay open while there is text or focus. Trade-off: slightly more state logic, but the hero returns to its designed resting state.
- B: Once opened, stays open. Simpler, but leaves the hero visually heavier after a stray click.
- **Selected: A.**

**Q2: How to size the hero for the marquee peek?**
- **A (recommended)**: `min-height: calc(100svh - header - ~150px)` on the hero content so the caption + ~3/4 of the 92px logo row shows on typical desktop viewports; keep a sane floor for short viewports. Trade-off: hero is taller than the fixed 720px Figma frame on tall screens, which is what produces the peek.
- B: Fixed 720px hero per Figma. Faithful to the frame but the peek only works at one viewport height.
- **Selected: A.**

**Q3: Button motion technique for the stack animation?**
- **A (recommended)**: Absolutely position the button bottom-right inside the padded container; animate textarea height/width and a spacer row height. Pure CSS transitions, no layout-FLIP code.
- B: Animate `grid-template-columns/rows`. Grid track interpolation is supported but moving an item across cells is not animatable, so the button would jump.
- **Selected: A.**

## Architecture Improvement Opportunities

- The hero entrance keyframes become shared `hero-enter-*` utilities in `globals.css`, reusable by both server-rendered hero text and the client `HeroArtwork`.
- `landing-idea-capture.tsx` keeps all intake handoff logic unchanged; only the shell/layout changes, so the tested flow (`page.test.tsx`) stays intact.

## Plan

**Phase 1 — Assets + fonts**
- Download the 16 new sticky-note images (nodes 362:12586–362:12601) into `public/landing/hero/` with `362-*` names.
- Add weight `300` and `style: ["normal", "italic"]` to the Hanken Grotesk font config in `src/app/layout.tsx`.

**Phase 2 — Hero text, layout, header, marquee section (`src/app/page.tsx`)**
- New heading lines/sizes (68px desktop, tracking ≈ -0.064em, leading ≈ 1.005), red italic `someday.` via `text-primary`.
- Subheading moved above the input, new copy, `text-[20px] font-light leading-[1.3] text-text-secondary max-w-[698px]`.
- Hero container `min-h` calc for the marquee peek.
- Landing header container: drop the 56px inset (use `max-w-[1368px] px-4 sm:px-6` so content aligns with the 1320 box on desktop).
- Marquee section: replace heading/paragraph/kicker with the single caption line.

**Phase 3 — Idea capture redesign (`src/components/landing/landing-idea-capture.tsx`)**
- Collapsed one-line row → focus-expanded stacked layout with CSS height/width transitions (ease-out-expo, ~350ms), button label "Get Started".

**Phase 4 — Sticky note artwork (`src/components/landing/hero-artwork.tsx`)**
- New layer data (16 layers, sides, positions mapped into the centered 1920×720 box), wrapper divs carrying `hero-enter-left/right` classes so the JS parallax (which transforms the inner `img`) does not fight the entrance animation.

**Phase 5 — Entrance motion (`src/app/globals.css`)**
- `hero-enter-fade`, `hero-enter-up`, `hero-enter-left`, `hero-enter-right` keyframes/utilities with stagger delays; covered by the existing `prefers-reduced-motion` global override.

**Phase 6 — Verify**
- Run dev server via preview tools, check console, snapshot, screenshot; confirm fold peek, input expand animation, entrance motion, header width; run `page.test.tsx` and lint/build checks.

## Milestones

1. Assets downloaded and fonts extended.
2. Hero reads and lays out per Figma (static).
3. Input expand/collapse animation works.
4. Entrance animations play once on load, reduced-motion safe.
5. Marquee peeks ~3/4 at the fold; header wider on landing only.
6. Tests + lint pass; browser evidence captured.

## Validation

- `npm run test` (page.test.tsx references LandingIdeaCapture), `npm run lint`.
- Browser: screenshot at 1440×900 and mobile 375×812; interaction test of focus-expand; console clean.

## Risks

- Figma asset URLs expire in 7 days — download now, commit the PNGs.
- Italic Hanken Grotesk adds a font file; minor payload increase on all pages.
- `100svh` calc on short viewports could squeeze the hero — mitigated with a `min-h` floor.
- Width transition on the textarea causes reflow during the 350ms animation; acceptable for a single hero element.

## Rollback

All changes are additive/localized to landing files; `git revert` of the single commit restores the previous hero. Old 215-* assets remain on disk.

## Open Decisions

- Deleting the superseded `public/landing/hero/215-*.png` assets (awaiting user approval).

## Critique (five perspectives)

- **Product**: Peek + entrance motion serve principle 3 (bias to the next action); copy change tightens the promise. Good.
- **Design**: Rounded 6px input on a landing surface deviates from "sharp corners on landing", but the Figma source is explicit — follow the design file.
- **Engineering**: Animation is CSS-only; no new deps; parallax/entrance separation avoids transform clobbering.
- **Performance**: Same number of hero images at 1x; fonts gain one weight + italic axis. No new JS on the server-rendered hero text.
- **Accessibility**: Reduced-motion users get instant state; textarea keeps label + focus ring; marquee unchanged (already aria-safe).
