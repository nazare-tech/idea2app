---
title: Review — workspace streaming coverage, nav follow, and honest loading states
date: 2026-07-10
plan: workspace-streaming-nav-follow-and-loading-states-plan.md
status: verified
---

# Review: workspace streaming coverage, nav follow, and honest loading states

## Verification run

- `npm test`: 464/464 pass (includes new `planning-document-streaming.test.ts`, `planning-streaming-document.test.tsx`, and the updated AI Prompts placeholder assertions).
- `npx tsc --noEmit`: clean.
- `npm run build`: clean (webpack/vendor regression guard passed).
- `npm run lint`: 1 pre-existing error in `src/components/layout/workspace-document-frame.tsx` (`react-hooks/set-state-in-effect`) and 1 pre-existing warning in `output/playwright/prod-full-flow.mjs`; neither file was touched by this change.

## Real-UI verification (fresh projects, Idea 1.1)

Automation: `output/playwright/local-streaming-qa.mjs` (headless Chromium against the real local dev server on :3000, e2e credentials read from `.env.e2e.local` inside the script). Three fresh projects were created through the real intake wizard; evidence under `ui-evidence/2026-07-10/workspace-streaming-round/` (run 1 at the root, then `run2/`, `run3/`).

- **Run 1 — "Signal To Roadmap"** (`/projects/f7266665-...-signal-to-roadmap`, 1440x900 → 1280x720 for the nav test): nav-follow and mockup-loader evidence. A status-parsing bug in the QA script (not the app) skipped the text-document streaming captures; fixed for run 2.
- **Run 2 — "Signal Map Roadmap Intelligence"** (`/projects/429123f4-...-signal-map-roadmap-intelligence`): full streaming evidence for Market Research and Product Plan, AI Prompts placeholders, mockup loader, nav follow.
- **Run 3 — "Signal To Roadmap"** (`/projects/714ad0ac-...-signal-to-roadmap`): full pass with fixed QA-script measurement. Checks: `marketResearchNoWritingChip: true`, `aiPromptsQueuedPlaceholders: true`, `prdStreamRendered: true`, `mvpNoWritingChip: true`, `mockupWebglLoaderShown: true`, `mockupNoOptionGeneratingCells: true`, `navScrolled: true`, `navActiveAlwaysInView: true`. The scripted `05-mvp-streaming.png` fired at the moment the First Version Plan flipped to Generating, before the first partial poll arrived, so it captured the expected generic generating fallback (`mvpStreamRendered: false` is that timing artifact, not an app defect); the follow-up capture `05b-mvp-streaming-late.png` (via `output/playwright/mvp-late-capture.mjs`) shows the live-fill state: MVP Summary designed block filled with streamed prose, Target User & Problem / The Bet as titled skeletons, nav First Version Plan GENERATING with the MVP Summary anchor live, and no "Writing" chip (`noWritingChip: true` in its log output).

### Item-by-item results

