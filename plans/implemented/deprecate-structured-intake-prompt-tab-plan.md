# Plan: Deprecate Prompt Tab Access For Structured Intake Projects

## Goal
Prevent users from reaching the deprecated Prompt Chat / Idea Brief editing surface for projects that were created through the structured intake wizard, including direct URLs such as `/projects/<project-ref>?tab=prompt`. The implementation should preserve authentication and project ownership behavior, keep the canonical document workspace available, and make the deprecated behavior explicit in code and documentation.

## Current Findings
- `PROJECT_CONTEXT.md` still describes Prompt Tab AI Chat as a legacy/follow-up surface after project creation, so the source of truth is not fully aligned with “this should not be possible.”
- `src/app/(dashboard)/projects/[projectRef]/page.tsx` preserves all query params during canonical project slug redirects. That means a stale or manually typed `?tab=prompt` survives the server redirect.
- `src/components/workspace/project-workspace.tsx` accepts any valid `DocumentType` from `?tab=...`; `prompt` is still in `DOCUMENT_TYPES`, so `?tab=prompt` selects the full Prompt Chat view.
- `src/components/workspace/project-workspace.tsx` also renders an `AnchorNav` “Idea Brief” button that calls `handleDocumentSelect("prompt")`, so this is not only a direct URL issue.
- `src/components/layout/content-editor.tsx` disables initial auto-start for structured-intake projects but still renders `PromptChatInterface`, which allows follow-up chat and refinement.
- `/api/prompt-chat` still accepts GET and POST requests for any project owned by the user. If Prompt Chat is fully deprecated for structured-intake projects, UI-only blocking is not enough.
- Existing plan history in `plans/fix-intake-wizard-step-count-and-handoff.md` previously assumed “Idea Brief” could intentionally remain available. That conflicts with the latest expectation and should be resolved.

## Assumptions
- “Should not have been possible” applies at least to structured-intake projects where `hasStructuredIntake === true`.
- The correct fallback destination for blocked `tab=prompt` is the canonical document workspace at `#overview`, or `?tab=competitive#overview` if we decide the query param should remain explicit.
- Legacy prompt-created projects may still need Prompt Chat unless we explicitly retire the feature for all projects.
- Prompt Chat data should be preserved unless you explicitly ask to archive or delete it.
- No new dependency is needed.

## Clarifying Questions
1. Should `tab=prompt` be blocked only for structured-intake projects, or for every project including legacy Prompt Chat projects?
2. When a user opens a blocked Prompt URL, should the app silently redirect to Overview, show a small “Prompt is deprecated” notice, or return a 404/not-found style state?
3. Should the left-nav “Idea Brief” entry disappear for structured-intake projects, become a read-only intake summary, or link to Overview?
4. Should `/api/prompt-chat` reject GET/POST for structured-intake projects too, or is UI-level blocking sufficient for this phase?
5. Do you want a migration/backfill that marks legacy prompt-origin projects differently, or should we infer behavior from the presence of `project_intakes`?
6. Should `PROJECT_CONTEXT.md` be updated to say Prompt Chat is deprecated entirely, or only deprecated as a primary/structured-intake surface?

## Recommended First Step
Decide the product policy boundary: structured-intake-only deprecation versus global Prompt Chat removal. My recommended first implementation is structured-intake-only blocking across UI, URL handling, and `/api/prompt-chat`, because it fixes the bug shown in the screenshot without breaking legacy projects that may still depend on Prompt Chat history.

## Phased Implementation Checklist
1. Add a small routing policy helper for workspace tabs.
   - Output: a focused helper that can answer whether `prompt` is allowed for a project state.
   - Validation: unit tests for structured-intake projects, legacy projects, missing/invalid tabs, and default document resolution.
2. Enforce the policy in `ProjectWorkspace`.
   - Output: `?tab=prompt` resolves to the document workspace for structured-intake projects, and `handleDocumentSelect("prompt")` no-ops or redirects to the chosen fallback.
   - Validation: focused component/browser check confirms the screenshot URL no longer renders `PromptChatInterface`.
