# Plan: Intake Wizard Multiple Choice Only

## Goal
Update the new-project intake wizard so Step 2 questions are always answered through single-choice or multiple-choice option chips, with optional free text revealed only after selecting an `Other` chip. Confirm whether the fast responses for the three example ideas are caused by curated fallback questions, client state reuse, API/model latency, or another cache, then remove any path that can render a required standalone text area for intake questions.

## Assumptions
- The relevant flow is `/projects/new` and the `IdeaIntakeWizard` component.
- The three starter ideas/prompts are the entries in `src/lib/intake-examples.ts`.
- Step 2 questions are requested from `POST /api/intake/questions`.
- Fast question loading may be normal API performance, fallback behavior, or client-side reuse when the same idea was already generated in the current wizard session.
- Existing stored `project_intakes` may contain historical `selectionMode: "text"` answers and should remain readable.
- The product decision is to disallow standalone text questions for newly generated intake questions, not to delete historical data.

## Clarifying Questions
1. Should `multiple` questions remain supported, or should every question become exactly one selected answer plus optional `Other`?
2. Should `Other` be available on every question, or only where the generated/fallback question marks `allowOther: true`?
3. When `Other` is selected, should typed text be required before the user can create a project?
4. Should users be allowed to combine `Other` with multiple selected options on `multiple` questions, or should selecting `Other` clear other options?
5. Should the API reject model output that contains `selectionMode: "text"`, or should it transform text questions into option-chip questions with an `Other` option?
6. Should old `text` intake questions still render as text fields if a historical intake payload is ever displayed, or can the UI normalize them too?
7. Should the three example ideas produce deterministic curated question sets, or should they always call the model when the model is configured?
8. Do you want instrumentation in the response/UI showing whether questions came from AI or fallback while debugging, or should that stay server-only?

## Recommended First Step
Add focused tests around `generateIntakeQuestions`, `parseIntakeQuestionSet`, and `QuestionCard` behavior before editing implementation. The first failing tests should assert that newly accepted/generated question sets never contain `selectionMode: "text"` and that an `Other` text input is hidden until `Other` is selected.

## Plan
1. Confirm the current source of fast example-question responses.
   - Inspect `src/lib/intake-examples.ts`, `src/lib/intake-question-generation.ts`, `src/lib/prompts/intake-wizard.ts`, and `src/app/api/intake/questions/route.ts`.
   - Add temporary local logging only if needed, then remove it before finalizing.
   - Validation: document whether speed comes from fallback, model response, or component reuse.

2. Change the question contract for new intake questions.
   - Update `src/lib/intake-types.ts` so generated intake questions support only `"single"` and `"multiple"` for new question sets, while preserving a legacy type/path if needed for stored payloads.
   - Update `src/lib/prompts/intake-wizard.ts` to instruct the model to produce only chip-based questions with optional `allowOther`.
   - Update `src/lib/intake-question-generation.ts` parser rules so AI output with `"text"` is rejected or normalized, depending on the chosen decision.
   - Validation: parser tests fail on standalone text questions and pass on chip questions with `allowOther`.

3. Replace curated fallback text questions with option-chip questions.
   - Update all fallback branches in `buildFallbackIntakeQuestions()` so marketplace, vague, and generic ideas no longer return `selectionMode: "text"`.
   - For formerly open-ended questions, provide 3-6 useful defaults plus `allowOther: true`.
   - Validation: fallback tests assert every fallback question has at least 2 options and no standalone text mode.

4. Tighten wizard rendering and answer validation.
   - Update `src/components/projects/idea-intake-wizard.tsx` so normal question cards always render chips first.
   - Keep the `Other` input hidden unless `answer.otherSelected` is true.
   - Ensure `hasAnswer()` requires non-empty `otherText` when `Other` is selected with no selected options.
   - Ensure `buildAnswers()` sends `otherText` only when `Other` is selected and trimmed text exists.
   - Validation: UI/component tests or browser verification show no text input initially, then show input after clicking `Other`.

