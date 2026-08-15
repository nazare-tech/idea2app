---
implemented: true
implemented_at: 2026-08-14
implementation_summary: Rebuilt the experiment around exact authored timestamps, a Figma-calibrated multipass live renderer, deterministic canvas seeking, and 240-frame lossless capture. Frame zero is pixel-identical to Figma; real Chrome and SwiftShader match exactly at origin and within 0.000072 normalized MAE at 1.25 seconds. The exact lossless/color-faithful outputs remain 680×711; the broad-playback 4:2:0 MP4 adds one background row.
---

# Plan: Figma Spectral Signal Render-Parity Remediation

## Goal

Replace the visually inventive shader proof at `/dev/spectral-signal` with a calibrated renderer that preserves the Figma ring colors, geometry, full-composition distortion, bloom, and exact motion timestamps. Produce deterministic static comparisons and a browser-canvas-derived video whose timing and rendering match the live page.

## Assumptions

- User correction makes Figma render parity the primary requirement; the existing “alive” motion character remains desirable.
- Figma node `473:30170` is the source of truth: 680×711 stage, 378/318/266px rings, exact exported RGBA assets, nested distortion on the middle/inner rings, two root shader effects, and a 16-second timeline containing four equivalent four-second envelope subcycles.
- Exact center is `(340,356)`. Effect order is outer raw ring; locally distorted middle and inner rings; alpha composition; root lens distortion; root multipass bloom. Effects are static—only ring rotations animate.
- The exact private Figma shader build source is not reliably readable through the connected resource bridge. Visual calibration against the exact exported composite is therefore required even when using the matching lens-distortion and bloom pass architecture.
- Figma's own timeline MP4 exporter omits custom shader effects, so it is motion evidence only; the exact composite PNG remains the visual source of truth.
- Existing unrelated dirty work remains untouched.

## Clarifying Questions

1. What should win when exact private shader code is unavailable?
   - Recommendation A: Match the exported Figma pixels through the same pass architecture and measured visual calibration.
   - Trade-off: Best observable parity; implementation is an equivalent reconstruction, not byte-identical Figma shader source.
   - Recommendation B: Keep a simpler procedural interpretation and accept visible drift.
   - Trade-off: Less code; contradicts the correction.
   - Selected: Recommendation A.
2. How should evidence video be produced?
   - Recommendation A: Seek the live shader deterministically and export lossless canvas PNG frames at exact timestamps, then encode a 60 fps master; keep fixed-time mode for exact screenshots.
   - Trade-off: Video uses the browser's exact shader pixels and cannot drop frames; adds development-only seek/capture hooks and a repeatable capture script.
   - Recommendation B: Continue stitching browser screenshots.
   - Trade-off: Easier tooling; repeats the timing and chroma errors already reported.
   - Selected: Recommendation A.

## Recommended First Step

Add exact nonuniform Figma timestamp sampling and deterministic fixed-time rendering before changing pixels. This creates stable `t=0`, `t=1`, and `t=2` comparison points for shader calibration.

## Runtime and Change-Impact Analysis

### Repeated Work

- Live mode: one route-local animation-frame loop, normally 60 Hz and at worst the display refresh rate; fixed-time mode renders one frame only.
- Per live frame: three transformed RGBA ring samples, full-composition lens pass, bounded separable bloom passes at reduced resolution, final composite. No React state or allocations per frame.
- Canvas capture: development-only, explicitly invoked, one synchronous render per requested timestamp across the four-second unique loop; no network or persistence.

### Ownership, Scope, And Lifetime

- Renderer, render targets, materials, textures, loop state, fixed-time state, and capture handlers remain owned by the experiment component.
- Navigation, reduced motion, context loss, initialization failure, and unmount cancel frames and dispose every GPU resource.
- No shared store, API, cache, auth, database, analytics, or product surface changes.

### Boundary And Cache Semantics

- Existing local Figma assets remain immutable source inputs.
- New development-only contract: optional capture mode plus a local synchronous canvas-seek hook after renderer readiness.
- Fallback remains the exact Figma composite. WebGL failure cannot expose a half-initialized pass.

### Failure And Recovery

- Any pass allocation, shader compilation, texture, or context failure returns to the exact static fallback.
- Capture/encoding failure affects evidence only, not rendering.
- Rollback seam is the experiment component, timing helper, focused tests, and evidence; no dependency or migration rollback.

### Risk-Matched Verification

