---
implemented: true
implemented_at: 2026-08-02T13:55:00-07:00
implementation_summary: Cursor-reactive clustered dot-field canvas with traveling pulses and cursor-pointing micro compass wedges shipped as the hero background; shared wedge geometry extracted, verified via Playwright with evidence in ui-evidence/2026-08-02/hero-dot-field/.
---

# Plan: Cursor-Reactive Dot-Field Hero Background with Micro Compass Bearings

## Goal

Add an ambient, cursor-reactive dot-field animation as the landing hero background, replicating the look of the reference video (`~/Downloads/hero animation.mp4`, analyzed frame by frame): a static dot lattice arranged in irregular map-like clusters, with sparse "signal pulse" dashes that travel along grid rows/columns. On top of the reference look, two interactive additions decided with the user: (1) dots near the cursor react subtly, and (2) a sparse subset of lattice positions render as tiny brand bearing wedges (the compass-mark geometry) that rotate to point at the user's cursor.

## Reference Animation Anatomy (from frame-by-frame analysis)

- 1560x1100, 30fps, 9.3s loop. Static dot lattice, ~28px pitch, dots ~2px radius.
- Dots form irregular clusters with large empty gaps (reads like terrain/landmasses). Layout never moves.
- Motion: a random dot occasionally stretches into a short dash (1-2 cells, horizontal or vertical), glides along its row/column, collapses back. ~4-8 live pulses at once. Occasional brightness twinkles.
- Monochrome. Source is white-on-black; the landing page is light (`--background: #FAFAFA`), so the implementation inverts to ink-on-light.

## Assumptions

- Placement: full-bleed behind the hero copy/CTA inside the existing `section.relative.isolate` in `src/app/page.tsx` (user selected "hero background"). `HeroBuildMap` stays; the field sits behind the copy block above it.
- Wedges are monochrome, same ink as dots (user selected "all white" on the dark reference, which maps to all-ink on the light page). No Action Red in the field; the red budget stays with existing brand elements.
- No backend, data, or analytics changes. Pure client-side decorative layer (`aria-hidden`).
- Deterministic layout (seeded PRNG) so the field renders identically across mounts; no hydration concerns since the canvas is client-only.

## Clarifying Questions

1. Should dots dim near the headline to protect legibility, or rely on low global opacity alone?
   - Recommendation A: per-dot alpha falloff inside an ellipse covering the headline/subhead/CTA region, on top of low global alpha. Choose when text contrast is paramount.
   - Trade-off: slightly more math per dot (one ellipse distance), guaranteed legibility.
   - Recommendation B: global low alpha only (~0.2 ink). Simpler, but dots collide visually with the thin light-weight subhead.
   - Selected: A (legibility is a hard constraint; cost is trivial).
2. Touch devices (no cursor): what do wedges do?
   - Recommendation A: wedges rest pointing north (up), pulses keep running. Field stays alive but calm; zero fake interactivity.
   - Trade-off: touch users never see the pointing behavior; acceptable since it is a desktop delight detail.
   - Recommendation B: wedges slowly sweep toward a bearing derived from scroll progress.
   - Trade-off: more motion on mobile where restraint matters; scroll-linked rotation risks feeling jittery.
   - Selected: A (brand principle: restraint; no gimmick without a cursor).
3. Should the canvas cover the whole hero section including the `HeroBuildMap` area, or only the copy block above it?
   - Recommendation A: cover the full hero section, with dot alpha fading to zero before the build-map's vertical band begins. One canvas, no seams, the field frames the copy.
   - Trade-off: canvas larger than strictly needed; fade math keeps the build map clean.
   - Recommendation B: canvas only behind the copy block.
   - Trade-off: hard bottom edge where dots stop; reads as a box, against the full-bleed intent.
   - Selected: A.

## Recommended First Step

Build the pure core (`hero-dot-field-core.ts`: seeded PRNG, cluster mask, wedge picks, pulse scheduler step, angle damping) with unit tests, then the canvas component consuming it.

## Runtime and Change-Impact Analysis

### Repeated Work
- One `requestAnimationFrame` loop redrawing a single `<canvas>` each frame.
- Expected frequency: 60fps while the hero is visible and the tab focused; 0 when the hero scrolls offscreen (IntersectionObserver pauses the loop) or the tab is hidden (`document.visibilitychange`), and never under `prefers-reduced-motion` (single static draw).
- Work per frame: iterate ~500-800 dots (clear + arc fill), 4-8 active pulses, ~15-20 wedges (path transform + fill), one cursor lerp. All CPU-cheap 2D canvas ops; no allocation in the loop (pools/arrays preallocated).
- Worst case: large desktop viewport ~1600x700 hero → ~1,600 lattice cells, ~50% inside clusters → ~800 dots. Well under 2D canvas budget.

