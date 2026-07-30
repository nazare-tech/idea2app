# Review Personas and Cross-Model Review
Defines the six review personas (maintainability, security, performance, AI-smells, product/founder UX, data & billing integrity), what each hunts for, and the system docs each owns.
Cross-model routing: work implemented by Claude is reviewed by Codex CLI (gpt-5.6-terra, reasoning medium); work implemented by Codex is reviewed by Claude CLI (Opus 4.8, high thinking).
Cross-model review runs once per substantial task as a blocking plan evaluation (`scripts/agent-review.sh --plan <plan-file>`) before implementation, not per commit.
Automatic code review is the same-model net-plus-1000-line commit-sweep, fanned out across parallel read-only finder subagents by persona; diff-level cross-model review is on demand only.
Each persona owns docs/systems/ files and must flag stale docs as findings; doc drift is a review defect, not a nice-to-have (see doc-conventions.md self-healing rule).
Reviewer output contract for both modes: severity-tagged findings with file:line or plan section, a concrete failure scenario, and a suggested fix; the clean sentinel is exactly `NO FINDINGS`.
---

## When cross-model review runs

1. **Plan evaluation, before implementation (automatic and blocking).** Every substantial task's plan file in `docs/plans/` is evaluated by the opposite CLI before code is written. Fold accepted findings into the plan, record rejections with reasons, then implement. One reviewer call per task.
2. **On demand, on a diff.** "Get a second opinion on this diff", or the implementing agent's own judgment that a change deserves one: auth, RLS, webhooks, billing, migrations, anything where being wrong is expensive.
3. **Never automatically per commit.** The `post-commit` hook prints the sweep notice and nothing else. `scripts/post-commit-review.sh <sha>` still exists with its ledger and isolation guarantees for deliberate single-commit reviews.

Automatic code review is the net-plus-1,000-line `commit-sweep`, which applies `thermo-nuclear-code-quality-review` across the marker range through parallel read-only finder subagents (one persona/lens group each) and keeps verification, triage, and edits in the dispatching agent. Between sweeps, code correctness is the implementing agent's own diligence plus the on-demand review above.

The reviewing model must not be the implementing model, in either mode.

Why plan-stage: a wrong plan costs more than a wrong line, plan material is a fraction of a diff bundle's size, and per-commit review put a twenty-minute worst case on every commit, which is how a quality gate turns into a gate people route around.

## Plan evaluation

```bash
scripts/agent-review.sh --plan docs/plans/<task>-plan.md                       # blocking, before implementation
scripts/agent-review.sh --plan docs/plans/<task>-plan.md --out docs/plans/<task>-plan-eval.md
scripts/agent-review.sh --plan docs/plans/<task>-plan.md --dry-run             # byte count, no spend
```

The wrapper sends the plan text plus the `head -7` header of every `docs/systems/` and `docs/operating-system/` doc, so the reviewer can name a system the plan forgot without being handed the repository. `--plan` is mutually exclusive with `--range` and `--review-root`; a missing, unreadable, or empty plan file is an error rather than an empty review.

Six plan lenses replace the six code personas, keeping the same output contract:

1. **Premises** — wrong problem, wrong diagnosis of the current system, an assumption likely to be false.
2. **Architecture and reuse** — simpler structure available, existing helper/component the plan ignores, abstraction with one caller, work in the wrong layer.
3. **Security and data integrity** — ownership/RLS/auth boundaries, secrets, idempotency, charge/refund symmetry, migrations without rollback, states that strand or double-charge.
4. **Runtime and change impact** — what the plan touches but never mentions: generation, polling/streaming, queues and partial state, shared client state, payloads, cache invalidation, billing-adjacent data.
5. **Verification and rollback** — whether the test strategy would actually fail if the change were wrong; real-flow verification gaps; hand-wave rollback.
6. **Product and scope** — violated product principles, unclear next action, over-engineering to reject, scope silently expanded or quietly dropped.

Save the evaluation next to the plan (`docs/plans/<task>-plan-eval.md`) or fold it into the plan's critique section. There is no separate ledger: the artifact is a tracked file. A reviewer outage is disclosed as an unevaluated plan; the implementing model never evaluates its own plan and calls that coverage.

In plan mode, `--implementer` names the agent that wrote the plan and will build it, so the wrapper's runtime auto-detection is already the right answer; pass it explicitly only when a human or a third runtime authored the plan. Re-run the evaluation when the plan changes materially after it was evaluated (new phase, changed decision, widened scope). An evaluation of a superseded plan is not coverage of the plan you are building.

## Sensitive paths: cross-model diff review regardless of size

Line count does not decide risk. Get an on-demand `scripts/agent-review.sh --range <base>..HEAD` before push, and say in the report whether you did, when the diff touches any of:

- `src/app/api/**`, `src/middleware.ts`, or any route/handler that reads a session
- Supabase migrations, RLS policies, or anything in `docs/plans/backend-change-history.md` scope
- Stripe/webhook handling, credit deduction or refund, entitlement or allowance checks
- authentication, authorization, ownership checks, or redirect/URL validation

These changes can be twenty lines and still be the expensive kind of wrong, so they must not wait for a 1,000-line sweep.

## Routing

Both modes use the same routing table.

| Implementer | Reviewer CLI | Model | Effort |
|---|---|---|---|
| Claude (Claude Code) | `codex exec` | `gpt-5.6-terra` | `model_reasoning_effort=medium` |
| Codex | `claude -p` | `claude-opus-4-8` | high thinking (`MAX_THINKING_TOKENS=32000`) |

Always invoke through the wrapper so incantations stay in one place:

