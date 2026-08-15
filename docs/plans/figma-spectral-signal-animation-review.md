# Review: Figma Spectral Signal Animation Experiment

> Superseded by `figma-spectral-signal-parity-remediation-review.md`. The evidence and limitations below describe the original implementation and are retained as historical review notes.

## Scope

Implemented the isolated `/dev/spectral-signal` feasibility page from Figma node `473:30170`. The page uses the repository's existing Next.js, React, Tailwind, and Three.js stack. It has no application chrome, API calls, persistence, auth flow, or new dependency.

## Plan Evaluation

The required opposite-model plan evaluation was attempted twice. Both attempts failed before review with `ENOTFOUND` because the reviewer API was unreachable. The outage is preserved in:

- `docs/plans/figma-spectral-signal-animation-plan-eval.md`
- `docs/plans/figma-spectral-signal-animation-plan-eval-retry.md`

The plan therefore remains explicitly unevaluated by the opposite model; no self-review is claimed as substitute coverage.

## Implementation Review

- Route is gated by the existing `isDevOnlyFeatureEnabled()` helper and returns `notFound()` when disabled.
- Exact Figma composite and three ring masks are stored locally under `public/experiments/spectral-signal/`; runtime has no external asset dependency.
- Three.js is dynamically imported only after mount. The renderer uses one bounded animation-frame loop, capped DPR, responsive resize handling, visibility pause/resume, and no per-frame React state.
- The exact composite is visible first and remains the fallback for reduced motion, unavailable WebGL, context loss, texture/import failure, or shader initialization failure.
- Cleanup cancels frames, disconnects observers, removes listeners, disposes textures/material/geometry/renderer, and discards a partially loaded texture set after failure.

## Fresh-Eyes Remediation

### Pass 1

Found that a browser reporting device pixel ratio below 1 produced a soft canvas. Fixed by clamping render scale to `1..1.5`. Rechecked the 680×711 stage: canvas now renders at 680×710 pixels with no overflow.

### Pass 2

Found two lifecycle edges:

- A live reduced-motion toggle could reveal a stale canvas when motion was later re-enabled.
- A partial texture load failure could leave already loaded textures undisposed.

Fixed both with centralized graphics disposal, immediate tracking of each loaded texture, and an explicit fallback-state reset during cleanup. Focused tests, typecheck, lint, and Chrome verification were rerun after the fixes.

## Independent Review

- Route-pattern reviewer recommended the separate dev-only route, existing feature gate, route-local Three.js shader, explicit reduced-motion handling, DPR cap, fallback, and lifecycle cleanup. The implementation follows those boundaries.
- Final read-only implementation reviewer found reversed-edge GLSL `smoothstep`, live double-compositing of the fallback rings, short-landscape overflow, missing executable lifecycle coverage, and limited proof of nonuniform Figma keyframe timing.
- Remediated before handoff: corrected `smoothstep`; changed the live shader to a clean procedural background so only animated rings render; sized the stage from both viewport axes; added focused Playwright coverage for landscape fitting, context-loss fallback when WebGL is available, and reduced-motion shutdown.
- The timing helper still uses the Figma-exported samples uniformly across each repeated subcycle because the source response did not preserve individual timestamp fractions. This is an explicit fidelity limitation, not an unreviewed defect; motion was validated visually in real Chrome and captured on video.

## Verification

- Focused tests: 5 passed.
- Full test suite: 758 passed, 0 failed.
- Focused Playwright: 2 passed, 0 failed.
- `npm run typecheck`: passed.
- Targeted ESLint: passed.
- Full `npm run lint`: passed with two unrelated pre-existing warnings in generated/evidence files; zero errors.
- Real Chrome, 680×711: `data-renderer="webgl"`, stage 680×711, canvas 680×710, no overflow.
- Real Chrome, short landscape 844×390: stage scales to 373×390 with no horizontal or vertical overflow.
- Reduced-motion emulation: static fallback visible, canvas hidden, renderer reports `fallback`.
- WebGL-disabled emulation: static fallback visible, canvas hidden, renderer reports `fallback`.
- Browser console: no `SpectralSignal` or Three.js errors.
- Production build was not run because the required long-lived development server owns `.next`; live compilation, full typecheck, tests, and lint passed.

## Evidence

- `ui-evidence/2026-08-14/figma-spectral-signal/desktop-webgl-final.png`
- `ui-evidence/2026-08-14/figma-spectral-signal/narrow-webgl.png`
- `ui-evidence/2026-08-14/figma-spectral-signal/reduced-motion.png`
- `ui-evidence/2026-08-14/figma-spectral-signal/spectral-signal-motion-final.mp4`

## Security Review

No user input, data access, network request, secret, executable upload, HTML injection, or authorization boundary was added. The route is development-only and all assets are immutable local files. No security finding remains.

## Architecture Improvement Review

The shader and timing model are isolated from product surfaces. Generalizing this into a shared design-system primitive is intentionally deferred until a product placement and reuse case exist. No architecture refactor is justified for the proof.
