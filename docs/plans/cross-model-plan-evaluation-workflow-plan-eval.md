# Plan Evaluation: Cross-Model Plan Evaluation Workflow

Reviewer: Codex `gpt-5.6-terra`, `model_reasoning_effort=medium`, tools disabled (`scripts/agent-review.sh --plan`).
Implementer: Claude Code. Payload: 26,782 bytes (plan + `head -7` of every system/operating-system doc). Tokens used: 19,832.
Run date: 2026-07-29. Triage table lives in `docs/plans/cross-model-plan-evaluation-workflow-plan.md` § Plan evaluation and triage.

Raw reviewer output, unedited:

```
MAJOR Premises docs/operating-system/review-personas.md — The supplied header already says cross-model review is a blocking plan evaluation, contradicting the plan's diagnosis that this behavior still needs to be introduced. Building from this unreconciled baseline can leave the actual hook, workflow, and documentation in mutually inconsistent states. Fix: establish and record the current behavior of `.githooks/post-commit`, `scripts/agent-review.sh`, and the workflow docs before selecting edits.

MAJOR Security and data integrity Phase 2 — Plan evaluation occurs before implementation, but the routing rule is based on which model implemented the work; the plan specifies no required provenance or evaluator-selection input for this pre-implementation stage. A model can evaluate its own plan, defeating the stated cross-model control. Fix: require an explicit plan author/implementer identity and have `--plan` reject or deterministically route same-model evaluations.

MAJOR Verification and rollback Phases 2–3 — A "blocking" gate is only documented; the plan creates no durable review artifact, reviewed-content hash, or enforcement that prevents implementation after an unevaluated or subsequently modified plan. An agent can implement an unreviewed revision while claiming the task passed plan evaluation. Fix: store the evaluator result and plan-content hash alongside the plan, and require re-evaluation when the hash changes before implementation proceeds.

MAJOR Product and scope Goal / Phase 3 — "Substantial task" has no operational definition or mandatory trigger, while small auth, RLS, webhook, migration, and billing changes can have severe consequences. Such changes can bypass both plan evaluation and the 1,000-line sweep despite the plan naming them as risky. Fix: define objective sensitive-path/change triggers that require plan evaluation or an on-demand cross-model diff review regardless of line count.

MINOR Security and data integrity Phase 2 — The plan promises secret-shaped-input refusal but does not specify that scanning occurs after concatenating both the plan and every system-doc header. A credential accidentally added to a system-doc header could be sent to an external reviewer even when the plan itself passes scanning. Fix: scan the complete assembled review payload and add a test with secret-shaped material in an included header.

MINOR Runtime and change impact Phase 1 — Retaining `node scripts/sweep-check.mjs --notify` is assumed to preserve automatic same-model code review, but the plan does not establish whether `--notify` actually launches a review or merely reports that one is due. The repository could lose its only automatic code-review mechanism. Fix: inspect and document `scripts/sweep-check.mjs` behavior, then add an automated test proving the threshold causes the intended review action.

MINOR Verification and rollback Phase 4 — The tests exercise option parsing but do not assert the assembled prompt includes all required system-doc headers, excludes diff/range material, or preserves the exact findings contract. A broken plan mode can pass while reviewing the wrong context or producing unparsable output. Fix: add deterministic dry-run assertions over the generated payload and output parser behavior.

MINOR Verification and rollback Test strategy — "Make a real commit and read the hook output" is manual and cannot detect a future reintroduction of the paid post-commit runner. Fix: add a repository test that verifies `.githooks/post-commit` invokes the sweep check and does not invoke `post-commit-review.sh`.
```

Capture note: this run predates the `--out` path fix in `scripts/agent-review.sh`, which resolved a relative `--out` against the reviewer's temporary exec directory instead of the invocation directory, so the artifact was discarded on cleanup. The text above is the run's stdout, transcribed verbatim; `--out` now writes where the caller expects.
