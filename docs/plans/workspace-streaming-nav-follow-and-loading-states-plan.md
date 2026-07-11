---
title: Workspace streaming coverage, nav follow, and honest loading states
date: 2026-07-10
implemented: true
implemented_at: 2026-07-11T01:05:00Z
implementation_summary: >
  All six items landed: AnchorNav scroll-follow with a two-row edge buffer;
  "Writing" chip removed from streaming headers; Product Plan and First
  Version Plan live-fill streaming (executor partial writes, generalized
  streamingPreview, per-docType store previews, PlanningStreamingDocument
  over the exported current-format renderers); mockup generating state
  restored to the MockupGenerationLoader WebGL surface with no Option
  A/B/C placeholder cells; AI Prompts renders queued non-interactive file
  card placeholders while source plans generate. Verified with 464 passing
  tests, clean tsc/build, and three fresh Idea 1.1 intake projects with
  screenshot evidence under ui-evidence/2026-07-10/workspace-streaming-round/
  (see the companion review artifact).
---

# Workspace streaming coverage, nav follow, and honest loading states

## Goal

Six workspace feedback items from the 2026-07-10 review round:

1. **Left nav does not follow scroll.** The active subsection in `AnchorNav` must always stay in view while the user scrolls the right-side document pane, and the rail should start scrolling early, about two subsections before the active one would touch the rail's top or bottom edge, so the active row never sits against the viewport/header border.
2. **Remove the "Writing" status word** shown next to streaming subsection headings, plus any writing-vs-not status plumbing. The user can see writing finish on their own.
3. **Streaming was only implemented for Executive Summary / Market Research.** Product Plan and First Version Plan must also live-stream into their designed blocks during onboarding generation. (AI Prompts is derived, it gets its own loading treatment in item 5.)
4. **Design Mockups generating state shows new "Option A/B/C generating" cells.** Remove them and use the existing WebGL loading surface (`MockupGenerationLoader`, img-fx) that the workspace already ships for mockup generation. Recovered draft images that already exist should still render.
5. **AI Prompts files need honest loading containers.** All expected file cards (first prompt, build steps, functional requirements, user stories & acceptance criteria, technical considerations, sub-agents, project context) should render their containers up front while the source plans generate: non-interactive, with a queued/skeleton loading state, becoming real interactive cards once fully written.
6. Concept image loading animation while queued: acknowledged as acceptable ("they could"), covered by item 4's loader treatment; no separate work.

## Assumptions

- `generation_queue_items.partial_content` (migration `20260709000000`) is a per-item column, so no schema change is needed to stream Product Plan / First Version Plan partials; only the writer gating and read paths are competitive-only today.
- `runPRD` / `runMVPPlan` already accept `StreamCallbacks.onToken` (verified in `src/lib/analysis-pipelines.ts`), so streaming is plumbing, not pipeline work.
- Only one of competitive/prd/mvp generates at a time (dependency chain), so a single `streamingPreview { docType, content }` payload per poll remains sufficient; the client store keys retained previews by docType.

## Clarifying questions and Recommendation A/B choices

**Q1. How should the PRD/MVP streaming renderer reuse the saved-document design blocks?**
- **A (selected):** Feed "committed markdown" (complete H2 sections plus the sanitized still-growing section) directly into the exported current-format renderers (`CurrentPrdDocumentBlocks`, `CurrentMvpPlanDocumentBlocks`), bypassing the legacy-format gate, and append titled skeleton sections for expected contract sections that have not arrived yet. Zero drift: streaming uses the exact production blocks.
- B: Refactor both plan renderers into config arrays like `COMPETITIVE_DETAIL_SECTION_CONFIGS`. Cleaner long-term but a large, risky refactor of two 1000+ line files in the same round as behavior changes. Deferred (see Architecture Improvement Opportunities).
- Trade-off accepted for A: the visible section counter ("02 / 05") grows as sections arrive during streaming instead of being fixed up front; skeleton titles below make the remaining work visible anyway.

