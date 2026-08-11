# Planning Workflow
Rules for plan and review artifacts in docs/plans/, the Recommendation A auto-selection policy, Architecture Improvement Opportunities, and backend-change-history.md.
Substantial work runs through the holistic-implementation skill: plan file first, blocking opposite-CLI plan evaluation, implement, verify, remediate, then mark the plan implemented.
Recommendation A is chosen for every open question unless docs/plans/recommendation-selection-rules.md, the user's prompt, or a hard safety constraint points elsewhere.
Every substantial plan needs goal, assumptions, A/B decisions with trade-offs, phases, test strategy, rollback notes, a candid multi-perspective critique, and change-impact analysis.
Backend, database, auth, webhook, persistence, or data-shape changes must also append to docs/plans/backend-change-history.md with verification and rollback notes.
Corrections to recommendation choices become generalized rules in docs/plans/recommendation-selection-rules.md after asking for the underlying reason.
---

## When this applies

For substantial feature, refactor, bug-fix, architecture, product, or implementation requests, use the `holistic-implementation` skill. That skill owns the full plan, critique, implementation, verification, review, security review, and remediation loop; this doc owns the repo-specific defaults. Small mechanical edits may use a short checklist instead.

Keep working on the current branch unless explicitly asked for a new branch.

## Plan files

Create `docs/plans/<short-slug>-plan.md` from `docs/plans/plan-template.md` before implementation. Include:

- Goal, assumptions, clarifying questions
- Recommendation A/B choices with trade-offs, and the selected recommendation
- Implementation phases, test strategy, rollback or recovery notes
- A candid critique from architecture, product, customer, engineering, and risk/security perspectives

### Architecture Improvement Opportunities (required in every substantial plan)

Actively look for scoped improvements that make the implementation more reusable, scalable, modular, durable, secure, observable, or recoverable. Patterns to consider: durable/idempotent intermediate state, ownership checks at trust boundaries, contract sync between producers and consumers, bounded repair of untrusted structured input, shared helpers, progressive loading, rollback hooks. For each opportunity record the benefit, trade-off, likely files or boundaries, and whether it is **selected**, **deferred**, or **rejected** as over-engineering for the current task.

### Runtime and Change-Impact Analysis (required)

Include the framework-agnostic analysis required by `holistic-implementation`: repeated-work cadence, ownership/scope/lifetime, propagation fan-out, boundary and cache semantics, partial/duplicate/delayed/stale/out-of-order behavior, blast radius, rollback seam, and risk-matched verification with concrete acceptance thresholds. Apply it explicitly to this project's real hot paths ({{POLLING/STREAMING, QUEUES, SHARED CLIENT STATE, CLIENT-SERVER PAYLOADS, CACHE INVALIDATION, BILLING-ADJACENT DATA, EXTERNAL API CALLS}}).

### Blocking cross-model plan evaluation

Before implementation, run the opposite reviewer CLI through:

```bash
scripts/agent-review.sh --plan docs/plans/<task>-plan.md --out docs/plans/<task>-plan-eval.md
```

Fold accepted findings into the plan and record rejected findings with reasons. Do not self-review a failed or unavailable opposite-CLI evaluation and call it coverage. Re-run the evaluation when the plan changes materially after review.

## Recommendation A policy

Do not wait for answers to clarifying questions by default. Pick Recommendation A for each open question and continue through implementation, verification, review, and remediation, unless an existing rule in `docs/plans/recommendation-selection-rules.md`, the user's prompt, or a hard safety constraint clearly points to another option.

Stop and ask first if Recommendation A would: delete data, overwrite existing files, expose secrets, weaken authorization, make irreversible production changes, require credentials not provided, or incur open-ended/production spend.

Do not avoid small expected local QA spend from configured services when real-flow verification or durable test artifacts depend on it; avoiding that spend usually creates more future work.

### When a recommendation choice is corrected

First adjust the implementation to the corrected direction when practical, then ask what underlying preference, constraint, or product principle made the other recommendation better. Do not treat the correction as a one-off. Update `docs/plans/recommendation-selection-rules.md` with the generalized rule once the root reason is clear.

## Keeping plans current

- Update the plan as decisions become facts.
- When implementation is complete, set plan metadata `implemented: true`, `implemented_at: <ISO 8601>`, and a concise implementation summary. If work is intentionally partial, keep `implemented: false` and document what remains.

## Review artifacts

For code or behavior changes, create `docs/plans/<same-slug>-review.md` from `docs/plans/review-template.md` with: verification run, real-flow evidence, two fresh-eyes passes, code-review findings, security-review findings when relevant, and remediation status.

Include an architecture improvement review that confirms selected opportunities landed, records why deferred opportunities remain deferred, and calls out any new duplication, brittle contracts, non-idempotent paths, authorization gaps, or recovery blind spots found during review.

Cross-model review runs automatically on the plan, not per commit. Diff-level opposite-CLI review is on demand for high-risk or explicitly requested work. See `docs/operating-system/review-personas.md`.

After the commit/review/remediation batch, run `node scripts/sweep-check.mjs --json`. If net code growth is at least 1,000 lines, invoke `commit-sweep` automatically in the active agent before push. The sweep applies `thermo-nuclear-code-quality-review` across the marker range and does not call a duplicate cross-model range reviewer.

## Backend change history

For backend, database, auth, webhook, persistence, queue, external-service, or data-shape changes, also update `docs/plans/backend-change-history.md` with: what changed, where the durable source of truth lives, how it was verified, and how to roll it back or recover. Never record secrets.

## General working style

- Think step by step before writing code; build one feature at a time and confirm it works before moving on.
- Before a medium or large change, consider whether the work should be re-architected across multiple files instead of patched in one place.
- Break large functions into smaller ones when it improves clarity, reuse, or testability; centralize logic duplicated across files.
- Prefer reusing existing components and patterns over one-off implementations.
- Prefer lazy loading, streaming, pagination, and progressive rendering over blocking on large content loads.
- Keep frequently changing state and repeated work at the narrowest practical owner.
- Validate contracts at trust boundaries. Derive authorization scope from verified server identity, never client-supplied ownership fields.
- After changes, suggest what to run and where to look next. If a request doesn't make sense, say so instead of doing it.
