# Review: Standardized Intake Test Cases

## Scope
- Added `docs/guides/idea-intake-test-cases.md` as the durable intake fixture.
- Updated `AGENTS.md` to point future agents to the fixture. Follow-up live capture refined the default to Idea 1.1.
- Added `docs/plans/standardized-intake-test-cases-plan.md`.

## Verification
- `test -f docs/guides/idea-intake-test-cases.md` passed.
- `rg -n "idea-intake-test-cases|Idea 1.1|Observed Question Log|primary-platform" AGENTS.md docs/guides/idea-intake-test-cases.md docs/plans/standardized-intake-test-cases-plan.md` confirmed discoverability, default-variant language, observed-question logging, and stable platform IDs after follow-up refinement.
- `git diff -- AGENTS.md docs/guides/idea-intake-test-cases.md docs/plans/standardized-intake-test-cases-plan.md` was reviewed. Untracked docs are not shown in regular `git diff`, so `git status --short` was also checked.
- Live UI generation was not run in the original pass because `/api/intake/questions` requires authenticated OpenRouter-backed generation and could spend API budget. Correction recorded on 2026-06-30: for future Maker Compass QA, bounded local AI/API spend should not block real-flow verification when it produces durable test evidence.

## Fresh-Eyes Self Review
- Pass 1 reviewed `docs/guides/idea-intake-test-cases.md` for default selection clarity, three distinct ideas, stable platform IDs, and future-question update instructions. No fixes were needed after the move to `docs/guides/`.
- Pass 2 reviewed `AGENTS.md` and the plan artifact for path consistency. The path was updated from the initially drafted `docs/testing/` location to `docs/guides/idea-intake-test-cases.md`.

## Code Review Findings
- No code changes were made.
- Finding: The fixture is intentionally documentation-backed, not executable. Severity: Low. Status: Accepted because the user asked for reusable standardized test cases in markdown, and the intake questions are AI-generated.

## Security Review Findings
- No secrets, credentials, user data, auth/RLS rules, payment behavior, database schema, or external-service calls were added.
- Finding: The original pass over-weighted avoiding small API spend and under-weighted the future value of real generated questions. Severity: Medium. Status: Remediated by updating `docs/plans/recommendation-selection-rules.md` and `AGENTS.md` to prefer real paid local verification for durable QA artifacts when spend is bounded and safe.

## Remediation Checklist
- [x] Point `AGENTS.md` at the final fixture path.
- [x] Include an append-only observed-question log for future generated question variants.
- [x] Record the corrected rule that bounded local AI/API spend is acceptable for real-flow QA evidence.
