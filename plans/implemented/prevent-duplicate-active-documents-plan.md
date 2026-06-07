# Plan: Prevent Duplicate Active Documents While Preserving Future Versioning

## Goal
Add server-side protection so each project can have only one active generated document per document type by default, while keeping the architecture compatible with future explicit document versioning. The fix should prevent accidental duplicate PRDs, MVP plans, mockups, competitive research, marketing plans, and tech specs from direct API calls, Generate All retries, stale queue execution, or UI regressions.

## Current Findings
- Project creation already has a short-lived `project_creation_locks` guard and a second allowance check, so duplicate project creation from rapid submits is mostly protected.
- The UI treats generated rows as versions today: project pages fetch all rows ordered by `created_at desc`, and `ProjectWorkspace` has `selectedVersionIndex` / `getVersionsForDocument()`.
- The current product direction is not to create more rows casually. Future versioning should be an explicit action, not accidental duplicate generation.
- The UI hides or skips generation when content exists, but server routes still insert new rows:
  - `/api/analysis/[type]` inserts into `analyses`, `prds`, `mvp_plans`, and `tech_specs`.
  - `/api/mockups/generate` inserts into `mockups`.
  - `/api/launch/plan` inserts into `analyses` with `type = 'launch-plan'`.
  - `src/lib/document-generation-service.ts` inserts rows during server-side Generate All/onboarding execution.
- Generate All start logic builds a queue that skips documents based on client-visible status, but the execution path should still check the database before generating because queues can be stale or retried.
- Hard unique constraints on the current document tables would block future row-based versioning, so they are not the best first move.

## Assumptions
- The immediate rule is: default generation creates a document only if one does not already exist for that project and document type.
- Future explicit versioning can introduce a separate route or request flag, such as `mode: "new-version"`, that bypasses the default guard intentionally.
- Existing duplicate rows in the database are legacy data. We can leave them alone unless you explicitly ask for a cleanup/migration.
- For duplicate generation attempts, returning the existing latest document with a skipped/already-exists response is better than charging credits or failing loudly.
- Onboarding and Generate All should mark already-existing docs as skipped/done rather than generating another row.

## Clarifying Questions
1. For direct API duplicate attempts, should the response be `409 Conflict`, or `200 OK` with `{ skipped: true, existingDocument }`? I recommend `200`/`skipped` for Generate All compatibility and no credit charge.
2. Should existing legacy duplicate rows be cleaned up now, or only prevent new duplicates going forward?
3. Should `techspec` remain hidden from the main nav but still guarded like other document types?
4. Should app `deployments` be included in this policy, or is app/deployment generation allowed to create multiple deployment records?

## Recommended First Step
Create a small server-side document identity policy helper that maps each `DocumentType` / analysis route type to its storage table and “latest existing document” query. Use tests to pin that `competitive`, `launch`, `prd`, `mvp`, `mockups`, and `techspec` all resolve to the correct table/type before touching routes.

## Phased Implementation Checklist
1. Add a shared document existence policy.
   - Output: `src/lib/document-active-policy.ts` or similar with mapping and helpers for latest existing document lookup.
   - Validation: Node tests for doc-type mappings, analysis-type mappings, and unsupported types.
2. Guard the shared Generate All/onboarding execution service.
   - Output: `generateProjectDocument()` checks for an existing active document before calling expensive AI/Stitch generation.
   - Behavior: return an object that indicates `skippedExisting` and the existing output table/id, so queue items can become `skipped`/`done` without duplicate inserts.
   - Validation: unit tests with a fake Supabase client prove existing docs skip generation and missing docs still generate.
3. Guard direct analysis generation.
   - Output: `/api/analysis/[type]` checks for existing active docs before deducting credits and before invoking LLMs.
   - Behavior: duplicate request returns existing doc metadata without charging credits.
   - Validation: focused tests or extracted helper tests for “already exists before credit deduction.”
