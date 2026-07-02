---
reviewed_at: 2026-07-01T20:55:18Z
status: partial
---

# Review: Workspace Refresh Loop And Fresh Project QA

## Verification Run
- `npm run typecheck` passed.
- `node --import tsx --test src/lib/planning-prompts.test.ts src/components/analysis/planning-document-blocks.test.tsx src/lib/document-sections.test.ts src/lib/intake-question-generation.test.ts src/lib/intake-required-questions.test.ts src/components/projects/intake-submission-loading-panel.test.tsx` passed: 57 tests.
- `node --import tsx --test src/lib/intake-question-generation.test.ts src/lib/intake-required-questions.test.ts src/components/projects/intake-submission-loading-panel.test.tsx` passed: 27 focused intake/loading tests after adding a regression assertion that intake generation requests use `maxTokens: 2000`.
- `git diff --check` passed.
- Real UI attempt on `http://localhost:3000/projects/new` initially hit a Turbopack client-manifest error for `IdeaIntakeWizard`; restarting the dev server on port 3000 with Webpack recovered the page.
- Real UI intake question generation initially failed twice with `IntakeQuestionParseError` from malformed provider JSON. After increasing the response budget and aligning the client cap, the server logged `POST /api/intake/questions 200 in 22.0s`.
- After that successful response, the dev server continued receiving repeated `GET /`, `GET /projects/new`, and `GET /projects/57ae8c53-0e68-423e-a090-27ccfd03416f-signal-to-roadmap?tab=mockups` requests while the in-app browser controller timed out, so the fresh project could not be completed in-browser.

## Code Review Findings
- No blocking code issue found in removing `router.refresh()` from Generate All step completion. The workspace already force-fetches changed document collections and updates credits from `/api/projects/:id/workspace`.
- Subagent review agreed there is no current server-derived status regression; caveat is that future Generate All flows that mutate `projects.name`, `projects.description`, or `projects.status` would need an explicit refresh or client-state update.
- Fixed an additional regression found during QA: the client wizard still capped generated question sets at 5 while backend/parser contracts now allow 7.
- Added focused regression coverage for the larger intake question response budget so malformed/truncated JSON is less likely to return after future edits.

## Security Review
- No auth, RLS, payment, secret, webhook, or data-access behavior changed.
- The intake route still requires an authenticated Supabase user before generation.
- The changes do not log or expose API keys or user credentials.

## UI Evidence
- Prior browser screenshot for project dashboard: `ui-evidence/2026-07-01-ai-tool-recommendation-qa/projects-page.png`.
- Fresh project completion screenshot is blocked. The in-app browser controller repeatedly timed out after the successful `/api/intake/questions` response, so Step 2 selection and project creation were not completed through the real UI.
- A follow-up browser-control attempt on `http://localhost:3000/projects/new` also timed out while reading the current tab; no new server-side intake errors appeared in the dev-server logs during that attempt.

## Remaining Work
- Reconnect the in-app browser and finish `/projects/new` with Idea 1.1.
- Confirm the new project reaches the workspace without repeated refresh.
- Confirm AI Prompts renders one Recommended AI Build Tool card above Next Prompt on a fresh generated First Version Plan.
