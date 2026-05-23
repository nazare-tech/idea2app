# Plan: Longer Prompt Lab And Project Generation Timeouts

## Goal
Reduce false "This operation was aborted" failures after increasing long-form output tokens by giving Prompt Lab and main project document generation longer provider timeouts, while keeping final blocked-template rendering unchanged.

## Assumptions
- The immediate failing surface is `/dev/prompt-lab` calling `/api/dev/prompt-lab/run`.
- The main project generation path uses `src/lib/analysis-pipelines.ts`, including direct generation and Generate All/onboarding document generation.
- The blocked renderers should continue receiving complete saved documents instead of partial streamed markdown.
- Vercel route envelopes are 300 seconds, so provider timeouts should stay below that with buffer for DB writes and error handling.

## Clarifying Questions
1. Should the longer timeout apply only to PRD/MVP, or all long-form text documents?
2. Should the timeout be fixed in code or configurable through environment variables?
3. Should stale OpenRouter model IDs be fixed in this same patch or handled separately?

## Recommended First Step
Keep the existing request/response shape and final rendering behavior. Increase only the OpenRouter text generation timeout for long-form document calls and improve timeout error messages.

## Plan
1. Add timeout constants/helpers in `src/lib/prompt-lab.ts`.
   - Use a longer text-generation timeout for Prompt Lab text artifacts.
   - Keep mockup image generation on its existing separate image timeout path.
   - Convert abort errors into a clear timeout message.
2. Add timeout constants/helpers in `src/lib/analysis-pipelines.ts`.
   - Use the longer timeout for main project long-form document calls.
   - Keep the value below the 300s route envelope.
   - Convert abort errors into document-specific timeout messages.
3. Update tests.
   - Cover timeout constants/error formatting where practical.
4. Update `PROJECT_CONTEXT.md`.
   - Document the longer timeout behavior for Prompt Lab and in-house document generation.

## Milestones
- Prompt Lab timeout: PRD/MVP Prompt Lab runs no longer abort at 120 seconds.
- Main project timeout: Product Plan and First Version Plan generation get the same longer timeout.
- Verification: focused tests and typecheck pass.

## Validation
- Run focused tests: `npm test -- src/lib/prompt-lab.test.ts`.
- Run typecheck: `npm run typecheck`.
- Manual local check: run a PRD Prompt Lab test with Claude Sonnet and verify the output renders only after completion and the run saves.

## Risks And Mitigations
- Risk: Longer timeouts can keep a serverless function busy longer.
  - Mitigation: Use a value below 300 seconds and avoid increasing route `maxDuration`.
- Risk: Generate All may spend more time on one slow document.
  - Mitigation: This is intentional for higher-token PRD/MVP quality; durable queue status still records failure if the function envelope is exceeded.
- Risk: OpenRouter model IDs in the selector are stale.
  - Mitigation: Leave this adjacent issue separate unless explicitly approved for the same patch.

## Rollback Or Recovery
- Revert timeout constants to 120 seconds.
- Existing `prompt_lab_runs` rows remain valid because the final saved row schema does not change.

## Open Decisions
- Whether to make the timeout configurable through env vars in a future patch.
- Whether to fix OpenRouter model ids in the same patch.

## Critique

### Software Architect
- This is a minimal operational fix. It does not change rendering or persistence architecture, which keeps the blast radius low.

### Product Manager
- Final rendering remains polished and stable. The tradeoff is users still wait, but they are much less likely to hit a false timeout.

### Customer Or End User
- The user gets the same final blocked-template experience with fewer aborted runs and clearer messages when a provider still takes too long.

### Engineering Implementer
- Keep helper names explicit and avoid scattering raw millisecond literals through the code.

### Risk, Security, Or Operations
- No new secrets or external dependencies are introduced. Longer requests are the main operational cost.
