---
implemented: true
implemented_at: 2026-07-19T02:37:21Z
implementation_summary: Every non-platform intake choice question now offers UI-owned "Decide for me" and "Other" escape hatches end to end (state, prompt, parser, server validation, summary/AI context, analytics counts); verified with 654-test suite and real-UI Playwright evidence, review artifact at docs/plans/intake-decide-for-me-other-review.md.
---

# Plan: Intake Wizard "Decide for me" + Universal "Other" Answers

## Goal
Every AI-generated intake question (single and multiple choice) offers two standing escape hatches like Claude Code's AskUserQuestion UI: a "Decide for me" chip that delegates the choice to the AI, and an "Other" chip with free text. Existing chip UI and visual system stay unchanged; only the answer functionality grows. The required platform question keeps its explicit single choice.

## Assumptions
- Keep the current chip UI (white cards, invert-on-select chips, checkbox chips for multi). No visual redesign.
- "Decide for me" means the downstream AI docs (Product Plan, First Version Plan, research) choose; the intake answer records the delegation, and the summary/AI context text says so explicitly.
- The required platform question (`primary-platform`) is exempt: backend validation and build-tool recommendation need an explicit platform.
- `allowOther` stays in the question schema (storage compat) but no longer gates the UI; the UI offers Other on every non-platform choice question.
- Monolith Next.js deploy: client and server ship atomically, no mixed-version window beyond already-open tabs (old tabs send payloads the new server still accepts).

## Clarifying Questions
1. Should "Other" and "Decide for me" appear on every choice question or only where the model sets `allowOther`?
   - Recommendation A: Universal on all non-platform choice questions, enforced client-side; server accepts `otherText`/`decideForMe` for any non-platform question. Matches the referenced AskUserQuestion UX, removes dependence on model judgment.
   - Trade-off: `allowOther` becomes vestigial (kept for schema compat); model prompt must stop generating its own "Not sure"/"Other" style options.
   - Recommendation B: Respect `allowOther` per question and extend it to multiple-choice.
   - Trade-off: Less uniform UX; model judgment decides which questions get escape hatches; screenshot behavior not matched.
   - Selected: Recommendation A (matches user request "provide this functionality ... when we ask questions", per Recommendation A policy).
2. How should "Decide for me" combine with other selections?
   - Recommendation A: Exclusive. Selecting it clears options and Other; selecting an option or Other clears it. Stored as `decideForMe: true` with no options.
   - Trade-off: Simple mental model and simple summary text; user cannot say "these two, otherwise you pick" (rarely needed).
   - Recommendation B: Combinable flag ("prefer these but you decide").
   - Trade-off: Ambiguous downstream semantics, more states to validate.
   - Selected: Recommendation A.
3. Should the platform question get "Decide for me"?
   - Recommendation A: No. `validateRequiredPlatformAnswer` keeps requiring exactly one supported option; UI hides both chips for `primary-platform`.
   - Trade-off: One question without the escape hatch; consistent with existing strict backend contract and build-tool logic.
   - Recommendation B: Allow it and have the server pick a default platform.
   - Trade-off: Ripples into build-tool recommendation, queue metadata, and platform-specific docs; bigger scope.
   - Selected: Recommendation A (B deferred).

## Recommended First Step
Extend `AnswerDraft`/`IntakeAnswer` + `answers.ts` state helpers with red-green tests; everything else hangs off that shape.

## Runtime and Change-Impact Analysis

### Repeated Work
- None added. Pure event-driven client state (chip clicks) and one-shot server validation. No timers, polling, streams, or caches.
- Expected frequency: a handful of clicks per wizard session.
- Work per update: O(options) state recompute in one React component subtree.

### Ownership, Scope, And Lifetime
- New state: `decideForMe: boolean` on `AnswerDraft`, owned by the wizard's existing `answers` state in `idea-intake-wizard.tsx`; lifetime = wizard session, already reset on idea edit/regeneration.
- Propagation: `buildAnswers` → POST body → `IntakeAnswer.decideForMe` → `project_intakes.answers_json` → `summarizeIntakeAnswers`/`formatProjectIntakeForAi` consumers (project summary, name generation, downstream doc prompts).
- Reset/disposal: unchanged wizard reset paths cover it (`emptyAnswer()`).

### Boundary And Cache Semantics
- Contract change: `IntakeAnswer` gains optional `decideForMe?: boolean`; question sets may now be `multiple` + `allowOther: true`. Parser (`question-generation.ts`), server route (`create-from-intake`), and prompt (`intake-wizard.ts`) all move in the same commit (parser/prompt/render contract alignment).
- Back-compat: old stored answers lack the field; all readers treat absence as false. Old question sets with `allowOther: false` still render (UI no longer reads the flag).
- Forward-compat: an already-open old tab posts payloads without `decideForMe`; new server accepts. A new tab against an old server cannot happen (atomic deploy).

### Failure And Recovery
- Partial states: exclusivity enforced in `answers.ts` helpers; server strips options/otherText when `decideForMe` is true (defense in depth).
- Blast radius: intake wizard + create-from-intake route only; existing projects untouched.
- Recovery: revert commit; stored `decideForMe` answers then summarize to empty text and are filtered out of summaries (graceful degradation, no crash).

