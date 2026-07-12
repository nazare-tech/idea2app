# Review Personas and Cross-Model Review
Defines the six review personas (maintainability, security, performance, AI-smells, product/founder UX, data & billing integrity), what each hunts for, and the system docs each owns.
Cross-model review routing: work implemented by Claude is reviewed by Codex CLI (gpt-5.6-terra, reasoning medium); work implemented by Codex is reviewed by Claude CLI (Opus 4.8, high thinking).
Every code commit triggers scripts/post-commit-review.sh, which persists pass/findings/failure status under .git/agent-reviews/ and invokes scripts/agent-review.sh with a bounded diff and no model tools.
At wrap-up, agents verify and remediate all per-commit findings; net +1000 sweeps stay in the current agent and apply thermo-nuclear-code-quality-review.
Each persona owns docs/systems/ files and must flag stale docs as findings; doc drift is a review defect, not a nice-to-have (see doc-conventions.md self-healing rule).
Reviewer output contract: severity-tagged findings with file:line, a concrete failure scenario, and a suggested fix; no praise, no restating the diff.
---

## When cross-model review runs

1. **Every code commit**: synchronous `post-commit` review of the immutable `<sha>^..<sha>` range; docs-only commits skip paid review.
2. **Wrap-up of substantial work**: collect every commit status, verify/deduplicate findings against final `HEAD`, remediate accepted findings, and review remediation commits too. Run a manual working-tree review only when uncommitted code remains.
3. **On request**: "get a second opinion on this diff."

The net-plus-1,000-line `commit-sweep` is intentionally not another cross-model range review. The active agent applies the repo-local thermonuclear skill after the per-commit review/remediation batch.

The reviewing model must not be the implementing model.

## Routing

| Implementer | Reviewer CLI | Model | Effort |
|---|---|---|---|
| Claude (Claude Code) | `codex exec` | `gpt-5.6-terra` | `model_reasoning_effort=medium` |
| Codex | `claude -p` | `claude-opus-4-8` | high thinking (`MAX_THINKING_TOKENS=32000`) |

Always invoke through the wrapper so incantations stay in one place:

```bash
scripts/agent-review.sh                        # auto-detect known Codex/Claude runtime; error if unknown
scripts/agent-review.sh --range abc123..HEAD   # review a commit range
scripts/agent-review.sh --implementer codex    # force routing (reviewer = claude)
scripts/agent-review.sh --personas security,performance
scripts/agent-review.sh --dry-run              # print the exact reviewer command without spending tokens
```

The wrapper builds a bounded diff/full-changed-file/system-doc bundle inside a temporary depth-two fetch of the immutable SHA and parent; no remote is stored. It rejects secret-like input, embeds the authoritative persona contract, then launches each CLI from a fresh empty non-repo directory with filesystem/shell/browser/app tools and project customizations disabled. Ignored/untracked files, dirty future chunks, unrelated history, repo instructions, and host environment data are unavailable to the model. Results live at `.git/agent-reviews/<sha>.{json,txt,stderr}` with private file modes and a 1 MB per-artifact cap. Quota, rate-limit, network, auth, timeout, snapshot, input/output-size, sensitive-input, or reviewer failure marks that SHA unreviewed; never substitute silently or report a pass.

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
