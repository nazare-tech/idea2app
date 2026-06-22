---
implemented: false
implemented_at:
implementation_summary:
---

# Plan: Project Creation Document Streaming

> Current revalidation, 2026-06-22: this is still a future backend streaming plan. It is separate from the implemented local-only Project Animation Lab in `src/app/dev/project-animation-lab`, which simulates block reveal with static fixtures and does not add durable partial-document streaming to onboarding or the workspace.

## Goal
Show users live generated document text while a new project is being created, without weakening the existing durable onboarding queue. The desired outcome is that the `/projects/new` loading screen can show the active document being written, and the workspace can continue showing preview text for queued documents that are still generating after the initial Market Research redirect.

## Current State
- `POST /api/projects/create-from-intake` validates intake, creates the project, inserts `project_intakes`, creates `generation_queues` plus `generation_queue_items`, and returns `statusUrl` plus `generationRunId`. It does not generate document content.
- `POST /api/generate-all/execute` is the worker. It claims queue items, calls `generateProjectDocument`, waits for the full document, inserts the final row, then marks the queue item done.
- `runCompetitiveAnalysis`, `runPRD`, `runMVPPlan`, and `runTechSpec` already support `StreamCallbacks` and set `stream: true` when `onToken` is supplied.
- The durable queue path does not pass callbacks, so OpenRouter streaming is currently disabled for onboarding and Generate All.
- `GET /api/projects/[id]/onboarding-status` returns row progress and redirect readiness, not partial content.
- `IntakeSubmissionLoadingPanel` renders fake progress rows only.
- `ProjectWorkspace` has stream parser scaffolding for manual generation, but callbacks are no-ops and streamed tokens are discarded.

## Assumptions
- We want durable streaming previews that survive refreshes and the redirect from `/projects/new` into the workspace.
- Final saved document tables remain authoritative. Partial text is preview-only and can be discarded or overwritten after completion.
- Text streaming applies to Market Research's OpenRouter synthesis step, Product Plan, First Version Plan, and Tech Spec if needed. Mockups should remain progress/status-only because image generation does not produce useful markdown tokens.
- No new frontend dependency should be required.

## Clarifying Questions
1. Should project creation wait longer on the loading screen, or redirect as soon as Market Research is ready like it does today?
   - Recommendation A: Keep the current redirect after saved v2 Market Research.
   - Trade-off: Preserves fast workspace entry and lets remaining docs stream in workspace; users may see only Market Research streaming on the creation screen.
   - Recommendation B: Keep the user on the creation screen until Product Plan or all documents are done.
   - Trade-off: Gives one continuous "building your brief" experience, but increases perceived wait time and blocks access to already-ready content.

2. Should the first implementation use polling or true SSE?
   - Recommendation A: Start with persisted preview snapshots returned by existing polling endpoints.
   - Trade-off: Simpler, durable, fits current 2-3 second polling model; less "token-by-token" feeling.
   - Recommendation B: Add an SSE endpoint for subsecond updates.
   - Trade-off: Feels more live, but adds connection lifecycle complexity and still needs persistence for refresh/retry.

3. Where should partial content be stored?
   - Recommendation A: Add a `generation_document_streams` table keyed to `generation_queue_items`.
   - Trade-off: Clean boundary, avoids bloating queue rows, supports later SSE and audit/debugging; requires migration and database type updates.
   - Recommendation B: Add `stream_preview` JSON/text columns to `generation_queue_items`.
   - Trade-off: Faster to implement, but queue rows become heavy and status polling responses can grow awkwardly.

4. How much partial text should the API return?
   - Recommendation A: Return a capped latest preview, for example last 20,000-40,000 characters plus `sequence`.
   - Trade-off: Keeps responses manageable and enough for visual progress; very long documents will not show from the beginning unless the UI stores prior chunks locally.
   - Recommendation B: Return full accumulated preview text.
   - Trade-off: Simpler client rendering, but repeated polling of large markdown can become expensive and slow.

5. Should incomplete markdown render through production document renderers?
   - Recommendation A: Render partial text with a lightweight live markdown/text preview, then switch to production renderers after save.
   - Trade-off: Stable during malformed/incomplete markdown; preview is less polished than final structured blocks.
   - Recommendation B: Feed partial content into existing Market Research, PRD, and MVP block renderers.
   - Trade-off: More visually faithful when it works, but partial headings/tables are likely to break or flicker.

6. Should manual document generation also show stream previews now?
   - Recommendation A: Include manual generation as a small follow-up after onboarding preview is working.
   - Trade-off: Reuses the same UI primitives and fixes existing no-op callbacks, but broadens test scope.
   - Recommendation B: Keep this strictly onboarding-only first.
   - Trade-off: Lower risk and faster delivery, but leaves an inconsistent manual generation experience.

