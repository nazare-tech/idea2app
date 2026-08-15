---
implemented: true
implemented_at: 2026-08-15T04:35:59Z
implementation_summary: Built the dev-only WebGL spectral-signal experiment with exact local Figma assets, reduced-motion and WebGL fallbacks, focused tests, and real-browser evidence.
---

> Superseded by `figma-spectral-signal-parity-remediation-plan.md`. The material below records the original feasibility implementation and its then-current assumptions; it is not the current renderer or verification contract.

# Plan: Figma Spectral Signal Animation Experiment

## Goal

Rebuild Figma node `473:30170` as an isolated, development-only web page using Maker Compass's existing Next.js, React, Tailwind, and CSS stack. Match the three concentric lens-distorted radial rings and their coordinated looping motion closely enough to prove the effect is viable in-browser.

## Assumptions

- This is a feasibility experiment, not a production landing-page integration.
- “Empty new page” means no application chrome, controls, copy, or authentication UI.
- Figma inspection found three angular-gradient ring masks plus two frame-level `SHADER` effects: lens distortion and glow. The web proof should therefore use the existing Three.js dependency for live shader rendering, with the exact composite screenshot as a non-WebGL/reduced-motion fallback.
- Existing dirty work is unrelated and must remain untouched except for a narrow documentation-row addition if required.

## Clarifying Questions

1. Should the experiment be publicly reachable?
   - Recommendation A: Development-only route at `/dev/spectral-signal`, matching existing lab conventions.
   - Trade-off: Safest isolation; unavailable in production builds.
   - Recommendation B: Public route at `/spectral-signal`.
   - Trade-off: Easy sharing; adds an unsupported product surface.
   - Selected: Recommendation A. This is explicitly a feasibility test.
2. Should the first pass recreate the distortion procedurally?
   - Recommendation A: Build a route-local Three.js fragment shader, using the inspected Figma ring geometry, angular gradient, and motion tracks.
   - Trade-off: Demonstrates real live distortion and glow; needs explicit WebGL lifecycle and fallback handling.
   - Recommendation B: Animate only the exported red ring masks with CSS transforms.
   - Trade-off: Lower runtime complexity; cannot reproduce the two Figma shader effects and would fail visual parity.
   - Selected: Recommendation A. Direct Figma property inspection proved the luminous treatment is shader-generated, not baked into the ring exports.
3. How should small screens behave?
   - Recommendation A: Scale the original 378px composition down responsively while retaining a centered full-viewport stage.
   - Trade-off: Preserves the complete effect on mobile; size differs from Figma below the source width.
   - Recommendation B: Keep the source size fixed and allow clipping.
   - Trade-off: Exact size; poor narrow-screen presentation.
   - Selected: Recommendation A.

## Recommended First Step

Download the three exact Figma ring masks and full-node composite before their temporary URLs expire, then establish the static fallback before adding the live shader.

## Runtime and Change-Impact Analysis

### Repeated Work

- One route-local `requestAnimationFrame` loop updates elapsed time and three Figma-derived ring rotation uniforms while the route is visible.
- Figma timeline duration is 16 seconds; repeated envelope tracks are represented as equivalent 4-second sampled loops, with the shared 1-second internal angular-gradient rotation profile.
- Expected cadence: browser refresh rate, normally 60 Hz; worst practical case 120 Hz on high-refresh displays.
- Work per frame: constant-size keyframe interpolation plus one full-screen fragment-shader draw. No React state updates, timers, network calls, or per-frame allocations.

### Ownership, Scope, And Lifetime

- Animation state, renderer, shader material, geometry, observers, and frame handle are owned by the experiment component only while `/dev/spectral-signal` is mounted.
- No shared client state, persistence, cache, request, subscription, or downstream consumer fan-out.
- Navigation cancels the frame, disconnects observers, and disposes Three.js resources.
- Page visibility pauses/resumes rendering. `prefers-reduced-motion: reduce` stops the loop and retains the exact static Figma composite.

### Boundary And Cache Semantics

- New boundary: three immutable public ring-mask PNGs plus one immutable composite fallback referenced by local URLs.
- Assets use normal Next static-file caching and have no invalidation requirement for this fixed experiment.
- No API, database, auth, billing, analytics, or client-server contract changes.

### Failure And Recovery

- WebGL import/context/shader failure: browser keeps the exact static composite fallback visible.
- Context loss: fallback remains visible and the live canvas stops claiming readiness.
- Blast radius is limited to the new development-only route.
- Rollback is deletion of new route/component/style/assets/test files plus the narrow documentation row.

### Risk-Matched Verification

