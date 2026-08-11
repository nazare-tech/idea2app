---
name: thermo-nuclear-code-quality-review
description: This skill should be used for the automatic net-plus-1000-line commit sweep, or when the user asks for a thermonuclear, extremely strict, or deep maintainability review of a branch or commit range.
---

# Thermo-Nuclear Code Quality Review

Perform an unusually strict review of the requested commit range. Preserve behavior while pushing hard for simpler structure, better boundaries, fewer concepts, and less code.

## Core Standard

Apply this prompt:

> Perform a deep code quality audit of the scoped changes. Rethink their structure and implementation to meaningfully improve code quality without changing intended behavior. Improve abstractions and modularity; reduce spaghetti code; improve succinctness and legibility. Be ambitious when a clear restructuring makes the result simpler. Measure twice, cut once.

## Required Lenses

1. Search for code-judo moves that delete branches, modes, helpers, wrappers, or layers instead of rearranging complexity.
2. Treat a changed file crossing 1,000 lines as a presumptive decomposition finding unless a strong structural reason exists.
3. Flag ad-hoc conditionals, scattered special cases, feature checks in shared paths, and nullable/boolean modes that make state harder to reason about.
4. Reject thin abstractions, identity wrappers, pass-through helpers, cast-heavy contracts, unnecessary optionality, `any`, and `unknown` used to avoid clear types.
5. Keep logic in its canonical layer. Reuse existing helpers; flag near-duplicates introduced in separate commits.
6. Separate orchestration from business logic. Flag avoidable sequential work and non-atomic related updates when a clearer parallel or atomic structure exists.
7. Check cross-commit contract drift among prompts, parsers, renderers, API payloads, database shapes, tests, and `docs/systems/`.
8. Find dead/orphaned code, stale compatibility paths, and false-confidence tests left by refactors.
9. Re-check security, billing, ownership, idempotency, retry, lease, and recovery boundaries that individual reviews deferred or missed.
10. Do not re-litigate an explicitly triaged finding unless current code contradicts its accepted rationale.

## Review Method

1. Read `docs/operating-system/review-personas.md` and the relevant system docs.
2. Scope review to the requested range; inspect enough surrounding code and plan/review artifacts to judge behavior in context.
3. Measure file growth and identify systems changed most.
4. Produce high-conviction findings with severity, persona, `file:line`, concrete failure or maintenance scenario, and fix.
5. Prefer a smaller set of structural findings over cosmetic nits.
6. Verify every finding against actual code before including it.
7. Fix safe findings, run relevant tests, then repeat two fresh-eyes passes.

## Approval Bar

Do not approve merely because tests pass. Approval requires:

- no clear structural regression or avoidable complexity layer;
- no unjustified file-size explosion;
- no obvious spaghetti growth or boundary leak;
- no unnecessary wrapper/cast/optionality churn;
- no canonical-helper duplication;
- no missed clear decomposition or code-judo simplification;
- no unresolved correctness, security, billing, retry, or recovery defect found in the range.

Use the commit-sweep skill for report, triage, remediation, and marker-advance mechanics when the review was triggered by net +1,000 code lines.
