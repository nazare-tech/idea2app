---
implemented: true
implemented_at: 2026-07-01T15:36:16Z
implementation_summary: Added one bounded repair retry for parser-invalid intake question model output, then created the Idea 1.1 project through the real UI.
---

# Plan: Intake Question Retry

## Goal
Allow the `/projects/new` UI flow to recover when the intake-question model returns a question set that becomes too short after platform-question normalization.

## Assumptions
- The current failure is not a missing API key or credit issue; server logs show `IntakeQuestionParseError: normalized questions must include 4-5 items`.
- The UI should still require a valid AI-generated 4-5 question set and should not fall back to canned questions.
- Project creation should continue through the real UI after the retry fix.

## Clarifying Questions
1. How should invalid but retryable model output be handled?
   - Recommendation A: Retry the model once with corrective instructions that include the parser rejection reason.
   - Trade-off: Keeps the AI-backed question contract and fixes transient bad outputs with one additional bounded call.
   - Recommendation B: Accept 3 normalized questions when the required platform question exists.
   - Trade-off: Faster and cheaper, but violates the product rule that the wizard asks 4-5 questions.
   - Selected: Recommendation A, because the current product contract and UI copy expect 4-5 questions.

## Recommended First Step
Add a unit test proving `generateIntakeQuestions()` retries after a normalized-too-short parse failure and succeeds with the second valid output.

## Plan
1. Add focused retry coverage in `src/lib/intake-question-generation.test.ts`. Done.
2. Update `generateIntakeQuestions()` to retry once only for parser failures, using a stricter repair prompt. Done.
3. Run focused intake tests. Done.
4. Retry the real `/projects/new` UI flow for Idea 1.1 and create the project. Done.
5. Record backend/API behavior in the change history and create a review artifact. Done.

## Milestones
- Parser retry test passes.
- Real UI creates an Idea 1.1 project without bypassing the wizard.

## Validation
- `node --import tsx --test src/lib/intake-question-generation.test.ts`
- Real in-app browser flow: `/projects/new` -> Idea 1.1 -> generated questions -> answered chips -> `Create project` -> project workspace.

## Risks And Mitigations
- Risk: Additional AI call adds latency and small API cost when the first output is invalid.
  - Mitigation: Limit retry to one parser failure.
- Risk: Retrying broad provider failures could hide dependency outages.
  - Mitigation: Retry only `IntakeQuestionParseError`; provider failures still return the existing retryable error.

## Rollback Or Recovery
Revert the retry logic and test. The route returns to failing fast on the first invalid generated question set.

## Open Decisions
- None.

## Implementation Notes
- The first live Idea 1.1 question-generation attempt failed because platform-question normalization reduced the set below four questions.
- The route now retries once with a repair prompt when parsing fails, while provider/runtime failures still return the existing retryable error.
- Created project: `Signal To Roadmap` at `/projects/57ae8c53-0e68-423e-a090-27ccfd03416f-signal-to-roadmap#executive-summary`.
- UI evidence: `ui-evidence/2026-07-01-idea-1-1-project-creation/signal-to-roadmap-workspace.png`.

## Critique

### Software Architect
- The retry belongs in the generation helper, close to the parser contract and shared tests.

### Product Manager
- Preserving 4-5 questions keeps the intake consistent and avoids quietly collecting less context.

### Customer Or End User
- A single retry is invisible except for a slightly longer wait, which is better than a spurious error.

### Engineering Implementer
- Keep the retry bounded and do not add fallback fixtures or test-only branches.

### Risk, Security, Or Operations
- No secrets, auth, RLS, billing, or database schema changes. External AI usage may make one extra call only after invalid output.
