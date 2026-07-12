---
implemented: true
implemented_at: 2026-07-12T00:40:00-07:00
implementation_summary: Automatic exact-SHA opposite-CLI persona reviews now run for every code/workflow commit with isolated bounded input, durable local status, outage disclosure, reviewed remediation loops, and automatic same-session thermonuclear sweeps before push.
---

# Plan: Per-Commit Cross-Model Review and Thermonuclear Sweep

## Goal

Make every code commit receive a synchronous six-persona review from the opposite coding CLI, collect and remediate valid findings across chunked commits, then automatically run a same-session thermonuclear cross-commit sweep when net code growth reaches 1,000 lines. Reviewer quota, authentication, network, or runtime failures must identify the unreviewed commit explicitly and must never be reported as a pass.

## Assumptions

- “Every commit” means every commit that changes reviewable code paths; docs-only sweep report/marker commits skip paid review to avoid recursion and zero-value spend.
- Codex-created commits route to Claude CLI; Claude-created commits route to Codex CLI. Unknown/human runtime does not guess an implementer and prints a loud skip notice.
- The user explicitly authorizes automatic reviewer-CLI spend after each code commit.
- The thermonuclear sweep runs in the already-active Codex/Claude session after a commit batch, not by spawning another same-model CLI from a Git hook.
- Existing dirty worktree files remain untouched unless they belong to this workflow change.

## Clarifying Questions

1. Where should per-commit review run?
   - Recommendation A: Run synchronously from `post-commit`, save results under `.git/agent-reviews/`, and let the active commit workflow triage/fix them.
   - Trade-off: Exactly matches “each commit kicks off review” and works for chunked commits, but intentionally adds paid latency to every code commit.
   - Recommendation B: Run only inside the `/commit` skill after each agent-created commit.
   - Trade-off: Easier orchestration and no surprise human-terminal spend, but raw commits bypass the guarantee.
   - Selected: Recommendation A, because the user explicitly asked for automatic review on every commit.
2. When should the +1,000-line thermonuclear sweep run?
   - Recommendation A: Run once at the end of the active commit/review/remediation batch, before push.
   - Trade-off: Reviews the complete batch and avoids firing halfway through five logical commits; manual commits still receive the existing loud due notice until an agent session processes it.
   - Recommendation B: Spawn a nested same-model CLI immediately from `post-commit` when the threshold is crossed.
   - Trade-off: Fully hook-driven, but not the current model/session, can fire mid-batch, adds recursion/state problems, and can duplicate paid work.
   - Selected: Recommendation A.
3. What happens when the opposite CLI is unavailable or out of quota?
   - Recommendation A: Keep the local commit, write a machine-readable failed status, print the affected SHA and failure class, continue the batch/sweep/push, and explicitly report the review gap to the user.
   - Trade-off: Matches the user’s “unfortunate, just let me know” tolerance while preventing a false “reviewed” claim.
   - Recommendation B: Substitute the current model automatically.
   - Trade-off: Keeps moving but destroys the cross-model guarantee and hides the outage.
   - Selected: Recommendation A, matching the user’s explicit instruction to report usage exhaustion.
4. How should review-fix recursion terminate?
   - Recommendation A: Review remediation commits too, allow up to three unchanged review/fix rounds, then stop with unresolved findings rather than loop indefinitely.
   - Trade-off: Preserves “every code commit” while bounding cost and churn.
   - Recommendation B: Exempt remediation commits from review.
   - Trade-off: Cheaper, but the fixes themselves become an unreviewed gap.
   - Selected: Recommendation A.

## Recommended First Step

Create a deterministic post-commit review runner with fake-CLI tests before wiring it into the live hook. This proves routing, exact commit scope, output persistence, and failure classification without spending reviewer tokens.

## Runtime and Change-Impact Analysis

### Repeated Work

- Trigger: once after every commit touching app/tooling code or executable agent workflow paths: `src/`, `scripts/`, `supabase/`, `supabase-migrations/`, `e2e/`, `.githooks/`, `.agents/skills/`, `.claude/skills/`, or root agent/package/build configs.
- Expected frequency: one reviewer call per logical code commit; worst case includes up to three remediation rounds per batch.
- Work per trigger: create a temporary depth-two tracked-files-only fetch of the immutable SHA/parent with no stored remote, compute a bounded diff/full-changed-file/system-doc bundle, launch the opposite CLI from an empty non-repo safe-mode directory with all model tools disabled, persist result/status under `.git/agent-reviews/`, then remove temporary roots. Default wall-clock ceiling: 1,200 seconds; input ceiling: 1.5 MB.
- Sweep: one current-session thermonuclear audit per completed batch when `sweep-check.mjs` reports `due: true`.

