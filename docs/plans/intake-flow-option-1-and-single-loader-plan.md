---
title: Intake Flow (Option 1) UI + single post-submit loader
status: implemented
implemented: true
implemented_at: 2026-07-11T00:00:00Z
created_at: 2026-07-11
owner: Claude Code
source_design: "Claude Design project 490c6f49-78c2-4d57-8a9f-042051f2fd7c, file 'Intake Flow (Option 1).dc.html'"
implementation_summary: >
  Reskinned /projects/new to Intake Flow Option 1 and replaced the six-row fake-progress
  submission loader with the single loader (rotating headline + red line + artifact
  marquee). Step 1 now shows three drifting example-idea rows (examples expanded 3 -> 12).
  Step 2 reveals skeleton question cards while generating, then staggers the real cards in
  with "Pick one"/"Pick a few" mode labels; errors render in-step with a Retry. The
  redirect-on-first-token flow (waitForFirstStreamedToken -> #executive-summary) is
  unchanged. Files: idea-intake-wizard.tsx, intake-submission-loading-panel.tsx (+test),
  lib/intake/examples.ts, globals.css (intake-marquee + intake-skeleton utils). Verified
  live through real Chrome for Step 1/Step 2/loader; tsc + lint clean; 51 unit tests pass.
  Full loader->workspace transition not captured live (connected account is Free-plan and
  cannot create a second project); that redirect path is unchanged.
---

# Intake Flow (Option 1) + Single Loader

## Goal

Reskin the new-project intake flow (`/projects/new`) to match the imported Claude
Design "Intake Flow (Option 1)" mock, and replace the current multi-row fake-progress
submission loader with Option 1's single loader (rotating headline messages + red
progress line + "what you're about to get" marquee). The redirect to the workspace
stays driven by the first streamed Market Research token (already implemented), so the
loader is a decorative hold that cuts to the project page the moment streaming starts.

This is a UI/flow change only. No backend, schema, auth, or generation-pipeline changes.

## Scope (files)

- `src/components/projects/idea-intake-wizard.tsx` — Step 1 (idea) + Step 2 (questions) restyle.
- `src/components/projects/intake-submission-loading-panel.tsx` — full rewrite to the single loader.
- `src/components/projects/intake-submission-loading-panel.test.tsx` — rewrite for new pure helpers.
- `src/lib/intake/examples.ts` — expand from 3 to 12 example ideas to feed the 3 marquee rows.
- (new) `src/lib/intake/loader-messages.ts` — messages + pure timing helpers (optional split for testability).

Blast radius is contained: `IntakeSubmissionLoadingPanel` and `INTAKE_EXAMPLE_IDEAS`
are each consumed only by the wizard.

## Current behavior (verified in code)

- `IdeaIntakeWizard` state machine: `step ∈ {"idea","questions"}`, plus `isCreatingProject`
  which swaps the whole view for `IntakeSubmissionLoadingPanel`.
- Step 1: card + `Textarea` + "Next"; below it a 2-col grid of 3 example cards.
- Step 2: real questions fetched from `POST /api/intake/questions` on "Next" (button shows
  "Generating questions"), then rendered as `QuestionCard`s with chip answers + "Other".
- Submit (`createProject`): `POST /api/projects/create-from-intake` → fire-and-forget
  `POST /api/generate-all/execute` → `waitForFirstStreamedToken(projectId)` (polls
  `GET /api/generate-all/status`, resolves on `streamingPreview.content` non-empty, on
  terminal queue status, on competitive item settling, or 60s deadline) → `router.push(redirectUrl)`.
- Current loader (`IntakeSubmissionLoadingPanel`): 6 rows (executive-summary, market-research,
  prd, mvp, mockups, ai-prompts), each a fake timed progress bar over
  `INTAKE_FAKE_PROGRESS_DURATION_MS = 40000` capped at `INTAKE_MAX_FAKE_PROGRESS = 90`.
  This is the "fake fixed-seconds loading showing executive summary / market research."

## Recommendation A/B decisions (A selected unless noted)

1. Step 1 example ideas presentation.
   - A (selected): Option 1 scrolling pill marquee — 3 rows, 12 ideas (4 per row, duplicated
     track for seamless loop), edge fade masks, `prefers-reduced-motion` → static flex-wrap.
   - B: keep the current 3-card grid.
   Trade-off: A matches the design and shows more idea breadth; costs a reduced-motion fallback
   and 9 more example strings. Chosen because it is the design's Step 1 identity.

2. Step 2 question loading.
   - A (selected): generation moves into Step 2. "Next" advances to Step 2 immediately, which
     shows shimmer skeleton question cards while `isGeneratingQuestions`, then reveals the real
     `QuestionCard`s (staggered fade-up). Subheading is "Reading your idea and writing questions
     worth answering..." while generating, final copy after. Errors render inside Step 2 with a
     Back-to-idea affordance and retry.
   - B: keep generate-then-show (spinner on the Next button), restyle Step 2 visuals only.
   Trade-off: A matches Option 1 and improves perceived speed but needs careful error/regeneration
   handling on the autostart (landing handoff) path. Chosen for design fidelity; guarded below.

