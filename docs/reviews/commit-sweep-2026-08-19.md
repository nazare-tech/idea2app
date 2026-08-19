# Commit Sweep: 2026-08-19
Range `35b49b76..d5dc7b7e` covered 5 commits, 27 classified code files, and net +1,489 classified code lines.
Three parallel read-only Codex finders covered structure, duplication, contracts, correctness, tests, dead code, docs, and product UX.
Primary themes were tabbed Market Research competitor comparison and authenticated current-project ZIP export from the Projects dashboard.
Verified export response-size, rate-limit, privileged Storage, route-bundle, timestamp, browser-lifecycle, and test defects were fixed.
Mandatory opposite-model review ran for the session-reading route and service-role Storage boundary; every verified major finding was remediated.
Verification passed with 773 tests, typecheck, focused lint, production build, route-trace inspection, and two fresh-eyes passes.
---

## Scope and method

- Marker: `35b49b7601d49141322f6eaab22f50cb646a8b67`
- Reviewed code head: `d5dc7b7e`
- Stats: 2,056 additions, 567 deletions, net +1,489 classified code lines
- Finder execution: three parallel read-only subagents, each assigned two mandatory sweep groups; the tests/docs finder also covered product UX and accessibility for the UI-heavy range.
- Verification, triage, edits, tests, and commits stayed with the dispatching agent.
- Opposite-model review: `scripts/agent-review.sh --range 35b49b76..HEAD` ran through Claude Opus at medium effort because the new route reads a session and crosses a service-role Storage boundary.

## Verified findings and triage

| Severity | Finding | Resolution |
|---|---|---|
| MAJOR | Buffered ZIP responses could exceed Vercel's 4.5 MB function-response limit while the route allowed 80 MB of inputs. | Fixed with incremental `ReadableStream` ZIP records, streaming parity coverage, and production build verification; inputs remain bounded. |
| MAJOR | Combined `userId:IP` rate-limit keys allowed one authenticated user to rotate IPs for fresh egress/memory budgets. | Fixed with independent 10/user-minute and 30/IP-minute buckets plus maximum `Retry-After`. |
| MAJOR | Importing one bucket constant from the image-generation pipeline pulled OpenRouter/image assets into the read route. | Fixed with `src/lib/mockups/storage.ts`; the production export route trace no longer references the image-generation pipeline. |
| MINOR | Mutable canonical-row content could select another same-project Storage run for service-role reads. | Fixed by binding every path to immutable `metadata.storage_run_id` and the exact finalized option filename contract. |
| MINOR | Prompt-file front matter assigned the First Version timestamp to Product Plan-only files. | Fixed with per-file Product Plan, First Version Plan, or latest-combined provenance. |
| MINOR | Client download lacked a deadline, revoked its blob URL synchronously, and reported completion before browser acceptance. | Fixed with a five-minute abort deadline, delayed revocation, robust anchor cleanup, lifecycle/error tests, and “download started” copy. |
| MINOR | Heading alias matching and export failure categories had duplicate sources of truth. | Fixed by moving exact alias matching into `planning-document-parser.ts` and deriving the client failure type from the analytics contract. |
| MINOR | ZIP tests did not independently traverse central-directory offsets or verify a known CRC-32 vector. | Fixed with a test-only stored-entry reader, the standard `123456789` CRC vector, byte assertions, and stream/buffer parity. |
| MINOR | Export documentation still described client-only prompt assembly and buffered ZIP delivery. | Fixed in API, architecture, directory, product-overview, and feature-review documentation. |

## Rejected findings

| Finding | Reason rejected |
|---|---|
| `project_intakes.user_id` may not exist. | Generated `src/types/database.ts` confirms `user_id` is required on Row/Insert and optional on Update; the owner predicate is valid. |
| Add a dependency-injected route test suite for every Supabase and Storage branch. | The repository has no route-mocking harness; introducing one inside a security remediation would primarily assert mocks. Pure archive/path/intake/browser contracts, generated DB types, full typecheck/build, and the authenticated manual verification surface remain the proportionate coverage. |
| Extract the 336-line route, 648-line dashboard card, and 1,320-line competitor renderer during this sweep. | The route now has one orchestration path with typed helpers, while the mature UI files coordinate shared saved/streaming behavior. No correctness defect depended on their current boundaries; decomposing unrelated UI during security remediation would widen regression risk. |
| Persist competitor comparison tabs or render every inactive panel for browser find/print. | The three-tab disclosure is intentional to reduce table density, remains keyboard accessible, and preserves authored data in source Markdown. Search/print behavior is a product tradeoff, not lost data. |
| Add DOM interaction tests for competitor tabs. | Root tests intentionally use server static rendering without jsdom. Existing tests cover tab semantics, labels, initial columns, saved/streaming parity, and keyboard attributes; adopting a browser test framework is outside this sweep. |
| Move card notices into a dashboard-level toaster solely to support concurrent exports. | Concurrent exports are independently rate-limited and each card remains accessible; no overlap defect was reproduced. A global notification architecture would be disproportionate to this action. |

No Linear issue was created: every verified actionable correctness/security finding was fixed, while rejected items were non-defects or disproportionate framework/architecture changes without a reproduced failure.

## Verification

- `npm test`: 773 passed, 0 failed.
- Focused remediation suite: 63 passed, 0 failed.
- `npm run typecheck`: passed directly and through both commit hooks.
- Focused ESLint: 0 errors; the one temporary unused-import warning was fixed before commit.
- `npm run build`: passed; `/api/projects/[id]/export` appears in the production route manifest and chunky/vendor guard passed.
- Route trace inspection: export no longer traces `openrouter-image-pipeline` or mockup skeleton assets.
- `git diff --check`: passed for the full range and remediation commit.
- Fresh-eyes pass 1 checked final route/client trust, resource, recovery, and browser lifecycle boundaries.
- Fresh-eyes pass 2 checked duplication, debug residue, docs, test confidence, and remediation regressions.

No blocker or major finding remains in the reviewed range.
