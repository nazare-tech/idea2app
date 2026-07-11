---
implemented: true
implemented_at: 2026-07-11T00:00:00-07:00
implementation_summary: "Reveal rate capped at 2 words/50ms tick (~40wps) with bounded catch-up to 5 words/tick (~100wps); resetKey added to useSmoothedStream and wired to active section heading/name in both streaming documents; pure advanceSmoothedReveal extracted and unit-tested (7 cases, 588 total pass); verified in motion lab with 2s poll chunks (evidence: ui-evidence/2026-07-11/stream-reveal-reading-rate/)."
---

# Stream Reveal: Reading-Rate Cap and Section Reset

## Goal

Restore the visible word-by-word streaming feel on the project workspace during generate-all. Today most of a section blinks in at once and only the last few words visibly stream. Two root causes fixed here:

1. `useSmoothedStream` drains backlog at up to 12 words per 50ms tick (240 words/sec), far past reading speed, so a 3-10s poll chunk is consumed in about a second.
2. The hook keeps `visibleLength` as a raw character offset with no notion of section identity. When the active section changes (previous section completed, new one is now the smoothing target), the old offset carries over; if the new section already arrived longer than that offset, its first `visibleLength` characters appear instantly and only the tail streams.

## Assumptions

- Word-by-word reveal should track a comfortable "fast reading" pace, not raw generation pace. Display lagging the poll buffer is acceptable and desirable; the buffer already exists client-side.
- Lag must stay bounded: if the backlog grows very large (slow 10s polls late in generation), the reveal may speed up, but never to a visually instant teleport.
- `finished` documents keep bypassing the reveal entirely (existing behavior in both streaming documents), so end-of-generation is not blocked by a slow drain.
- Dev motion lab keeps using the hook over the whole simulated document with default options; no reset key needed there.

## Clarifying Questions

**Q1: What should the baseline and catch-up reveal rates be?**
- **Recommendation A:** Baseline 2 words per 50ms tick (~40 words/sec), ramping linearly with backlog to a hard cap of 5 words/tick (~100 words/sec) once backlog exceeds ~1,500 characters. 40 wps reads as an energetic stream (comparable to chat UIs); 100 wps is still visibly animated while bounding lag to roughly one long poll interval behind. Trade-off: display can lag the freshest content by several seconds on 10s polls.
- **Recommendation B:** Keep backlog-proportional scaling but halve the cap (6 words/tick). Trade-off: still up to 120 wps in bursts and keeps the "chunk blinks in" feel on big deltas.
- **Selected: A.**

**Q2: How should section identity reset the reveal?**
- **Recommendation A:** Add an optional `resetKey` to `useSmoothedStream`. When the key changes, the visible length resets to 0 during render (React derive-state-from-props pattern), so no frame ever shows the carried-over offset. Call sites pass the active section's heading/name. Trade-off: two identically named consecutive active sections would not reset, which cannot happen in these documents (headings are unique per doc).
- **Recommendation B:** Key the whole component subtree with React `key={heading}`. Trade-off: remounts the rendered markdown blocks and drops memoized state; heavier re-render for the same effect.
- **Selected: A.**

## Architecture Improvement Opportunities

- **Extract the per-tick advance as a pure function (`advanceSmoothedReveal`).** Benefit: unit-testable with the repo's node:test runner (no React testing library available), and the rate policy is documented as executable code. Trade-off: one more export. Files: `src/hooks/use-smoothed-stream.ts`, new `src/hooks/use-smoothed-stream.test.ts`. **Selected.**
- **Viewport-aware reveal (snap when off-screen, stream when visible) and in-view poll cadence.** Benefit: matches user attention. Trade-off: IntersectionObserver plumbing across workspace; separate scope. **Deferred** (explicitly discussed with the user as ideas 3/4; only 1+2 requested).
- **SSE streaming to replace polling.** Root fix for chunkiness but an infra change. **Deferred.**

