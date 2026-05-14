# Plan: Mockup Timeout And Retry Actions

## Goal
Reduce premature mockup generation failures on a Vercel Hobby deployment, and let users manually generate or retry individual workspace modules from both the left document rail and the right content module.

## Current Timeout Findings
- OpenRouter mockup image request timeout: `285,000 ms` / `285s` / `4m45s`, defined by `DEFAULT_IMAGE_TIMEOUT_MS` in `src/lib/openrouter-image-mockup-pipeline.ts`.
- Direct mockup route max duration: `300s` / `5m`, exported from `src/app/api/mockups/generate/route.ts`.
- Generate All/onboarding executor max duration: `300s` / `5m`, exported from `src/app/api/generate-all/execute/route.ts`.
- Workspace client request timeout: `300,000 ms` / `300s` / `5m`, used in `src/components/workspace/project-workspace.tsx` for both active-document generation and specific-document generation.
- Current execution shape: mockup generation runs the three options concurrently with `Promise.all(...)` in `src/lib/openrouter-image-mockup-pipeline.ts`.
- Practical issue: concurrency is good for wall-clock time, but each option can consume up to `4m45s`; that leaves only about `15s` for response overhead, streaming completion, Supabase Storage upload, DB insert, and route completion before the 5-minute Hobby envelope ends.

## Recommended Timeout
- Production deployment is Vercel Hobby, so do not rely on `600s` / `10m` function duration. Vercel Hobby is capped at `300s` / `5m`.
- Best effective Hobby solution: split mockup generation into option-level work so each function invocation generates and saves one mockup option, then the UI assembles the three saved options progressively.
- Keep the route/client envelope at `300s` for Hobby compatibility.
- Set the per-option OpenRouter image timeout below the hard function cap, recommended `255,000 ms` / `255s` / `4m15s`, leaving about `45s` for Supabase Storage upload, DB writes, streaming finalization, and response overhead.
- If a future deployment moves to Vercel Pro/Enterprise, a simpler timeout-only improvement could use a `600s` route/client envelope and `540,000 ms` image timeout. That is not the recommended Hobby implementation.

## Sequential Versus Concurrent Mockup Generation
- The current code generates the three mockup options concurrently, not one after another.
- Generating all three one by one inside a single Hobby function is not recommended. It would increase wall-clock time to roughly the sum of all three image generations, making the 5-minute cap more likely to fail.
- Generating one option per separate function invocation is different and is recommended for Hobby. Each option gets its own 5-minute envelope and can save independently.
- OpenRouter/image-model cost should be roughly the same if the same three images are generated, because the provider is still producing three images. The main cost difference is Vercel compute: three separate invocations can mean more aggregate function duration than one concurrent invocation, but Hobby reliability improves because each invocation has its own timeout budget and partial success is preserved.
- Best cost/reliability balance: keep three total concepts, generate each concept in its own invocation, show each option as it completes, and allow retrying only the failed option or failed module instead of regenerating already saved images.

## User Decisions
- Deployment plan: Vercel Hobby.
- Left rail behavior: show `Retry` for failed modules and `Generate` for missing idle modules.
- Overview and Market Research both map to `competitive`; both can show retry/generating/done for the same underlying document. Clicking either one should update both rail items because they share the same source document.

## Assumptions
- The immediate request is scoped to the visible workspace modules: Overview/Market Research, PRD, MVP Plan, Mockups, and Marketing.
- Manual retry should reuse existing direct generation endpoints instead of creating a new queue system.
- A successful manual retry should leave the old failed Generate All queue row alone, because existing display-state logic already treats saved content as `Ready` once the document exists.
- If a user manually retries a failed item, the UI should flip from `Needs retry` to `Generating` immediately.
- Missing idle modules should expose a manual `Generate` action in the left rail.
- Failed modules should expose a manual `Retry` action in both the left rail and right content module.
- For competitive generation, Overview and Market Research must stay visually synchronized because they share one source document.
- No new paid dependency is needed for the first implementation. A database migration may be needed if option-level mockup persistence cannot be represented cleanly in the existing `mockups.content`/`metadata` shape.

