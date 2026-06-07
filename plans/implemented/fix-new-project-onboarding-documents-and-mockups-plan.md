# Plan: Fix New Project Onboarding Documents And Mockups

## Goal
Make the `/projects/new` flow create a usable project whose initial onboarding generation completes the expected documents and OpenRouter image mockups, then verify the real authenticated flow with Playwright.

## Assumptions
- The existing `.env.local` / `.env.e2e.local` files contain the needed Supabase, OpenRouter, and auth configuration.
- Existing uncommitted OpenRouter mockup work is intentional and should be preserved.
- The onboarding queue should include mockups after the MVP plan because mockups depend on MVP context.
- The wizard should not show the generic initial-documents failure when recoverable downstream work remains.

## Clarifying Questions
1. Should initial redirect wait only for Overview / Market Research, or should the loading screen wait for every bundled document including mockups?
2. Is the expected test account the one configured in `.env.e2e.local`, or is there another seeded account?
3. Should failed mockups block project creation, or should the project open with a retryable mockup failure?

## Recommended First Step
Reproduce the failure locally using the configured app and Playwright, then inspect the queue rows and server logs to identify whether the failing step is competitive research, document insertion, queue state, or OpenRouter image upload.

## Plan
1. Inspect the new-project onboarding code path and current tests.
2. Run focused tests around onboarding queue construction and OpenRouter mockup formatting to establish the current baseline.
3. Start the local app with the existing environment and reproduce project creation in Playwright using the available credentials.
4. Patch the smallest failing surface, likely queue construction/status mapping and/or OpenRouter image response parsing/storage handling.
5. Add or update focused tests for the regression.
6. Re-run tests, type/lint where practical, and use Playwright to confirm the authenticated project creation flow reaches the workspace and creates expected artifacts.
7. Record code review and security review notes, remediate any concrete issues, and update `PROJECT_CONTEXT.md` if architecture or dependencies change.

## Milestones
- Reproduction: The exact failing generation step is known from browser/server output.
- Implementation: Onboarding queue includes the expected document set and OpenRouter mockups save successfully.
- Verification: Automated tests pass and Playwright confirms a new project reaches the workspace without the generic failure.

## Validation
- `npm test` or focused Node tests for onboarding and mockup utilities.
- `npm run lint` or `npx tsc --noEmit` if time and repo state allow.
- Playwright browser run through login, `/projects/new`, intake answers, loading state, redirect, and workspace document/mockup presence.

## Risks And Mitigations
- Real OpenRouter image generation can be slow or expensive: Use one full end-to-end run only after focused local fixes pass.
- Supabase storage bucket or RLS may be missing in a local/preview DB: Verify bucket configuration and fail with a clear queue error instead of a generic UI error.
- Existing dirty files may include user work: Touch only files needed for this fix and review diffs before finalizing.
- Long generation can exceed route leases: Preserve queue retry/recovery behavior and avoid client-only assumptions.

## Open Decisions
- Whether mockup failure should block initial onboarding redirect.
- Whether initial onboarding should include tech specs as well as mockups.

## Critique

### Software Architect
- The queue must remain the source of truth. Adding mockups only in UI/status without a normalized queue item would create inconsistent recovery behavior.

### Product Manager
- Users expect a new project to include tangible mockups if the product promises them. If mockups are slower, the UX should show them as still generating rather than fail the whole project.

### Customer Or End User
- The current generic error does not say what failed or whether the project was created. The fix should leave users with a project they can open whenever the core overview is ready.

### Engineering Implementer
- The likely low-risk change is in `src/lib/onboarding-generation.ts`, supported by tests in `src/lib/generate-all-helpers.test.ts` or a new onboarding-focused test.

### Risk, Security, Or Operations
- OpenRouter and Supabase storage errors must not leak secrets. Image proxy ownership checks should remain mandatory for generated mockup assets.
