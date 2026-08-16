# Commit Sweep: 2026-08-15
Range `3f80163f..35b49b76` covered 12 commits, 54 code files, and net +1,976 classified code lines.
Three parallel read-only Codex finders covered structure/duplication, contracts/correctness, and tests/dead-code/docs plus product UX.
Primary themes were dashboard carousel/theme work, report-table/navigation work, and standalone Research Inbox persistence/process execution.
Verified major findings in Research Inbox schema validation, file locking, stale-worker fencing, and merge idempotence were fixed.
Product and documentation drift for the retired Maker route, filters, typography, geometry, setup variables, and test inventory was fixed.
Opposite-model range review was attempted but not executed because the 4,969,539-byte bundle exceeded its 1,500,000-byte limit.
---

## Scope and method

- Marker: `3f80163f11a875a4913603cc5c22a62a4991148c`
- Reviewed code head: `35b49b7601d49141322f6eaab22f50cb646a8b67`
- Stats: 2,408 additions, 432 deletions, net +1,976 classified code lines
- Finder execution: three parallel read-only subagents, each assigned two mandatory sweep groups; verification, edits, tests, and triage stayed with the dispatching agent.
- Cross-model review: `scripts/agent-review.sh --range 3f80163f..HEAD` exited before reviewer execution because the bounded input exceeded 1.5 MB. No cross-model pass is claimed.

## Verified findings and triage

| Severity | Finding | Resolution |
|---|---|---|
| MAJOR | Persisted Research Inbox JSON validated only top-level containers, allowing malformed nested items/state to crash after load. | Fixed with full version-1 nested validation and malformed-valid-JSON recovery coverage. |
| MAJOR | Repository and job-store `O_EXCL` lockfiles had no crash recovery and could block writes forever. | Fixed through one PID/nonce-owned lock helper, dead-owner recovery, changed-owner recheck, and live/dead owner tests in both stores. |
| MAJOR | Research job service ignored failed fenced transitions, letting a stale worker continue toward merge. | Fixed by aborting unless running/importing transitions update the matching active job; stale-worker regression test added. |
| MAJOR | Inbox merge and job completion lacked an idempotent recovery boundary, so a completion-write failure could rescan and double-count. | Fixed with per-job merge receipts, idempotent replay, failed-status reconciliation, and a 100-receipt bound. |
| MAJOR | Retained Maker `/research` exposed a live Generate action against a retired `410` endpoint. | Fixed by replacing the route body with a clear standalone-local-app handoff notice and render test. |
| MINOR | URL canonicalization lowercased case-sensitive paths and query values. | Fixed; URL parsing normalizes host while preserving path/query case, with regression coverage. |
| MINOR | Standalone filter selected state was visual only. | Fixed with `aria-pressed` on shared filter buttons. |
| MINOR | Dashboard card geometry, standalone env names, test counts, and scoped typography docs drifted from current code. | Fixed in `coding-conventions.md`, `setup-and-build.md`, `test-inventory.md`, `PRODUCT.md`, and `DESIGN.md`. |
| MINOR | Standalone bootstrap/token fetch logic is repeated between the feed and run control. | Rejected for this sweep: controls deliberately own independent retry/error lifecycles, payload is local and bounded, and no contract or correctness failure was verified. |
| MINOR | Carousel-specific rules remain in the large global stylesheet. | Rejected for this sweep: moving responsive interaction selectors into a new styling boundary is a refactor without a verified defect and would widen the audited behavior surface. |

## Verification

- `npm --prefix apps/research-inbox test`: 53 passed, 0 failed.
- `npm --prefix apps/research-inbox run typecheck`: passed.
- `npm --prefix apps/research-inbox run lint`: passed.
- `node --import tsx --test 'src/app/(dashboard)/research/page.test.tsx'`: passed.
- Root `npm run typecheck`: passed through direct run and both remediation commit hooks.
- Both remediation commits passed repository pre-commit ESLint and typecheck hooks.
- Fresh-eyes pass 1 fixed a lockfile observation race before unlink.
- Fresh-eyes pass 2 bounded run receipts to prevent metadata-only exhaustion of the 2 MB document limit.

No blocker or major finding remains in the reviewed range. No Linear issue was needed because every verified actionable correctness, product, accessibility, and documentation finding was fixed; two structural suggestions were rejected with concrete scope reasons above.
