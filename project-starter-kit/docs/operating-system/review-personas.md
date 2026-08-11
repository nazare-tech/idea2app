# Review Personas and Cross-Model Review
Defines the six review personas (maintainability, security, performance, AI-smells, product/user experience, data & integrity), what each hunts for, and the system docs each owns.
Cross-model review routing: work implemented by one model is reviewed by the other CLI, so the reviewing model is never the implementing model.
Cross-model review runs once per substantial task as a blocking plan evaluation through `scripts/agent-review.sh --plan`, before implementation.
Automatic code review is the same-model net +1000 sweep; opposite-CLI diff review remains available on demand.
Each persona owns docs/systems/ files and must flag stale docs as findings; doc drift is a review defect, not a nice-to-have (see doc-conventions.md self-healing rule).
Reviewer output contract: severity-tagged findings with a concrete consequence and suggested fix; the clean sentinel is exactly `NO FINDINGS`.
---

## When cross-model review runs

1. **Plan evaluation, before implementation (automatic and blocking):** every substantial task's plan is evaluated by the opposite CLI. Accepted findings change the plan while changes are still cheap.
2. **On demand, on a diff:** use for explicitly requested review or sensitive changes where being wrong is expensive.
3. **Never automatically per commit:** the post-commit hook only reports sweep status.

The net-plus-1,000-line `commit-sweep` is the automatic code-review layer. It remains in the active agent and is not a duplicate opposite-CLI range review.

The reviewing model must not be the implementing model.

## Plan evaluation

```bash
scripts/agent-review.sh --plan docs/plans/<task>-plan.md
scripts/agent-review.sh --plan docs/plans/<task>-plan.md --out docs/plans/<task>-plan-eval.md
scripts/agent-review.sh --plan docs/plans/<task>-plan.md --dry-run
```

Plan mode reviews the working-tree plan plus the seven-line headers of operating/system docs. It is mutually exclusive with `--range` and `--review-root`. Save the evaluation beside the plan, triage every finding, and rerun when a new phase, changed decision, or wider scope materially changes the plan.

The six plan lenses are premises, architecture/reuse, security/data integrity, runtime/change impact, verification/rollback, and product/scope. A reviewer outage leaves the plan explicitly unevaluated; the implementing model does not substitute itself.

## Routing

| Implementer | Reviewer CLI | Model | Effort |
|---|---|---|---|
| Claude (Claude Code) | `codex exec` | `{{CODEX MODEL ID}}` | `model_reasoning_effort=medium` |
| Codex | `claude -p` | `{{CLAUDE MODEL ID}}` | high thinking (`MAX_THINKING_TOKENS=32000`) |

Set the two model IDs in `scripts/agent-review.sh` to models you actually have access to on this machine, then verify with `--dry-run` before trusting the automation. Always invoke through the wrapper so incantations stay in one place:

```bash
scripts/agent-review.sh --plan docs/plans/x-plan.md
scripts/agent-review.sh                        # auto-detect known Codex/Claude runtime; error if unknown
scripts/agent-review.sh --range abc123..HEAD   # review a commit range
scripts/agent-review.sh --implementer codex    # force routing (reviewer = claude)
scripts/agent-review.sh --personas security,performance
scripts/agent-review.sh --dry-run              # print the exact reviewer command without spending tokens
```

The wrapper builds bounded material (a plan plus doc headers in plan mode, or a diff/full-file/system-doc bundle in range mode), rejects secret-like input, embeds the authoritative reviewer contract, and launches each CLI from a fresh non-repository directory with tools and project customizations disabled. `post-commit-review.sh` remains available for deliberate isolated single-commit reviews and its ledger, but the hook no longer invokes it automatically. Quota, network, authentication, timeout, input-size, sensitive-input, or reviewer failures are disclosed; never substitute silently or report a pass.

### Ledger patch identity and review reuse

