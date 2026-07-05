# Milestone 3 Quality Polish Review Notes

## Implementation Summary
- Hid reachable user-facing credit balance/cost surfaces in the dashboard shell, project header, workspace payload, public pricing copy, and billing page. Internal credit accounting remains for legacy/non-bundled paths and refunds.
- Added explicit plan allowance support through `plans.monthly_project_allowance`, a Supabase migration, manual production SQL notes, database types, and resolver-equivalence coverage.
- Split the planning document renderer into Product Plan, First Version Plan, and shared renderer modules, with matching split tests plus a small barrel smoke test.
- Added intake question rate limits and moved the shared limiter to async Redis REST support with in-memory local fallback.
- Sanitized Mermaid SVG output with DOMPurify and lazy-loaded `beautiful-mermaid` so non-Mermaid tests do not import the renderer package at module load time.
- Updated `PROJECT_CONTEXT.md` for the milestone's current-state architecture changes.

## Verification
- `npm.cmd test` passed: 352 passing.
- `npm.cmd test -- src/components/analysis/product-plan-blocks.test.tsx src/components/analysis/first-version-plan-blocks.test.tsx src/components/analysis/planning-document-blocks.test.tsx` passed. The npm script expands to the full suite: 352 passing.
- `npm.cmd test -- src/lib/rate-limit.test.ts src/lib/project-allowance.test.ts src/lib/generation-queue-credit-flow.test.ts` passed earlier in the implementation. The npm script expanded to the full suite: 350 passing at that point.
- `npm.cmd run typecheck` passed.
- `npm.cmd run lint` passed with no warnings.
- Local server smoke on `http://localhost:3000` passed: landing page returned 200, included project-oriented copy, and did not include credit/token terms in server-rendered HTML. `/projects` and `/billing` redirected unauthenticated users to `/auth`.
- Codex in-app browser automation was attempted, but the required Node REPL browser tool was not available through tool discovery in this session; verification used HTTP smoke checks instead.

## Security Review
- Mermaid SVG now fails closed when sanitization cannot produce a safe SVG string, avoiding direct injection of AI-generated SVG.
- Rate limiting is now available across serverless instances when Redis REST env vars are configured, with conservative intake question limits of 5 per user/hour and 20 per IP/hour.
- New Redis tokens are read only from environment variables. No secrets were added to code or docs.
- Hidden credit failures now use plan-limit language, avoiding leakage of internal accounting details to users.

## Residual Notes
- `PROJECT_CONTEXT.md` received targeted current-state corrections for the changed architecture. A deeper prose trim can still be done as a separate documentation-only cleanup.
- `product-plan-blocks.tsx` is still 2,105 lines after the safe document-type split. Splitting the current numbered PRD renderer into another module is the next low-risk size reduction, but it shares several PRD story/requirement/timeline helpers and should be done as a focused follow-up instead of a late mechanical move.
- Production should run either the Supabase migration or the manual SQL note before relying on explicit plan allowance fields for all live plans.
