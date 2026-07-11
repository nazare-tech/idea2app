---
title: Streaming competitor links + marquee loop width
status: implemented
implemented: true
implemented_at: 2026-07-11T23:00:00Z
created_at: 2026-07-11
owner: Claude Code
implementation_summary: >
  Marquees: new IntakeMarquee component measures one copy of its children
  (ResizeObserver) and clamps the container to exactly one loop's width,
  centered; Step 1 example rows (back to 4 unique pills per row) and the loader
  artifact strip both use it; the clone half is inert/aria-hidden. Streaming
  links: competitor source pairs are computed once before synthesis
  (buildCompetitorSourcePairs), surfaced via StreamCallbacks.onCompetitorSources,
  persisted by the executor to the new generation_queue_items.partial_metadata
  column (migration 20260711120000, applied via supabase db push), attached to
  the status streamingPreview as competitorSources (validated through
  getCompetitorSourcesFromMetadata), merged sticky in the generate-all store,
  and passed to both CompetitiveStreamingDocument instances, which feed it to
  getCompetitiveAnalysisStructuredData shaped as saved metadata
  (allowParsedSourceFallback stays false). Verified: marquee clamp live on Step
  1 + loader (fresh Idea 1.1 run "Signal Road Product Intelligence");
  streaming-time links proven in Dev Motion Lab live-fill (underlined
  Productboard/Dovetail links in the comparison table while later sections were
  still skeletons); real-run transport confirmed by logs (partial writes, no
  write_failed) plus 119 unit tests, tsc, eslint. Follow-up chip filed: the
  generate-all store's one-shot hydrate has no retry (pre-existing zombie-tab
  risk observed during verification).
---

# Streaming competitor links + marquee loop width

## Goal

1. (Done in same session) Intake marquees (Step 1 example rows, loader artifact strip)
   clamp to exactly one loop's content width, centered (`IntakeMarquee`, measured half).
2. Competitor mention links must render DURING Market Research streaming, not only after
   the saved document replaces the stream. Root cause (investigated): competitor sources
   are computed by live research BEFORE synthesis streams, but only persisted into
   `analyses.metadata` at completion; the streaming channel is text-only and
   `CompetitiveStreamingDocument` hard-codes an empty source map
   (`getCompetitiveAnalysisStructuredData(parsed, undefined, {allowParsedSourceFallback:false})`).

## Recommendation A (selected)

Transport the source pairs through the queue item row, parallel to `partial_content`:

- New nullable `generation_queue_items.partial_metadata JSONB` (migration
  `20260711120000`). Server-written only (same policies as partial_content), cleared at
  terminal state, failure-isolated so pre-migration environments lose nothing.
- `StreamCallbacks.onCompetitorSources` fired in `runCompetitiveAnalysis` right after
  research resolves (before synthesis), with the SAME pairs later saved to
  `analyses.metadata.live_research.competitor_sources` (logic extracted to one helper so
  stream + saved can never diverge).
- Execute route persists `{ competitor_sources }` to the claimed item's
  `partial_metadata` (single small write, try/catch isolated, warn log).
- `/api/generate-all/status` attaches `competitorSources` to `streamingPreview` when the
  streaming item is competitive and partial_metadata holds pairs.
- Store keeps `streamingCompetitorSources`; workspace passes it to both
  `CompetitiveStreamingDocument` instances (overview + detail); the component accepts a
  `competitorSources` prop and feeds it to `getCompetitiveAnalysisStructuredData` shaped
  as `{ live_research: { competitor_sources } }` so the existing validated metadata path
  (syntactic public http(s) checks, fail-closed) is reused verbatim.
  `allowParsedSourceFallback` stays false: streaming still never promotes model-authored
  H3 URLs.

Rejected B: embed a serialized header inside `partial_content` (no migration, but mangles
the text channel and every consumer must strip it). Rejected C: write the analyses row
early (violates "saved row exists only when generation succeeded" invariant).

## Runtime & change-impact

- Streaming/polling: +1 small DB write per competitive run; status payload grows by a few
  hundred bytes while competitive streams. Delta text protocol untouched.
- Trust: pairs originate server-side from the same normalize/validate path as saved
  metadata; browser cannot write queue items (RLS unchanged).
- Pre-migration environments: metadata write fails, is swallowed and logged; behavior
  degrades to current (links appear on save).
- Rollback: revert code; column is additive and nullable, safe to leave or drop.

## Test strategy

- Unit: existing pipeline/status tests must stay green; add coverage where cheap.
- Real flow (sanctioned QA spend): create one fresh Idea 1.1 project with the allowanced
  signed-in account; verify links are underlined in streamed Executive Summary / Market
  Research text before the saved row loads; also captures loader marquee clamp + first
  token -> workspace transition (closes prior evidence gap).
- `tsc`, eslint, `node --test` on touched areas.

## Architecture improvement opportunities

- Single source-pair builder shared by stream callback and saved metadata (selected).
- Failure-isolated partial_metadata writes mirroring partial_content (selected).
- Generalizing partial_metadata for prd/mvp streaming extras: deferred, no consumer yet.
