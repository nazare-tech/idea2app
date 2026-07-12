---
name: commit-sweep
description: This skill should be used when net +1000 lines of code have landed since the last sweep, when the commit workflow detects a due sweep, or when the user asks to sweep recent commits. It runs a same-agent thermonuclear cross-commit audit, remediates findings, writes a report, and advances the sweep marker.
---

# Commit Sweep

A periodic higher-altitude review across many commits. Every code commit already received an opposite-CLI persona review; this sweep stays in the current agent and applies thermonuclear standards to problems no isolated commit review can see: structural complexity growth, duplication across commits, contract drift, doc rot, dead code, weak tests, and creeping architecture violations.

## Trigger

- `node scripts/sweep-check.mjs` reports `SWEEP DUE` (net added lines ≥ 1000 since the marker in `docs/reviews/.last-sweep-commit`, counting only code paths; deletions offset additions, so heavy-deletion periods correctly do not trigger).
- The post-commit hook prints the same notice automatically.
- Or the user asks for a sweep explicitly (threshold does not gate a requested sweep).

## Procedure

1. **Scope.** `node scripts/sweep-check.mjs --json` → note `marker`, `commits`, `net`. The range under review is `<marker>..HEAD`.
2. **Survey the range.** `git log --stat <marker>..HEAD` and read the plan/review artifacts in `docs/plans/` created during the range. Build a short list of themes (which systems changed most).
3. **Thermonuclear cross-cutting review.** Load and apply `.agents/skills/thermo-nuclear-code-quality-review/SKILL.md` to the range, plus these lenses (details in `docs/operating-system/review-personas.md`):
   - structural simplification/code-judo opportunities, spaghetti growth, unjustified files crossing 1,000 lines, weak abstractions, casts, and boundary leaks
   - duplication introduced across different commits (helpers that should merge)
   - contract drift: prompts vs parsers vs renderers vs docs
   - dead or orphaned code left by refactors in the range
   - `docs/systems/*.md` freshness against actual behavior changes (self-healing rule)
   - test coverage for the range's new code paths; false-confidence tests
   - security/billing regressions that individual reviews marked deferred and forgot
4. **Verify and remediate.** Verify every finding against actual code and earlier triage. Fix safe findings, prioritizing every BLOCKER/MAJOR; run relevant tests. Commit code fixes before advancing the marker. Each code-fix commit must receive and clear its automatic opposite-CLI persona review. File Linear issues for remaining actionable work per `docs/operating-system/linear-issue-format.md`; record rejected findings with reasons.
5. **Fresh-eyes passes.** Re-read the range and remediation twice. Confirm structural opportunities landed, deferred items remain justified, and no fix introduced new duplication, brittle contracts, authorization gaps, non-idempotent paths, or recovery blind spots.
6. **Report.** Write `docs/reviews/commit-sweep-<YYYY-MM-DD>.md` with the 7-line greppable header (`docs/operating-system/doc-conventions.md`), range and line stats, themed findings with severity and file:line, verification, and a triage table (fixed / Linear issue / rejected with reason).
7. **Advance the marker.** After code remediation and its per-commit reviews are complete, write that code `HEAD` SHA into `docs/reviews/.last-sweep-commit`. Commit report and marker together with `chore(sweep): commit sweep <date> (<range summary>)`. This docs-only meta commit does not trigger paid persona review.

## Rules

- Do not run a second cross-model range reviewer during the sweep; per-code-commit cross-model persona reviews already provide that lens.
- When invoked by the commit workflow because `due` is true, run automatically in the active agent without asking again.
- Do not re-litigate findings already triaged in the range's review artifacts unless the code shows the triage was wrong.
- A sweep that finds nothing still produces a (short) report and advances the marker; silence is not evidence of a sweep.