## Clarifying Questions
1. Answered: deployment is Vercel Hobby, so the implementation must work within a `300s` function cap.
2. Answered: left rail should show `Retry` for failed modules and `Generate` for missing idle modules.
3. Answered: Overview and Market Research may both show retry/generating/done together for the shared competitive document.

## Recommended First Step
Implement the manual Generate/Retry UI first, then refactor mockup generation to option-level saves for Hobby reliability. This avoids betting on a timeout increase that the production host cannot honor.

## Plan
1. Add named Hobby-compatible timeout constants for workspace generation and OpenRouter mockup image calls.
   - Keep `src/app/api/mockups/generate/route.ts` `maxDuration` at `300`.
   - Keep `src/app/api/generate-all/execute/route.ts` `maxDuration` at `300`.
   - Keep workspace client abort timers at `300000`.
   - Update `src/lib/openrouter-image-mockup-pipeline.ts` per-option default from `285_000` to `255_000`.
   - Update user-facing timeout copy to explain the 5-minute Hobby-safe limit.
2. Refactor mockup generation into option-level units.
   - Extract a reusable `generateAndStoreOption` path that can generate one option by label.
   - Save each generated option as it completes instead of waiting for all three options before any saved output exists.
   - Prefer preserving the existing final `mockups.content` shape for completed mockups; if partial option status cannot fit cleanly, add minimal metadata or a small companion persistence shape.
   - Let retries regenerate only missing or failed options where practical, not already saved options.
3. Adjust display-state precedence so `locallyGenerating[docType]` shows `Generating` even if the durable queue item is still in an error state.
   - Update `src/lib/document-generation-display-status.ts`.
   - Add or update focused tests if a local test surface exists for this pure helper.
4. Add manual Generate/Retry actions in the left rail.
   - Pass an `onGenerateDocument(docType)` callback from `ProjectWorkspace` into `AnchorNav`.
   - Render a compact `Retry` button inside `NavTab` when status is `needs_retry`.
   - Render a compact `Generate` button inside `NavTab` when the module is missing and idle.
   - Stop event propagation so clicking retry does not unexpectedly navigate unless we choose to navigate intentionally.
   - Keep Overview and Market Research synchronized by deriving both from `competitive` generation state.
5. Add manual retry actions in the right content module.
   - Pass the same callback into `ScrollableContent`.
   - Render a retry button in `GenerationStatusModule` when `state.displayStatus === "needs_retry"`.
   - Disable the button while that document is locally generating.
6. Reuse existing generation behavior for non-mockup modules.
   - In `ProjectWorkspace`, implement `handleGenerateDocument(docType)` around `checkPrerequisites(docType)` and `generateDocument(docType, defaultModel)`.
   - Refresh the specific document collection after success using the existing `generateDocument` refresh path.
   - Surface prerequisite and generation errors in plain language through existing alert behavior unless a toast pattern already exists nearby.
7. Update Generate All/onboarding mockup handling.
   - Keep the queue item as one `mockups` module from the user's perspective.
   - Internally generate/save mockup options in separate Hobby-safe invocations or resumable option-level calls.
   - Mark the mockups module done when all required options exist; mark partial/needs retry when one or more options fail.
8. Update `PROJECT_CONTEXT.md`.
   - Document the Hobby-safe mockup generation strategy, per-option timeout, and visible Generate/Retry behavior.