### Ownership, Scope, And Lifetime
- All state (dot positions, pulse pool, wedge angles, cursor position) lives inside the `HeroDotField` client component via refs; created on mount, dropped on unmount. No shared/global state, no React state in the hot path (zero re-renders from animation).
- Pointer tracking: `pointermove` listener on the hero section element, passive; removed on unmount.
- Resize: `ResizeObserver` on the section re-seeds the lattice for the new size (debounced one-shot rebuild, not per-frame).

### Boundary And Cache Semantics
- No contract changes. `page.tsx` renders `<HeroDotField />` as the first child of the hero section (absolute inset, `z-0`, `pointer-events-none`); existing copy block already has `relative z-10`.
- Server component boundary: `HeroDotField` is `"use client"`; page stays a server component, canvas renders nothing on the server (SSR-safe empty `<div>` + canvas).

### Failure And Recovery
- If JS fails or reduced-motion is set, the hero renders exactly as today plus (at worst) a blank transparent canvas; copy/CTA untouched. Blast radius: decoration only.
- Kill switch: remove one JSX line in `page.tsx`.

### Risk-Matched Verification
| Risk | Observable evidence or test | Acceptance threshold |
|---|---|---|
| Frame cost too high / jank | Chrome DevTools performance trace during 10s idle + cursor movement over hero | Scripting+painting for the rAF callback < 4ms/frame average on desktop |
| Loop runs while hero offscreen | Console counter or Performance panel after scrolling below hero | rAF callbacks stop within 1s of hero leaving viewport |
| Text legibility harmed | Screenshot of hero at 1440px and 375px | Dots visibly dimmed under headline/subhead/CTA ellipse |
| Reduced motion ignored | Emulate `prefers-reduced-motion: reduce` in DevTools, reload | No pulses, static dots, wedges rest north |
| Layout shift / CLS | Lighthouse or DevTools performance overlay on landing | CLS contribution 0 (absolute-positioned canvas) |
| Hydration mismatch | Console on load | No hydration warnings |

## Architecture Improvement Opportunities

- Pure core module (`hero-dot-field-core.ts`) separated from the canvas component: unit-testable lattice/cluster/pulse/angle logic, reusable if the field is later wanted on auth or 404 pages. Selected.
- Central motion-token reuse: pull ease-out-expo and durations from existing conventions rather than new constants where CSS is involved (canvas easing implemented numerically to match). Selected (constants documented against DESIGN.json).
- Offscreen-canvas/worker rendering: over-engineering for ~800 dots. Rejected.
- Extracting a generic "ambient canvas layer" abstraction: premature with one consumer. Deferred until a second surface wants it.

## Plan

1. `src/lib/compass-geometry.ts`: extract the bearing-wedge geometry (the four path points in the 1024 viewBox from `compass-mark.tsx`) into shared constants with helpers to build an SVG `d` string and to trace the polygon onto a canvas path. `compass-mark.tsx` consumes the same constants, so the brand mark and the field wedges cannot drift. (Eval finding 1.)
2. `src/components/landing/hero-dot-field-core.ts`: seeded PRNG (mulberry32), value-noise cluster mask over the lattice, deterministic wedge-site selection (~1 per 40 cluster dots, minimum spacing), pulse scheduler (`stepPulses(state, dt)` pure update), shortest-arc angular damping helper, rect-derived protected-ellipse alpha falloff, `computeShouldAnimate(isIntersecting, documentHidden, reducedMotion)` gate. Unit tests in `hero-dot-field-core.test.ts` (determinism for a fixed seed, pulse lifecycle bounds, angle damping converges and takes the short arc, falloff clamps to [0,1], gate truth table across all transition sequences).
3. `src/components/landing/hero-dot-field.tsx`: client component; canvas absolutely positioned `inset-0 z-0 pointer-events-none` with DPR scaling; rAF loop drawing dots, pulses, wedges (shared geometry from `compass-geometry.ts`, ~10px, prebuilt `Path2D`); cursor tracking with lerp smoothing; proximity reaction (radius ~140px, scale up to ~1.6x + alpha lift with smoothstep falloff); single `shouldAnimate` lifecycle gate combining IntersectionObserver, `visibilitychange`, and reduced-motion (eval finding 3); ResizeObserver rebuild (debounced) that re-measures protected zones; `prefers-reduced-motion` static draw. Interaction capability is event-driven: cursor reaction and wedge pointing activate on `pointermove` events with `pointerType` mouse/pen, so hybrid touch+trackpad devices still get the interactive variant; wedges rest north until such an event arrives (eval finding 4).
4. Protected-zone layout contract (eval finding 2): the hero copy container in `page.tsx` gets `data-dot-field-protect`, and the `HeroBuildMap` gets wrapped with `data-dot-field-avoid`; on every rebuild the component measures those elements' rects relative to the section (plus padding) and derives the headline ellipse and the vertical band where dot alpha reaches zero. No hardcoded breakpoints; wrapped copy at intermediate widths stays protected.
5. Wire into `src/app/page.tsx` hero section as first child; confirm copy block stacking (`z-10`) and `overflow-clip` behavior.
6. Update `docs/systems/product-overview.md` and `docs/systems/directories-and-key-files.md` landing-artwork entries in the same commit (eval finding 6).
7. Verification per UI workflow: real Chrome against local dev server, evidence (screenshots + short video of cursor reaction and wedge pointing) under `ui-evidence/<date>/hero-dot-field/`; performance trace; reduced-motion and mobile-viewport checks.