4. Guard mockup and launch endpoints.
   - Output: `/api/mockups/generate` and `/api/launch/plan` perform the same existing-doc check before charging or generating.
   - Validation: focused route helper tests where practical.
5. Harden Generate All queue start/execution.
   - Output: server-side queue construction/execution uses DB state to skip already-existing documents, not only client-supplied status.
   - Validation: tests that stale pending queue items do not create duplicate documents when the document already exists.
6. Update docs and review artifacts.
   - Output: `PROJECT_CONTEXT.md` explains generate-missing-only behavior and future explicit versioning boundary.
   - Output: `plans/prevent-duplicate-active-documents-review.md` with code and security review notes.
7. Verification and remediation.
   - Run focused tests, `npm test`, `npx tsc --noEmit`, and `npm run lint`.
   - Optionally use local API calls against a test project to confirm a second generation request is skipped and not charged.

## Test Strategy
- Prefer pure unit tests for the policy mapping and fake-Supabase tests for existing-document checks.
- Use red-green TDD:
  - First test: existing `prd` returns an existing output and does not call the generator.
  - Second test: missing `prd` still calls the generator and saves output.
  - Third test: existing `competitive` and `launch` are distinguished by `analyses.type`.
  - Fourth test: stale Generate All queue item skips if DB already has output.
- Add route-level tests only if the current Next route surfaces are practical to test without brittle auth mocks.
- Manual validation after implementation can use a sandbox project and local server, but should not depend on costly LLM calls where a helper test can prove the behavior.

## Rollback Or Recovery Notes
- Keep the guard in TypeScript first, without database uniqueness constraints. Rollback is a code revert, not a schema rollback.
- Do not delete existing duplicate document rows in this implementation unless separately confirmed.
- If versioning work starts soon, the guard can become the default path while an explicit `createVersion` path bypasses it.
- If a skipped duplicate response breaks a client, fallback can be changed to `409 Conflict` without changing the core existence helper.

## Milestones
- Policy Helper Complete: all document types map to a canonical storage identity and tests pass.
- Generate All Protected: stale or retried queue execution cannot create duplicate active docs.
- Direct API Protected: direct route calls cannot create duplicate active docs or consume credits for duplicate attempts.
- Docs And Review Complete: project context and review/security notes match the implemented behavior.

## Open Decisions
- Decision: duplicate direct requests should return `200 OK` with `{ skipped: true, existingDocument }`. No dedicated UI notice is needed.
- Decision: existing duplicate document rows should be cleaned up by keeping the newest row per project/document type and deleting older duplicates.
- Decision: deployments remain outside this policy for now. Deployment/build records can reasonably have multiple attempts and are not project planning documents.
- Decision: future versioning must be a separate explicit action, not the default generation path.

## Implementation Decisions From User
- Use `200 skipped`, not `409 Conflict`, for duplicate document generation attempts.
- No UI surfacing is required for skipped duplicate attempts.
- Delete existing duplicate document rows.
- Leave deployment records out of the document generate-once policy.
- Future versioning is an explicit, separate product action.

## Critique

### Software Architect
- A code-level guard is the right first step because hard unique constraints would fight future versioning. The risk is that without database constraints, two truly concurrent requests can still race unless the helper uses a database-backed lock or atomic insert/upsert pattern.

### Product Manager
- The policy clarifies that “Generate” means “create the missing document,” not “regenerate.” That protects user credits and reduces confusing version piles. Future versioning should surface as an intentional “Create new version” product action.

### Customer Or End User
- Returning the existing document instead of charging for a duplicate request is the least surprising outcome. If the user expects regeneration, they need a visible future command that says exactly that.

### Engineering Implementer
- The biggest implementation risk is duplicated guard code across routes. Centralizing table/type lookup and existing-output behavior will keep analysis, launch, mockups, onboarding, and Generate All consistent.

### Risk, Security, Or Operations
- Server-side checks must happen before credit deduction and before external API calls. This avoids accidental billing, external spend, and abuse via direct endpoint calls. A later DB-backed locking mechanism may be needed if concurrent duplicate requests are common.