### Ownership, Scope, And Lifetime

- `.githooks/post-commit` owns automatic triggering only.
- `scripts/post-commit-review.sh` owns routing input, reviewable-path filtering, exact SHA scope, persistence, and failure classification.
- `scripts/agent-review.sh` owns reviewer CLI/model invocation and read-only prompt contract.
- `.agents/skills/commit/SKILL.md` owns batch collection, finding verification/remediation, sweep sequencing, push gating, and user reporting.
- `.agents/skills/commit-sweep/SKILL.md` owns same-session range review, thermonuclear standards, report, remediation, and marker advancement.
- Review artifacts are local worktree metadata under `.git`; tracked review summaries remain in plan/sweep artifacts.

### Boundary And Cache Semantics

- Exact-commit scope must not absorb ignored secrets, newer commits, or remaining dirty chunks. Automatic review uses an isolated depth-two fetch of the immutable SHA/parent; the wrapper reads context from regular Git blobs only, supplies a bounded diff/full-changed-file/system-doc bundle, disables model tools and repository/user instructions, treats repository text as untrusted input, and embeds persona rules outside repo docs.
- Status contract: `passed`, `findings`, `failed`, or `skipped`, with commit SHA, implementer, reviewer, timestamp, and failure class where applicable.
- Existing clones activate hooks through `npm prepare`; repo-local thermo skill and Claude symlink make sweep standards portable.
- Docs-only commits skip reviewer calls but remain visible in Git history; code-path filter mirrors sweep code paths.

### Failure And Recovery

- Reviewer quota/network/auth failure: status becomes `failed`; commit workflow continues and may push, but reports the exact unreviewed SHA and never claims complete review coverage; rerun exact SHA later when useful.
- Unknown implementer: status becomes `skipped`; no wrong-model guess.
- Reviewer finding: status becomes `findings`; active agent verifies against final HEAD, fixes accepted items, records rejection reasons, commits fixes, and reviews those commits.
- Hook/reviewer cannot mutate source because reviewer tools stay read-only.
- Rollback: set `SKIP_AGENT_REVIEW=1` for an explicit emergency commit, or revert hook/script changes; any skip remains loud and recorded.

### Risk-Matched Verification

| Risk | Observable evidence or test | Acceptance threshold |
|---|---|---|
| Wrong reviewer routing | Fake `agent-review.sh` in temporary Git repos | Codex identifies Claude reviewer; Claude identifies Codex reviewer; unknown routes to neither |
| Dirty/future chunk contamination | Assert exact immutable range in fake reviewer arguments and prompt | Each review names only its committed SHA range |
| Silent usage-limit failure | Fake CLI exits nonzero with quota text | Failed status records `usage_limit` and hook prints SHA; no `passed` status |
| Secret/dirty-file exposure | Put untracked `.env.e2e.local` beside committed code and inspect fake-review snapshot | Sensitive untracked file is absent; artifacts stay under `.git/agent-reviews/` with mode `0600` |
| Reviewer hang | Fake reviewer exceeds a one-second test watchdog | Runner terminates it and records `timeout` for exact SHA |
| Premature/multiple sweep | Commit-skill contract inspection | Sweep is sequenced once after review/remediation batch, before push |
| Skill portability | Validate local thermo skill and `.claude/skills` symlink | Both agent runtimes resolve identical skill instructions |

## Architecture Improvement Opportunities

- Durable local review ledger: selected. Benefit: exact reviewed/unreviewed SHA evidence and reliable failure reporting; trade-off: local-only state is not shared across clones. Files: `scripts/post-commit-review.sh`, `.git/agent-reviews/`.
- Strict implementer detection: selected. Benefit: prevents human/unknown commits from being mislabeled as Codex; trade-off: unknown runtimes skip loudly. Files: hook runner and docs.
- Same-session thermonuclear sweep: selected. Benefit: preserves full conversation context and avoids duplicate cross-model sweep after every commit already received persona review; trade-off: manual terminal commits need an active agent to process the due notice.
- Pre-push enforcement across arbitrary clones: deferred. Benefit: stronger enforcement; trade-off: local `.git` ledgers do not travel and could block legitimate pushes after clone/cherry-pick.
- Nested hook-driven same-model sweep: rejected as over-engineering and operationally incorrect because it cannot reuse the current model/session or know the end of a chunk batch.

