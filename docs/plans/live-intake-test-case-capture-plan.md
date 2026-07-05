---
implemented: true
implemented_at: 2026-06-30T04:35:32Z
implementation_summary: Captured real OpenRouter-backed intake question sets, verified the local UI reaches Step 2 for all three ideas, and updated the fixture with six answer variants.
---

# Plan: Live Intake Test Case Capture

## Goal
Run the real local `/projects/new` intake UI for the three standardized ideas, capture the actual AI-generated Step 2 question sets, and update the reusable fixture with two answer variants per idea: `.1` as the default-market answer set and `.2` as a meaningfully different or opposite-market answer set.

## Assumptions
- The dev server can run from this workspace using the real local environment.
- The in-app browser can authenticate with the e2e credentials if sign-in is required.
- The task should stop before clicking `Create project`; only Step 2 question generation is needed.
- Bounded OpenRouter/API spend for real local QA is acceptable under `docs/plans/recommendation-selection-rules.md`.
- The same generated question set can be used for `.1` and `.2` variants for each idea unless the UI generates materially different questions during capture.

## Clarifying Questions
1. Should this capture use the real UI or call the API directly?
   - Recommendation A: Use the real UI and inspect the generated network response.
   - Trade-off: Matches the user flow while preserving exact option IDs, but requires local server/browser setup.
   - Recommendation B: Call `/api/intake/questions` directly with an authenticated session.
   - Trade-off: Faster and easier to script, but less faithful to the requested UI path.
   - Selected: Recommendation A, because the user explicitly asked to run localhost and get to the generated-question phase.
   - Implementation note: The in-app browser could not expose the generated response body from the real UI call, so exact IDs/options were captured by calling the same local OpenRouter-backed `generateIntakeQuestions()` prompt/parser path. The real UI was still driven to Step 2 for all three ideas and stopped before project creation.
2. How many generated question sets should be captured?
   - Recommendation A: Capture one live generated question set per idea, then define two answer variants against that question set.
   - Trade-off: Keeps API spend bounded and makes variants directly comparable.
   - Recommendation B: Generate separate question sets for `.1` and `.2`.
   - Trade-off: More coverage of model variation, but answer variants become less directly comparable.
   - Selected: Recommendation A, because the user asked for two answer sets per idea, not two different generated question sets.

## Recommended First Step
Start or reuse the local dev server, authenticate in the in-app browser, and capture Idea 1's Step 2 question response without submitting project creation.

## Plan
1. Start/reuse localhost and verify `/projects/new` is reachable.
2. Capture Step 2 question sets for Ideas 1, 2, and 3 through the real generation path, and verify the real UI reaches Step 2 for each idea.
3. Update `docs/guides/idea-intake-test-cases.md` with exact generated questions, option IDs/labels, and answer variants 1.1/1.2, 2.1/2.2, 3.1/3.2.
4. Capture browser evidence under `ui-evidence/2026-06-30-live-intake-test-case-capture/`.
5. Create a review artifact with verification, code-review, and security-review notes.

## Milestones
- [x] Dev server reachable.
- [x] Browser authenticated or authenticated session confirmed.
- [x] Live question sets captured for all three ideas.
- [x] Fixture updated with six answer variants.
- [x] Evidence captured and review completed.

## Validation
- Verify exact generated question IDs and options are present in the fixture.
- Verify `Idea 1.1` is documented as the default.
- Confirm no `Create project` submission occurred.
- Run targeted `rg` checks over the guide, plan, and review artifacts.

## Risks And Mitigations
- Auth unavailable: use the documented e2e credentials without printing secrets; if credentials are missing or invalid, stop and report the blocker.
- AI generation fails: record the error and retry once through the real UI; if still blocked, document the failure and do not fabricate live questions.
- Accidental project creation: do not click `Create project`; stop at the Step 2 screen and only record answers.
- Generated questions vary later: keep the observed question log append-only and preserve category-based matching guidance.

## Rollback Or Recovery
Revert the fixture additions and this plan/review artifact. No database or runtime code changes are planned.

## Open Decisions
- None.

## Critique

### Software Architect
- Capturing exact option IDs from the real response makes the fixture useful for future automated API or UI tests. Keeping category guidance preserves resilience against future question variation.

### Product Manager
- `.1` and `.2` variants per idea give better comparison coverage without multiplying generated projects.

### Customer Or End User
- The default `Idea 1.1` should remain stable and realistic, while alternate variants exercise materially different planning outputs.

### Engineering Implementer
- The main implementation risk is browser/session setup, not code complexity. The docs update should make the fixture easy to maintain.

### Risk, Security, Or Operations
- Do not print credentials or capture secrets in screenshots. Bounded question-generation spend is expected and acceptable.
