# Plan: Disable Intake Input During Generation

## Goal
When a user starts Step 1 question generation in the new-project intake wizard, the idea textarea should remain visible but become disabled, and the three example idea cards should fade out and stop being tappable. This should apply both to the normal dashboard flow where the user clicks Next and to the landing-page handoff flow where `/projects/new?autostart=1` restores an already-submitted idea and immediately starts question generation.

## Assumptions
- "Generate" in the request maps to the existing Step 1 `Next` button while it is generating intake questions.
- The desired disabled state is only for Step 1 question generation and pending idea restoration, not for the final Step 2 project creation loading screen, because that already replaces the wizard with `IntakeSubmissionLoadingPanel`.
- The examples should not just be visually faded; they should also be removed from keyboard focus and click/tap interaction while disabled.
- If question generation fails, the textarea and example cards should become interactive again so the user can revise or retry.
- No backend, database, or architecture documentation update is expected because this is a client-side UX state change with no new dependencies.

## Decisions
- Example ideas should fade out completely while keeping their layout space stable.
- Pending idea loading should use the same locked state as question generation.
- The textarea should rely on its existing disabled styling.
- Failed question generation must unlock the textarea and fade the examples back in.

## Clarifying Questions
1. Answered: Example ideas should fade out completely while keeping layout stable.
2. Answered: Opacity/hover details are secondary because the examples should visually disappear while disabled.
3. Answered: During `isLoadingPending`, examples should also be faded/disabled.
4. Answered: Rely on the existing textarea disabled styling.

## Recommended First Step
Add a focused UI-state helper in `src/components/projects/idea-intake-wizard.tsx`, such as `isIdeaStepLocked = isLoadingPending || isGeneratingQuestions`, and route all Step 1 interactive controls through it. This keeps behavior centralized and lowers the chance that one of the entry paths remains editable.

## Plan
1. Confirm current behavior with a small failing validation target.
   - Inspect whether the repo has a practical component test harness for client components.
   - If no React DOM test harness exists, use TypeScript/lint plus browser verification as the initial validation surface.
   - Expected red state: while `isGeneratingQuestions` is true, examples can currently still call `updateIdea`, and the textarea is only disabled for `isLoadingPending`.
2. Implement the Step 1 locked state.
   - In `src/components/projects/idea-intake-wizard.tsx`, derive a single `isIdeaStepLocked` boolean from `isLoadingPending || isGeneratingQuestions`.
   - Disable the textarea with `isIdeaStepLocked`.
   - Disable each example button with `isIdeaStepLocked`.
   - Fade the examples out completely while locked, using existing Tailwind patterns and preserving layout.
   - Guard `updateIdea` or the example click path if needed so state cannot change during generation even if an event races the disabled attribute.
3. Preserve retry behavior.
   - Ensure `setIsGeneratingQuestions(false)` in `finally` unlocks the textarea/examples after success or failure.
   - Ensure the successful path moves to Step 2, so the Step 1 disabled state does not matter after question generation completes.
   - Ensure the landing-page autostart path gets the same locked state while `generateQuestions()` is running.
4. Verify behavior.
   - Run focused lint on `src/components/projects/idea-intake-wizard.tsx`.
   - Run `npm run typecheck` if the change touches types beyond simple JSX state.
   - Use browser verification on `/projects/new` if a local authenticated/dev route is available, checking normal Step 1 Next behavior and the autostart query path.
5. Review and remediate.
   - Use a subagent for a bounded review or verification pass after implementation, per project instructions.
   - Write `plans/disable-intake-input-during-generation-review.md` with code review and security review findings.
   - Fix any accepted findings and rerun the relevant checks.

## Milestones
- [x] Plan approved: Scope and visual behavior are agreed before code changes.
- [x] Step 1 lock implemented: Textarea and examples cannot be changed during question generation or pending idea load.
- [x] Verification complete: Focused lint/type checks pass. Authenticated browser verification confirms the locked loading state and unlock-on-failure behavior.
- [x] Review complete: Review markdown captures code and security findings, with no remediation required.

## Validation
- `npm run lint -- src/components/projects/idea-intake-wizard.tsx`
- `npm run typecheck` if the implementation changes types or helper signatures.
- Browser/manual visual check:
  - Open `/projects/new`.
  - Enter a valid idea and click `Next`.
  - Confirm the textarea is disabled while the button shows `Generating questions`.
  - Confirm the three examples are faded and cannot be tapped/clicked/focused to replace the idea.
  - Open `/projects/new?autostart=1` with a valid session/pending idea path when feasible and confirm the same locked Step 1 state during autostart generation.

## Risks And Mitigations
- Risk: Fading the examples while preserving layout may still make users think they are selectable.
  - Mitigation: Combine opacity with `disabled`, suppressed hover styles, and `cursor-not-allowed`.
- Risk: The landing-page autostart path may skip visible Step 1 too quickly in fast local responses.
  - Mitigation: Verify by throttling or stubbing the questions request if needed, and reason through shared `isGeneratingQuestions` state.
- Risk: A broad disabled flag could accidentally disable Step 2 answer controls.
  - Mitigation: Keep the lock scoped to Step 1 rendering only.
- Risk: Native disabled textarea contrast might be too low.
  - Mitigation: Check visually and adjust with existing design tokens only if needed.

## Rollback Or Recovery
Revert the focused changes in `src/components/projects/idea-intake-wizard.tsx`. Since this is client-side state and styling only, rollback should not require data migration, backend changes, or cache cleanup.

## Open Decisions
- Whether examples should be hidden/collapsed or faded in place during generation.
- Whether pending idea loading should use the same faded examples treatment before autostart begins.
- Whether we should add a component-level test harness now, or keep verification to lint/typecheck/browser because the repo currently appears to rely mainly on Node tests for pure helpers.

## Critique

### Software Architect
- Centralizing the locked state is the right shape; scattering `isGeneratingQuestions` checks across individual controls would be brittle. The change should stay inside the wizard component because there is no cross-module state or backend contract involved.

### Product Manager
- The request improves trust during generation by preventing the user from changing inputs after the system has started generating questions from a specific idea. The main product decision is visual intensity: faded in place is less disruptive than disappearing, but it must be unmistakably disabled.

### Customer Or End User
- Users coming from the landing page already gave an idea, so disabling the field while questions generate makes sense. If generation fails, the UI must clearly return control so they are not trapped with a restored idea they cannot edit.

### Engineering Implementer
- This should be a small, low-risk React state/style change. The only tricky part is reproducing the transient loading state for visual verification, because local question generation may complete quickly or require configured AI credentials.

### Risk, Security, Or Operations
- Security impact is minimal because this is not an authorization or data-access change. The operational risk is introducing a stuck disabled state; using existing `finally` cleanup and keeping disabled state derived from current loading flags mitigates that.