**Q2. Where do the AI Prompts placeholders get their state from?**
- **A (selected):** Keep AI Prompts derived from saved documents. While the Product Plan / First Version Plan are queued or generating, render every expected file card as a non-interactive skeleton card with a mono "Queued" label; swap each card to the real interactive card when its source section exists. No new writing-status machinery (consistent with item 2).
- B: Feed the live PRD/MVP streams into the file builder so files appear mid-stream. More motion but adds a second consumer of partial content with truncation risk; rejected for this round.

**Q3. Mockup generating layout?**
- **A (selected):** While the mockups item generates: status header plus the `MockupGenerationLoader` WebGL surface. Draft options that already have stored images render as real concept cards above the loader; no placeholder slots and no per-option "generating" rows. Per-option status rows return only when at least one option needs retry (actionable state).
- B: Keep per-option rows but restyle. Rejected: the user explicitly wants the old loader experience back.

**Q4. Nav follow mechanics?**
- **A (selected):** Effect inside `AnchorNav` watching `activeSectionId`; scrolls the rail (vertical on desktop, horizontal fallback to the parent tab on small screens where sub-tabs are hidden) so the active row keeps a margin of two subsection heights from either edge. Follow is suppressed for ~1s after a rail click so it cannot fight the existing click-position-restore timers. Respects `prefers-reduced-motion`.
- B: `scrollIntoView({ block: "nearest" })`. Rejected: no early-margin control and it fights the click-restore logic.

## Implementation phases

### Phase 1 — Nav follow (item 1)
- `src/components/layout/anchor-nav.tsx`: internal nav ref merged with the forwarded ref; `useEffect` on `activeSectionId` computes the active `[data-nav-target]` row rect vs the rail rect and scrolls by the delta needed to restore a 2-row margin; suppression timestamp set from `handleNavClick` via a callback prop threaded to `AnchorNavTab`.

### Phase 2 — Remove "Writing" chip (item 2)
- `src/components/analysis/competitive-streaming-document.tsx`: drop `StreamStatusLabel` from `StreamingSectionHeader` (delete the `status` prop) and from the live-fill overview branch. Keep the pre-first-heading "Starting market research" chip (different affordance: nothing else is on screen yet).

### Phase 3 — PRD/MVP live streaming (item 3)
- `src/app/api/generate-all/execute/route.ts`: create the partial-content writer for `competitive | prd | mvp`.
- `src/lib/document-generation-service.ts`: thread `onPartialContent` into `runPRD` and `runMVPPlan` exactly like `runCompetitiveAnalysis`.
- `src/app/api/generate-all/status/route.ts` + `src/app/api/projects/[id]/onboarding-status/route.ts`: `streamingPreview` now reports whichever of the three text items is generating with partial content.
- `src/stores/generate-all-store.ts`: replace `streamingPreviewContent: string | null` with `streamingPreviews: Partial<Record<"competitive" | "prd" | "mvp", string>>`, longest-content-wins per docType, retained after completion to bridge to the saved-document load.
- `src/components/workspace/use-generate-all-hydration.ts` + `project-workspace.tsx`: three `useSmoothedStream` instances; per-doc streaming content computed with the same no-saved-content + generating/ready gate; passed to `ScrollableContent` as a `streamingContents` map (replaces the single `competitiveStreamingContent` prop).
- New `src/lib/planning-document-streaming.ts`: lenient H2 splitter shared shape with the competitive streaming parser; exports committed-markdown builder (complete sections + sanitized tail) and present-heading info.
- New `src/components/analysis/planning-streaming-document.tsx`: renders the exported current-format block renderers with committed markdown and appends skeleton sections for expected-but-missing contract sections. Expected-section lists (title + aliases) exported from `product-plan-blocks.tsx` / `first-version-plan-blocks.tsx` so the contract lives beside the renderer.
- `src/components/layout/scrollable-content.tsx`: `renderStatus` for `prd` and `mvp` prefers the streaming document when stream content exists.

### Phase 4 — Mockup loader (item 4)
- `src/components/layout/scrollable-content.tsx` (`MockupProgressModule` + `GenerationStatusModule`): WebGL loader during generating; option-status rows only when an option needs retry; draft renderer only for options that already have images (labels derived from present options, no empty slots).

