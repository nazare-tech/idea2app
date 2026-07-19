# Review: Intake Wizard "Decide for me" + Universal "Other" Answers

Plan: `docs/plans/intake-decide-for-me-other-plan.md`

## Scope
- `src/lib/intake/types.ts` — `IntakeAnswer.decideForMe?: boolean`.
- `src/lib/intake/answers.ts` — `decideForMe` draft state, `toggleDecideForMe`, mode-aware `toggleOther`, `supportsAnswerEscapeHatches`, `hasAnswer`/`buildAnswers`/`shouldShowOtherInput` updates.
- `src/lib/intake/summary.ts` — delegation text "Decide for me (pick the best fit for this idea)" in summaries and AI context; `normalizeAnswers` carries the flag.
- `src/lib/intake/required-questions.ts` — platform answer rejects `decideForMe`.
- `src/lib/intake/question-generation.ts` — dropped the `multiple` + `allowOther` parser rejection.
- `src/lib/prompts/intake-wizard.ts` — allowOther always true; model must not author its own "Other"/"Not sure"/"Decide for me" options.
- `src/app/api/projects/create-from-intake/route.ts` — accepts `decideForMe` (strips picks/otherText), removed `multiple`+`allowOther` and `otherText && !allowOther` gates, `project_created` escape-hatch counts.
- `src/lib/product-analytics/contracts.ts` — optional `decideForMeCount`/`otherAnswerCount` (0-7) on `project_created`.
- `src/components/projects/intake-question-step.tsx` — escape-hatch chips (Decide for me plain invert chip, Other button/checkbox chip), shared `CHIP_*` classes, `ChipCheckbox` extraction.
- Docs: `product-overview.md`, `product-analytics-event-taxonomy.md`, `test-inventory.md`, `idea-intake-test-cases.md` observed-question log.

## Verification
- `npm run test`: 654/654 pass (post-change).
- Intake-focused suite: 58/58 pass; red-green order followed for answers, summary, required-questions, question-generation changes.
- `npx eslint` on all touched files: clean. `npx tsc --noEmit`: only pre-existing error in `src/components/layout/scrollable-content.test.tsx` from unrelated in-progress structural work already dirty in the tree.
- Real UI (Playwright, real dev server on :3000, real e2e sign-in, real question generation, Idea 1.1, two runs): escape hatches present on every non-platform card and absent on the platform card; Decide-for-me exclusivity both directions; multi-select Other checkbox chip + free-text input combine with picks; Create project armed (`isDisabled: false`) with per-card selection state logged. Stopped before `Create project` per `docs/guides/idea-intake-test-cases.md` rule 6.
- Evidence: `ui-evidence/2026-07-18/intake-decide-for-me-other/01-step2-all-chips.png`, `02-answered-create-armed.png` (1280x720; note: final chip caught mid `transition-colors` paint — the logged aria state and enabled assertion are the ground truth).

## Fresh-Eyes Self Review
- Pass 1 (all changed files reread): no defects found. Confirmed no import cycle for `answers.ts` → `required-questions.ts`; `toggleOther` deselect still resets text; `buildAnswers` drops picks/otherText when delegated.
- Pass 2 (integration hunt): checked `src/lib/project-intake-context.ts` — its `isIntakeAnswer` filter passes answer objects through unreshaped, so stored `decideForMe` flags survive workspace AI-context rebuilds and reach `answerToText`. Checked analytics validation ranges (counts always 0-7 integers). No fixes needed; nothing rerun beyond the suites above.

## Code Review Findings
- None blocking. `allowOther` is now vestigial for UI gating; kept for schema/storage compat and documented in `product-overview.md` (accepted).
- Route `validateAnswers` has no direct test file (pre-existing); its new delegation branch is 4 lines and covered by reasoning plus platform-validation tests. Accepted; noted as residual risk below.

## Architecture Improvement Review
- Selected opportunities landed: prompt/parser/route contract moved in one change; mode-aware `toggleOther`; analytics counts.
- Deferred: platform-question "Decide for me" with server-chosen default (needs build-tool recommendation changes) — still deferred, no new pressure.
- No new duplication (chip classes consolidated into `CHIP_*` constants, checkbox extracted); no new non-idempotent paths.

## Security Review Findings
- None. `decideForMe` is coerced with `=== true`; delegated answers strip client-supplied picks/otherText server-side. `otherText` cap (300) and normalization unchanged. Platform strictness retained via `validateRequiredPlatformAnswer` (explicit `decideForMe` rejection + exactly-one-option rule). No auth/RLS/secret surface touched. Analytics properties are bounded integers, no content/PII. Prompt change adds no new untrusted interpolation (idea remains delimiter-wrapped via `buildSecurePrompt`).

## Remediation Checklist
- [x] None required.

## Follow-Up: Compact Inline Other Input (2026-07-19)
- User feedback pass: the Other input must be chip-sized/inline and must not accept a pasted paragraph.
- Changes: `INTAKE_OTHER_TEXT_MAX_LENGTH = 100` shared constant in `types.ts` (client `maxLength` + server `MAX_OTHER_LENGTH` slice, previously 300); input moved inline into the chip row, chip-height (`h-11` mobile / ~30px desktop), 240px wide, autofocused on reveal, placeholder "Your answer...".
- Verified via temp Playwright spec (real sign-in, real generated questions): input height 30px == Other chip height 30px, same row (y delta ≤3px), `maxlength="100"`, paste-like `insertText` of 150 chars clamps to 100, autofocus asserted. Full suite re-run: 654/654. Evidence: `ui-evidence/2026-07-18/intake-decide-for-me-other/03-inline-other-input.png`.
- Existing semantics confirmed unchanged: click Other reveals the field; single-select Other is radio-exclusive (picking an option clears Other and its text); multi-select Other is a checkbox chip combinable with picks.

## Residual Risks
- Full `Create project` submission with a `decideForMe` payload was not executed end-to-end (repo rule: stop before Create for question QA; full creation is real generation spend). Server acceptance is covered by the reviewed 4-line branch plus tests around it; first real intake creation will confirm via `project_created.decideForMeCount`.
