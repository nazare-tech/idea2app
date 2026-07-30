---
implemented: true
implemented_at: 2026-07-29T00:00:00-07:00
implementation_summary: Per-commit cross-model review is gone from .githooks/post-commit (sweep notice only). scripts/agent-review.sh gained a --plan mode with six plan lenses, working-tree plan material plus docs head -7 headers, and the same secret/byte/tool guarantees. commit-sweep now fans its thermonuclear lenses across six parallel read-only finder subagents with verification and edits kept in the dispatching agent, and ui-verification.md pins one long-lived next dev per thread. Docs, commit and commit-sweep skills, AGENTS.md, CLAUDE.md, and scripts/README.md now describe plan-stage cross-model review, a sensitive-path on-demand diff-review rule, and the sweep as the only automatic code review. Covered by src/lib/agent-review-plan.test.ts (6 tests, dry-run only) plus a post-commit hook regression assertion.
---

# Plan: Move Cross-Model Review from Every Commit to Plan Evaluation

## Goal

Cut the dominant latency out of the implementation loop. Today every code commit blocks on a synchronous opposite-CLI six-persona review (`.githooks/post-commit` → `scripts/post-commit-review.sh`, 1200s timeout, 1.5 MB bundle, remediation commits re-trigger it). Replace that with one blocking cross-model **plan evaluation** per substantial task, and let the existing same-model `thermo-nuclear-code-quality-review` sweep remain the automatic code-review lens.

Net effect: cross-model spend moves from O(commits) to O(tasks), and it moves upstream to where a caught defect is cheapest (a wrong plan costs more than a wrong line).

## Assumptions

- Cross-model review still has real value; the problem is *cadence and placement*, not the technique.
- The plan-evaluation reviewer sees the plan file plus system-doc headers, not the whole repo. Plans are small, so this call is far cheaper than a diff review.
- Post-commit review machinery stays on disk and stays tested. Only the automatic hook invocation goes away.
- The sweep threshold stays at 1,000 net code lines (user decision), so up to ~1,000 lines can sit unreviewed between sweeps. Accepted trade-off.
- Local `codex` / `claude` CLIs remain authenticated; a plan-eval outage is disclosed, never silently substituted with the implementing model.

## Decisions (user-selected)

| Question | Options | Selected |
|---|---|---|
| How far to pull cross-model review out of the commit path | A: remove hook call, keep `agent-review.sh` / `post-commit-review.sh` on demand · B: batch it at push time · C: delete it entirely | **A** — no automatic per-commit spend, no lost capability, reversible in one line |
| Sweep threshold now that the sweep is the only automatic code review | A: lower to ~400 · B: keep 1,000 · C: every push | **B** — cadence unchanged |
| Plan evaluation gate | A: blocking before implementation · B: advisory in parallel | **A** — plans are rare and cheap to fix; a revised plan must not arrive after the code is written |

## Phases

### Phase 1 — Hook

`.githooks/post-commit` stops calling `scripts/post-commit-review.sh`. It keeps `node scripts/sweep-check.mjs --notify`. Comment explains that cross-model review now runs at plan time and that the runner is on-demand.

### Phase 2 — Plan-evaluation mode in `scripts/agent-review.sh`

Add `--plan FILE` to the existing wrapper rather than writing a second script: reviewer routing, secret-shaped-input refusal, input byte cap, tool disabling, and the outside-the-repo `EXEC_ROOT` launch are already there and must not be duplicated (maintainability + security personas both own that code).

In plan mode:
- Material = the plan file body + `head -7` headers of every `docs/systems/*.md` and `docs/operating-system/*.md`, so the reviewer can name systems the plan forgot without being handed the repo.
- No diff, no range, no dirty-tree logic; a dirty working tree is irrelevant to a plan review.
- Prompt swaps the six code personas for six plan lenses (premises, architecture/reuse, security & data integrity, runtime/change-impact, verification & rollback, product/scope).
- Same output contract shape and the same `NO FINDINGS` sentinel, so the caller's parsing rule is unchanged.
- `--range` and `--plan` are mutually exclusive; a missing/unreadable/empty plan file is an error, not an empty review.

### Phase 3 — Docs and skills

- `docs/operating-system/review-personas.md`: rewrite the 7-line header and the "when cross-model review runs" section around plan evaluation + on-demand diff review. Personas themselves stay (the sweep and manual reviews still use them). Add the plan-lens list and the plan-eval artifact convention.
- `docs/operating-system/planning-workflow.md`: add the blocking plan-eval gate between "plan written" and "implementation starts", and correct the paragraph that promises per-commit review.
- `.agents/skills/commit/SKILL.md`: delete steps 4/5 (collect per-commit reviews, remediate, re-review loop) and the safety rules that assume automatic review; keep the sweep step, secrets rules, branch discipline. Push no longer waits on reviewer status.
- `.agents/skills/commit/references/api_reference.md`: same correction.
- `.agents/skills/commit-sweep/SKILL.md`: the sweep is now the *only* automatic code review, so drop "per-commit review already provided that lens", widen its remit accordingly, and stop requiring per-commit review of its own fix commits.
- `AGENTS.md`: router row + "automation already active" section.
- `CLAUDE.md`: reviewer-routing note becomes plan-eval routing.
- `scripts/README.md`: script table, hook table, and the paid-spend declaration (the sole automatic paid path is gone; plan eval is user-triggered).