5. Preserve downstream intake compatibility.
   - Review `src/lib/intake-summary.ts`, `src/lib/intake-context.ts`, `src/lib/project-intake-context.ts`, and `src/app/api/projects/create-from-intake/route.ts` for assumptions about `answer.text`.
   - Keep legacy summary formatting for historical text answers, but make new submissions use `selectedOptionIds` and optional `otherText`.
   - Validation: existing intake summary tests still pass or are updated to cover both legacy text and new other-text answers.

6. Update documentation if the contract changes.
   - Update `PROJECT_CONTEXT.md` to replace the current note that `/api/intake/questions` generates `single`, `multiple`, and `text` answer modes.
   - Note that free text is now only available through an `Other` option.
   - Validation: documentation matches the implemented API and UI behavior.

7. Verify end to end.
   - Run focused tests for intake generation, intake summary/context, and project creation validation.
   - Run lint/type checks if feasible.
   - Start the dev server and visually test `/projects/new` using the three example ideas.
   - Validation: each example reaches Step 2 quickly or with normal loading, every question shows choices, no text field is visible until `Other` is clicked, and project creation still accepts complete answers.

## Milestones
- Current behavior explained: The source of fast generated questions is identified and summarized.
- Contract updated: New intake question sets cannot contain standalone text questions.
- Fallback fixed: Curated fallback questions are all chip-based.
- UI fixed: Text input appears only after selecting `Other`.
- Compatibility preserved: Historical text answers remain readable and downstream document generation still receives useful context.
- Verified: Tests and visual checks confirm the new behavior.

## Validation
- `npm test -- src/lib/intake-question-generation.test.ts`
- Relevant intake summary/context tests, depending on project test runner support.
- `npm run lint` or the closest available lint/type command.
- Manual browser test on `/projects/new` with each example idea.
- Inspect network response from `/api/intake/questions` to confirm `questionSet.questions[*].selectionMode` is never `"text"` for new responses.

## Risks And Mitigations
- Risk: Removing `"text"` from the shared type could break historical intake rendering or stored payload parsing. Mitigation: preserve a legacy answer/text path for stored payloads and only restrict newly generated questions.
- Risk: Forced multiple choice can reduce answer specificity. Mitigation: add high-quality options and use `Other` on questions where specificity matters.
- Risk: AI output may still include text questions despite prompt changes. Mitigation: enforce the rule in parser validation and fallback/normalization logic.
- Risk: `Other` answers may be submitted empty. Mitigation: update `hasAnswer()` and submit validation to require trimmed text when `Other` is the only answer.
- Risk: Visual regressions on mobile from many chip options. Mitigation: verify wrapping, tap targets, and input reveal behavior in browser at mobile and desktop widths.

## Open Decisions
- Whether to reject AI text-mode output and use fallback, or transform text-mode output into a chip question with generated generic options plus `Other`.
- Whether `Other` should be available on every generated question by policy.
- Whether `multiple` plus `Other` can be combined, or whether `Other` should be mutually exclusive.
- Whether to expose `usedFallback` in development UI while diagnosing fast responses.

## Critique

### Software Architect
- The plan correctly treats this as an API contract and renderer change, not just a UI tweak. The main architectural concern is type compatibility: `INTAKE_SELECTION_MODES` currently includes `"text"` globally, so removing it bluntly could break historical `project_intakes`. A cleaner implementation may need separate types for new question generation versus legacy stored payloads.

### Product Manager
- The direction reduces friction and makes onboarding feel faster and more guided. The tradeoff is less nuance for early idea capture, so the option set quality matters. The plan should favor `Other` on questions where founders are likely to have domain-specific answers.

### Customer Or End User
- This improves the experience because users are not forced into blank required text areas after already describing their idea. The key UX detail is that `Other` must feel optional and obvious, and the revealed field should be short, focused, and easy to dismiss by unselecting `Other`.

### Engineering Implementer
- The implementation is straightforward but touches several seams: prompt, parser, fallback data, UI state, answer serialization, and tests. The most likely bug is validation accidentally allowing an empty `Other` answer or breaking existing tests that intentionally assert `"text"` is accepted.

### Risk, Security, Or Operations
- Security risk is low because this does not introduce new external inputs beyond existing intake answers. Operationally, strict parser rejection may increase fallback usage if the model keeps emitting `"text"`, so logs or tests should confirm the prompt change is effective before relying on AI output quality.
