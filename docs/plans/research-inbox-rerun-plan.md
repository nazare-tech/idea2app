---
implemented: true
implemented_at: 2026-08-15
implementation_summary: Added a durable single-flight Codex/last30days job, strict JSON import and state-preserving merge, accessible header control, active polling, local-only API protections, production trace exclusion, and one verified live run that added three cards.
---

# Plan: Research Inbox Last-30-Days Rerun

## Goal

Add an accessible header control that starts a real last30days research run through local Codex CLI, reports durable progress without blocking the request, and merges validated new evidence into the standalone local JSON inbox. Run it once for the current Maker Compass seed topic.

## Assumptions

- The existing workspace topic is the only research input. The browser sends no prompt, path, command, or model choice.
- One research run may execute at a time. A quick last30days profile targets a useful result in minutes, not a 31-minute exhaustive pass.
- Existing item state and curated cards remain authoritative. New cards merge by stable URL and ID.
- Browser-cookie access for X was explicitly approved and is configured through `~/.config/last30days/.env`.

## Clarifying Questions

1. Should the endpoint block until research finishes?
   - Recommendation A: Start a background single-flight job and poll status. Fast response, visible progress, recoverable failure.
   - Recommendation B: Keep the request open. Simpler code, but fragile across browser/server timeouts.
   - Selected: Recommendation A.
2. Should each run replace or merge the inbox?
   - Recommendation A: Merge and deduplicate while preserving all user state.
   - Recommendation B: Replace the dataset. Cleaner snapshot, but destructive to saved/replied context.
   - Selected: Recommendation A.
3. Can the browser provide arbitrary research prompts?
   - Recommendation A: Use the stored server-side workspace topic only.
   - Recommendation B: Add a free-form topic input.
   - Selected: Recommendation A. Prevents a local unauthenticated command/prompt surface.

## Recommended First Step

Define and test the job-state, strict import-validation, and merge contracts before wiring the subprocess or UI.

## Runtime and Change-Impact Analysis

### Repeated Work

- Header status polls every 2.5 seconds only while a run is queued or running; zero polling when idle, complete, or failed.
- One Codex child process per accepted run. Hard timeout: 10 minutes. Stderr and final output are bounded.
- Each successful completion performs one locked JSON merge and one client refresh event.

### Ownership, Scope, And Lifetime

- `.local/research-run.json` owns durable job state; the server module owns the live child promise.
- `.local/research-inbox.json` remains the only interactive research source of truth.
- A stale queued/running job found after server restart becomes failed with a retryable message.
- Duplicate POST while active returns the existing job, never starts a second process.

### Boundary And Cache Semantics

- New `GET/POST /api/research-job` uses existing loopback Host, matching Origin, and launch-token checks.
- POST accepts no research text. Codex output is untrusted JSON and is schema/length/URL/source validated before merge.
- Completion increments document revision. Existing tabs reload through the current bootstrap contract.

### Failure And Recovery

- Codex failure, timeout, malformed output, or import failure records a bounded public error and leaves inbox data untouched.
- Temporary output lives in a private temp directory and is removed after completion.
- Retry is the same header button after failure. Server restart converts stale active state to failed.

### Risk-Matched Verification

| Risk | Observable evidence or test | Acceptance threshold |
|---|---|---|
| Duplicate expensive runs | Concurrent start contract test | Exactly one runner invocation; both callers observe same job |
| Hostile/malformed Codex output | Parser tests | Reject invalid sources, non-HTTPS URLs, oversized fields, and non-JSON |
| Lost inbox state | Merge repository test | Saves, archives, drafts, replies, browser mode, and prior cards unchanged |
| Unsafe local endpoint | Request-policy/API tests | Wrong Host, Origin, or token rejected; POST has no prompt field |
| Frozen UI | Real Chrome flow | Button changes within 300 ms, announces status, stays disabled while active |
| Hung child | Runner timeout test/inspection | Process group killed at 10 minutes; job becomes failed |

## Architecture Improvement Opportunities

- **Selected: durable single-flight job state.** Benefit: restart visibility and duplicate prevention. Trade-off: one small JSON repository and lifecycle logic. Files: `src/lib/research/run-repository.ts`, `src/lib/server/research-runner.ts`.
- **Selected: schema-bound import and merge.** Benefit: Codex cannot corrupt local inbox or erase state. Trade-off: explicit validator. Files: research types/repository/import module.
- **Selected: server-owned prompt.** Benefit: narrows command-injection and prompt-injection surface. Trade-off: no custom-topic UI yet. Files: API route and runner prompt.
- **Selected: exclude runtime `.local` data from standalone output tracing.** Benefit: prevents research JSON and launch secret from being copied into build artifacts. Trade-off: deployed local server must use its runtime data directory. File: `apps/research-inbox/next.config.ts`.
- **Deferred: streaming detailed source-by-source progress.** Valuable, but last30days/Codex output parsing would create a brittle log contract. Use queued/running/importing/succeeded states now.
- **Deferred: multi-workspace scheduling/history.** Current product has one local workspace; queue/history would be over-engineering.

## Critique

- Architecture: Codex driving a long child process is less deterministic than calling the engine directly. Fixed arguments, fixed prompt, strict output schema, single flight, timeout, and durable failure state contain that risk while honoring the requested Codex CLI boundary.
- Product/customer: Header placement makes rerun discoverable. “Run last 30 days” plus last-run status is clearer than a generic refresh icon. Quick mode may miss long-tail evidence, but matches prior runtime feedback.
- Engineering: Background work inside a Next dev/server process is local-tool appropriate but not cloud-server durable. Document local-only constraint.
- Security/operations: Codex needs network and browser-cookie access. Endpoint remains loopback-only, token-gated, and accepts no arbitrary prompt. Never expose this route on a public host.

## Phases

- [x] Phase 1: Add failing tests for import validation, merge preservation, and job single-flight/recovery.
- [x] Phase 2: Implement durable job repository, fixed Codex/last30days runner, and API route.
- [x] Phase 3: Add header control, status feedback, polling, and completed-run inbox refresh.
- [x] Phase 4: Run focused tests, typecheck, lint, build, then real Chrome flow that starts the actual research run.
- [x] Phase 5: Review architecture/security, remediate findings, update docs/history, and mark complete.

## Test Strategy

- Node unit tests for parser bounds, URL/source validation, merge/dedupe/state preservation, single-flight behavior, stale recovery, and prompt invariants.
- Existing standalone package tests, typecheck, lint, and one final production build.
- Real Chrome at `http://localhost:4310/`: click header control, verify immediate running state, observe completion/failure, confirm refreshed counts/cards, capture screenshot evidence.

## Rollback And Recovery

- Remove header control and research-run route/runner/job repository.
- Existing `.local/research-inbox.json` remains backward compatible; merged cards are ordinary items.
- `.local/research-run.json` can be ignored or moved aside. Failed jobs never mutate inbox.

## Open Decisions

- None. Repository Recommendation A policy applies.

## Plan Evaluation

- Opposite-CLI evaluation attempted on 2026-08-15. Reviewer unavailable because its API host could not resolve (`ENOTFOUND`). Plan remains externally unevaluated; implementation proceeds with that limitation recorded.
