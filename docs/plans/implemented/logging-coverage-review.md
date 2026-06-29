# Review: Logging Coverage

## Scope
- Added a shared structured logger in `src/lib/logger.ts`.
- Migrated high-value server and helper paths to structured logs: Generate All start/status/cancel/execute, create-from-intake, document generation, analysis pipelines, mockup routes and image pipeline, Stripe checkout/portal, active chat, direct analysis generation, app generation, project/document mutation routes, PDF generation, Stitch HTML proxy, waitlist, pending intake, metrics tracking, Perplexity fallback, and intake question generation.
- Left direct console calls only where intentional: `src/lib/logger.ts`, logger/console tests, Stripe webhook's existing structured JSON writer, dev-only `parseDocumentStream` warning with tests, and deprecated `src/app/api/prompt-chat/route.ts`.

## Verification
- `node --import tsx --test src/lib/logger.test.ts src/lib/with-retry.test.ts src/lib/parse-document-stream.test.ts` passed.
- `npm test` passed: 345 tests.
- `npm run typecheck` passed after deleting stale generated `.next/dev` route types and regenerating Next route types.
- `npm run lint` passed with two unrelated pre-existing warnings:
  - `output/playwright/prod-full-flow.mjs:28` unused `pageText`.
  - `src/components/analysis/planning-document-blocks.tsx:430` unused `TimelinePhaseDetails`.
- `git diff --check` passed.

## Code Review Findings
- No blocking findings.
- The shared logger keeps output dependency-free and console-backed, which avoids new infrastructure or runtime dependencies.
- Request/correlation IDs are available via request headers or generated UUIDs on migrated routes.
- The migration is logging-only: no response payloads, status codes, queue transitions, credit logic, or persistence behavior were intentionally changed.

## Security Review Findings
- No blocking findings.
- Sensitive keys are redacted recursively, including prompts, raw content, tokens, cookies, authorization, sessions, signatures, emails, signed URLs, image/html URLs, and raw payloads.
- Logger tests cover redaction, error normalization, truncation, and the important distinction between raw `content` and safe metadata like `contentLength`/`contentType`.
- Known raw Stitch prompt/provider response logs were replaced with sanitized metadata logs.
- Remaining deprecated prompt-chat direct logs are intentionally out of scope because the product context says `/api/prompt-chat` returns `410 Gone`; if that route is reactivated, migrate it before use.

## Remediation Checklist
- [x] Add shared structured logger.
- [x] Add tested redaction and request-context behavior.
- [x] Migrate core generation, onboarding, mockup, billing, chat, app-generation, project/document, PDF, intake, waitlist, and metrics logs.
- [x] Replace raw Stitch prompt/provider logs.
- [x] Verify tests, typecheck, lint, and whitespace.