### Risk-Matched Verification
| Risk | Observable evidence or test | Acceptance threshold |
|---|---|---|
| Exclusivity broken (decideForMe + options coexist) | Unit tests on toggle helpers + server strip test | All state-transition tests green |
| Server rejects new payloads ("Every question requires an answer") | Route validation unit-style tests via `validateAnswers` path + real intake flow through UI | Create flow reaches workspace with decideForMe answers |
| Downstream AI loses the delegation signal | `summary.test.ts` asserts decideForMe text in summary + AI context | Text "Decide for me" line present for delegated answers |
| Platform question loses strictness | `required-questions.test.ts` rejects decideForMe/other on platform | Validation error returned |
| Model now emits its own "Not sure/Other" options | Prompt rule added; real generation observed once during UI verification | Generated set contains no duplicate escape-hatch options |
| UI regression on chips | Real-flow verification in Chrome + screenshots under `ui-evidence/2026-07-18/intake-decide-for-me-other/` | Chips render, toggle, and gate Create button correctly |

## Architecture Improvement Opportunities
- Parser/prompt/server contract alignment in one commit (selected): removes the tri-state drift risk between `question-generation.ts`, `intake-wizard.ts` prompt, and route validation for `multiple`+`allowOther`.
- Mode-aware `toggleOther` (selected): fixes latent single-select-only semantics instead of special-casing in the component.
- Platform "Decide for me" with server default (deferred): needs build-tool recommendation changes; rejected for this scope.
- Analytics visibility (selected, small): add `decideForMeCount`/`otherAnswerCount` numeric properties to the existing server `project_created` event so adoption is measurable; no content, no PII (per taxonomy doc).
- Extracting a shared Chip component (rejected): only one consumer; over-engineering.

## Plan
1. `src/lib/intake/types.ts`: add `decideForMe?: boolean` to `IntakeAnswer`.
2. `src/lib/intake/answers.ts` (+ tests, red first): add `decideForMe` to `AnswerDraft`/`emptyAnswer`; `toggleDecideForMe`; mode-aware `toggleOther` (multi keeps selections); both option/other toggles clear `decideForMe`; `shouldShowOtherInput` supports multi; `hasAnswer` counts `decideForMe`; `buildAnswers` emits it.
3. `src/lib/intake/summary.ts` (+ tests): `normalizeAnswers` carries `decideForMe`; `answerToText` renders "Decide for me (pick the best fit for this idea)".
4. `src/lib/intake/required-questions.ts` (+ tests): `validateRequiredPlatformAnswer` explicitly rejects `decideForMe`.
5. `src/lib/intake/question-generation.ts` (+ tests): drop the `multiple` + `allowOther` rejection.
6. `src/lib/prompts/intake-wizard.ts`: allowOther rules replaced (always true; never generate own "Other"/"Not sure"/"No preference"/"Decide for me" options; UI adds them).
7. `src/app/api/projects/create-from-intake/route.ts`: accept `decideForMe`; when true, strip options/otherText and count as answered; drop the question-set `multiple`+`allowOther` rejection and the `otherText && !allowOther` rejection (platform strictness stays via `validateRequiredPlatformAnswer`).
8. `src/components/projects/intake-question-step.tsx`: render "Decide for me" + "Other" chips on all non-platform choice questions (multi Other = checkbox chip; Decide for me = plain invert chip, exclusive); Other input shown for both modes.
9. Analytics: extend `project_created` contract with `decideForMeCount`/`otherAnswerCount` (registry + route + taxonomy doc).
10. Docs self-heal: update `docs/testing/test-inventory.md` line for touched test files; check `docs/systems/product-overview.md`/`api-endpoints.md` intake descriptions for drift.
11. Verify: `npm run test`, lint/typecheck via pre-commit, real-UI flow with Idea 1.1 per `docs/guides/idea-intake-test-cases.md`, evidence saved.

## Milestones
- State layer green: answers/summary/required-questions/question-generation tests pass with new shape.
- Server accepts delegated answers: create-from-intake validation tests pass.
- UI complete: chips interact correctly in real Chrome with generated questions.
- Evidence + reviews + docs done.

## Validation
- `npm run test` full suite.
- Real intake flow: sign in with `.env.e2e.local` creds, Idea 1.1, verify chips on step 2, answer using "Decide for me" on at least one question and "Other" on a multiple-choice question, confirm Create enables; capture screenshots.
- Fresh-eyes self review, code review, security review per workspace flow.

## Risks And Mitigations
- Model keeps generating its own "Not sure" options: prompt rule added; acceptable residual (harmless duplication).
- Old open tabs mid-deploy: payloads without new field remain valid.
- Downstream doc prompts mis-read delegation: summary text is explicit natural language, verified in summary tests.

## Rollback Or Recovery
- Single revert of the commit(s). Stored `decideForMe` answers degrade to filtered-out empty summary lines; no data migration needed either way.

## Open Decisions
- None.

## Critique

### Software Architect
- The `allowOther` flag becomes dead weight in the schema; acceptable for storage compat but should be noted in docs, else future readers re-implement gating. The tri-contract (prompt/parser/route) change in one commit is the right move; splitting it would create windows where generation and validation disagree.

### Product Manager
- "Decide for me" directly serves the non-technical founder persona; biggest risk is overuse leaving downstream docs generic. Summary text must read as an instruction to the AI, not as a skipped answer. Excluding the platform question is defensible but should get helper-text clarity later if users complain.

### Customer Or End User
- Wants zero friction: chips must not shift layout when the Other input appears (existing pattern already handles). "Decide for me" wording matches the reference UI and is self-explanatory.

### Engineering Implementer
- Touch points are many but each is small; the dangerous edit is route validation ordering (decideForMe must bypass the "requires an answer" check without weakening platform validation). Tests first on `validateAnswers`-adjacent logic via lib helpers; the route itself has no direct test file, so platform/required checks in `required-questions.test.ts` carry that weight.

### Risk, Security, Or Operations
- No new secrets, auth, or RLS surface. `decideForMe` is a boolean, no injection surface. `otherText` length caps unchanged (300). Analytics additions are counts only, taxonomy-compliant. Blast radius confined to intake; rollback trivial.