1. **Nav follows active subsection with 2-row edge buffer** — verified. `qa-report.json` nav-follow samples: rail `scrollTop` advanced 0 → 618 as the content pane scrolled through 12 positions; the active row stayed in view at every sample and was held ~63px (two rows) clear of the bottom edge, clamping only at the rail's scroll end (`navScrolled: true`, `navActiveAlwaysInView: true`). Screenshots `08/09/10-nav-follow-*.png`.
2. **"Writing" chip removed** — verified. Streaming section headers render title + counter only (`01/02/03/05-*.png`); `marketResearchNoWritingChip: true`, `mvpNoWritingChip` in run 3.
3. **Product Plan / First Version Plan streaming** — verified. `run2/02-prd-streaming-early.png` shows the Product Plan masthead with titled skeleton sections from the first token; `run2/03-prd-streaming-late.png` shows real streamed prose inside the designed Introduction & Overview block ("01 / 05" counter) with arrived subsection anchors already live in the nav rail (`prdStreamRendered: true`). First Version Plan equivalent: `run3/05b-mvp-streaming-late.png`. Known cosmetic gap observed in run 3: when the active section's H2 has arrived but its body has no parseable rows yet, that section briefly renders neither block nor skeleton (its heading removes it from the upcoming list) until content parses seconds later; low-impact, noted for the deferred config refactor.
4. **Mockups loading (corrected 2026-07-11)** — the first implementation collapsed the concept placeholders into one loader; user correction: keep the three Concept 1/2/3 placeholder cells (they mirror the nav rail's concept entries) and remove only the per-option status rows above them. Final behavior: `MockupProgressModule` always renders the A/B/C concept cells; each pending cell hosts the `MockupGenerationLoader` WebGL surface via the new `MockupRenderer` `pendingMedia` prop, arrived draft images render as real concept cards, and option status rows return only when an option needs retry. Verified live on a fifth fresh project (`run5/06b-mockup-concept-cells-with-loaders.png`): 3 concept cells, 3 per-cell loaders, no option rows, nav showing Design Mockups GENERATING with Concept 1/2/3 subsections (capture log: `conceptCells: 3, loaders: 3, optionRows: false, generating: true`). Headless Chromium has no WebGL so the loader used its `data-webgl-loader="fallback"` surface; the WebGL/fallback split is unchanged shipped behavior. The generalized rule (preserve structural placeholders that mirror navigation; strip only redundant status chrome) is recorded in `docs/plans/recommendation-selection-rules.md` (2026-07-10 entry).
   **Shader visibility follow-up (2026-07-11):** the user reported not seeing the WebGL shader inside the cells. Diagnosis in the user's real Chrome (via the extended `/dev/mockup-renderer-preview` lab section): the shader mounts and animates correctly per cell — the earlier evidence screenshot came from headless Chromium, which has no GPU and therefore shows the loader's designed static fallback; and during the long *queued* phase the cells showed the plain pulse skeleton because `pendingMedia` was gated to `generating` only. Fix: `MockupProgressModule` now passes the loader for `queued`, `waiting`, and `generating`, so the concept cells run the shader for the whole pre-image window. Live real-Chrome inspection confirmed `data-webgl-loader="enabled"`, one WebGL canvas pair per loader instance (4 instances mounted concurrently without context loss), and frame-over-frame mosaic movement. Note for future evidence: headless screenshots always show the fallback surface; shader claims need a headed/real-Chrome capture.
5. **AI Prompts queued placeholders** — verified. `run2/04-ai-prompts-queued-placeholders.png`: masthead + Recommended AI Build Tool "QUEUED" placeholder card + Prompt Files section with usage guide and non-interactive queued file cards while the Product Plan was generating; run 3 re-checked the text assertion post-scroll (`aiPromptsQueuedPlaceholders`). The run-2 `false` flag for this check was a QA-script measurement artifact (`innerText` of a `content-visibility`-contained offscreen section is empty); the screenshot shows the state directly.
6. **Concept-image queue animation** — covered by item 4's loader treatment, per the feedback ("that's fine, but they could").

## Code-review findings (self-review)

- Store shape change (`streamingPreviews` map) keeps the longest-content-wins rule per docType; hydrate and poll paths both merge through `mergeStreamingPreview`, so an out-of-order poll can never rewind a reveal.
- The partial-content writer stays failure-isolated and is created per item; `finish()` still clears partials at terminal states for all doc types (writer is docType-agnostic).
- `PlanningStreamingDocument` bypasses the legacy-format gate deliberately (early streams cannot pass it); the saved-document path through `PrdDocumentBlocks` / `MvpPlanDocumentBlocks` is unchanged, so legacy documents still get the markdown fallback.
- Nav follow is suppressed for 1s after rail clicks so it cannot fight the existing click-position-restore timers; landing `FeatureNavPreview` (which reuses `AnchorNavTab`) is unaffected because the new `onNavClick` prop is optional.
- Known cosmetic trade-off (accepted in plan Q1): the streaming section counter total grows as sections arrive instead of being fixed up front; titled skeletons communicate the remaining contract.

## Security review

No new trust boundaries. Partial content reads stay behind the existing user-scoped queue lookup (`generation_queues` filtered by `user_id`); writes stay service-role in the executor. No schema change; no client-writable authority fields introduced. `backend-change-history.md` updated with the payload-shape note and rollback path.

## Architecture improvement review

- Selected: generic lenient planning stream parser (`planning-document-streaming.ts`) — landed with unit tests.
- Selected: per-docType streaming previews in the store — landed.
- Selected: expected-file descriptors (`AI_PROMPT_FILE_PLACEHOLDERS`) shared by placeholders and real cards — landed; identities mirror `buildAiPromptFiles`.
- Deferred (unchanged): config-array refactor of the PRD/MVP renderers for fixed streaming numbering; revisit when next touching those renderers.
- No new duplication or non-idempotent paths observed during review; the QA script lives in `output/playwright/` alongside the existing flow scripts.

## Remediation status

None outstanding.
