---
implemented: true
implemented_at: 2026-07-05
implementation_summary: >-
  Competitor names without a verified URL now link to a web search fallback;
  the Positioning Map shows a one-time "How to read the scores" legend
  (parsePositioningAxis in competitive-analysis-v2.ts) with short axis names on
  bars; the Executive Summary shows a Proposed Name card fed by projectName
  threaded through ScrollableContent; prompt files renamed to first-prompt.md
  and build-steps.md with a "How to use these files" guide; the AI Prompts
  masthead tooltip was removed; First Version Plan masthead/section headings
  now match the Product Plan scale. Verified with the full test suite (398
  passing), tsc, eslint, and a server-render check against the real
  Influencer Growth Loop AI document (browser session unavailable: user-owned
  dev server on port 3000 and Chrome extension disconnected).
---

# Workspace Feedback Round: Competitor Links, Positioning Legend, Prompt File Clarity, Heading Sizes

## Goal

Address a round of workspace feedback found while reviewing the "Influencer Growth Loop AI" project:

1. Competitor rows without a verified website URL (TubeBuddy) render no external link.
2. The Positioning Map repeats the full axis legend ("0 = fully manual…, 10 = fully autonomous…") on every competitor's score bars.
3. The Executive Summary never surfaces the AI-generated project name as the proposed name.
4. `next-prompt.md` and `ai-friendly-build-sequence.md` are not self-explanatory; the `project-context.md` description says "CLAUDE.md-style" but should say CLAUDE.md / AGENTS.md.
5. Nothing tells the user what to do with the downloaded prompt files (folder setup, first paste).
6. The AI Prompts masthead has a tooltip that duplicates its subheading.
7. First Version Plan masthead and section headings are much larger than Product Plan / AI Prompts; Product Plan sizes are the reference.

Out of scope (recommendation only, no change): renaming the "AI Prompts" section heading. The user asked for suggestions to choose from.

## Assumptions

- The TubeBuddy gap is a data gap (generated markdown has `### TubeBuddy` with no link and no Website field), not a parser bug: `parseCompetitorProfiles` correctly found no URL. Verified against the saved document in Supabase.
- The positioning axis format in current documents is `**X-Axis: Name** (0 = Low label, 10 = High label)`. The older `where 0 means … and 10 means …` phrasing may still appear in other documents and must keep working.
- Nav anchors for individual prompt-file cards are not referenced in `document-sections.ts` (only `ai-prompts-recommended-build-tool` and `ai-prompts-files` are), so file card anchor ids can change safely alongside file names.

## Clarifying Questions

### Q1: How should competitors without a verified URL get an external link?

- **A (selected): Renderer fallback to a web search link.** When `websiteUrl` is null, link the competitor name to `https://www.google.com/search?q=<name>`. Honest (no fabricated official URL, consistent with the "no fake URLs" prompt rule), fixes every existing document without regeneration or DB edits.
- **B: Prompt change to always emit official URLs.** Requires a new prompt version, only fixes future documents, and risks hallucinated URLs for obscure companies.
- Trade-off: A sends the user to a search page rather than the official site; B is "purer" but doesn't fix the document the user is looking at. **Selected: A.**

### Q2: Keep, merge, or delete `next-prompt.md` and `ai-friendly-build-sequence.md`?

- **A (selected): Keep both, rename for clarity.** `next-prompt.md` → `first-prompt.md` ("Your First Prompt": the message you paste first), `ai-friendly-build-sequence.md` → `build-steps.md` ("Build Steps": ordered chunks you feed the tool one at a time). They serve different moments: one is pasted once to start; the other is an ongoing checklist referenced by `project-context.md`'s working rules.
- **B: Merge the build sequence into the first prompt.** Makes the kickoff paste huge and buries the step list the working rules tell the agent to follow chunk-by-chunk.
- Trade-off: renaming touches tests and PROJECT_CONTEXT.md; merging degrades both artifacts. **Selected: A.**

### Q3: Where does "what to do with these files" guidance live?

- **A (selected): Static "How to use these files" steps at the top of the Prompt Files section.** Content is generic per-project, so it belongs in UI, not in a generated file that costs tokens.
- **B: Generate a README.md card.** Another file to explain the files; adds noise to the download set.
- **Selected: A.**

## Architecture Improvement Opportunities

- `positioningBarLabel` currently mixes parsing and display. Extracting a `parsePositioningAxis` helper into `competitive-analysis-v2.ts` keeps parsing in the lib (testable) and display in the component.
- `FvpSection` and `AiPromptsSection` become visually identical after the size fix; they stay separate components for now (different ids/props usage), noted as a future consolidation.

