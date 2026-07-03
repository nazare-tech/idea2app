---
reviewed_at: 2026-07-02T23:27:52Z
status: passed-for-intake-and-recommendation
---

# Review: Workspace Refresh Loop And Fresh Project QA

## Verification Run
- `npm run typecheck` passed.
- `node --import tsx --test src/lib/planning-prompts.test.ts src/components/analysis/planning-document-blocks.test.tsx src/lib/document-sections.test.ts src/lib/intake-question-generation.test.ts src/lib/intake-required-questions.test.ts src/components/projects/intake-submission-loading-panel.test.tsx` passed: 57 tests.
- `node --import tsx --test src/lib/intake-question-generation.test.ts src/lib/intake-required-questions.test.ts src/components/projects/intake-submission-loading-panel.test.tsx` passed: 27 focused intake/loading tests after adding a regression assertion that intake generation requests use `maxTokens: 2000`.
- `node --import tsx --test src/components/analysis/planning-document-blocks.test.tsx` passed: 20 renderer tests after adding a known-tool URL fallback regression.
- `git diff --check` passed.
- Real UI attempt on `http://localhost:3000/projects/new` initially hit a Turbopack client-manifest error for `IdeaIntakeWizard`; restarting the dev server on port 3000 with Webpack recovered the page.
- Real UI intake question generation initially failed twice with `IntakeQuestionParseError` from malformed provider JSON. After increasing the response budget and aligning the client cap, the server logged `POST /api/intake/questions 200 in 22.0s`.
- After that successful response, the dev server continued receiving repeated `GET /`, `GET /projects/new`, and `GET /projects/57ae8c53-0e68-423e-a090-27ccfd03416f-signal-to-roadmap?tab=mockups` requests while the in-app browser controller timed out, so the fresh project could not be completed in-browser.
- 2026-07-02 retry succeeded through the real in-app browser after restarting the stale port 3000 listener and signing in with `.env.e2e.local` credentials. Created project: `http://localhost:3000/projects/33c50a38-b5a0-4ed3-9750-238dd4757ad9-signal-to-roadmap#executive-summary`.
- The fresh Step 2 generated seven questions including tool-fit questions. Selected answers: Desktop website, Mid-market, Support tickets, Chat transcripts, Sales call recordings, Internal docs, Roadmap recommendations, Per-seat SaaS, Full-stack developer, GitHub repo ready.
- Market Research, Product Plan, First Version Plan, and AI Prompts completed. Design Mockups were still generating during recommendation verification.

## Code Review Findings
- No blocking code issue found in removing `router.refresh()` from Generate All step completion. The workspace already force-fetches changed document collections and updates credits from `/api/projects/:id/workspace`.
- Subagent review agreed there is no current server-derived status regression; caveat is that future Generate All flows that mutate `projects.name`, `projects.description`, or `projects.status` would need an explicit refresh or client-state update.
- Fixed an additional regression found during QA: the client wizard still capped generated question sets at 5 while backend/parser contracts now allow 7.
- Added focused regression coverage for the larger intake question response budget so malformed/truncated JSON is less likely to return after future edits.
- QA found the generated First Version Plan emitted `### Cursor` instead of `### [Cursor](url)`, leaving the recommendation card without an external link. Added an allowlisted URL fallback for known tools and verified the live card now links to `https://cursor.com/`.

## Security Review
- No auth, RLS, payment, secret, webhook, or data-access behavior changed.
- The intake route still requires an authenticated Supabase user before generation.
- The changes do not log or expose API keys or user credentials.

## UI Evidence
- Prior browser screenshot for project dashboard: `ui-evidence/2026-07-01-ai-tool-recommendation-qa/projects-page.png`.
- Fresh project workspace screenshot: `ui-evidence/2026-07-02-intake-retry-qa/new-project-workspace-queued.png`.
- Recommended tool card screenshot after link fallback fix: `ui-evidence/2026-07-02-intake-retry-qa/recommended-tool-cursor-linked.png`.
- Earlier blocker: the in-app browser controller repeatedly timed out after the successful `/api/intake/questions` response, so Step 2 selection and project creation were not completed through the real UI on 2026-07-01.
- A follow-up browser-control attempt on `http://localhost:3000/projects/new` also timed out while reading the current tab; no new server-side intake errors appeared in the dev-server logs during that attempt.

## Remaining Work
- Design Mockups were still generating when recommendation verification finished; revisit only if mockup completion is part of the next QA pass.