Ledger entries may include optional `patchId`, `parent`, and `tree` fields. The runner computes `patchId` with `git patch-id --stable`, records the commit's first parent, and records the resulting tree SHA. Before spending another reviewer call, it may reuse a prior `passed` or `findings` result only when patch ID, parent, tree, reviewer, and result-artifact semantics all match. This deliberately narrow rule covers message-only rewrites (`git commit --amend`) while preventing whitespace-insensitive patch-ID collisions or reuse after a patch is rebased onto different surrounding code. Reused entries preserve the original result under the new SHA and add `reason: "duplicate_patch"` plus `duplicateOf: <reviewed-sha>`.

Patch-ID/tree calculation, ledger parsing, missing or incoherent source artifacts, legacy entries, failed/skipped reviews, or any other reuse ambiguity fails open: the runner performs a fresh review. Code-path classifier failure fails closed as an unreviewed commit; only its explicit no-match exit becomes a docs-only skip.

## Personas

Each persona is a lens the reviewer must adopt in turn. Each owns system docs: if the reviewed change contradicts an owned doc and did not update it, that is a finding. Assign the `Owns:` lines once this project's `docs/systems/` docs exist.

### 1. Maintainability
- Hunts: duplicated logic that should be centralized, one-off components where shared ones exist, functions grown past clarity, patches where a small re-architecture was warranted, naming drift from `docs/systems/coding-conventions.md`.
- Owns: `docs/systems/coding-conventions.md`, `docs/systems/directories-and-key-files.md`.

### 2. Security
- Hunts: ownership checks missing at trust boundaries, row-level access assumptions violated, client-writable authority fields, secrets in code or logs, unsanitized input reaching queries, prompts, or HTML, redirect/URL validation gaps, rate-limit bypasses.
- Owns: `docs/systems/database-schema.md`, `docs/systems/api-endpoints.md`.

### 3. Performance
- Hunts: blocking loads where streaming/lazy patterns exist, unbounded queries, missing pagination, N+1 request patterns, client bundles pulled into server paths (and vice versa), polling cadences that fight documented backoff, re-render storms from unstable references.
- Owns: `docs/systems/architecture.md`, `docs/systems/tech-stack.md`.

### 4. AI-smells
- Hunts: plausible-but-wrong code an LLM writes confidently: dead abstractions invented for one caller, comments narrating the diff instead of constraints, error handling that swallows and continues, tests asserting the mock instead of behavior, fabricated API shapes, copy-paste variants that almost match an existing helper, type escapes (`any`, unchecked casts) around type friction.
- Owns: `docs/operating-system/doc-conventions.md`, `docs/testing/test-inventory.md` (false-confidence tests are its beat).

### 5. Product / User Experience
- Hunts: violations of this project's stated product principles, copy drift from the documented voice, screens where the next action stopped being obvious, accent/emphasis overuse, motion that violates the design idioms, changes that make the primary user's job harder.
- Owns: `docs/systems/product-overview.md`, {{DESIGN/PRODUCT DOCS IF THIS PROJECT HAS THEM}}.

### 6. Data & Integrity
- Hunts: non-idempotent writes on money- or entitlement-adjacent paths, deduction/refund asymmetry, queue states that can strand or double-charge, webhook handling that isn't claim-then-process, allowance checks done client-side only, migrations without rollback notes, `backend-change-history.md` not updated.
- Owns: `docs/plans/backend-change-history.md`, `docs/systems/database-schema.md` (shared with Security), {{BILLING/QUEUE SYSTEM DOCS IF ANY}}.

## Reviewer output contract

Each finding, one per line where possible:

```
<severity: BLOCKER|MAJOR|MINOR> <persona> <file:line> — <problem>. <concrete failure scenario>. Fix: <suggestion>.
```

- Severity reflects user/data impact, not effort.
- No praise sections, no summaries of what the diff does, no style nits the linter already enforces.
- Stale-doc findings cite both the code location and the doc line it contradicts.
- The implementing agent triages every finding in the review artifact: fixed, rejected (with reason), or deferred (with a tracked issue when warranted).