### Phase 4 — Test

`src/lib/agent-review-plan.test.ts`: `--plan` + `--dry-run` builds a prompt and reports plan mode; `--plan` with `--range` is rejected; missing/empty plan file is rejected; a plan containing secret-shaped material is refused (exit 4). Dry-run means no reviewer tokens are spent by the test.

### Phase 5 — Loop-latency follow-ons the maintainer approved after the plan-eval pass

Added to this plan rather than deferred, because both are pure process changes with no product runtime impact:

- `.agents/skills/commit-sweep/SKILL.md` gains a fan-out step: six read-only finder groups (structure, duplication, contracts, correctness, tests/dead-code, docs) dispatched in one batch with a shared finder preamble and the standard finding contract, plus an extra themed finder when one system dominates the range. Verification, deduplication, triage, tests, and every edit stay with the dispatching agent, so no two agents write to the working tree. Serial fallback is allowed only when the runtime has no subagents, and must be disclosed in the report. Mirrored as a short pointer in `thermo-nuclear-code-quality-review`.
- `docs/operating-system/ui-verification.md` § dev server discipline is tightened to one long-lived `next dev` per thread: reuse across tasks in that thread, never kill at task end, probe before starting a second one, never kill a server another thread owns, restart only for env/config/middleware/dependency changes.

## Test strategy

- `bash -n scripts/agent-review.sh` plus the new node test file (`npm test` runs `src/**/*.test.ts`).
- `scripts/agent-review.sh --plan <this file> --dry-run` for a real byte count.
- One live plan evaluation against this plan file to confirm the prompt produces contract-shaped findings.
- Existing `src/lib/post-commit-review.test.ts` must still pass: the runner keeps its contract, it just loses its automatic caller.
- Commit this change and confirm the post-commit hook prints only the sweep notice.

## Rollback

One-line revert in `.githooks/post-commit` restores automatic per-commit review; nothing it depends on is deleted. `--plan` mode is additive. Doc edits revert with the commit.

## Architecture Improvement Opportunities

- **Reuse the hardened wrapper for plan mode instead of a new script** — *selected*. Avoids a second copy of secret scanning, byte caps, and reviewer isolation; a divergent copy is the realistic security failure here.
- **Keep the `NO FINDINGS` sentinel and severity contract identical across modes** — *selected*. One parsing rule for callers, one habit for the agent.
- **Bound plan-review context to 7-line doc headers rather than whole system docs** — *selected*. Keeps the call cheap and keeps the reviewer from drifting into a code review.
- **A ledger for plan reviews (`.git/agent-reviews`-style)** — *rejected*. Plan reviews are one per task and their artifact is a tracked file in `docs/plans/`; a second ledger is machinery without a reader.
- **Auto-run plan eval from a hook when `docs/plans/*-plan.md` is added** — *rejected*. Hidden automatic spend is what we are removing; plan eval stays an explicit workflow step.
- **Push-time batched diff review** — *deferred*. Cheap to add later (`pre-push` + `agent-review.sh --range @{push}..HEAD`) if the sweep gap proves too wide.

## Runtime and Change-Impact Analysis

- **AI generation / paid calls**: automatic reviewer spend drops to zero; the only cross-model spend is user- or workflow-triggered plan eval. `scripts/README.md`'s spend declaration must say so or it lies.
- **Polling / streaming / queues / billing data**: untouched, no product runtime change. Risk is process-side only.
- **Shared client state, payloads, cache invalidation**: untouched.
- **Real-flow verification**: the hook change is verified by making a real commit and reading the hook output; the plan mode is verified by a real reviewer call.
- **Regression risk**: docs that still promise per-commit review would make a future agent claim coverage that no longer exists. Doc edits are part of the change, not follow-up (self-healing rule).
- **Coverage risk**: between sweeps, code review is now the implementing model's own diligence. Mitigation: the sweep's remit widens, and on-demand `agent-review.sh` stays one command away for risky diffs (auth, billing, migrations).

## Candid critique