## Milestones

- Core module green under unit tests: deterministic layout, pulses bounded, damping correct.
- Field visible in hero matching reference feel (calm, sparse pulses) on light background.
- Cursor reaction + wedge pointing verified in real Chrome with video evidence.
- Perf/reduced-motion/mobile checks pass thresholds above.

## Validation

- Required commands: `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build` (eval finding 5).
- Real-Chrome evidence per `docs/operating-system/ui-verification.md`; note: per repo memory, scroll-driven checks need Playwright when the preview pane is hidden, but this feature is pointer-driven, so live Chrome + video applies.

## Risks And Mitigations

- Field too busy against light background: start alphas low (dots ~0.28 ink, pulses ~0.5), tune with screenshots against reference.
- Wedges read as clutter at 10px: cap count (~15-20 visible), minimum spacing ~120px, slightly higher alpha than dots so they read as intentional.
- Cursor reaction feels laggy or twitchy: lerp cursor at ~0.12/frame and damp wedge angle at ~0.08/frame; verify by feel in Chrome video.
- `overflow-clip` on the section already contains the canvas; no bleed risk.

## Rollback Or Recovery

Remove the `<HeroDotField />` line from `page.tsx`; component files are inert without the reference. No data, route, or dependency changes.

## Open Decisions

- None (all clarifying questions selected per Recommendation A policy; color/placement/build decisions made by the user in-thread).

## Cross-Model Plan Evaluation Outcome

Codex evaluation (2026-08-02, `docs/plans/hero-dot-field-cursor-compass-plan-eval.md`): 4 MAJOR + 2 MINOR findings, all accepted and folded in: shared wedge-geometry module (Plan step 1), measured protected-zone layout contract (step 4), single combined `shouldAnimate` lifecycle gate with transition tests (steps 2-3), event-driven pointer capability instead of `pointer: coarse` (step 3), exact validation commands (Validation), same-commit `docs/systems/` updates (step 6). No findings rejected.

## Critique

### Software Architect
Separation of pure core from canvas shell is right; the only smell is a second hero artwork component coexisting with `HeroBuildMap` and the retired `hero-reel-arc.tsx`. Keep naming and file placement parallel to those so the landing artwork family stays legible.

### Product Manager
The field must never compete with the headline or the idea-capture CTA; the ellipse falloff is the load-bearing detail. The wedge-pointing moment is a quiet brand reinforcement (bearing = Maker Compass) rather than a feature; success is a visitor noticing it on the second visit, not the first.

### Customer Or End User
On a trackpad the pointing needles are delightful if smooth, irritating if jittery; damping constants deserve real-feel tuning, not just tests. Mobile users get a calm ambient field, which is the correct experience, not a loss.

### Engineering Implementer
The rAF loop must allocate nothing per frame; preallocate the pulse pool and reuse. DPR handling and ResizeObserver rebuilds are the classic canvas bug sources; the rebuild must be debounced and deterministic per size. Drawing the wedge via `Path2D` once and transforming per wedge keeps per-frame cost flat.

### Risk, Security, Or Operations
Zero data surface; the only real risks are performance regression on low-end hardware and accessibility (motion). Both have explicit acceptance thresholds; the reduced-motion static path must be verified, not assumed.