## Recommended First Step
Implement a small vertical slice for Market Research only: persist streamed tokens for the active onboarding queue item, expose the latest preview through `/api/projects/[id]/onboarding-status`, and render that preview in `IntakeSubmissionLoadingPanel`. This validates the end-to-end data path before expanding to Product Plan, First Version Plan, and workspace continuation.

## Recommended Architecture
Use persisted preview snapshots first, not direct client streaming from `/api/generate-all/execute`.

The durable queue is the right owner of document generation. Since the browser fires `/api/generate-all/execute` and then polls, the client cannot rely on holding the OpenRouter stream connection directly. The worker should consume the OpenRouter stream, periodically persist accumulated preview text, and expose preview snapshots through authenticated read endpoints.

Recommended backend shape:
- New table: `generation_document_streams`
  - `id uuid primary key`
  - `queue_item_id uuid references generation_queue_items(id) on delete cascade`
  - `queue_id uuid references generation_queues(id) on delete cascade`
  - `project_id uuid references projects(id) on delete cascade`
  - `user_id uuid references auth.users(id) on delete cascade`
  - `run_id text`
  - `doc_type text`
  - `status text check ('streaming','completed','error','cancelled')`
  - `content text not null default ''`
  - `sequence integer not null default 0`
  - `stage_message text`
  - `error text`
  - timestamps
  - RLS select policy: `auth.uid() = user_id`
  - No direct client insert/update/delete policies
- New service helpers in `src/lib/generation-document-stream-service.ts`
  - create/reset stream row on item claim
  - append/replace content with throttling
  - update stage/status/error
  - fetch active/latest previews for a queue/run
- Extend `generateProjectDocument` to accept `callbacks?: StreamCallbacks`.
- In `/api/generate-all/execute`, build callbacks per claimed item:
  - `onStage`: update queue item `stage_message` and stream row `stage_message`
  - `onToken`: append to an in-memory buffer and flush to DB every 500-1000ms or every N characters
  - completion: mark stream completed only after final canonical insert succeeds
  - failure/cancel: mark stream error/cancelled
- Extend `/api/projects/[id]/onboarding-status` to include:
  - `activePreview?: { docType, label, status, content, sequence, stageMessage, updatedAt }`
  - optionally `previews?: Record<DocumentType, ...>` for workspace continuity
- Extend `/api/generate-all/status` similarly so the workspace store can continue displaying previews after redirect.

## UI Changes
1. `IdeaIntakeWizard`
   - Extend `OnboardingStatusPayload` with `activePreview`.
   - Store `creationPreview` in state.
   - Poll at the existing cadence initially; consider 1000ms while a preview is actively changing.
   - Pass preview props into `IntakeSubmissionLoadingPanel`.

2. `IntakeSubmissionLoadingPanel`
   - Keep the existing progress rows.
   - Add a right-side or below-row live preview pane inside the same main white surface.
   - Show active document label, stage message, and a streaming cursor.
   - Render partial content as lightweight markdown or safe text, not the structured production document renderer.
   - Empty state copy should stay operational, e.g. "Waiting for the first draft..." rather than explaining implementation.

3. `generate-all-store`
   - Add `streamPreviews: Partial<Record<DocumentType, StreamPreview>>`.
   - Update previews from `/api/generate-all/status`.
   - Clear a preview when its document becomes `done` or `skipped` and `onStepComplete` refreshes saved content.

4. `ProjectWorkspace`
   - Read preview state from the store.
   - Pass preview content into `scrollableDocuments`.
   - For manual generation, either wire `parseDocumentStream` callbacks into the same preview state or explicitly defer that to a follow-up.

5. `ScrollableContent`
   - When `content` is missing and a `streamContent` preview exists, render `GenerationStreamPanel` or a lighter `DocumentStreamPreview`.
   - Do not invoke `CompetitiveOverviewSection`, `CompetitiveDetailSection`, `PrdDocumentBlocks`, or `MvpPlanDocumentBlocks` on partial content.

6. `AnchorNav`
   - Optional: show a more specific active state like `Writing` while `streamPreview.sequence > 0`.
   - Avoid adding new states until the preview data path is stable.

## API Changes
1. `POST /api/generate-all/execute`
   - Create/reset a stream row when an item is claimed.
   - Pass stream callbacks to `generateProjectDocument`.
   - Persist throttled token updates.
   - Finalize stream row after final document save.

2. `GET /api/projects/[id]/onboarding-status`
   - Include the current active preview for the requested `runId`.
   - Keep existing `readyToRedirect` behavior unchanged unless a decision says otherwise.

3. `GET /api/generate-all/status`
   - Include previews for currently generating queue items.
   - Keep queue status backwards-compatible.

4. Optional future endpoint
   - `GET /api/projects/[id]/onboarding-stream?runId=...`
   - Emits SSE events from persisted preview snapshots.
   - Treat this as a phase-two enhancement after polling proves correct.

## Plan
1. Backend schema and types
   - Add a Supabase migration for `generation_document_streams`.
   - Update `src/types/database.ts`.
   - Add stream service helpers with tests for append throttling and ownership-safe query shape where practical.

