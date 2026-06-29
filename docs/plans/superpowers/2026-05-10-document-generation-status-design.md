# Document Generation Status Design

## Summary

Improve the onboarding and project dashboard generation experience by showing durable, high-level progress states for every generated document. After the idea brief is submitted and the user lands in the dashboard, documents that are still queued or generating must no longer look static or empty.

This design uses the existing server-side generation queue as the source of truth and presents compact status in the left panel plus explanatory loading modules in the right panel.

## Goals

- Show clear progress for Overview, Market Research, PRD, MVP Plan, Mockups, and Marketing during onboarding generation.
- Keep the left navigation compact and scannable.
- Show active loading animation and status text in the right content panel for modules that are queued or generating.
- Stream PRD and MVP Plan text into the right panel while those documents are actively generating.
- Show mockup-level progress states in the Mockups panel when the backend can expose per-option progress.
- Derive dashboard status from durable queue state, not only local browser flags.
- Keep left-panel and right-panel states stable across refresh, browser back/forward, and returning to the project page.
- Preserve the current check mark behavior for completed documents.

## Non-Goals

- Do not stream full document tokens into every dashboard module; streaming is limited to PRD and MVP Plan.
- Do not redesign the whole dashboard layout.
- Do not add new generated document types.
- Do not change the document dependency graph.

## User Experience

### Left Panel

Each document row keeps the existing status slot on the right side.

Supported labels:

- `Queued`: document is pending, blocked by dependency, or waiting for its turn.
- `Generating`: document is actively being generated.
- `Ready`: represented by the existing check mark.
- `Needs retry`: document failed or became blocked.

Behavior:

- Pending or dependency-waiting documents show a compact `Queued` label, using the current hollow-circle position as the anchor.
- Active documents show a circular loading animation with the `Generating` label.
- Completed documents show the existing check mark.
- Failed documents show a small warning treatment with `Needs retry`.

The left panel intentionally avoids dependency-specific copy such as `Waiting on PRD`; that detail belongs in the right panel.

### Right Panel

Each document module renders one of three states before real content exists:

- Queued state: calm placeholder with text like `Queued` and explanatory copy.
- Generating state: circular loading animation, stage text, and subtle skeleton rows.
- Failed state: recovery copy and retry affordance where the existing queue flow supports retry.

PRD and MVP Plan have one additional active-generation behavior:

- Before the first streamed text is available, show the generating loading state.
- Once text starts arriving, stream the partial markdown into the module body.
- Keep the circular loading animation visible while the document is still generating.
- When the saved document is ready, replace the streamed preview with the canonical saved content from the database.

Mockups do not stream partial image/content output. The Mockups panel stays in a loading/progress state until generated mockups are ready to display. If the backend can report individual mockup option progress, the panel should show three option rows such as `Concept 1`, `Concept 2`, and `Concept 3` with `Queued`, `Generating`, and `Ready` states.

Example state copy:

- PRD generating: `Drafting product requirements`
- PRD streaming: `Drafting product requirements` plus the live markdown preview
- MVP queued: `Queued`
- MVP detail text: `This will start automatically after PRD is ready.`
- MVP streaming: `Planning launchable scope` plus the live markdown preview
- Mockups queued: `Queued`
- Mockups detail text: `Visual directions will generate after the MVP plan is ready.`
- Mockups generating: `Generating visual directions`
- Marketing queued: `Queued`
- Marketing generating: `Mapping launch channels`

When content exists, the module renders the real document content as it does today.

## State Model

The UI maps backend queue statuses into a smaller display model.

| Queue/document condition | Left label | Right panel state |
| --- | --- | --- |
| Content exists | Check mark | Real content |
| PRD or MVP queue item is `generating` before first streamed text | Generating | Active loading module |
| PRD or MVP queue item is `generating` with streamed text | Generating | Live markdown preview plus loading indicator |
| Non-text queue item status is `generating` | Generating | Active loading/progress module |
| Queue item status is `pending` | Queued | Queued placeholder |
| Queue item status is `blocked` | Needs retry | Failed placeholder with dependency/error detail |
| Queue item status is `error` | Needs retry | Failed placeholder |
| Queue item status is `cancelled` | Needs retry | Cancelled placeholder with resume/retry copy |
| Queue item status is `skipped` with output | Check mark | Real content or existing output |

For onboarding, dependency-specific right-panel text should be derived from known document dependencies:

- PRD waits on Competitive Research.
- MVP Plan waits on PRD.
- Mockups wait on MVP Plan.
- Marketing can run independently.

Streaming preview state is subordinate to durable queue state. If the user refreshes or returns to the project and partial text cannot be resumed, the UI must still show the durable `Generating` or `Queued` state from the queue rather than reverting to an empty document state.

## Data Flow

The dashboard should use the durable generation queue as the source of truth.

Current useful pieces:

- `generation_queue_items`: authoritative per-document queue status.
- `GET /api/generate-all/status`: returns normalized queue data for dashboard generation.
- `src/stores/generate-all-store.ts`: hydrates and polls queue status.
- `src/components/workspace/generate-all-hydrator.tsx`: keeps queue callbacks fresh.
- `src/components/layout/anchor-nav.tsx`: left panel status icons.
- `src/components/layout/scrollable-content.tsx`: right panel document modules and skeletons.