| Risk | Observable evidence or test | Acceptance threshold |
|---|---|---|
| Motion timing drift | Golden helper tests at authored nonuniform timestamps | Exact expected degrees at keyframe timestamps and four-second periodicity |
| Static render drift | Fixed-time Chrome capture compared with Figma composite | Same geometry and dominant red/orange treatment; materially lower pixel error than current renderer |
| Video/live mismatch | 240 lossless canvas frames at exact timestamps plus live observation | 4.000-second, 60 fps evidence; same shader, phase, scale, and color treatment |
| Excess GPU work | Code inspection plus live frame cadence check | One animation loop; bounded render targets; bloom below full resolution; no per-frame React state |
| Resource leak | Lifecycle review/test and repeated reload/navigation | All frames, targets, textures, materials, geometry, observers, listeners, and streams stopped/disposed |
| Accessibility regression | Reduced-motion browser test | Static exact fallback, no animation loop or capture |

## Architecture Improvement Opportunities

- Selected: split timing data/sampling from rendering. Benefit: exact golden tests and deterministic capture; trade-off: explicit timestamp arrays. Files: `src/lib/spectral-signal-motion.ts` and test.
- Selected: route-local multipass renderer helpers with centralized disposal. Benefit: Figma-like post-processing and safer cleanup; trade-off: more renderer code. File: `src/components/dev/spectral-signal-client.tsx` or a narrow renderer module if size warrants.
- Selected: deterministic fixed-time canvas seek plus lossless export seam. Benefit: repeatable visual diffs and frame-complete video; trade-off: development-only diagnostic surface and capture script.
- Deferred: reusable product design-system shader primitive. No second product consumer yet.
- Rejected: add a new animation or post-processing dependency. Existing Three.js primitives are sufficient.

## Plan

1. Add failing golden timing tests for exact Figma timestamp fractions and deterministic fixed-time parsing; implement exact interpolation.
2. Replace alpha-only invented shading with original RGBA ring compositing, nested ring distortion, full-composition lens distortion, reduced-resolution bloom, and final color composite.
3. Add fixed-time rendering, a development-only synchronous seek seam, and a repeatable lossless canvas-frame capture script; update focused browser tests and script docs.
4. Calibrate fixed frames against the exact Figma composite in real Chrome; capture new PNG and deterministic video evidence.
5. Run focused and full verification, fresh-eyes passes, independent review, security review, remediation, and plan metadata completion.

## Milestones

- Deterministic timing: exact authored timestamps pass golden tests.
- Render parity: live and fixed frames preserve Figma red/orange color, softness, overlap, and lens/bloom structure.
- Honest evidence: video is encoded from exact live-canvas pixels at authored timestamps, not JPEG browser screenshots.

## Validation

- Focused timing/component tests, targeted ESLint, typecheck, full unit suite, focused Playwright.
- Real Chrome at 680×711 plus short landscape; reduced-motion and WebGL fallback checks.
- Fixed-time screenshots at representative phases and one four-second, 60 fps canvas-derived video under `ui-evidence/2026-08-14/figma-spectral-signal-parity/`.
- Pixel statistics and visual inspection against `public/experiments/spectral-signal/reference.png`; numeric error is calibration evidence, not sole acceptance criterion.

## Risks And Mitigations

- Exact Figma shader source unavailable: mirror the pass order and tune against the exported composite rather than inventing unrelated chroma treatment.
- Bloom can be expensive: half/quarter-resolution targets, capped DPR, fixed tap count.
- Color-space mismatch: preserve texture color space, linearize/composite consistently, and validate captured RGB values.
- Encoding support varies: keep the lossless PNG sequence as canonical proof and emit a high-quality WebM/MP4 derivative using available ffmpeg codecs.

## Rollback Or Recovery

Revert only the spectral-signal component, timing helper/tests, focused E2E updates, plan/review docs, and new ignored evidence. Static fallback and route gate remain safe throughout.

## Open Decisions

None. Recommendation A policy applies. Required opposite-model plan evaluation was attempted once and remains unevaluated because the reviewer API failed with `ENOTFOUND`; the durable evaluation file records the outage.

## Critique

### Software Architect

- Multipass rendering is justified only inside this experiment until reuse exists. Centralized ownership and disposal prevent shader-prototype complexity leaking into product architecture.

### Product Manager

- Success means faithful visual proof, not merely impressive motion. Evidence must make comparison easy and honest.

### Customer Or End User

- Rendering should feel like Figma: soft red/orange spectral overlap, restrained chromatic fringe, luminous lower bloom. Rainbow-white invention is a failure even if motion is attractive.

### Engineering Implementer

- Visual TDD needs deterministic phases. Shader tuning before fixed-time control would create unreliable comparisons and repeat the prior mistake.

### Risk, Security, Or Operations

- No data or trust boundary changes. Main risks are GPU lifecycle, unsupported capture APIs, color-space drift, and misleading evidence; fallback, disposal, deterministic capture, and real Chrome verification contain them.
