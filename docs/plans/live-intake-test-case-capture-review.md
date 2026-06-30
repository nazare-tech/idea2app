# Review: Live Intake Test Case Capture

## Scope
- Ran the local Next.js app at `http://localhost:3000`.
- Captured real OpenRouter-backed intake question sets for Ideas 1, 2, and 3.
- Verified the real `/projects/new` UI reaches Step 2 for all three ideas without clicking `Create project`.
- Updated `docs/guides/idea-intake-test-cases.md` with variants `1.1`, `1.2`, `2.1`, `2.2`, `3.1`, and `3.2`.
- Updated `AGENTS.md` so future agents use Idea 1.1 by default.

## Verification
- Started the dev server with `npm run dev` at `http://localhost:3000`.
- In-app browser opened `/projects/new` with an existing authenticated session.
- Real UI Step 2 evidence:
  - `ui-evidence/2026-06-30-live-intake-test-case-capture/ui-step-2-captures.json`
  - `ui-evidence/2026-06-30-live-intake-test-case-capture/idea-1-ui-step-2-viewport.png`
  - `ui-evidence/2026-06-30-live-intake-test-case-capture/idea-2-ui-step-2-viewport.png`
  - `ui-evidence/2026-06-30-live-intake-test-case-capture/idea-3-ui-step-2-viewport.png`
- Exact generated fixture source:
  - `ui-evidence/2026-06-30-live-intake-test-case-capture/captured-question-sets.json`
- Confirmed exact question counts match the UI Step 2 card counts for the first completed UI capture set: Idea 1 has 4 questions, Idea 2 has 5, and Idea 3 has 5.
- Validated every selected answer ID in the guide exists in `captured-question-sets.json`.
- Confirmed no `Create project` submission was performed; browser automation stopped at Step 2.

## Fresh-Eyes Self Review
- Pass 1 found that full-page screenshots saved as `idea-*-ui-step-2.png` appeared blank in local preview. Viewport screenshots were recaptured as `idea-*-ui-step-2-viewport.png` and the guide now references the viewport files.
- Pass 2 found that exact generated JSON and UI screenshots came from separate AI generations. The guide now explicitly states that `captured-question-sets.json` is the exact reusable source of IDs/options and that UI screenshots are separate Step 2 render evidence.

## Code Review Findings
- No runtime code changes were made.
- Finding: The first attempted browser-response capture could not monkeypatch `fetch` because the browser evaluation scope is read-only. Severity: Low. Status: Addressed by using the same local `generateIntakeQuestions()` prompt/parser path for exact JSON while separately verifying the real UI renders Step 2.
- Finding: Intake questions vary between AI calls, so screenshots may not exactly match the stored JSON fixture. Severity: Medium. Status: Addressed by labeling evidence sources clearly in the guide.

## Security Review Findings
- No secrets were printed or committed.
- No database rows, projects, auth/RLS rules, payments, or schema were changed.
- Bounded OpenRouter/API usage occurred for local QA capture under the learned rule in `docs/plans/recommendation-selection-rules.md`.

## Remediation Checklist
- [x] Add stop-before-`Create project` instruction to the guide.
- [x] Document Idea 1.1 as the default variant.
- [x] Separate exact generated JSON fixture source from UI render evidence.
- [x] Validate answer IDs against captured question options.
- [x] Mark the live-capture plan implemented.