3. Update navigation behavior.
   - Output: hide or repurpose the “Idea Brief” nav entry for structured-intake projects based on your answer.
   - Validation: visual check that the project workspace has no misleading path back into Prompt Chat.
4. Add server-side API enforcement if approved.
   - Output: `/api/prompt-chat` rejects structured-intake project requests with a clear 410 or 403 response.
   - Validation: route-level test or local request confirms GET and POST are blocked for a structured-intake project but still authorized/owned.
5. Update documentation.
   - Output: `PROJECT_CONTEXT.md` reflects the final Prompt Chat policy and route behavior.
   - Validation: doc statements match implemented code paths.
6. Review and remediate.
   - Output: `plans/deprecate-structured-intake-prompt-tab-review.md` with code review and security review notes, then fixes for accepted findings.
   - Validation: rerun focused tests plus lint or the best available suite.

## Test Strategy
- Unit-test the tab policy helper first so the intended behavior has a red/green loop.
- Run focused tests with `npm test` if the added tests fit the existing Node test harness.
- Run `npm run lint` after implementation.
- Use the running local server to manually open:
  - `/projects/65b38e33-34e7-4e61-a4cf-3a7157ea4783-elite-pet-concierge?tab=prompt`
  - the same project without `tab`
  - a valid document URL such as `?tab=competitive#overview`
- If UI changes are made, visually confirm the Prompt Chat composer is not rendered for the blocked case.

## Rollback Or Recovery Notes
- Keep changes isolated to routing policy, workspace rendering, and optionally `/api/prompt-chat`.
- Do not delete Prompt Chat messages or tables.
- If blocking causes a regression for legacy projects, revert the policy helper decision or gate it only on `hasStructuredIntake`.
- If API enforcement is too disruptive, retain the UI redirect and defer API blocking with a documented risk.

## Open Decisions
- Decision: Prompt Chat is globally deprecated. `tab=prompt` should be blocked for all projects, including legacy Prompt Chat projects.
- Decision: blocked Prompt URLs should silently redirect/fallback to Overview.
- Decision: the “Idea Brief” nav entry should be removed. The nav should start with Overview.
- Decision: `/api/prompt-chat` should reject requests. Because this route mutates project descriptions and consumes credits, API-level blocking is in scope.
- Pending destructive-data decision: legacy Prompt Chat projects/messages may be deleted, but no database rows or code files will be deleted until the user explicitly confirms the exact destructive action.

## Implementation Decisions From User
- Block `tab=prompt` for every project, not only structured-intake projects.
- Silently redirect blocked Prompt URLs to Overview.
- Remove the Idea Brief nav entry entirely.
- Reject Prompt Chat API requests.
- Treat legacy Prompt Chat data cleanup as acceptable in principle, but defer actual deletion until the deletion target is explicit and confirmed.

## Critique

### Software Architect
- A shared policy helper is better than scattering `hasStructuredIntake && tab === "prompt"` checks through the component. The likely weakness is that server and client have different information: the server can query `project_intakes`, while the client currently receives only `hasStructuredIntake`.

### Product Manager
- The product needs one clear story. “Prompt is deprecated but still available as Idea Brief” causes exactly this bug. The policy should distinguish “old data/history” from “current user workflow.”

### Customer Or End User
- A silent redirect is least disruptive, but it can feel confusing if the URL changes or a bookmarked Prompt link appears to stop working. A small notice may help, but only if it does not add clutter to the main workspace.

### Engineering Implementer
- The smallest safe change is client-side tab sanitization, but the more complete change includes API blocking. Tests should pin the policy so future UI tweaks do not accidentally re-enable `tab=prompt`.

### Risk, Security, Or Operations
- UI-only hiding does not prevent direct API use. If Prompt Chat can mutate `projects.description` and consume credits, server-side blocking is the stronger security and billing posture for deprecated structured-intake projects.