| Risk | Observable evidence or test | Acceptance threshold |
|---|---|---|
| Wrong composition | Browser screenshot at 680×711 and source-image comparison | Three rings centered; 378/318/266px source proportions retained; no clipping; luminous lower arc present |
| Motion drift | Short browser video plus computed-style inspection | All rings visibly move; seamless repeat; no layout movement during animation |
| Main-thread/GPU churn | Implementation inspection and browser performance sample | One bounded frame loop, no React render loop, DPR capped at 1.5, pause while hidden |
| Resource leak | Lifecycle test/review plus repeated navigation | Frame canceled, observers disconnected, renderer/material/geometry disposed |
| Accessibility discomfort | Reduced-motion browser emulation/check | Frame loop stopped; exact static composite remains visible |
| Route exposure | Focused route test and production-mode helper behavior | Route uses existing dev-only gate and returns 404 when disabled |

## Architecture Improvement Opportunities

- Selected: Isolate renderer, shader source, timing helpers, fallback, and utility-class styling in one route-local client component. Benefit: easy later extraction without global pollution. Trade-off: a larger experiment component. Likely boundaries: `src/components/dev/`.
- Selected: Reuse the existing dev-only feature gate. Benefit: prevents accidental production exposure. Trade-off: route remains local-only. Likely boundary: `src/app/dev/spectral-signal/page.tsx`.
- Selected: Use existing Three.js through a route-local dynamic import, with DPR cap, visibility pause, resize handling, cleanup, and static fallback. Benefit: real procedural lens/glow behavior without a dependency change. Trade-off: explicit lifecycle code.
- Selected: Keep Figma motion sampling in pure helpers. Benefit: testable exact timing without React renders. Trade-off: keyframe tables remain verbose.
- Deferred: Generalize the shader into a production design-system primitive. Benefit: reuse. Trade-off: premature before the experiment has a product placement.
- Rejected: Add Motion as a dependency. Existing Three.js and the bounded animation-frame loop already express the Figma timeline; dependency growth would be unnecessary.

## Plan

1. Save exact Figma layer exports under `public/experiments/spectral-signal/` and inspect transparency/dimensions.
2. Add a client `SpectralSignal` renderer with static fallback, exact geometry, procedural lens/glow shader, Figma-derived motion sampling, responsive sizing, reduced-motion behavior, visibility pause, and cleanup.
3. Add a chrome-free dev-only page at `/dev/spectral-signal` using the existing feature gate.
4. Add focused render/contract tests and update the test inventory plus directory documentation narrowly.
5. Run focused tests, typecheck, lint, and build-relevant checks.
6. Verify the real route in Chrome, capture a screenshot and short motion video under `ui-evidence/2026-08-14/figma-spectral-signal/`.
7. Complete fresh-eyes review, code/security review artifact, remediation, and plan metadata.

## Milestones

- Static parity: local assets and centered composition match the Figma source.
- Motion parity: three nested tracks loop smoothly with reduced-motion fallback.
- Project integration: dev-only route passes focused and repository checks.
- Evidence: real-browser screenshot and motion capture recorded.

## Validation

- Pure timing tests plus render-contract checks for fallback semantics, renderer marker, and route gate.
- `npm test` focused to new test when supported, then `npm run typecheck` and targeted lint.
- Real Chrome at `/dev/spectral-signal`, 680×711 plus narrow portrait and short landscape viewports.
- Screenshot for static composition; short video for the full motion behavior.

## Risks And Mitigations

- Temporary Figma URLs expire: download exact assets immediately and commit local references.
- Raster layers could soften when enlarged: cap at source size; only scale down responsively.
- Large keyframe tables become hard to maintain: document that values come from Figma node motion context and compress the repeated 16-second tracks into equivalent shorter loops.
- WebGL can fail or be unavailable: render the exact Figma composite first and only reveal the canvas after the first successful frame.
- Existing dirty documentation/test inventory edits may overlap: inspect diffs before applying narrow additions and never replace whole files.

## Rollback Or Recovery

Remove only newly added experiment files and reverse the specific documentation lines. No migrations, state cleanup, or dependency rollback required.

## Open Decisions

None. Repository Recommendation A policy applies. Required opposite-model plan evaluation was attempted twice and remains unevaluated because both calls failed with reviewer API `ENOTFOUND`; the two durable evaluation files record that outage.

## Critique

### Software Architect

- Direct property inspection proved the source uses two Figma shader effects. Route-local Three.js is proportionate for this feasibility test; production abstraction remains deferred.

### Product Manager

- A dev-only proof answers feasibility quickly but does not establish where this animation should appear in the product.

### Customer Or End User

- Motion must feel alive without becoming distracting; reduced-motion support and a chrome-free test stage make evaluation honest.

### Engineering Implementer

- Figma's generated 16-second arrays contain repeated subcycles. Equivalent sampled loops reduce data while preserving timing, but need video verification and pure interpolation tests.

### Risk, Security, Or Operations

- No data or network runtime exists. Main risks are accidental production exposure, WebGL failure, leaked GPU resources, and unbounded frame work; dev gating, exact fallback, lifecycle cleanup, visibility pause, and capped DPR address them.