## Milestones
- [x] Hobby-safe timeout constants updated and user-facing timeout copy correct.
- [x] Manual mockup generation uses option-level invocations before finalizing one canonical mockup document.
- [x] Missing idle modules can be generated from the left rail.
- [x] Failed queue item can be retried from the left rail.
- [x] Failed queue item can be retried from the right module.
- [x] Manual retry visibly changes the failed module to generating, then ready after saved content loads.
- [x] Overview and Market Research move together when either shared retry/generate action is clicked.
- [x] Project context reflects the new behavior.
- [ ] Browser visual verification completed. Blocked in this session because the browser automation Node REPL surface was unavailable and the workspace requires authenticated project data.
- [x] Final lint/build verification completed.

## Validation
- Run the focused pure helper tests if present or add a small test for `buildDocumentGenerationDisplayStates`.
- Run TypeScript and/or lint checks for touched files.
- Start the dev server and visually confirm the left/right retry buttons by forcing a mock `needs_retry` display state or using an existing failed queue row.
- Visually confirm the left rail `Generate` button appears for missing idle modules.
- Visually confirm Overview and Market Research both show generating/done when competitive generation is started from either rail item.
- For the mockup path, confirm configured timeout values are Hobby-safe by code inspection and focused tests; avoid actually waiting 4-5 minutes in normal verification.
- For option-level mockups, test partial success behavior with one mocked option failure and confirm retry does not regenerate already saved options.

## Risks And Mitigations
- Vercel Hobby cannot exceed 300s: keep route/client limits at 5 minutes and move reliability gains to option-level persistence/retry.
- Option-level generation may increase aggregate Vercel function duration versus one concurrent invocation: acceptable tradeoff for reliability on Hobby; provider/image cost remains roughly the same for the same three images.
- Sequential generation inside one request would worsen timeout risk: avoid this.
- A failed Generate All queue row may still exist after manual retry: saved content wins in display-state logic, so the user sees `Ready`; later queue cleanup can be separate.
- Duplicate generation risk: existing active-document policy should skip if content already exists.
- Button duplication for Overview and Market Research is intentional; both represent the same failed competitive document and should stay synchronized.

## Rollback Or Recovery
- Revert the OpenRouter image timeout constant from `255_000` to `285_000` if the shorter Hobby-safe buffer causes more provider aborts than route-level failures.
- Keep `maxDuration` exports at `300` for Hobby; no `600` rollback should be needed.
- Remove the retry callback props from `AnchorNav` and `ScrollableContent`.
- Revert `document-generation-display-status` precedence if local generation should no longer override queue errors.
- If option-level persistence requires a migration, include a backward-compatible migration and a code rollback path that can still render existing completed `mockups.content`.

## Open Decisions
- Decide whether option-level mockup state should live in `mockups.metadata`, in partial `mockups.content`, or in a small companion table.
- Decide whether the UI should start all three option-level mockup invocations at once or run a limited concurrency of two. Recommendation: start all three as separate invocations for fastest wall-clock on Hobby, unless provider rate limits suggest limiting to two.

## Critique

### Software Architect
- The direct retry path is pragmatic for non-mockup modules because it reuses existing generation routes and active-document singleton policy. Mockups need a slightly better boundary: option-level generation is a real architectural improvement because it matches the host's 5-minute ceiling and preserves partial success.

### Product Manager
- Visible Generate/Retry buttons directly address the user's blocked state. Progressive mockup completion is better than waiting for all three concepts because users can see partial progress and only retry what failed.

### Customer Or End User
- The experience should be obvious: if a module is missing, the rail says `Generate`; if it failed, the rail and body say `Retry`. For Overview and Market Research, both should visibly move together because they are two views of one competitive-analysis document.

### Engineering Implementer
- The highest-risk UI detail is state precedence: if queue errors keep winning over local generation flags, the button click will work but the UI will still look failed. The highest-risk backend detail is partial mockup persistence; keep that implementation narrow and backward-compatible.

### Risk, Security, Or Operations
- Longer function durations do not solve the production problem on Hobby. Keep auth and ownership checks in existing routes, do not expose storage paths beyond the existing authenticated mockup image proxy, and avoid provider-cost surprises by not regenerating already completed mockup options.