## Plan

1. Add red tests for exact-commit routing, reviewable-path filtering, status persistence, and CLI failure classification using temporary Git repos and fake CLIs.
2. Implement `scripts/post-commit-review.sh`; harden `scripts/agent-review.sh` prompt/error capture and explicit implementer handling.
3. Wire synchronous code-commit review into `.githooks/post-commit`, retaining the sweep-due notice.
4. Vendor the thermonuclear skill into `.agents/skills/` and link it for Claude.
5. Rewrite `commit` sequencing: commit chunks, collect/verify reviews, remediate/re-review, run due sweep automatically, then push.
6. Rewrite `commit-sweep`: current-session thermonuclear plus cross-commit drift lenses; remove its duplicate cross-model step; remediate before marker/report commit.
7. Update AGENTS router, operating-system docs, scripts inventory, commit references, and prior workflow plan/review notes where current behavior is described.
8. Run focused script tests, shell syntax checks, full unit tests, typecheck, lint, dry-run routing, fresh-eyes review, independent code/security review, and remediation.

## Milestones

- Per-commit contract: each code commit produces a durable local pass/findings/failure/skip record.
- Batch contract: valid persona findings are fixed and remediation commits reviewed before push.
- Sweep contract: due batches run same-session thermonuclear review automatically before push and advance marker only after remediation.
- Failure contract: reviewer limits/outages identify exact unreviewed SHAs and prevent false completion.

## Validation

- `bash -n scripts/agent-review.sh scripts/post-commit-review.sh .githooks/post-commit`
- Focused temporary-repo/fake-CLI tests.
- `scripts/agent-review.sh --dry-run --implementer codex --range HEAD~1..HEAD`
- `scripts/agent-review.sh --dry-run --implementer claude --range HEAD~1..HEAD`
- `node scripts/sweep-check.mjs --json`
- `npm test`, `npm run typecheck`, `npm run lint`.
- No UI evidence: developer workflow only; no product UI or user-visible backend behavior changes.

## Risks And Mitigations

- Automatic paid latency/spend: explicitly requested; reviewable-path filter, one review per SHA, and 1,200-second watchdog bound waste/hangs.
- External code transfer: reviewer receives repository diff/context through installed opposite CLI; user explicitly authorized this workflow.
- False-positive churn: active agent verifies every finding and records rejected reasons; unchanged repeat rounds stop after three.
- Reviewer outage: durable failure status plus explicit final disclosure; never substitute silently or call the SHA reviewed.
- Hook environment ambiguity: explicit `AGENT_IMPLEMENTER` override, known-runtime detection, loud unknown skip.

## Rollback Or Recovery

- Remove `scripts/post-commit-review.sh` invocation from `.githooks/post-commit` to restore zero-cost hooks.
- Revert commit/commit-sweep skill changes to restore explicit/manual review and sweep behavior.
- Delete local `.git/agent-reviews/` metadata without affecting source or history.
- Leave `agent-review.sh` usable manually throughout rollback.

## Open Decisions

- None. User explicitly selected automatic per-code/workflow-commit cross-model review, automatic due sweep, current-model thermonuclear execution, and loud reviewer-limit reporting.

## Critique

### Software Architect

- Post-commit is the only hook that can review the immutable commit exactly, but it cannot undo or fix that commit. Durable status plus active-agent orchestration is therefore essential; the hook alone is not the workflow.

### Product Manager

- This adds no customer feature. Value is fewer regressions across fast chunked delivery; cost is slower commits and reviewer quota consumption.

### Customer Or End User

- Users see no direct change. Better review coverage should reduce latent reliability, billing, and UX defects.

### Engineering Implementer

- Exact SHA isolation matters when several chunks remain dirty. Reviewing `WORKING_TREE` would contaminate findings across chunks and defeat the requested per-commit boundary.

### Risk, Security, Or Operations

- Automatic hooks export reviewable code to the configured opposite CLI. Read-only tools constrain mutation, not disclosure. Authorization is explicit; failures and skips must remain visible and attributable.