### Phase 5 — AI Prompts placeholders (item 5)
- `src/components/analysis/ai-prompt-files.tsx`: export the expected-file descriptor list; `AiPromptFileGrid` accepts placeholder descriptors rendered as non-interactive skeleton cards ("Queued" mono label, pulse bars, no click/copy/download).
- `src/components/analysis/first-version-plan-blocks.tsx` (`AiPromptsDocumentBlocks`): while sources are unsettled, render masthead + sections with available real cards + placeholders for missing expected files (and a recommended-tool placeholder). Terminal incomplete keeps today's notice without placeholders.
- `src/components/layout/scrollable-content.tsx`: AI Prompts section renders its content (with placeholders) whenever the PRD/MVP pipeline is active, not only once readiness leaves "waiting".

### Phase 6 — Tests and verification
- Unit tests: new parser tests (`planning-document-streaming`), placeholder-grid rendering, updated `scrollable-content` / `anchor-nav` tests if they assert removed UI.
- `npm run lint`, targeted `tsc`/build, full test run.
- Real-UI: fresh Idea 1.1 intake project; observe PRD/MVP streaming, mockup loader, AI Prompts placeholders, nav follow; evidence under `ui-evidence/2026-07-10/workspace-streaming-round/`; review artifact in `docs/plans/`.

## Test strategy

- Node test runner (`tsx`) unit tests for the new lenient planning stream parser (section completion on next H2, sanitized tail, finished flag).
- Component tests where the repo already has them (scrollable-content, anchor-nav) updated for the new props/DOM.
- Manual real-flow QA through the intake wizard per the standardized Idea 1.1 test case; screenshot/video evidence saved and referenced in the review artifact.

## Rollback / recovery

- All changes are client/render or additive streaming plumbing; no schema change. Rolling back is reverting the commit.
- The partial-content writer stays failure-isolated: any write error disables partial writes for that run without affecting generation.
- If PRD/MVP streaming misbehaves in production, the safe kill switch is reverting the two-line docType gate in the execute route (writer creation) — status routes and the client degrade gracefully to the existing generating placeholders when `partial_content` is absent.

## Architecture Improvement Opportunities

| Opportunity | Benefit | Trade-off | Files/boundaries | Decision |
|---|---|---|---|---|
| Generic H2 stream parser shared by competitive + planning docs | One lenient block-commit contract, no drift | Touches proven competitive parser | `src/lib/planning-document-streaming.ts` (new), `competitive-analysis-streaming.ts` | **Selected** (new module generalizes; competitive parser left untouched this round to limit blast radius) |
| Config-array refactor of PRD/MVP renderers (like `COMPETITIVE_DETAIL_SECTION_CONFIGS`) | True per-section streaming parity incl. stable numbering | Large refactor of 2 big files in a behavior round | `product-plan-blocks.tsx`, `first-version-plan-blocks.tsx` | Deferred (revisit when next touching these renderers) |
| Per-docType streaming previews in store | Removes single-slot preview coupling; ready for parallel streams | Slightly larger client state | `generate-all-store.ts` | **Selected** |
| Expected-file descriptor as single source for AI Prompts cards + readiness | Placeholders, readiness, and builders cannot drift | Small indirection | `ai-prompt-files.tsx`, `ai-prompts-readiness.ts` | **Selected** (descriptors keyed by the existing `AiPromptRequirementKey`) |
| Streaming-fed AI Prompts files (mid-stream file availability) | Earlier file access | Second partial-content consumer, truncation risk | same | Rejected as over-engineering for now |

## Candid critique

- **Architecture:** Feeding committed markdown through the saved renderers is pragmatic and zero-drift, but it leans on those renderers being tolerant of missing sections; the deferred config refactor is the real fix for numbering stability.
- **Product:** Growing section counters during streaming are slightly less polished than the competitive treatment; acceptable because skeleton titles communicate the remaining work.
- **Customer:** The biggest UX win is items 1 and 3; users watching onboarding no longer stare at static skeletons for the two longest documents.
- **Engineering:** The store shape change (`streamingPreviews` map) touches hydrate/poll paths; tests must cover the longest-wins-per-docType rule to avoid rewind flicker.
- **Risk/security:** No new trust boundaries; partial content stays user-scoped through existing ownership-filtered queue reads. Streaming writes remain throttled (~1.5s) and failure-isolated.