## Plan

### Phase 1: Data-driven fixes (competitive analysis)

1. `src/lib/competitive-analysis-v2.ts`
   - Add `parsePositioningAxis(axis)` returning `{ name, lowLabel, highLabel }`, supporting both `Name (0 = low, 10 = high)` and `… where 0 means low and 10 means high` formats; export for tests.
2. `src/components/analysis/competitive-analysis-document.tsx`
   - `FastComparisonTable`: when `websiteUrl` is null, fall back to a search URL for the competitor name (same link treatment).
   - `PositioningMap`: render a one-time legend block at the top of the card (axis name + "0 = low · 10 = high" per axis) before the first competitor row; score bars use only the short axis name.
   - `CompetitiveOverviewSection` / `ExecutiveSummaryCard` area: render "Proposed Name" + project name above the summary card.
3. `src/components/layout/scrollable-content.tsx` + `src/components/workspace/project-workspace.tsx`: thread `projectName` into `ScrollableContent` → `CompetitiveOverviewSection`.

### Phase 2: AI Prompts clarity

4. `src/components/analysis/ai-prompt-files.tsx`
   - Rename `next-prompt.md` → `first-prompt.md`, title "Your First Prompt", description "The first message to paste into your AI build tool. Start here."; anchor `ai-prompts-first-prompt`.
   - Rename `ai-friendly-build-sequence.md` → `build-steps.md`, title "Build Steps", description clarifying "one chunk at a time, after the first prompt"; anchor `ai-prompts-build-steps`.
   - Update `project-context.md` description to "Starter CLAUDE.md / AGENTS.md context file to drop into your repo root." and update the working-rules reference to `build-steps.md`.
5. `src/components/analysis/first-version-plan-blocks.tsx`
   - Remove the `ExplainTermButton` from `AiPromptsMasthead` (subheading already explains the section).
   - Add a "How to use these files" numbered steps block at the top of the Prompt Files section (download into a new folder, open your AI tool there, save project-context as CLAUDE.md/AGENTS.md, paste first-prompt, work through build-steps).

### Phase 3: First Version Plan heading sizes

6. `FvpMasthead`: `text-[42px] sm:text-[56px] lg:text-[68px]` → the Product Plan / AI Prompts masthead scale (`text-[36px] md:text-[44px]`).
7. `FvpSection` h2: `text-[30px] sm:text-[40px] font-extrabold` → the shared `text-[22px] font-bold tracking-[-0.03em]` style used by Product Plan and AI Prompts sections.

### Phase 4: Tests + docs

8. Update `first-version-plan-blocks.test.tsx` (file names, anchors), add `parsePositioningAxis` tests, and update any competitive-analysis document tests touched by legend/link markup.
9. Update `PROJECT_CONTEXT.md` (file names in the AI Prompts section description).
10. Verify in the running dev server against the Influencer Growth Loop AI project; screenshot proof.

## Milestones

- M1: Phase 1 done, unit tests pass.
- M2: Phases 2-3 done, tests updated and passing.
- M3: Browser-verified on the live project; PROJECT_CONTEXT.md and plan metadata updated.

## Validation

- `npm test` (Node test runner globs) and `npx tsc --noEmit` / lint.
- Browser: TubeBuddy row shows an external link; positioning legend appears once above all competitors; Executive Summary shows the proposed name; prompt file cards show new names + how-to steps; no tooltip beside AI Prompts; FVP headings match Product Plan sizes.

## Risks

- Renaming files breaks users' muscle memory from earlier downloads (low: filenames are per-download artifacts).
- Legend parser must not regress documents using the older "where 0 means…" phrasing — covered by keeping the old regex path and tests for both.
- Search-link fallback could look like an official link; mitigated by it being the same affordance the user asked for (an external way to reach the competitor).

## Rollback

All changes are client-render/lib-level; revert the commit. No DB or prompt-version changes.

## Open Decisions

- New name for the "AI Prompts" section heading — recommendations delivered to the user; awaiting their pick.

## Critique (five perspectives)

- **Product:** How-to steps + renamed files directly answer "then what?"; the proposed-name line reinforces the naming value the wizard already paid for.
- **Design:** Sizes converge on the Product Plan scale, removing the loudest inconsistency; the legend extraction removes repeated noise, in line with "restraint" and "show the work."
- **Engineering:** Parsing stays in `competitive-analysis-v2.ts`; component changes are local; no schema/prompt version bumps.
- **QA:** Both axis formats and the no-URL competitor path get unit coverage; browser verification on real data.
- **Security/Privacy:** Search fallback URL is built with `encodeURIComponent`; no new external calls or data exposure.
