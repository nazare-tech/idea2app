# Review: Cursor-Reactive Hero Dot Field with Micro Compass Bearings

## Scope
- New: `src/lib/compass-geometry.ts`, `src/components/landing/hero-dot-field-core.ts` (+ tests), `src/components/landing/hero-dot-field.tsx`
- Modified: `src/components/landing/compass-mark.tsx` (consumes shared geometry), `src/app/page.tsx` (mount + `data-dot-field-protect`/`data-dot-field-avoid` markers), `docs/systems/product-overview.md`, `docs/systems/directories-and-key-files.md`

## Cross-Model Plan Evaluation
- Codex evaluated the plan before implementation (`hero-dot-field-cursor-compass-plan-eval.md`): 4 MAJOR + 2 MINOR, all accepted and folded into the plan; none rejected. Diff-level cross-model review not requested (no auth/RLS/webhook/billing/migration surface).

## Verification
- `npm run test`: 704 pass (11 new core tests: determinism, cluster fraction, wedge spacing/cap, pulse lifecycle bounds, angle damping short-arc + convergence, falloff clamps, shouldAnimate truth table, shared-geometry contract).
- `npm run typecheck`, changed-files `eslint`: clean. `npm run build`: clean (chunky guard passed). Full-repo lint has one pre-existing unrelated error in `src/components/layout/workspace-document-frame.tsx:52`.
- Playwright (headed-equivalent headless Chromium, real dev server) because the in-app Browser pane reports `document.hidden: true`, which correctly parks the rAF loop (the component's own gate). Evidence in `ui-evidence/2026-08-02/hero-dot-field/`:
  - `01-hero-full.png`, `02/03` cursor left/right, `06-cursor-lift-at-cluster.png`, `04-mobile-375.png`, `05-reduced-motion.png`, two `.webm` cursor-sweep videos.
  - Cursor proximity lift: alpha in a 160px box around the cursor rose 13053 → 31764 (2.43x) after `mouse.move`.
  - Wedges visibly rotate to point at the cursor from both sides of the hero (01 vs 03).
  - Pulses live: full-canvas alpha varies across 5 samples; pulse strokes observed with the expected fade-in alpha ramp.
  - Reduced motion: field drawn once, pixel-identical 1s later (static), no loop.
  - Frame cadence: median rAF delta 8.3ms in unthrottled headless (draw well under a 60fps budget); draw loop measured at ~121 draws/s idle, stable.
- Acceptance thresholds from the plan's risk table: loop pauses when hidden (verified: hidden pane froze it), reduced motion static (verified), no hydration warnings (console clean), CLS 0 (absolute canvas, no layout contribution).

## Fresh-Eyes Self Review
- Pass 1: found protect-rect measurement racing the `hero-enter-up` entrance transform (CTA measured mid-rise). Fixed with a one-shot 1500ms settle re-measure; re-ran typecheck/lint/tests.
- Pass 1 (during browser iteration): found the replaced-element bug — a canvas with `inset-0` and no CSS size renders at its intrinsic backing-store size (2x, clipped). Fixed by pinning `canvas.style.width/height` in rebuild.
- Pass 2: checked save/restore state handling in the wedge loop, dt=0 draw path, listener cleanup, pointer-type filtering, zero-size sections, SSR/hydration surface (canvas renders empty markup; all randomness is seeded and client-side). No further issues.

## Code Review Findings
- Wedge angles reset to north on debounced resize rebuilds (needles snap, then re-damp). Cosmetic, rare event, accepted.
- Seed 633 was chosen by scanning 6,000 seeds for worst-case left/right cluster balance ≥0.97 across hero widths 1024–1680; extreme widths outside that range may be less balanced. Accepted (clamped by realistic viewports).

## Architecture Improvement Review
- Selected: pure core module (landed, 11 tests); shared wedge geometry module (landed, consumed by both renderers; SVG path string verified byte-identical to the previous hardcoded `d`).
- Deferred: generic ambient-canvas abstraction (still one consumer; remains deferred).
- No new duplication, brittle contracts, non-idempotent paths, or recovery blind spots identified. Kill switch unchanged: remove `<HeroDotField />` from `page.tsx`.

## Security Review Findings
- None. No data, auth, network, or storage surface; decorative client-only canvas. Pointer coordinates are consumed locally and never transmitted.

## Remediation Checklist
- [x] Canvas CSS size pinned (replaced-element stretch bug)
- [x] Settle re-measure after entrance animations
- [x] Pulse spawns filtered to visible dots
