# Plan: Document Generation Status States

## Goal

Implement durable document generation states in the project dashboard so queued, generating, streaming, completed, and failed documents remain clear across onboarding, refreshes, and navigation.

## Assumptions

- The existing `generation_queue_items` data surfaced by `GET /api/generate-all/status` remains the source of truth for per-document queue status.
- PRD and MVP can show live markdown only when an active stream preview is available in the current session; after refresh, durable queue state is enough until saved content arrives.
- Mockup option-level progress should not be faked. If the backend does not expose individual option progress, the UI shows one Mockups loading state.
- No new dependency is needed.

## Clarifying Questions

1. Should mockup option-level progress be added later as a deeper backend pipeline change if the current pipeline cannot report real per-option states?

## Recommended First Step

Create a pure status-mapping helper with tests. It will merge content existence, queue items, local generation flags, and optional stream preview state into a stable display model for the left and right panels.

## Plan

1. [x] Add a tested status-mapping helper for `idle | ready | queued | generating | streaming | needs_retry`.
2. [x] Hydrate queue state into `ProjectWorkspace` from the existing Generate All store.
3. [x] Pass richer status objects into `AnchorNav` and `ScrollableContent`.
4. [x] Update the left panel status slot to show compact labels and icons.
5. [x] Add right-panel queued/generating/streaming/failed placeholder modules.
6. [x] Preserve PRD/MVP live markdown previews when current-session stream content is available.
7. [x] Run focused tests and the best available project verification.

## Milestones

- Status mapping: unit tests cover content-overrides-queue, pending, generating, streaming, and error states.
- Dashboard wiring: refresh/navigation state derives from queue hydration, not local flags alone.
- UI states: left and right panels show consistent queued/generating/ready/needs retry states.

## Validation

- Run focused status helper tests.
- Run TypeScript/lint or the closest available project checks.
- Start the local app if practical and inspect the dashboard states visually.

## Risks And Mitigations

- Risk: Existing Generate All store only polls while status is `running`.
  Mitigation: Preserve current behavior and ensure hydration/status display uses whatever queue row is returned; adjust polling only if active queue items are present.
- Risk: PRD/MVP background server generation may not expose live stream tokens after redirect.
  Mitigation: Show streaming only for active-session preview; otherwise show durable generating state.
- Risk: Mockup option progress cannot be known from current backend.
  Mitigation: Do not invent per-option readiness; show single loading state.

## Rollback Or Recovery

Revert the feature branch commit. The previous dashboard behavior is content-based plus local generating flags.

## Open Decisions

- Mockup option progress requires a later backend enhancement if the current pipeline needs to expose real per-option events.
- Server-side onboarding PRD/MVP token streaming requires a later backend persistence/broadcast enhancement if partial text must survive refresh and appear during background queue execution. This implementation renders live preview when a real active-session stream preview is available and otherwise falls back to durable queue status.

## Critique

### Software Architect

- The helper should stay pure and shared so status rules do not drift between nav and content.
- Avoid adding another polling endpoint unless the existing store cannot provide stable queue state.

### Product Manager

- The implementation favors clarity over full token streaming everywhere, matching the spec and avoiding noisy dashboard content.

### Customer Or End User

- Users should no longer see static empty modules while the queue is doing work.
- PRD/MVP streaming improves perceived progress but must not become confusing after refresh.

### Engineering Implementer

- Keep edits tightly scoped to the workspace/nav/content components and a small helper.
- Prefer existing icons and loading patterns.

### Risk, Security, Or Operations

- No secrets or new external calls are needed.
- Queue data must remain server-authoritative; browser state cannot decide billing or generation authority.
