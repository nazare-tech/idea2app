---
implemented: true
implemented_at: 2026-06-21T01:14:33Z
implementation_summary: Added a shared structured logger, migrated important active API/helper logging paths, removed raw Stitch payload logs, and added focused log behavior tests.
---

# Plan: Logging Coverage

## Goal
Make the system's important operational paths produce useful, structured, and tested logs without leaking user ideas, prompts, credentials, payment details, storage URLs, or raw provider payloads. The first implementation should focus on shared logging primitives plus the highest-value generation and onboarding paths, then expand coverage only where tests can prove behavior.

## Assumptions
- "Every important path" means critical backend/server flows first: intake project creation, Generate All/onboarding execution, document generation, AI provider fallbacks, mockup generation/recovery/finalization, billing checkout/portal/webhook, and stuck-generation diagnostics.
- This should be implemented on the current branch.
- Logs should remain console-backed for now, because the project does not have a centralized logging dependency and adding one would be an architectural change.
- Useful logs should be structured JSON for server paths, include scope/event/context, and avoid raw user-generated or provider-generated content.
- Client-side logs are lower priority unless they diagnose user-visible failures that cannot be observed server-side.

## Clarifying Questions
1. Should this pass introduce a shared logger, or only add tests around existing `console.*` calls?
   - Recommendation A: Add `src/lib/logger.ts` and migrate high-value server paths to it.
   - Trade-off: Creates a maintainable pattern and testable sanitization, but touches more files.
   - Recommendation B: Keep direct `console.*` calls and add targeted assertions.
   - Trade-off: Smaller patch, but locks in inconsistent logging and makes future coverage harder.
2. Should logs use JSON in all environments or only production?
   - Recommendation A: JSON for server logs in all environments.
   - Trade-off: Easier to test and grep by keys, but local logs are less conversational.
   - Recommendation B: Human-readable in development, JSON in production.
   - Trade-off: Nicer locally, but creates two formats to test and maintain.
3. How broad should the first implementation be?
   - Recommendation A: Cover shared logger, retry/stream parser tests, document generation service, Generate All execution, and create-from-intake.
   - Trade-off: High impact with manageable blast radius.
   - Recommendation B: Include mockup and billing routes in the same pass.
   - Trade-off: More complete, but larger risk and slower review.
4. Should raw legacy Stitch logs be removed in this pass?
   - Recommendation A: Replace raw prompt/provider response logs with sanitized structured logs.
   - Trade-off: Reduces leakage risk immediately, but may affect debugging of legacy mockups.
   - Recommendation B: Defer Stitch cleanup to a follow-up.
   - Trade-off: Keeps this change focused, but leaves known risky logs in place.
5. Should logs include stable correlation IDs?
   - Recommendation A: Include available `runId`, `queueId`, `projectId`, and `userId`, but do not invent a request ID framework yet.
   - Trade-off: Useful today without middleware changes.
   - Recommendation B: Add a request/correlation ID helper across routes.
   - Trade-off: Better observability, but broader App Router plumbing.

## Recommended First Step
Add a small shared logger with tested serialization, context sanitization, error normalization, and safe field truncation. Then migrate one narrow path under red-green tests to prove the logging contract before expanding.

## Plan
1. Inventory and define the logging contract.
   - Output: `src/lib/logger.ts` with `logInfo`, `logWarn`, `logError`, `sanitizeLogContext`, and `normalizeLogError`.
   - Validation: New `src/lib/logger.test.ts` proves JSON shape, error normalization, redaction, and truncation.
2. Add focused tests for existing logging behavior.
   - Output: `src/lib/with-retry.test.ts` and `src/lib/parse-document-stream.test.ts`, plus any small renderer test if appropriate.
   - Validation: Tests assert retry warnings, malformed stream-line warnings, and non-retryable silence.
3. Migrate central document generation logging.
   - Output: `src/lib/document-generation-service.ts` logs start, skip-existing, missing prerequisites, generation success, save success, and failures with doc type/model/project/run metadata.
   - Validation: Add focused tests around a dependency-injected or extracted helper if direct route/service testing is too heavy.
4. Migrate Generate All execution logging.
   - Output: `src/app/api/generate-all/execute/route.ts` logs queue start, item claim/skip/charge/generate/save/refund/error, and final status.
   - Validation: Reuse existing Generate All tests where possible or extract pure log-event helpers for test coverage.
