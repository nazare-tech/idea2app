---
implemented_at: 2026-07-01T15:36:16Z
change_type: backend-user-flow
---

# Review: Intake Question Retry

## Scope
- `src/lib/intake-question-generation.ts`
- `src/lib/intake-question-generation.test.ts`
- Real `/projects/new` project creation flow for Idea 1.1.

## Verification
- Passed: `node --import tsx --test src/lib/intake-question-generation.test.ts`
- Passed: `npm run typecheck`
- Passed with unrelated warning: `npm run lint`
  - Existing warning: `output/playwright/prod-full-flow.mjs:28` unused `pageText`.
- UI verified: created `Signal To Roadmap` through `/projects/new` using Idea 1.1.
- Created project URL: `http://192.168.2.168:3000/projects/57ae8c53-0e68-423e-a090-27ccfd03416f-signal-to-roadmap#executive-summary`
- UI evidence: `ui-evidence/2026-07-01-idea-1-1-project-creation/signal-to-roadmap-workspace.png`

## Fresh-Eyes Self Review
- Pass 1: Reviewed retry loop behavior for parser failures versus provider failures. Fixed provider-error handling so model/network failures still return the existing generic retryable error.
- Pass 2: Reviewed live UI behavior after the code change. The route needed a module timestamp refresh before the running dev server picked up the helper change; after refresh, Step 2 rendered and project creation completed.

## Code Review Findings
- No blocking findings. The retry is bounded to one additional AI call and only applies after `parseIntakeQuestionSet()` rejects generated output.

## Security Review Findings
- No auth, RLS, secret, or database permission changes.
- Input remains sanitized through the existing prompt builder, and the retry prompt includes parser issues only, not secrets.
- External API behavior changes by at most one additional OpenRouter call after invalid model output.

## Remediation Checklist
- [x] Preserve retryable error behavior for provider failures.
- [x] Verify the actual UI project creation path after the fix.