3. Post-submit loader.
   - A (selected): rewrite `IntakeSubmissionLoadingPanel` (same name + render slot) to Option 1's
     single loader: "Creating your project" mono kicker, one large rotating message at a time
     (blinking red caret on the final "opening your workspace" line), a thin red progress line,
     and the "What you're about to get" marquee of artifact preview cards. Time-based message
     index clamps to the last message and holds until the first-token redirect fires. Reduced
     motion → static final-ish state (last message, full line, non-animated carousel).
   - B: keep the multi-row panel, restyle only.
   Trade-off: A is the explicit ask and reads as one confident loader instead of six fake bars.

4. Message cadence ("use whatever that fixed second is").
   - A (selected): keep the ~40s felt window. 6 messages at ~4s each (~24s), then hold the final
     message + caret + full red line until `waitForFirstStreamedToken` redirects (≤60s deadline).
   Exposed as `INTAKE_LOADER_MESSAGE_INTERVAL_MS` + `INTAKE_LOADER_MESSAGES` for testing.

## Implementation phases

Phase 1 — Data: expand `INTAKE_EXAMPLE_IDEAS` to 12 (titles/descriptions from the Option 1 mock).
Phase 2 — Loader: rewrite `IntakeSubmissionLoadingPanel` to the single loader with pure helpers
  (`getLoaderMessageIndex`, `getLoaderLineWidth`) + reduced-motion handling; rewrite its test.
Phase 3 — Step 1: replace the example grid with the 3-row marquee; keep textarea/Next, validation
  hint, keyboard submit, pending-idea spinner, autostart. Add `mc-marquee`/reduced-motion CSS to
  `globals.css` (or scoped styles).
Phase 4 — Step 2: skeleton-reveal question loading + restyled cards ("Pick one"/"Pick a few" mono
  mode label, fade-up reveal), Step-2 error + Back/retry, subheading swap.
Phase 5 — Verify through the real UI (fresh project via Idea 1.1), capture `ui-evidence/`.
Phase 6 — Review + typecheck/lint/tests; write review artifact.

## Test strategy

- Unit (node:test): loader pure helpers (message index clamps to last; line width monotonic and
  capped at 100%; reduced-motion returns final state). Keep validation/keyboard-submit tests green.
- Real-flow UI: create a project with Idea 1.1 on the local dev server signed in via `.env.e2e.local`;
  screenshot Step 1 (marquee), Step 2 (skeleton → revealed), and the loader; confirm the loader
  cuts to `#executive-summary` when the first token streams. Capture reduced-motion state.
- `npx tsc --noEmit` + `npm run lint` + `node --test` on touched files.

## Rollback / recovery

Pure client UI change, no data migration. Revert the 4 touched files to restore the prior flow.
The redirect + generation contract (`create-from-intake`, `generate-all/execute`, `generate-all/status`)
is untouched, so a UI revert cannot strand generation.

## Architecture Improvement Opportunities

- Extract loader messages + timing into `src/lib/intake/loader-messages.ts` (pure, testable, reused
  by any future motion-lab preview). Selected.
- Share the marquee row as a tiny presentational helper rather than 3 copy-pasted blocks. Selected
  (internal component in the wizard file; not worth a shared module yet).
- Reduced-motion helper: reuse existing `--motion-ease-out-expo` token and a single
  `prefers-reduced-motion` guard rather than per-element JS. Selected.
- Deferred: turning the "what you're about to get" cards into real per-artifact status once the
  workspace already streams — over-engineering for this task; the loader is intentionally decorative
  and short-lived (redirect fires on first token). Deferred/rejected for now.

## Runtime & Change-Impact Analysis

- AI generation / streaming: unchanged. Loader still redirects on first `streamingPreview.content`.
- Polling: unchanged (`waitForFirstStreamedToken` logic untouched).
- Shared client state: `isCreatingProject`, `step`, `questionSet`, `answers` semantics preserved;
  Step 2 now also renders during `isGeneratingQuestions`.
- Client-server payloads: unchanged (`create-from-intake` body identical).
- Real-flow verification: mandatory fresh-project run per repo rules.
- Reduced motion: all new marquees/animations gated; static fallback required by DESIGN.

## Product Analytics Taxonomy

No new event warranted: intake impression/creation events (if any) already fire in the unchanged
`create-from-intake` path. This is a presentational reskin of existing steps; no new intentional
action, reach, or trusted transition is introduced. Recorded per repo requirement.

## Candid critique

- Architecture: low risk, contained. Only concern is CSS keyframes placement; keep marquee/caret
  keyframes in `globals.css` next to existing motion utilities to avoid style duplication.
- Product: the single loader better matches "show the work, don't sell it" than six fake bars; the
  marquee adds idea inspiration. Watch One Voice Rule (red only on line/caret/focus).
- Customer: skeleton reveal on Step 2 improves perceived speed; must not trap the user on error.
- Engineering: rewriting the loader test is required (old exports removed). Autostart path must be
  re-verified because generation now runs while on Step 2.
- Risk/Security: none. No auth/RLS/payload/secret surface touched.
