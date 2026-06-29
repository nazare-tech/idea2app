# Plan: Live Artifact Refresh

## Goal
Fix the project workspace so generated downstream artifacts render their saved content as soon as background onboarding or Generate All marks them complete, without requiring a manual browser refresh.

## Assumptions
- The bug is caused by generation queue status changing to `done` before the corresponding lazy-loaded document collection has been refreshed in client state.
- The affected document types are PRD, MVP plan, mockups, and likely any later generated document that uses the same queue-aware workspace display path.
- The existing durable queue polling should remain the source of truth for progress, while saved document payloads should be refreshed when a queue item transitions to `done`.

## Clarifying Questions
1. Should a completed queue item with missing content show `Ready` briefly, or should it show a loading/retrieving state until content arrives?
2. Should the workspace fetch only newly completed document types, or refresh all visible document collections after each completion?
3. Is it acceptable to add a focused unit test around the display-state helper and/or a hook-level behavior test if the current test setup supports it?

## Recommended First Step
Inspect the workspace polling and display-state logic to confirm where queue `done` becomes visible before document content is loaded, then add a focused regression test for that exact state.

## Plan
1. [x] Reproduce the state transition in code: queue item becomes `done`, `hasContent` is false, loaded document collection is stale.
2. [x] Add or adjust a focused test so queue `done` without loaded content does not permanently render a contentless `Ready` state.
3. [x] Update the workspace refresh callback so newly completed queue steps force-load the corresponding document collections, not only trigger `router.refresh()`.
4. [x] Keep display state honest while content is being fetched: avoid showing a static `Ready` placeholder when the queue says done but the client has not loaded content.
5. [x] Run focused tests and a type/lint check that covers the touched files.

## Milestones
- Regression captured: a test fails or an explicit validation case demonstrates the current bug.
- Client refresh fixed: completed queue items force-load their saved documents.
- UI state fixed: sections do not get stuck as `Ready` with no content.
- Verification complete: focused tests pass and touched TypeScript compiles.

## Validation
- Run the focused document generation display-state tests if present, or add one under `src/lib`.
- Run the closest workspace/generation tests available.
- Run `npm run lint` or a narrower TypeScript check if full lint is too broad for the repo state.
- Manually reason through the onboarding flow: Overview and Market Research load, PRD completion triggers a forced PRD fetch, then MVP and mockups follow the same path.

## Risks And Mitigations
- Extra network load from refreshes: refresh only completed document types when possible.
- Race between queue status and database visibility: fetch with `cache: "no-store"` and keep a retry/loading state if content is not present on the first poll.
- Existing dirty files: leave unrelated local changes untouched.

## Rollback Or Recovery
- Revert the workspace refresh callback and display-state helper changes.
- Since this is client-side state behavior only, rollback should not require database migrations or data recovery.

## Open Decisions
- Decision: A completed queue item with missing client content should show a loading/retrieving state, not `Ready`.
- Decision: Refresh the newly completed document types first, with router refresh preserved as a secondary update for surrounding server data.

## Critique

### Software Architect
- The current split between queue status and lazy document loading is sound, but the UI needs an explicit bridge between “the queue finished” and “the saved document is now in client state.”

### Product Manager
- Users interpret `Ready` as “click/read now,” so a contentless Ready state breaks trust at the exact moment the product is trying to feel magical.

### Customer Or End User
- The desired behavior is simple: when PRD, MVP, or mockups finish, the section should open with the generated content already there.

### Engineering Implementer
- The smallest likely fix is in `ProjectWorkspace` and `document-generation-display-status`, with tests around the pure status helper. Avoid broad generation pipeline changes unless inspection proves the server is failing to save.

### Risk, Security, Or Operations
- This does not appear to touch auth, secrets, RLS, or external API calls. The main operational risk is over-polling, so refreshes should stay targeted and cache-disabled.
