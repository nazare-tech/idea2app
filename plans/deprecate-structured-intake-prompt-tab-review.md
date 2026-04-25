# Review: Deprecate Prompt Tab Access

## Scope
- `src/lib/workspace-tab-policy.ts`
- `src/app/(dashboard)/projects/[projectRef]/page.tsx`
- `src/components/workspace/project-workspace.tsx`
- `src/components/layout/anchor-nav.tsx`
- `src/app/api/prompt-chat/route.ts`
- `PROJECT_CONTEXT.md`

## Verification
- `npm test -- --test-name-pattern='workspace'` passed.
- `npm test -- --test-name-pattern='workspace|safe-redirect'` passed.
- `npx tsc --noEmit` passed.
- `npm run lint` passed with warnings only. The new relevant warnings are dead `ProjectWorkspace` helper code made unreachable by removing the Prompt view; two other warnings are pre-existing unrelated files.
- `curl -i http://localhost:3000/api/prompt-chat` returns `410 Gone`.
- `curl -i -X POST http://localhost:3000/api/prompt-chat ...` returns `410 Gone`.

## Code Review Findings
- No blocking findings.
- Non-blocking: `ProjectWorkspace` now has several prompt-era helper functions and state values that are no longer used after removing the Prompt branch. They do not break typecheck or lint, but should be pruned in a separate cleanup to avoid mixing broad component surgery into this bug fix.

## Security Review Findings
- No blocking findings.
- API-level rejection is in place for `/api/prompt-chat`, preventing deprecated Prompt Chat from mutating `projects.description` or consuming credits through direct API calls.
- No secrets or new external calls were added.

## Remediation Checklist
- [x] Block `?tab=prompt` with server-side redirect to Overview.
- [x] Resolve Prompt tab to the default Overview document in client tab policy.
- [x] Remove the Idea Brief nav entry from the workspace nav.
- [x] Return `410 Gone` from `/api/prompt-chat`.
- [x] Update `PROJECT_CONTEXT.md`.
- [ ] Optional follow-up: delete or archive legacy Prompt Chat database rows after explicit confirmation of the exact destructive scope.
- [ ] Optional follow-up: remove deprecated Prompt Chat UI/config files and dead prompt-era workspace helpers.