Design direction:

- Extend or adapt the existing Generate All store so `ProjectWorkspace` can read per-document queue status during onboarding and Generate All runs.
- Map queue items by `docType`.
- Merge queue status with actual content existence.
- Pass a richer status object into `AnchorNav` and `ScrollableContent`.
- Keep local `generatingDocuments` useful for single-document manual generation, but do not let it be the only source for dashboard generation state.
- Persist or expose PRD/MVP streaming previews through the generation queue flow so the right panel can render live text during background generation. If a preview is not available after refresh, the UI falls back to the durable `Generating` state until saved content exists.
- Expose mockup option progress only if the generation pipeline can report it without inventing fake completion. If individual progress is not available, show a single Mockups generating/loading state until the saved mockup document exists.

### Refresh and Navigation Stability

The dashboard must rebuild its left-panel and right-panel status from server state after:

- Browser refresh.
- Browser back/forward navigation.
- Leaving the project and returning later.
- Opening the same project in a new tab.

Rules:

- Content existence always wins over stale queue state.
- Active queue status comes from `generation_queue_items` via the hydrated Generate All store or equivalent server-backed status adapter.
- Local-only stream buffers may improve the current session but cannot be required for correct status display.
- On hydration, queued/generating/failed modules must render the same display status on the left and right panels.
- Polling must continue while any queue item is pending or generating, and it must call `router.refresh()` when a document becomes ready.

## Component Changes

### `ProjectWorkspace`

Build a unified document status map for the scrollable dashboard:

- `displayStatus`: `ready | queued | generating | streaming | needs_retry`
- `message`: short right-panel status message
- `dependencyLabel`: optional internal detail for right-panel copy
- `queueStatus`: original queue item status for debugging and logic
- `streamPreview`: optional PRD/MVP markdown preview
- `mockupOptionStatuses`: optional progress array for mockup concepts

This map should combine:

- Existing document content counts.
- Queue item status from the durable generation queue.
- Local single-document generation flags.
- Durable or active-session PRD/MVP stream preview state.
- Mockup option progress when real progress is available.

### `AnchorNav`

Replace the current pending circle rendering with a status component that can morph from icon to compact text:

- `ready`: check mark.
- `generating`: spinner plus `Generating`.
- `queued`: circle/chip plus `Queued`.
- `needs_retry`: warning plus `Needs retry`.

Keep labels short to avoid making the nav visually heavy.

### `ScrollableContent`

Replace the plain empty state for queued/generating queue items with a document generation placeholder.

The placeholder should:

- Show document label.
- Show status text.
- Show a circular loading animation when `displayStatus === "generating"` or `displayStatus === "streaming"`.
- Show skeleton rows while generating before stream preview exists.
- Render streamed markdown for PRD/MVP when `displayStatus === "streaming"` and `streamPreview` is present.
- Show dependency-aware explanatory text for queued documents.
- Render mockup option progress rows when `mockupOptionStatuses` is present.

## Error Handling

- If queue status cannot be fetched, fall back to existing content-based states.
- If a document has content, content wins over stale queue state.
- If PRD/MVP streamed preview is unavailable after refresh, keep showing the durable generating/loading state until saved content arrives.
- If mockup option-level progress is unavailable, show a single Mockups loading state rather than synthetic per-option progress.
- If the queue reports an error, show `Needs retry` in the nav and failed copy in the module.
- If the queue reports stale `generating` items, rely on the existing recovery path in `/api/generate-all/status`.

## Testing Plan

Unit tests:

- Add tests for the status mapping helper.
- Verify content existence overrides stale pending/generating queue state.
- Verify pending dependency documents map to `Queued` in the nav.
- Verify queue errors map to `Needs retry`.
- Verify PRD/MVP generating items can map to `streaming` when a stream preview exists.
- Verify PRD/MVP generating items fall back to `generating` when a stream preview is absent.
- Verify mockup option progress is shown only when real option statuses are present.

Integration/manual tests:

- Submit a new idea brief and confirm onboarding loading rows still update.
- After redirect, confirm PRD/MVP/Mockups/Marketing show queued or generating states before content exists.
- Confirm active generation uses a circular loading animation in the left and right panels.
- Confirm PRD and MVP stream text into the right panel while generating after text starts.
- Refresh during PRD/MVP generation and confirm the panels still show the correct durable status.
- Navigate away and back during generation and confirm left/right states do not scramble.
- Confirm Mockups shows loading until mockups are ready, and option-level progress only appears if backed by real pipeline state.
- Confirm completed documents turn into check marks and real content.
- Confirm failed queue item shows `Needs retry`.

## Open Implementation Notes

- The preferred implementation is to reuse the existing Generate All queue polling instead of adding a separate dashboard polling endpoint.
- If onboarding queues need slightly different language, keep that in a small message map rather than hardcoding copy in rendering components.
- No new dependency is required.
