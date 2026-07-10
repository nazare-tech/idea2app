# Motion Lab + Streaming Generation Plan

**Date**: 2026-07-09
**Status**: Implemented; migration applied 2026-07-09.

**Revision (2026-07-09, after first live test)**: The loading-screen preview was replaced by in-workspace streaming. Final intake submit now redirects to the workspace immediately after project creation (loading panel only covers the create request; its polling moved out entirely, since the workspace generate-all store already polls `/api/generate-all/status` and retries execute). The status route exposes `streamingPreview`; the store retains the longest partial seen; `ProjectWorkspace` smooths it and `ScrollableContent` renders `CompetitiveStreamingDocument` in the Executive Summary (`parts="overview"`) and Market Research (`parts="detail"`) sections until the saved document loads. `/api/projects/[id]/onboarding-status` still returns `streamingPreview` but has no client consumer.

## Goal

Two connected deliverables:

1. **Motion Lab** (`/dev/motion-lab`): a dev-only workbench (same gating idea as Prompt Lab) that renders the real Executive Summary + Market Research workspace components from sample content, and lets us prototype generation/animation states (3 streaming variants) against production renderers. Because it imports the real components, experiments never drift from production UI. Never ships to production (`notFound()` outside local dev).
2. **Real streaming during onboarding (Prototype A, "block commit")**: while a project is being generated, the intake loading screen shows the Market Research document streaming in. Prose streams word by word; structured blocks (competitor cards, tables) buffer and commit atomically with entrance motion.

## Current state (investigated)

- Competitive analysis renders through `CompetitiveOverviewSection` / `CompetitiveDetailSection` (`src/components/analysis/competitive-analysis-document.tsx`), which parse markdown via `getCompetitiveAnalysisViewModel` (`src/lib/competitive-analysis-v2.ts`).
- Validation is strict: all 12 H2 sections, exact order, non-empty, else markdown fallback. Partial streamed content can never feed these components directly.
- `CompetitiveDetailSection` hardcodes 12 `WorkspaceDesignedSection` blocks; internal block components (`CompetitorProfiles`, `CompactTableCard`, `SmallListCard`, `PositioningMap`, `MVPCard`, `ExecutiveSummaryCard`) are not exported.
- Streaming infra partially exists: `runCompetitiveAnalysis(input, callbacks)` already supports `onStage`/`onToken` with `stream: true` to OpenRouter (`src/lib/analysis-pipelines.ts:125`). `/api/analysis/[type]` can stream NDJSON; `parseDocumentStream` client parser exists. But the onboarding path (`/api/generate-all/execute` → `generateProjectDocument()`) passes no callbacks and persists nothing partial. `generation_queue_items` has no partial content column.
- Onboarding UI: `IdeaIntakeWizard` polls `/api/projects/[id]/onboarding-status` every 2s and shows `IntakeSubmissionLoadingPanel` (fake timed progress bars).
- Sample data: `LANDING_SAMPLE_CONTENT.competitive` (`src/lib/landing-sample-content.ts`) holds a real generated Market Research doc + v2 metadata.

## Design decisions

- **Section-level commit with in-section prose streaming.** A section is complete when the next H2 arrives (or stream ends). Complete sections render through the real designed components with a snap-in entrance (ease-out-expo, reduced-motion guarded). The in-progress section shows its heading plus streamed prose; a trailing incomplete line that looks structural (table row, heading, list marker, unclosed `**`) is withheld; once table/card lines are detected in the tail, show an "assembling" chip instead of raw half-tables.
- **Lenient streaming parser lives in a new module** so production validation stays strict and untouched.
- **Refactor `CompetitiveDetailSection` to a config array** (`id`, `kicker`, `title`, required v2 section names, `render(structured)`), exported for reuse. `CompetitiveDetailSection` maps over it: visual no-op for production. Streaming preview renders the subset whose sections are complete.
- **Onboarding transport = DB partials + existing 2s poll.** Executor throttle-writes partial markdown to a new `generation_queue_items.partial_content` column (~1.5s cadence); `onboarding-status` returns it; the client smooths the 2s chunks with a catch-up typewriter so it reads as a continuous stream. No SSE infra; durable across refresh, consistent with the fire-and-forget execute design.

## Steps

1. **Refactor (visual no-op)**
   - `competitive-analysis-v2.ts`: export `extractSectionsByHeading`, `resolveCompetitiveAnalysisSectionName`.
   - `competitive-analysis-document.tsx`: extract exported `COMPETITIVE_DETAIL_SECTION_CONFIGS`; `CompetitiveDetailSection` maps over it. Export `CompetitiveOverviewBody` (proposed-name + exec summary cards from structured data) and `WorkspaceDesignedSection`.
2. **Streaming parse lib** `src/lib/competitive-analysis-streaming.ts` + tests
   - `parseStreamingCompetitiveAnalysis(content, { finished })` → ordered sections with `complete` flags (last section incomplete unless finished).
   - `getSafeStreamTail(text)` → `{ visibleText, buffering }` withholding rules above.
3. **Streaming preview component** `src/components/analysis/competitive-streaming-document.tsx`
   - Props: `content`, `finished`, `variant` (`block-commit` | `skeleton` | `ticker`), `projectName`.
   - Variant A: committed sections + streamed tail. Variant B: full 12-section skeleton up front (from `COMPETITIVE_ANALYSIS_V2_SECTION_ORDER`), sections fill in place. Variant C: no prose streaming; mono ticker of pipeline/parse events; sections snap in whole.
   - `useSmoothedStream(target)` hook: displayed text catches up to target word-by-word (shared by lab simulation and real 2s-poll smoothing).
4. **Motion Lab** (`src/lib/motion-lab.ts`, `src/app/dev/motion-lab/page.tsx`, `src/components/dev/motion-lab-client.tsx`)
   - Gated by `isDevOnlyFeatureEnabled()`. Variant tabs, replay, speed, delivery mode (smooth token stream vs 2s poll chunks) simulated from `LANDING_SAMPLE_CONTENT.competitive.content`. Real `AnchorNav` rail alongside with display states driven by stream progress.
5. **Backend streaming (onboarding)**
   - Migration: `alter table generation_queue_items add column partial_content text`.
   - `generateProjectDocument()`: accept optional `onToken`; thread to `runCompetitiveAnalysis` (competitive only for now).
   - Execute route: throttled partial writes (~1.5s) while generating; clear on terminal state.
   - `onboarding-status`: include `streamingPreview: { docType: "competitive", content }` while the competitive item is generating.
   - `IdeaIntakeWizard`/`IntakeSubmissionLoadingPanel`: render `CompetitiveStreamingDocument` (variant A) beneath the progress rows once partial content arrives.
6. **Verify**: unit tests, lint, typecheck, browser check of `/dev/motion-lab`; onboarding path verified with unit tests around status mapping + manual run note.

## Risks / notes

- Partial writes add ~1 small DB update per 1.5s per generating competitive item: negligible.
- `partial_content` is user-readable via existing queue-item RLS (same user's own data).
- If the migration is not applied, executor catches the update error and skips partial writes (feature degrades to current behavior).
- Prompt Lab competitive preview passes `metadata={null}`, which forces the markdown fallback path (`document_version` check fails); Motion Lab passes the sample metadata so designed modules render. Possible existing Prompt Lab bug, out of scope here.