5. Migrate create-from-intake lifecycle logging.
   - Output: `src/app/api/projects/create-from-intake/route.ts` logs validation category, allowance decision, lock acquisition/rejection, project/intake/queue insert success/failure, pending-token claim result without logging token values.
   - Validation: Add helper-level tests for emitted event names/context and redaction if route-level mocking is too brittle.
6. Clean up known risky raw logs.
   - Output: Replace raw provider/prompt logs in `src/lib/stitch-pipeline.ts` where still present, and sanitize Tavily/Perplexity retry-visible messages if needed.
   - Validation: Tests for sanitized error messages where helpers are exported.
7. Review and document coverage.
   - Output: `plans/implemented/logging-coverage-review.md` with code review, security review, remediation notes, and remaining follow-up coverage.
   - Validation: Run focused tests, then full `npm test`, `npm run typecheck`, and lint if time permits.

## Milestones
- Logging contract: Shared server logger has tests for shape, levels, redaction, truncation, and error normalization.
- Existing-path tests: Retry and stream-parser warnings are covered without polluting global console state.
- Generation coverage: Document generation and Generate All logs expose enough metadata to diagnose stuck, skipped, failed, and refunded work.
- Intake coverage: Project creation logs show lifecycle progress without exposing business ideas or intake answers.
- Security cleanup: Known raw prompt/provider response logs are removed or gated behind sanitized summaries.

## Validation
- Run focused tests after each phase using `node --import tsx --test <test-file>`.
- Run `npm test` after implementation.
- Run `npm run typecheck`.
- Run `npm run lint` if the change touches route/service files broadly.
- Manually inspect representative log payloads in tests to confirm no secrets, prompts, generated content, pending tokens, signed URLs, base64 images, or raw provider responses are present.

## Risks And Mitigations
- Risk: Logging leaks user business ideas, prompts, payment details, or provider payloads.
  - Mitigation: Central redaction helper, default error normalization, bounded string lengths, tests for sensitive keys, and no raw `Error` object spreading.
- Risk: Route-level tests become brittle due to Supabase and Stripe mocking.
  - Mitigation: Test the shared logger and extracted helper functions first; only add route integration tests where existing seams are clean.
- Risk: Too many logs create noise or cost.
  - Mitigation: Log lifecycle events at important state transitions only; avoid per-token, per-poll, or raw content logs.
- Risk: Refactor touches too many critical generation paths at once.
  - Mitigation: Implement in phases, run focused tests after each phase, and keep behavior changes limited to logging unless a risky raw log must be removed.

## Rollback Or Recovery
- Revert the logger migration commit if logs cause operational problems; the app behavior should remain unchanged because logs are side effects only.
- Keep migration scoped so individual route/service conversions can be reverted without removing the shared logger.
- If a test-only logger seam causes complexity, back it out and retain only shared logger unit tests plus high-value call-site tests.

## Open Decisions
- Decided: Add a shared `src/lib/logger.ts` and migrate high-value server paths to it.
- Decided: Emit structured JSON logs in all environments for the migrated server paths.
- Decided: Include mockup and billing route migrations in the first implementation pass.
- Decided: Replace raw Stitch prompt/provider logs with sanitized structured logs in this pass.
- Decided: Add request/correlation ID helpers across migrated routes rather than only using available run IDs.

## Critique

### Software Architect
- A shared logger is the right boundary; otherwise this becomes scattered console assertion work. The main risk is over-designing correlation IDs before the app has request middleware for them.

### Product Manager
- The highest customer value is diagnosing project creation and document generation failures faster. Billing and mockups matter too, but the first pass should not balloon enough to delay the core fix.

### Customer Or End User
- Logs should help support explain stuck generation without exposing the user’s idea. Anything that prints prompts, intake answers, or generated plans would violate trust even if it helps debugging.

### Engineering Implementer
- Route-level tests may be expensive because Supabase, Stripe, and OpenRouter are module-scoped in places. Start with small exported helpers and existing pure test surfaces, then migrate call sites.

### Risk, Security, Or Operations
- The current raw Stitch logs and ad hoc `console.error(error)` calls are the highest leakage risks. A redaction-first logger should be treated as security hardening, not just observability polish.