2. Queue streaming vertical slice
   - Extend `generateProjectDocument` to accept callbacks.
   - Wire callbacks in `/api/generate-all/execute`.
   - Stream Market Research synthesis into the stream table.
   - Validate canonical final document insertion still wins.

3. Onboarding status API
   - Add active preview to `/api/projects/[id]/onboarding-status`.
   - Add focused tests or route-helper tests for response shape and run-id filtering.

4. Creation loading UI
   - Extend `IdeaIntakeWizard` state and polling.
   - Add preview UI to `IntakeSubmissionLoadingPanel`.
   - Add/adjust component tests for preview, empty preview, error, and done states.

5. Expand to Product Plan and First Version Plan
   - Pass callbacks for `runPRD` and `runMVPPlan`.
   - Ensure dependency sequencing and saved-content refresh still behave.

6. Workspace continuation
   - Extend `/api/generate-all/status` and `generate-all-store` with previews.
   - Render preview content in `ScrollableContent` until saved content is loaded.
   - Clear previews after completed docs refresh.

7. Review, security, and documentation
   - Update `PROJECT_CONTEXT.md` because this changes generation architecture.
   - Run tests, typecheck, and browser verification.
   - Record code/security review findings in `plans/project-creation-document-streaming-review.md`.

## Milestones
- Vertical slice: Market Research preview appears on the creation loading screen while the queue is running.
- Text document coverage: Market Research, Product Plan, and First Version Plan all persist and expose previews.
- Workspace continuity: after redirect, still-generating downstream documents show previews in their workspace sections.
- Production readiness: migration, tests, typecheck, browser verification, review notes, and `PROJECT_CONTEXT.md` update are complete.

## Validation
- Unit tests:
  - `src/lib/analysis-pipelines.ts` callbacks still accumulate final content correctly.
  - stream service creates, appends, truncates/caps, finalizes, and errors predictably.
  - onboarding status maps active preview into the response only for the authorized project/run.
  - display-state/store tests cover preview clearing on done.
  - `IntakeSubmissionLoadingPanel` renders preview content and fallback states.
- Integration/manual:
  - Create a project locally with fixture or mocked AI path if available.
  - Confirm loading screen shows progress rows and live preview.
  - Confirm redirect still happens when v2 Market Research is saved.
  - Confirm Product Plan/First Version Plan previews continue in workspace if generation is still active.
  - Confirm refresh during generation restores preview from persisted state.
- Commands:
  - `npm test`
  - `npm run typecheck`
  - `npm run lint`
  - Browser verification through the Codex in-app browser.

## Risks And Mitigations
- Large repeated polling payloads: cap preview content, throttle DB writes, and return only active previews by default.
- Database write amplification: flush token buffers every 500-1000ms or after a character threshold, not per token.
- Incomplete markdown flicker: render partials with a simple preview renderer, not production structured blocks.
- Queue retries may show stale content: reset stream rows per queue item attempt and include `attempt` or sequence reset semantics.
- Cross-user data leakage: enforce project ownership in read routes and RLS on the stream table.
- Final content mismatch: treat previews as non-authoritative and always switch to saved canonical document rows.
- Provider streams can fail mid-response: mark preview error, show retry UI, and preserve existing queue retry behavior.

## Rollback Or Recovery
- Feature flag the preview response/rendering if needed, for example `ENABLE_ONBOARDING_DOCUMENT_STREAM_PREVIEW`.
- If preview persistence causes issues, stop passing callbacks in `/api/generate-all/execute`; generation returns to completion-only behavior.
- The new stream table can be left unused without affecting canonical document tables.
- Existing queues remain compatible because queue item schema and saved output tables remain authoritative.

## Open Decisions
- Polling first or SSE immediately.
- Keep current Market Research redirect or hold users longer on the creation screen.
- Exact preview cap size.
- Whether manual document generation should be included in the first implementation.
- Whether previews should be retained after completion for debugging or cleared/pruned quickly.

## Critique

### Software Architect
- The clean architecture is a separate preview table because queue items are orchestration state, not content storage. The biggest design risk is coupling live preview too tightly to queue polling; keep the service boundary separate so SSE can be added later.

### Product Manager
- The strongest product value is reducing uncertainty during the long wait, not showing every token. A readable active preview plus honest stage messages is enough for v1.

### Customer Or End User
- Users should not have to understand that Market Research streams only after competitor search/extraction finishes. The UI needs a good "researching sources" state before first text arrives.

### Engineering Implementer
- The smallest safe slice is Market Research only. Trying to solve creation loading, workspace continuation, manual generation, and SSE in one pass will make failures hard to isolate.

### Risk, Security, Or Operations
- Partial text may contain user idea details and generated strategy, so it must be protected exactly like final documents. Use RLS, owner-scoped routes, capped payloads, and no console logging of preview content.
