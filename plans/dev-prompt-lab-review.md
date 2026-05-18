# Review: Dev Prompt Lab With Artifact-Accurate Preview

## Scope
- Added local-dev-only Prompt Lab page, API routes, isolated generation utilities, prompt history tables, and AI-backed Launch Plan generation.
- Reviewed that Prompt Lab runs save only to `prompt_lab_runs` and do not write canonical artifact tables or generation queues.

## Verification
- `npm.cmd test -- src/lib/prompt-lab.test.ts` passed. Note: the repo test script runs all `src/**/*.test.ts(x)` before the explicit file, so the full suite passed.
- `npm.cmd run typecheck` passed.
- `npm.cmd run lint` passed with 13 pre-existing warnings in unrelated files.
- Started local dev server on `http://127.0.0.1:3010`; `GET /dev/prompt-lab` returned HTTP 200.

## Code Review Findings
- No blocking findings.
- Low: The Prompt Lab default Market Research prompt does not perform the production Perplexity/Tavily competitor discovery step. This is intentional for isolated prompt iteration, and the user prompt explicitly invites adding competitor notes.
- Low: Full authenticated browser interaction could not be completed from this session because no logged-in browser context was available.

## Security Review Findings
- No blocking findings.
- Local-dev guard is applied to the page and every Prompt Lab API route through `isPromptLabEnabled()`.
- API routes require Supabase auth and project ownership checks before reading context, saving history, running AI, or proxying lab images.
- Prompt drafts/runs have user-scoped RLS and project ownership constraints.
- Prompt text is length-limited before model calls and database writes.
- Mockup image proxy validates project-owned Prompt Lab run association before streaming private storage content.

## Remediation Checklist
- [x] Keep Prompt Lab routes blocked in production.
- [x] Keep lab outputs separate from canonical artifacts and queues.
- [x] Add RLS migration for Prompt Lab tables.
- [x] Add focused tests for prompt lab guard and prompt assembly.
- [x] Update `PROJECT_CONTEXT.md`.
