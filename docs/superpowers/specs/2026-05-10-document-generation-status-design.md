# Document Generation Status Design

## Summary

Improve the onboarding and project dashboard generation experience by showing durable, high-level progress states for every generated document. After the idea brief is submitted and the user lands in the dashboard, documents that are still queued or generating must no longer look static or empty.

This design uses the existing server-side generation queue as the source of truth and presents compact status in the left panel plus explanatory loading modules in the right panel.

## Goals

- Show clear progress for Overview, Market Research, PRD, MVP Plan, Mockups, and Marketing during onboarding generation.
- Keep the left navigation compact and scannable.
- Show active loading animation and status text in the right content panel for modules that are queued or generating.
- Derive dashboard status from durable queue state, not only local browser flags.
- Preserve the current check mark behavior for completed documents.

## Non-Goals

- Do not stream full document tokens into every dashboard module.
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

Example state copy:

- PRD generating: `Drafting product requirements`
- MVP queued: `Queued`
- MVP detail text: `This will start automatically after PRD is ready.`
- Mockups queued: `Queued`
- Mockups detail text: `Visual directions will generate after the MVP plan is ready.`
- Marketing queued: `Queued`
- Marketing generating: `Mapping launch channels`

When content exists, the module renders the real document content as it does today.

## State Model

The UI maps backend queue statuses into a smaller display model.

| Queue/document condition | Left label | Right panel state |
| --- | --- | --- |
| Content exists | Check mark | Real content |
| Queue item status is `generating` | Generating | Active loading module |
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

## Component Changes

### `ProjectWorkspace`

Build a unified document status map for the scrollable dashboard:

- `displayStatus`: `ready | queued | generating | needs_retry`
- `message`: short right-panel status message
- `dependencyLabel`: optional internal detail for right-panel copy
- `queueStatus`: original queue item status for debugging and logic

This map should combine:

- Existing document content counts.
- Queue item status from the durable generation queue.
- Local single-document generation flags.

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
- Show a circular loading animation only when `displayStatus === "generating"`.
- Show skeleton rows only while generating.
- Show dependency-aware explanatory text for queued documents.

## Error Handling

- If queue status cannot be fetched, fall back to existing content-based states.
- If a document has content, content wins over stale queue state.
- If the queue reports an error, show `Needs retry` in the nav and failed copy in the module.
- If the queue reports stale `generating` items, rely on the existing recovery path in `/api/generate-all/status`.

## Testing Plan

Unit tests:

- Add tests for the status mapping helper.
- Verify content existence overrides stale pending/generating queue state.
- Verify pending dependency documents map to `Queued` in the nav.
- Verify queue errors map to `Needs retry`.

Integration/manual tests:

- Submit a new idea brief and confirm onboarding loading rows still update.
- After redirect, confirm PRD/MVP/Mockups/Marketing show queued or generating states before content exists.
- Confirm active generation uses a circular loading animation in the left and right panels.
- Confirm completed documents turn into check marks and real content.
- Confirm failed queue item shows `Needs retry`.

## Open Implementation Notes

- The preferred implementation is to reuse the existing Generate All queue polling instead of adding a separate dashboard polling endpoint.
- If onboarding queues need slightly different language, keep that in a small message map rather than hardcoding copy in rendering components.
- No new dependency is required.
