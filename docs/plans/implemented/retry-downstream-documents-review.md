# Review: Resume Downstream Documents After Retry

## Scope
- `src/lib/generate-all-helpers.ts`
- `src/components/workspace/project-workspace.tsx`
- `src/stores/generate-all-store.ts`
- `src/lib/generate-all-helpers.test.ts`
- `src/lib/generation-queue-service.test.ts`

## Verification
- Focused red test confirmed missing `shouldResumeQueueAfterDocumentRetry` before implementation.
- `node --import tsx --test src/lib/generate-all-helpers.test.ts src/lib/generation-queue-service.test.ts` passed.
- `npm run typecheck` passed.
- `npm run lint` passed with existing warnings only.
- `git diff --check` passed.
- `npm test` and `node --import tsx --test src/lib/planning-prompts.test.ts` failed on unrelated existing prompt-contract assertions in `src/lib/planning-prompts.test.ts`.
- In-app browser metadata confirmed the local Verified PAWS workspace tab is open at `http://localhost:3000/projects/bcc4e443-97fd-4c01-a5f8-49858485dcc7-verified-paws-home-care?tab=mockups#prd-follow-through`; deeper DOM reads timed out while the page had long-running generation/status traffic.

## Fresh-Eyes Self Review
- Pass 1: Reviewed the helper, workspace retry call site, store resume guard, and tests. Found the helper could restart unrelated failed documents in the same terminal queue.
- Fix: Narrowed `shouldResumeQueueAfterDocumentRetry` to require a resettable downstream dependent whose dependency chain includes the retried document.
- Pass 2: Reread the narrowed helper and call sites. No additional code issues found.
- Verification rerun after remediation: focused tests, typecheck, lint.

## Code Review Findings
- P3: Initial helper was too broad and could resume unrelated failed queue items, e.g. Launch Plan retry restarting Product Plan. Fixed by requiring downstream dependency relationship before auto-resume.

## Security Review Findings
- No new endpoint, secret, or privileged server mutation was added.
- The new client path uses existing same-origin `/api/generate-all/start` and `/api/generate-all/execute` flows, which already verify authenticated user and project ownership before service-role queue mutation.
- No hardcoded credentials, external data transmission, or new user-input query construction introduced.

## Remediation Checklist
- [x] Add focused helper test for Product Plan upstream retry.
- [x] Add backend reset helper coverage for failed/blocked queue items.
- [x] Wire successful queue-backed retry to durable queue resume.
- [x] Narrow auto-resume to downstream dependency chains only.
- [x] Rerun focused tests, typecheck, lint, and diff checks.
