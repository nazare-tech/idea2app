# NAZ-118 / NAZ-120 Follow-up Fixes Plan

status: implemented (2026-07-09, verified in Chrome against the Signal Roadmap project)
date: 2026-07-09

## Reported symptoms (post-fix walkthrough)

1. Product Plan "Team & Milestones" appears in the left rail; owner thought the subsection was removed.
2. Clicking "Team & Milestones" in the rail, then scrolling up, jumps the viewport into Market Research "Best Customer Segments".
3. Latest project's AI Prompts row shows a Retry button and one prompt file is missing.

## Diagnosis

- Symptom 1 is intended behavior: the NAZ-120 contract renders Team & Milestones as Product Plan section 3 (orientation-first order). Not a bug.
- Symptom 3, part 1 (missing files, verified against production data with a read-only script):
  - `sub-agents.md`: the model nests `#### Agents` (H4) under `### 3.4 Milestones`, but `ai-prompts-readiness.ts` and `ai-prompt-files.tsx` only look for an H3 `Agents` heading inside Team and Milestones. Both latest projects show this nesting.
  - `first-prompt.md` (Signal Roadmap project): the saved First Version Plan is truncated mid-table; generation hit the 16,384 `max_tokens` cap and the last two contract sections (Validation Plan, Next Prompt) were never written. Nothing detects `finish_reason: "length"`, so the truncated document was saved as a success.
- Symptom 3, part 2 (Retry button): AI Prompts readiness `incomplete` maps to `needs_retry`, and `AnchorNavTab` renders a Retry action for any `needs_retry` item. Clicking it calls `onGenerateDocument("mvp")`, which the active-document guard turns into a skipped no-op. AI Prompts is derived and has no queue item; a Retry action is misleading (NAZ-118 acceptance: no implied queue item).
- Symptom 2: suspected `content-visibility: auto` containment jump. When the active document changes to Product Plan, the Market Research frame above regains containment with a 2,600px estimate while its real height is much larger; scrolling back up expands it and the viewport lands mid Market Research. To verify in the browser, then fix by recording the frame's actual height when containment is re-applied.

## Fixes

- F1: Parse the Agents list at H3 or H4 inside Team and Milestones in `ai-prompts-readiness.ts` and `ai-prompt-files.tsx`. Tests for the H4 nesting.
- F2: Detect `finish_reason === "length"` in `analysis-pipelines.ts` and fail the generation (retryable) instead of saving a truncated planning document. Raise `FIRST_VERSION_PLAN_MAX_TOKENS` to 24,576.
- F3: Mark the AI Prompts nav item as derived; derived items never render Generate/Retry actions and show an "Incomplete" status label instead.
- F4: Fix the containment scroll jump by remembering each frame's last rendered height and using it as `contain-intrinsic-size` when containment is re-applied (after browser verification of the repro).

## Outcome

- Repro confirmed in Chrome before the fix: clicking Team & Milestones then scrolling up jumped the viewport to the top of Executive Summary.
- F1-F4 implemented. After the fix, scrolling up from Team & Milestones lands in Goals; the AI Prompts rail row shows "Incomplete" with no Retry button; sub-agents.md assembles from the H4 Agents list on the Signal Roadmap project.
- first-prompt.md on the Signal Roadmap project stays missing because the saved First Version Plan is genuinely truncated; regenerating that document is an owner decision (delete + regenerate, or accept).
- A related first-pass jump remains possible the very first time an un-rendered document expands during scroll (static estimate replaced by real height); the ResizeObserver makes it self-correct after each document has rendered once.

## Non-goals

- No regeneration of existing truncated documents (owner action).
- No Team & Milestones renderer redesign.