```bash
scripts/agent-review.sh --plan docs/plans/x-plan.md   # plan evaluation (the automatic mode)
scripts/agent-review.sh                        # auto-detect known Codex/Claude runtime; error if unknown
scripts/agent-review.sh --range abc123..HEAD   # review a commit range
scripts/agent-review.sh --implementer codex    # force routing (reviewer = claude)
scripts/agent-review.sh --personas security,performance
scripts/agent-review.sh --dry-run              # print the exact reviewer command without spending tokens
```

Two layers with distinct guarantees. The wrapper (`agent-review.sh`) builds bounded material (in plan mode: the working-tree plan file plus system-doc headers; in diff mode: a diff/full-changed-file/system-doc bundle from regular Git blobs), rejects secret-like input in either mode, embeds the authoritative contract, and launches each CLI from a fresh empty non-repo directory with filesystem/shell/browser/app tools and project customizations disabled. The runner (`post-commit-review.sh`, now invoked deliberately rather than by a hook) adds isolation and a ledger for single-commit diff review: a temporary depth-two fetch of the immutable SHA and parent (no remote stored, so ignored/untracked files and dirty future chunks never enter the review root), plus results at `.git/agent-reviews/<sha>.{json,txt,stderr}` with private file modes and a 1 MB per-artifact cap. A manual wrapper invocation against the live repo gets the bundle/secret/tool guarantees but not the snapshot or the ledger. Quota, rate-limit, network, auth, timeout, snapshot, input/output-size, sensitive-input, or reviewer failure marks that SHA unreviewed; never substitute silently or report a pass.

### Ledger patch identity and review reuse

Applies to `post-commit-review.sh` runs only.

Code-review ledger entries may include optional `patchId`, `parent`, and `tree` fields. The runner computes `patchId` with `git patch-id --stable`, records the commit's first parent in `parent`, and records the exact resulting tree SHA in `tree`. Before spending another reviewer call, it may reuse a prior `passed` or `findings` result only when patch ID, parent, tree, reviewer, and result-artifact semantics all match. This deliberately narrow rule covers message-only rewrites while preventing whitespace-insensitive patch-ID collisions or reuse after a patch is rebased onto different surrounding code. Reused entries preserve the original result and output under the new SHA and add `reason: "duplicate_patch"` plus `duplicateOf: <reviewed-sha>`.

Patch-ID/tree calculation, ledger parsing, missing or incoherent source artifacts, legacy entries, failed/skipped reviews, or any other reuse ambiguity fails open: the runner performs a fresh review. Code-path classifier failure fails closed as an unreviewed commit; only its explicit no-match exit becomes a docs-only skip. Optional fields keep old ledger entries valid without migration.

## Personas

Each persona is a lens the reviewer must adopt in turn. Each owns system docs: if the reviewed change contradicts an owned doc and did not update it, that is a finding.

### 1. Maintainability
- Hunts: duplicated logic that should be centralized, one-off components where shared ones exist, functions grown past clarity, patches where a small re-architecture was warranted, naming drift from `docs/systems/coding-conventions.md`.
- Owns: `docs/systems/coding-conventions.md`, `docs/systems/directories-and-key-files.md`.

### 2. Security
- Hunts: ownership checks missing at trust boundaries, RLS assumptions violated, client-writable authority fields, secrets in code or logs, unsanitized input reaching prompts or HTML, redirect/URL validation gaps, rate-limit bypasses.
- Owns: `docs/systems/database-schema.md`, `docs/systems/api-endpoints.md`.

### 3. Performance
- Hunts: blocking loads where streaming/lazy patterns exist, unbounded queries, missing pagination, N+1 request patterns, client bundles pulled into server paths (and vice versa), polling cadences that fight the documented visibility-aware backoff, re-render storms from unstable references.
- Owns: `docs/systems/architecture.md`, `docs/systems/tech-stack.md`.

### 4. AI-smells
- Hunts: plausible-but-wrong code an LLM writes confidently: dead abstractions invented for one caller, comments narrating the diff instead of constraints, error handling that swallows and continues, tests asserting the mock instead of behavior, fabricated API shapes, copy-paste variants that almost match an existing helper, `any` escapes around type friction.
- Owns: `docs/operating-system/doc-conventions.md`, `docs/testing/test-inventory.md` (false-confidence tests are its beat).

### 5. Product / Founder UX
- Hunts: violations of the five strategic principles (PRODUCT.md), copy drift (em dashes, register), broken bias-to-next-action on changed screens, Action Red over-use, motion that violates DESIGN.md idioms, changes that make the next step less obvious for a non-technical founder.
- Owns: `docs/systems/product-overview.md`.

### 6. Data & Billing Integrity
- Hunts: non-idempotent writes on billing-adjacent paths, credit deduction/refund asymmetry, queue states that can strand or double-charge, webhook handling that isn't claim-then-process, allowance checks done client-side only, migrations without rollback notes, `backend-change-history.md` not updated.
- Owns: `docs/systems/credits-and-billing.md`, `docs/systems/database-schema.md` (shared with Security), `docs/plans/backend-change-history.md`.

## Reviewer output contract

Each finding, one per line where possible:

```
<severity: BLOCKER|MAJOR|MINOR> <persona> <file:line> — <problem>. <concrete failure scenario>. Fix: <suggestion>.
```

- Severity reflects user/data impact, not effort.
- No praise sections, no summaries of what the diff does, no style nits ESLint already enforces.
- Stale-doc findings cite both the code location and the doc line it contradicts.
- The implementing agent triages every finding in the review artifact: fixed, rejected (with reason), or deferred (with Linear issue when warranted).
