# Review: Prevent Duplicate Active Documents

## Implementation Summary
- Added `src/lib/active-document-policy.ts` as the shared source of truth for active planning document identities and latest-document lookup.
- Guarded direct generation routes before credit deduction or external AI/Stitch calls:
  - `/api/analysis/[type]`
  - `/api/mockups/generate`
  - `/api/launch/plan`
- Guarded Generate All/manual/onboarding paths:
  - `/api/generate-all/start` marks already-existing active docs as `skipped`.
  - `/api/generate-all/execute` re-checks DB state before charging or generating stale pending items.
  - `generateProjectDocument()` returns existing output references with `skippedExisting` when generation is not needed.
- Duplicate direct API attempts return `200 OK` with `{ skipped: true, reason: "document_already_exists", existingDocument }`.
- Existing duplicate active document rows were audited and cleaned up by keeping the newest row per project/document type.

## Data Cleanup Result

Final audit after cleanup:

| Table | Rows Audited | Duplicate Groups Remaining |
| --- | ---: | ---: |
| `analyses` (`competitive-analysis`, `launch-plan`) | 5 | 0 |
| `prds` | 2 | 0 |
| `mvp_plans` | 2 | 0 |
| `mockups` | 0 | 0 |
| `tech_specs` | 0 | 0 |

The corrected cleanup groups `analyses` by `project_id:type` and non-analysis document tables by `project_id`.

## Code Review Notes
- The active-document policy centralizes table/type mapping, which avoids route-specific drift.
- Duplicate checks happen after user/project authorization and before credit deduction, external API calls, and inserts.
- Generate All has two layers of protection: start-time skipping for user-visible queue state and execute-time skipping for stale/retried items.
- Deployment records are intentionally outside this policy because build/deployment attempts can reasonably have multiple records.

## Security Review Notes
- The duplicate guard does not loosen ownership checks; all guarded routes still verify auth and project ownership first.
- Duplicate requests do not consume credits, avoiding accidental billing and reducing external API spend.
- Service-role cleanup was run from the local environment using `.env.local`; no secrets were added to source.
- Remaining risk: the guard is code-level, not a database uniqueness constraint. Two truly concurrent first-time requests can still race between lookup and insert. This is acceptable for now because future versioning should stay flexible, but a DB-backed lock or explicit active-document table should be considered if duplicate races continue.

## Remediation Notes
- Future versioning should be implemented as an explicit route/action, for example `createDocumentVersion`, that intentionally bypasses the default active-document guard.
- If stricter enforcement becomes necessary before versioning, add a short-lived per-project/document lock around generation rather than a permanent unique constraint on the existing output tables.
