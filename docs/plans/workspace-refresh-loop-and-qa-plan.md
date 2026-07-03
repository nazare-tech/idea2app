---
implemented: true
implemented_at: 2026-07-02T23:27:52Z
implementation_summary: Removed workspace route refresh during generation, fixed intake 4-7 question handling, completed fresh Idea 1.1 browser QA, and verified the AI Prompts recommendation card renders with a Cursor external link.
---

# Plan: Workspace Refresh Loop And Fresh Project QA

## Goal
Stop the project workspace from repeatedly refreshing during document generation, then create a fresh project through the real intake UI to verify the AI build-tool recommendation appears in the AI Prompts section.

## Assumptions
- The visible refresh is caused by the workspace calling `router.refresh()` when Generate All reports a completed step.
- Client-side `loadWorkspaceDocuments(..., { force: true })` is sufficient to surface newly completed documents without reloading the whole route.
- Fresh QA should use the real `/projects/new` flow and the default standardized Idea 1.1 case unless the UI requires a closer answer.

## Clarifying Questions
1. Should Generate All completion refresh the whole route or only reload affected workspace documents?
   - Recommendation A: Only reload affected workspace documents.
   - Trade-off: Avoids browser refresh loops and preserves scroll/UI state, but relies on the client workspace payload for document freshness.
   - Recommendation B: Keep whole-route refresh and add debounce/terminal guards.
   - Trade-off: Preserves the old server-refresh behavior, but still risks visible reloads and state churn during polling.
   - Selected: Recommendation A, because the client already force-fetches the completed document types.

2. Should QA create one or two projects?
   - Recommendation A: Create one fresh Idea 1.1 project first.
   - Trade-off: Fastest way to verify the refresh fix and recommendation UI without extra AI spend.
   - Recommendation B: Create both Idea 1.1 and Idea 1.2 projects.
   - Trade-off: Better comparison coverage, but doubles the real generation path and cost/time.
   - Selected: Recommendation A for the bug fix pass; create a second project only if the first pass is stable and time/cost are acceptable.

## Recommended First Step
Remove the route-level `router.refresh()` in `ProjectWorkspace` generation-step completion and keep the forced workspace-document reload.

## Plan
1. [x] Patch `ProjectWorkspace` so Generate All step completion force-loads completed documents without refreshing the route.
2. [x] Run focused TypeScript/test verification for the changed workspace and prompt rendering paths.
3. [x] Fix the intake client/server question-count mismatch discovered during fresh-project QA.
4. [x] Use the in-app browser at `localhost:3000` to create a fresh project through `/projects/new`.
5. [x] Watch for unexpected page refreshes during intake/onboarding and capture evidence under `ui-evidence/2026-07-02-intake-retry-qa/`.
6. [x] Inspect AI Prompts on the fresh project and confirm the recommended tool card renders above Next Prompt when the First Version Plan is available.

## Milestones
- Refresh fix: Generate All step completion no longer calls a full route refresh.
- Fresh project QA: A new project is created through the UI and observed through onboarding.
- Recommendation QA: AI Prompts shows one primary recommended tool card or a documented blocker explains why generation did not reach that state.

## Validation
- `npm run typecheck`
- Focused Node tests for planning/document-section parsing where relevant.
- Real in-app browser QA with screenshots or video evidence saved in `ui-evidence/`.

## Risks And Mitigations
- Risk: Some sidebar/server-derived metadata may not update without `router.refresh()`.
  - Mitigation: The workspace already force-fetches document collections and derives statuses from the workspace/onboarding APIs.
- Risk: Fresh project generation may be blocked by external AI/API failures.
  - Mitigation: Report the blocker and avoid bypassing the real UI path with fixtures.
- Risk: Existing projects may have stale queue state that does not reproduce the fresh flow.
  - Mitigation: Create a fresh project for QA as requested.

## Rollback Or Recovery
Re-add a guarded refresh only on terminal queue completion if client document loading proves insufficient.

## Open Decisions
- None for the intake/recommendation QA goal. Design Mockups were still generating at final recommendation verification and can be revisited separately if needed.

## Implementation Notes
- Removed `router.refresh()` from Generate All step completion in `src/components/workspace/project-workspace.tsx`; the callback now only force-loads changed workspace documents.
- Updated `src/components/workspace/generate-all-hydrator.tsx` comments so the old route-refresh expectation is no longer documented.
- Aligned `src/components/projects/idea-intake-wizard.tsx` with the backend 4-7 question contract.
- Increased intake question generation response budget in `src/lib/intake-question-generation.ts` from 1200 to 2000 tokens and tightened `src/lib/prompts/intake-wizard.ts` to prefer compact question sets.
- Restarted the broken Turbopack dev server on port 3000 as Webpack. This recovered the client-manifest error.
- Real `/api/intake/questions` QA returned `200` after the fix.
- 2026-07-02 real browser retry created project `33c50a38-b5a0-4ed3-9750-238dd4757ad9`, generated Market Research, Product Plan, First Version Plan, and AI Prompts, and verified the Recommended AI Build Tool card recommends Cursor.
- Added a renderer URL fallback after QA found the generated heading omitted the markdown link for Cursor.

## Critique

### Software Architect
- Removing the full route refresh keeps state ownership clearer: queue polling updates client document state, while server route refresh is reserved for navigation-level changes.

### Product Manager
- The fix targets the user-visible failure directly and preserves the core project-generation workflow.

### Customer Or End User
- Users should see generation progress without the page visibly restarting or losing position.

### Engineering Implementer
- The smallest useful patch is one callback change plus verification through the real queue path.

### Risk, Security, Or Operations
- No auth, RLS, secrets, payment, or data persistence rules change. The only operational dependency is real AI generation during QA.
