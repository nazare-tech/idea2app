# Review: Stream Reveal Reading-Rate Cap and Section Reset

Plan: `docs/plans/stream-reveal-reading-rate-and-section-reset-plan.md`
Date: 2026-07-11

## Changes

- `src/hooks/use-smoothed-stream.ts`: extracted pure `advanceSmoothedReveal(current, full)`; reveal rate now 2 words per 50ms tick baseline (~40 words/sec), ramping `floor(backlog / 750)` to a hard cap of 5 words/tick (~100 words/sec). Previous cap was 12 words/tick (~240 words/sec), which drained poll chunks near-instantly. Added `resetKey` option with a render-phase derived-state reset so a new active section always reveals from its top instead of inheriting the previous section's character offset.
- `src/components/analysis/planning-streaming-document.tsx`: passes `resetKey: structure.active?.heading ?? null`.
- `src/components/analysis/competitive-streaming-document.tsx`: passes `resetKey: activeSection?.name ?? null`.
- New `src/hooks/use-smoothed-stream.test.ts`: 7 node:test cases (baseline rate, cap, ramp, shrink reset, caught-up stability, end clamp, no-space string).

## Verification

- `npm test`: 588 pass, 0 fail (7 new).
- `npx tsc --noEmit`: clean.
- Real browser (Browser pane, dev server port 3000) at `/dev/motion-lab`, variant A, delivery "2s poll chunks", speed Real-ish: prose reveals continuously word by word through chunky delivery; quantitative trace in `ui-evidence/2026-07-11/stream-reveal-reading-rate/reveal-rate-measurements.md` shows ~40 wps baseline and ~100 wps bounded catch-up with no full-chunk teleports. Structured blocks still commit whole by design.
- Motion lab exercises the exact changed hook and both production streaming renderers. A fresh-project intake run (Idea 1.1) was not performed in this session; if desired as canonical generation-flow evidence, run it as a follow-up.

## Code-Review Findings

- Render-phase `setState` reset follows React's documented derive-state-from-props pattern (state updated only when `resetKey` differs from tracked key); no render loop possible.
- `prefersReducedMotion` check moved inside the tick updater; behavior unchanged (immediate full reveal).
- Motion lab's whole-document usage passes no `resetKey`; default `null` keeps prior semantics. No regression.
- No duplication introduced; rate policy constants documented at the top of the hook.

## Security Review

Not applicable: client-only render pacing, no data, auth, or API surface touched.

## Architecture Improvement Review

- Selected opportunity (pure `advanceSmoothedReveal` extraction) landed and is under test.
- Deferred: viewport-aware reveal/poll cadence and SSE streaming, per plan; both remain valid future scopes.

## Remediation

None required.