## Runtime and Change-Impact Analysis

- **AI generation / queues / persistence:** untouched. Client-only reveal pacing; the poll buffer and status route are unchanged.
- **Polling/streaming:** poll cadence (3s/6s/10s ramp) unchanged. Only the rate at which already-fetched text is revealed changes. The status-route suffix/delta protocol is unaffected because the store still holds full preview text.
- **Shared client state:** `visibleLength` stays local to the leaf components (post-ca000f89 architecture preserved); reveal ticks still re-render only the streaming leaf.
- **Client-server payloads / cache / billing:** none touched.
- **Perf:** the interval already runs at 50ms while a section streams; the word-boundary scan work per tick shrinks (fewer words per tick). Render-phase reset adds one extra render only on section swap.
- **Failure modes:** if a heading repeats within one document (not possible with current parsers, which dedupe by alias), reset would be skipped and behavior degrades to today's. If backlog outruns 100 wps for a long stretch, the reveal lags but `finished` swap-in still shows the saved document instantly.

## Plan

1. `src/hooks/use-smoothed-stream.ts`
   - Export pure `advanceSmoothedReveal(current, full)` implementing: reset when target shrank; baseline 2 words/tick; linear ramp `floor(backlog / 750)` clamped to [2, 5] words/tick; word-boundary stepping as today.
   - Add `resetKey?: string | number | null` option; render-phase reset of `visibleLength` (and tracked key state) when it changes.
2. `src/components/analysis/planning-streaming-document.tsx`: pass `resetKey: structure.active?.heading ?? null`.
3. `src/components/analysis/competitive-streaming-document.tsx`: pass `resetKey: activeSection?.name ?? null`.
4. New `src/hooks/use-smoothed-stream.test.ts` (node:test): rate cap at small/large backlogs, shrink reset, word-boundary stepping, end-of-string clamp.
5. Verify: full unit suite, typecheck, and real-browser check via `/dev/motion-lab` streaming simulation (hook pacing) plus evidence saved under `ui-evidence/`.

## Milestones

- M1: hook change + pure function + tests green.
- M2: call sites pass reset keys; typecheck clean.
- M3: browser evidence captured; plan marked implemented.

## Validation

- `npm test` (adds hook suite to the 575 existing tests).
- `npx tsc --noEmit` (or repo typecheck script).
- Motion lab at `/dev/motion-lab` with `delivery=stream`: confirm continuous word reveal, no large blink-ins after big chunks. Screenshot/video under `ui-evidence/2026-07-11/stream-reveal-reading-rate/`.
- Fresh-project generation flow is the canonical evidence for generation UI per repo rules; motion lab exercises the exact hook and both streaming documents' parsers with simulated chunky delivery. If the user wants full intake-flow evidence (spends generation credits), run Idea 1.1 as a follow-up.

## Risks

- Reveal lag on 10s polls could make the workspace feel behind; bounded by the 100 wps catch-up cap and by the instant swap to the saved document at `finished`.
- Render-phase `setState` must follow the React derive-state pattern exactly (update state only when key differs) to avoid render loops.

## Rollback

Single revert of the commit; no data, schema, or API changes.

## Open Decisions

None; Recommendation A selected for both questions.

## Critique

- **Architecture:** Pure-function extraction keeps policy testable under node:test; leaf-scoped timers from ca000f89 preserved. Sound.
- **Product:** Directly serves the "show the work" principle: streaming text is the product's AI signal. Reading-rate pacing is the point, not a compromise.
- **Customer:** Bounded lag means users see steady progress instead of jumpy blocks; worst case they read slightly stale text that is still newer than what they had read.
- **Engineering:** Small diff, two call sites, one new test file. Main subtlety is the render-phase reset; covered by pattern discipline and tests on the pure function.
- **Risk/Security:** Client-only, no trust-boundary or data changes. Lowest-risk category.
