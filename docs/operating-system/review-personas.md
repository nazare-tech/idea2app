# Review Personas and Cross-Model Review
Defines the six review personas (maintainability, security, performance, AI-smells, product/founder UX, data & billing integrity), what each hunts for, and the system docs each owns.
Cross-model review routing: work implemented by Claude is reviewed by Codex CLI (gpt-5.6-terra, reasoning medium); work implemented by Codex is reviewed by Claude CLI (Opus 4.8, high thinking).
The single entry point is scripts/agent-review.sh, which auto-detects the implementer, builds the persona-aware prompt, and shells out to the other CLI read-only.
Reviews happen at wrap-up of substantial work (see planning-workflow.md) and during commit sweeps (.agents/skills/commit-sweep); findings land in the review artifact in docs/plans/.
Each persona owns docs/systems/ files and must flag stale docs as findings; doc drift is a review defect, not a nice-to-have (see doc-conventions.md self-healing rule).
Reviewer output contract: severity-tagged findings with file:line, a concrete failure scenario, and a suggested fix; no praise, no restating the diff.
---

## When cross-model review runs

1. **Wrap-up of substantial work**: after implementation and self-review, before marking a plan implemented. Feed the working-tree diff or commit range.
2. **Commit sweeps**: the `commit-sweep` skill (triggered at net +1000 added lines, `scripts/sweep-check.mjs`) runs a persona sweep across the whole range.
3. **On request**: "get a second opinion on this diff."

The reviewing model must not be the implementing model.

## Routing

| Implementer | Reviewer CLI | Model | Effort |
|---|---|---|---|
| Claude (Claude Code) | `codex exec` | `gpt-5.6-terra` | `model_reasoning_effort=medium` |
| Codex | `claude -p` | `claude-opus-4-8` | high thinking (`MAX_THINKING_TOKENS=32000`) |

Always invoke through the wrapper so incantations stay in one place:

```bash
scripts/agent-review.sh                        # auto-detect implementer, review working tree + last commit
scripts/agent-review.sh --range abc123..HEAD   # review a commit range
scripts/agent-review.sh --implementer codex    # force routing (reviewer = claude)
scripts/agent-review.sh --personas security,performance
scripts/agent-review.sh --dry-run              # print the exact reviewer command without spending tokens
```

The reviewer runs read-only (`codex exec --sandbox read-only` / `claude -p` restricted to read tools). Reviews cost CLI tokens; they are never triggered automatically by git hooks, only by an agent or the user.

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
