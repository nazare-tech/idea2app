# Plan: Resume Downstream Documents After Retry

## Goal
Fix the workflow where retrying a failed Product Plan from the workspace generates the Product Plan but leaves downstream First Version Plan and Design Mockups stranded. A successful retry of an upstream document should update or resume the durable generation queue so remaining dependent documents continue automatically.

## Assumptions
- The reported case is an onboarding/generate-all queue that ended in `partial` or `error` with Product Plan failed and dependent items marked `blocked`.
- The right-panel and left-nav Retry actions currently call one-off `generateDocument(docType, model)`, not the durable Generate All resume action.
- Existing active-document policy should remain authoritative: if Product Plan now exists, the queue should skip or link Product Plan rather than generating a duplicate active Product Plan.
- We should not delete queue rows or overwrite saved documents.

## Clarifying Questions
1. Should right-panel Retry for a queue-backed failed document resume the whole remaining queue immediately?
   - Recommendation A: Yes, resume the durable queue after the one-off retry succeeds.
   - Trade-off: Matches the user expectation and preserves the manual Retry behavior; requires a small bridge from one-off generation back to Generate All.
   - Recommendation B: Make Retry call the durable queue first instead of one-off generation.
   - Trade-off: Cleaner queue ownership, but changes the visible retry path and may be harder to keep responsive for a single document card.
2. Should the same behavior apply when retrying Market Research or First Version Plan, not only Product Plan?
   - Recommendation A: Apply it generically to queue-backed visible documents.
   - Trade-off: Fixes the whole dependency chain consistently; slightly broader blast radius.
   - Recommendation B: Scope only to Product Plan.
   - Trade-off: Minimal behavioral change, but leaves the same class of bug for Market Research -> Product Plan and First Version Plan -> Mockups.
3. Should blocked downstream items become `pending` in the saved queue once their dependency content exists?
   - Recommendation A: Yes, reset blocked descendants to `pending` and set queue status back to `running`.
   - Trade-off: Directly restores automatic execution and makes status polling honest.
   - Recommendation B: Leave DB status untouched and only start a fresh manual queue.
   - Trade-off: Less migration logic, but loses the original onboarding run continuity and may confuse queue history.

## Recommended First Step
Add a focused failing test around queue service behavior: when `prd` has active saved content and downstream `mvp`/`mockups` are blocked, the queue should mark/link `prd` as skipped or done and reset downstream blocked descendants to pending.

## Plan
1. Add queue-service helper coverage for syncing an active upstream document into a failed queue and unblocking dependent items.
2. Implement the smallest backend helper or endpoint needed to mark/link active document outputs and reset blocked descendants without deleting queue rows.
3. Wire successful individual document generation in `ProjectWorkspace` to resume the existing durable queue when the queue is terminal or stranded.
4. Run focused tests, typecheck or lint where practical, and verify in the in-app browser that retrying Product Plan shows downstream documents as queued/generating rather than requiring manual Generate.
5. Record implementation and security review notes, then remediate findings before finalizing.

## Milestones
- Failing test: A blocked `mvp`/`mockups` queue remains stranded before the fix.
- Backend fix: Saved Product Plan can be linked into the queue and dependent blocked items reset.
- Client fix: Right-panel/left-nav Retry can trigger durable continuation after successful one-off generation.
- Verification: Focused tests pass and local UI shows downstream continuation.

## Validation
- Run focused node tests for `generation-queue-service` and any new route/helper tests.
- Run `npm run typecheck` if the change touches route/client types.
- Use the Codex in-app browser on the Verified PAWS workspace or a fixture path to confirm Product Plan retry no longer leaves First Version Plan and Mockups idle.

## Implementation Notes
- Added `shouldResumeQueueAfterDocumentRetry()` to detect terminal queue-backed retries that have resettable downstream dependents.
- Wired successful individual workspace generation to call the existing durable Generate All resume path when the helper identifies a stranded dependency chain.
- Allowed `startGenerateAll()` to reconcile stale terminal queues even when all documents now appear saved locally.
- Added tests for the retry-resume helper and the queue reset helper.

## Verification Results
- Focused queue tests passed.
- `npm run typecheck` passed.
- `npm run lint` passed with existing warnings only.
- `git diff --check` passed.
- Full `npm test` still fails on unrelated existing prompt-contract assertions in `src/lib/planning-prompts.test.ts`.

## Risks And Mitigations
- Risk: Accidentally generating duplicate active Product Plans.
  - Mitigation: Use `active-document-policy.ts` to link existing outputs as skipped, and keep existing duplicate prevention in `/api/generate-all/execute`.
- Risk: Restarting a queue while another generation is already running.
  - Mitigation: Only resume when the queue is terminal/stranded, and keep existing `/api/generate-all/start` conflict behavior.
- Risk: Resetting unrelated failed docs.
  - Mitigation: Reset only descendants in the dependency graph or only resettable items whose dependencies have become satisfiable.
- Risk: UI state races after the one-off document save.
  - Mitigation: refresh the saved document first, then trigger queue resume/polling.

## Rollback Or Recovery
Revert the client bridge and backend helper/endpoint. Existing saved documents and queue rows remain intact; users can still use the existing global Generate All Retry button or individual Generate buttons.

## Open Decisions
- Decision: Use Recommendation A for question 1. A successful right-panel or left-nav Retry should resume the durable queue after the one-off document generation succeeds.
- Decision: Use Recommendation A for question 2. Apply the behavior generically to queue-backed visible documents, not only Product Plan.
- Decision: Use Recommendation A for question 3. Once dependency content exists, reset blocked downstream queue items to `pending` and set the queue back to `running` so execution continues.

## Critique

### Software Architect
- The core issue is queue ownership drift: one-off generation creates content but does not update the queue state that drives the workflow. The fix should centralize queue reconciliation server-side rather than relying only on client status cosmetics.

### Product Manager
- The expected product behavior is clear: retrying the failed prerequisite should continue the onboarding pipeline. Making users discover separate Generate buttons for each dependent document is avoidable friction.

### Customer Or End User
- The UI currently implies the system is smart enough to know Product Plan is ready, but then asks for manual action. The fixed flow should make the next document visibly queued or generating after retry succeeds.

### Engineering Implementer
- The safest implementation is a small queue reconciliation helper plus a client trigger after successful one-off generation. Avoid broad changes to the document-generation pipelines or the active-document singleton policy.

### Risk, Security, Or Operations
- The route must preserve ownership checks, avoid trusting client-supplied queue authority fields, and never expose or mutate another user's queue. No secrets or new external calls are needed.
