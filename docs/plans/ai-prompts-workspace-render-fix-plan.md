---
implemented: true
implemented_at: 2026-07-05T14:15:29.2005569-04:00
implementation_summary: Mounted the existing derived AI Prompts renderer after Design Mockups in the scrollable workspace and added a regression test for the workspace wrapper.
---

# AI Prompts Workspace Render Fix Plan

## Goal

Restore the derived AI Prompts workspace section for generated projects, including newly generated projects such as Smart Wardrobe Outfit Planner.

## Assumptions

- The AI Prompts section is intentionally derived from Product Plan and First Version Plan content.
- It should not add a database table, queue item, or generation endpoint.
- The existing `AiPromptsDocumentBlocks` renderer is the intended UI.

## Clarifying Questions

- Should AI Prompts appear even when only one upstream document exists? Recommendation A: yes, render whatever derived content is available and show the existing empty state only when nothing can render.

## Recommendation A/B Choices

- Recommendation A: Mount `AiPromptsDocumentBlocks` in `ScrollableContent` after Design Mockups. This is selected because it matches `PROJECT_CONTEXT.md` and the existing nav registry.
- Recommendation B: Add a new document type or queue item for AI Prompts. Rejected because the project context explicitly says AI Prompts is derived and has no durable artifact type.

## Selected Recommendation

Use Recommendation A.

## Implementation Phases

1. Import `AiPromptsDocumentBlocks` in the workspace scroll renderer.
2. Add a `DocumentWrapper navKey="ai-prompts"` after Design Mockups.
3. Feed it current PRD and MVP content and preserve loading/status behavior from upstream documents.
4. Add a regression test that proves the workspace render tree includes the AI Prompts wrapper.

## Test Strategy

- Run the focused layout/component tests.
- Run the existing AI Prompts block renderer tests.
- Run typecheck if time allows.

## Rollback Or Recovery Notes

Revert the `scrollable-content` import/wrapper and the added test if the section causes workspace rendering issues. No persisted data or migrations are involved.

## Architecture Improvement Opportunities

- Selected: Reuse the existing derived renderer instead of duplicating parsing or content mapping. Benefit: keeps prompt/parser/render contracts centralized. Trade-off: the workspace still depends on upstream PRD/MVP document availability.
- Deferred: Add a pure rendered-section contract test spanning `SCROLLABLE_NAV_ITEMS` and actual workspace content. Benefit: catches future nav/render drift. Trade-off: requires more test harness work because deferred client rendering does not run in server markup tests.
- Rejected: Introduce an AI Prompts document type. Benefit: simpler status semantics. Trade-off: contradicts the current architecture and would create unnecessary persistence/queue surface.

## Candid Critique

- Architecture: The bug came from a nav/render contract split; mounting the renderer fixes the immediate issue, but broader contract tests would be stronger.
- Product: The fix restores a key handoff surface users expect after mockups.
- Customer: The section should appear without asking users to regenerate data.
- Engineering: This is low-risk because it composes existing components and avoids data-shape changes.
- Risk/Security: No new backend, auth, storage, or secret handling is introduced.
