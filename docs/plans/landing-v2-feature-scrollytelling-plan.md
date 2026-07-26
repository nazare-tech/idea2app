---
title: Landing page v2 — feature scrollytelling, compass rail, compass marks
status: implemented
implemented: true
implemented_at: 2026-07-26T00:00:00Z
created: 2026-07-26
implementation_summary: >
  Replaced the five stacked FeatureCard rows with a scroll-driven sticky card
  stage plus pinned copy (feature-scrollytelling.tsx, feature-stage-card.tsx,
  landing-feature-stage.ts, landing-scrolly-* CSS), added the fixed compass rail
  (>=1280px), the bottom-CTA compass mark, the footer compass watermark, and the
  new testimonial avatar/attribution. The 3D tilt was dropped and the whole
  orphaned static-preview cluster (FeatureCard, the preview components, the
  /landing-preview capture route and its manifest, the captured PNGs, and the
  export script's capture modes) was deleted.
source_design: https://claude.ai/design/p/107533b6-3cad-4c1d-8f43-50ca3d40f04f?file=Maker+Compass+Landing+v2.dc.html
---

# Landing page v2

## Goal

Bring `src/app/page.tsx` and its landing components in line with the Claude Design
project file `Maker Compass Landing v2.dc.html` (project "Landing page desktop mockup",
id `107533b6-3cad-4c1d-8f43-50ca3d40f04f`).

## What the design changes, and what it does not

The v2 file is a full recreation of the current landing page. Section-by-section diff
against the repo:

| Section | v2 vs. repo |
|---|---|
| Sticky header | identical |
| Hero (copy, artwork, note parallax/scatter, idea capture) | identical |
| Tool marquee | identical |
| **Features** | **completely different** — see below |
| Testimonial band | same layout/motion; attribution changes from "Dipesh Dave" + grey circle to "Rohan Mehta" + a real avatar photo |
| Pricing | identical (monthly/yearly toggle, three plans) |
| FAQ | identical |
| Bottom CTA | **new**: an animated compass mark above the headline |
| Footer | **new**: a large low-contrast compass watermark behind the columns |
| Left gutter | **new**: a fixed "compass rail" progress indicator, ≥1280px only, visible while the features section is on screen |

### Features section: from stacked cards to scrollytelling

Current: an `h2` ("From idea to momentum, without the usual excuses") plus five stacked
`FeatureCard` rows, each with eyebrow / title / description / three bullets and a static
workspace capture (`FeatureProductPreview`) alternating left/right.

v2: no `h2`, no bullets, no workspace captures. A two-column grid
(`minmax(0,1.4fr) minmax(0,0.6fr)`, 56px gap):

- **Left, sticky (top 92px, `100vh - 128px` tall):** a "stage" bleeding left past the
  container to the viewport edge (the design's optional 3D tilt was dropped, see
  decision 2). The stage is a fixed
  1120×820 canvas (840×1120 in portrait) scaled to fit, holding five absolutely
  positioned card sets that cross-fade with the active feature. Cards inside the
  active set reveal progressively as the section scrolls.
- **Right, pinned:** the five feature text blocks stacked in a single grid cell,
  crossfading one at a time while the column scrolls (column height
  `blocks*86vh + 100vh - 128px`).
- **Below 1024px:** the grid collapses to a block; the stage becomes a sticky
  portrait strip under the header, the text blocks go `visibility:hidden` (they only
  drive scroll length), and a short "swap panel" under the stage carries the copy.

Card sets (curated copy from the "Signal To Roadmap" sample project, not the live
workspace renderers):

0. Market Research — 4 competitor cards (Productboard, Canny, Aha!, UserVoice) with
   favicons from `https://www.google.com/s2/favicons?domain=…&sz=128`.
1. Product Plan — 3 persona cards (Maya Chen, Raj Patel, Elena Ruiz).
2. First Version Plan — 4 step / validation / out-of-scope cards.
3. Design Mockups — the three existing `public/landing/samples/mockup-option-{a,b,c}.png`,
   laid out as an overlapping stagger on desktop and a horizontally scrolling flow on mobile.
4. AI Prompts — 4 prompt cards (project brief, PRD, tech spec, first prompt) with
   monospace body previews clipped by `max-height`.

Feature copy also changes for 02: "Turn the idea into a buildable plan." →
"Know who you're building for.", with new one-line descriptions for all five.

## Assumptions

- The design file is authoritative for markup, geometry, and copy. Where it uses raw hex,
  map to the existing repo token (`text-primary`, `text-secondary`, `text-muted`,
  `border-subtle`, `border-strong`, `primary`, `sidebar-bg`) when the value matches; keep
  literals only for values with no token (`#8A8480`, `#6B6259`, `#E2DDD6`).
- No backend, database, auth, or billing surface is touched. `waitlistMode` behaviour
  is preserved exactly.
- The features section carries no `id`-anchored content other than `#features`, which
  moves to the new section wrapper so the header nav link keeps working.

## Recommendation A/B decisions

**1. Card-set content source — A (selected): a hand-authored data module.**
The design ships curated one-line cards, not the full document renderers. A =
`src/lib/landing-feature-stage.tsx` with a typed discriminated union of card kinds.
B = drive them off `LANDING_SAMPLE_CONTENT`. B was rejected: that file is generated
long-form markdown; extracting these five-word summaries from it at build time is
more machinery than the copy is worth, and the design already fixed the wording.
Trade-off: the stage copy now drifts independently from the exported sample project.

**2. 3D tilt — B (selected after review): no tilt.**
Recommendation A was to keep the tilt on (`section` mode: base 2.5°/−7° plus per-section
offsets), reasoning that the design file's static markup carried it. The user chose the
design file's own declared `tiltMode` default of `"off"`. The tilt loop, the tilt
sequence table, the `preserve-3d` wrapper, and the `perspective` on
`.landing-scrolly-frame` were all removed rather than left inert. Cards keep their
individual 2D `rotate()`, which is what gives the stack its scattered look.

**3. Old feature components — deletion confirmed by the user.**
The initial pass left them on disk (`AGENTS.md` requires asking before deleting). With
that confirmation, the whole orphaned cluster was removed: `feature-card.tsx`,
`feature-product-preview.tsx`, `feature-product-preview-live.tsx`, `preview-frame.tsx`,
`workspace-screenshot.tsx`, `sample-preview-document.tsx`, the
`/landing-preview/[navKey]` capture route, `src/lib/landing-preview-captures.mjs`,
`public/landing/samples/previews/*.png`, and the `--capture-previews` /
`--capture-previews-only` modes of `scripts/export-landing-sample.mjs`. Everything in
that set was reachable only from the deleted landing components. The export script's
fixture export and mockup-image copy stay: `src/lib/landing-sample-content.ts` is still
consumed by `src/components/dev/motion-lab-client.tsx`, and
`public/landing/samples/mockup-option-{a,b,c}.png` are used by the new stage.

**4. Rail placement — A (selected): render the fixed rail as a sibling of the features
section from the same client component.**
It shares the scroll loop with the stage, so one rAF drives both. It must not be nested
inside any transformed ancestor or `position: fixed` would be captured by it.

**5. Testimonial attribution — A (selected): apply the design's change, confirmed by
the user.** Name becomes "Rohan Mehta" and the grey placeholder circle becomes the photo
the design uploaded (`public/landing/testimonial-avatar.png`).

## Implementation phases

1. **Data + presentation.** `src/lib/landing-feature-stage.tsx` (card sets, positions,
   feature copy) and `src/components/landing/feature-stage-card.tsx` (renders one card).
2. **Scrollytelling.** `src/components/landing/feature-scrollytelling.tsx` — client
   component with the single rAF loop: text-mode pinning, active index, card reveal,
   portrait flow translation, stage canvas scaling, tilt, rail progress.
3. **CSS.** A `landing-scrolly-*` block in `src/app/globals.css` for the grid, sticky
   column, bleeding frame, and the <1024px overrides (calc()-heavy; not worth Tailwind
   arbitrary values).
4. **Compass marks.** `src/components/landing/compass-mark.tsx` (bottom-CTA reveal,
   IntersectionObserver) and the footer watermark inline in `site-footer.tsx`.
5. **Testimonial.** Avatar asset + name.
6. **Wire-up.** `src/app/page.tsx` swaps the features block; removes now-unused imports.

## Test strategy

- `npx tsc --noEmit` and `npx eslint` on the touched files.
- Existing `src/app/page.test.tsx` must still pass (it asserts landing copy).
- Real-Chrome verification per `docs/operating-system/ui-verification.md`: local dev
  server, `/` unauthenticated, evidence under `ui-evidence/2026-07-26/landing-v2/`:
  - desktop 1440×900: hero, features at each of the five stops (rail chip advancing),
    testimonial, pricing, FAQ, CTA compass, footer watermark;
  - ≥1280px to confirm the rail appears, 1279px to confirm it does not;
  - mobile 390×844: sticky portrait stage, swap panels, mockup + prompt flow scroll;
  - `prefers-reduced-motion: reduce` to confirm no tilt/parallax and readable content.

## Rollback

Every change is additive except `page.tsx`'s features block and the testimonial
attribution. Reverting the commit restores the `FeatureCard` layout; the old components
are untouched on disk.

## Architecture Improvement Opportunities

- **Selected — one rAF loop for stage + rail.** Two independent loops would double
  layout reads per frame on the heaviest section of the page. Files:
  `feature-scrollytelling.tsx`.
- **Selected — geometry as data, not markup.** Card positions live as
  `{ landscape, portrait, portraitSmall }` triples in the data module, so a layout tweak
  is a data edit and the renderer stays dumb. Files: `landing-feature-stage.tsx`.
- **Selected — loop bails when the section is off screen.** The tick returns early once
  the features rect is out of view, so scrolling the rest of the page costs nothing.
- **Deferred — reusing the workspace document renderers inside the stage.** Would keep
  landing visuals honest to real output, but the design deliberately shows condensed
  cards; revisit if the copy starts drifting from the product.
- **Deferred — extracting a generic `<Scrollytelling>` primitive.** One caller today;
  premature.
- **Rejected — porting the design's `textMode`/`tiltMode`/`tiltIntensity` prop knobs.**
  They are design-tool affordances, not product configuration. Kept as module constants.

## Runtime and Change-Impact Analysis

- **AI generation / queues / partial content:** untouched.
- **Polling, streaming, shared client state:** untouched. The new component holds no
  React state that re-renders per frame; all per-frame work writes directly to DOM style.
- **Client-server payloads, cache invalidation:** untouched. `page.tsx` keeps its
  `unstable_cache`'d user count and auth redirect.
- **Billing-adjacent data:** untouched; `PricingSection` and `waitlistMode` unchanged.
- **Server/client boundary:** the features block becomes a client component. It receives
  no props from the server, so the page stays a server component and the RSC payload
  does not grow beyond the component's own JS.
- **Performance:** one rAF loop, early-exit when off screen, `will-change` only on the
  tilt element. Four external favicon requests (allowed by the existing
  `img-src … https:` CSP); they are `loading="lazy"` and `referrerPolicy="no-referrer"`.
- **Accessibility:** on desktop the inactive text blocks are `opacity: 0` +
  `pointer-events: none` but still in the a11y tree (matching the design); the mobile
  swap panels are `display: none` there, so there is no duplicate reading. Below 1024px
  the blocks are `visibility: hidden` (removed from the tree) and only the swap panels
  are exposed. The rail and both compass marks are `aria-hidden`.
- **Real-flow verification:** the landing page is unauthenticated, so no project
  creation is needed; the fresh-project rule does not apply.

## Candid critique

- **Architecture.** A ~350-line imperative rAF component is the least testable thing on
  the page. It is justified by the design (scroll-linked, per-frame geometry), but it
  earns its keep only if the geometry stays in data and the loop stays in one place.
- **Product.** The old section showed *real product screenshots*; v2 shows stylised
  cards. That is prettier and reads faster, but it moves the page one step further from
  "show the work, don't sell it". The three mockup PNGs are the only remaining real
  artefact. Worth watching in conversion terms.
- **Customer.** Removing the three bullets per feature removes the concrete "what do I
  actually get" list. The single-line descriptions carry more weight now; if they are
  vague, the section says less than before.
- **Engineering.** The `100vh`-based heights (not `svh`) on desktop are copied from the
  design; on mobile browsers with a collapsing URL bar these would jump, which is why
  the <1024px rules override them. Also: fixed-pixel card canvases scale by transform,
  so text scales rather than reflows — deliberate, but it means the card copy cannot
  grow much without overflowing.
- **Risk / security.** Only new external dependency is Google's favicon service, in
  `<img>` tags with `no-referrer`. No user data leaves the page. The testimonial
  attribution change is the one item that makes a claim about a real person.

## Resolved open items

- Testimonial attribution: shipped, confirmed by the user.
- 3D tilt: removed, confirmed by the user (decision 2 above).
- Orphaned preview cluster: deleted, confirmed by the user (decision 3 above).