- **Architecture**: correct direction. Reviewing a plan is higher leverage per token than reviewing a diff, and the per-commit design put a 20-minute worst case on the inner loop, which is how a quality gate becomes a gate people route around.
- **Product**: the maintainer ships alone; loop latency is the real constraint. Faster iteration with review at the design boundary is a better fit than exhaustive per-commit auditing.
- **Customer**: no user-visible change either way.
- **Engineering**: main risk is doc drift, addressed in Phase 3. Second risk is that plan eval becomes a rubber stamp; the prompt therefore demands severity-tagged findings on premises and scope, not a summary of the plan.
- **Risk / security**: real reduction in automatic coverage. Security-sensitive diffs (auth, RLS, webhooks, billing) no longer get an automatic second model. Mitigation is discipline plus a named on-demand command; if that proves insufficient, the deferred push-time batched review is the fix.

## Plan evaluation and triage

Raw reviewer output: `docs/plans/cross-model-plan-evaluation-workflow-plan-eval.md` (Codex `gpt-5.6-terra`, plan mode, 26.8 KB payload, 19.8k tokens). Eight findings; this was also the live verification of the new mode.

| Finding | Triage |
|---|---|
| MAJOR Premises: doc headers already describe plan-stage review, contradicting the plan's diagnosis | **Rejected (bootstrap artifact).** The evaluation ran after the doc edits because the mechanism it evaluates did not exist when the plan was written. Every future plan is evaluated before implementation. |
| MAJOR Security: routing keyed on implementer lets a model evaluate its own plan | **Fixed (docs).** `review-personas.md` now states that in plan mode `--implementer` names the agent that wrote and will build the plan, so runtime auto-detection is already the correct answer; pass it explicitly only for human- or third-runtime-authored plans. |
| MAJOR Verification: nothing enforces the "blocking" gate or re-evaluation after the plan changes | **Partly fixed.** Both `planning-workflow.md` and `review-personas.md` now require re-evaluation when the plan changes materially. A content-hash gate stays rejected: a solo repo with tracked artifacts does not need an enforcement mechanism it would also have to maintain. |
| MAJOR Product/scope: sensitive small changes bypass both plan eval and the 1,000-line sweep | **Fixed.** New `review-personas.md` § sensitive paths lists concrete triggers (`src/app/api/**`, `src/middleware.ts`, migrations/RLS, Stripe/webhook/credits, auth and ownership checks) requiring on-demand cross-model diff review at any diff size, referenced from `planning-workflow.md` and the commit skill. |
| MINOR Security: secret scan must cover the assembled payload including doc headers | **No change needed.** The scan runs on `REVIEW_MATERIAL` after plan text and every doc header are concatenated, in both modes; the plan-mode secret test proves the refusal path. |
| MINOR Runtime: `sweep-check.mjs --notify` only notifies, it does not launch review | **No change needed, correct as designed.** The notice is advisory; the active agent invokes `commit-sweep` when `due` is true (commit skill step 5). A hook cannot spawn a same-model agent session. |
| MINOR Verification: tests assert option parsing, not payload content | **Fixed.** Added a dry-run assertion that the plan-mode payload exceeds the plan file by >10 KB, which fails if the system-doc header sweep regresses. |
| MINOR Verification: "make a commit and read the hook output" cannot catch reintroduction | **Fixed.** Added a test asserting `.githooks/post-commit` calls `sweep-check.mjs --notify` and references neither `post-commit-review.sh` nor `agent-review.sh`. |

## Iteration-speed follow-ons (recorded, not implemented here)

Ranked by latency removed per unit of work:

1. **Done (this plan).** Per-commit review removal, which takes the 20-minute worst case out of the loop.
2. **Done.** Sweep fan-out: `commit-sweep` now dispatches six read-only finder subagents in one batch (structure, duplication, contracts, correctness, tests/dead-code, docs), each with the thermonuclear lenses and a fixed finding contract, while verification, triage, and every edit stay with the dispatching agent. It was the heaviest blocking step before push. Mirrored into `thermo-nuclear-code-quality-review` for direct invocations.
3. **Done.** Dev-server discipline in `docs/operating-system/ui-verification.md`: exactly one long-lived `next dev` per thread, reused across tasks in that thread, never killed at task end, never a second server when one is reachable, and never killing another thread's server. Restart only for env/config/middleware/dependency changes; hot reload covers source edits.
4. Move any *automatic* cross-model review that returns to CI, off the local critical path.

Measured and rejected:

- `.githooks/pre-commit` is not a bottleneck. `incremental: true` is already set in `tsconfig.json`, `npm run typecheck` completes in ~2s, and ESLint is already staged-scoped. Scoping the typecheck further buys nothing.
- Persona/effort scaling for on-demand reviews (`--personas security,data`). Rejected by the maintainer: an on-demand review is deliberate and unbounded in time, so trading coverage for speed there is the wrong trade. `--personas` stays available but is not a recommended default.
- Shortening plan files to cut evaluation latency. Rejected by the maintainer: plan quality outranks eval turnaround, and the payload cap (1.5 MB) is nowhere near binding at ~27 KB.
