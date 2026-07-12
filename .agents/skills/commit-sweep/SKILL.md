---
name: commit-sweep
description: Cross-commit code sweep triggered when net +1000 lines of code have landed since the last sweep. Reviews the whole commit range with persona lenses and a cross-model reviewer, writes a report to docs/reviews/, and advances the sweep marker. Trigger phrases - "run a commit sweep", "sweep recent commits", "/commit-sweep", or the post-commit SWEEP DUE notice.
---

# Commit Sweep

A periodic higher-altitude review across many commits, looking for problems no single-commit review can see: duplication introduced in separate commits, contract drift between prompt/parser/renderer, doc rot, dead code accumulation, and creeping architecture violations.

## Trigger

- `node scripts/sweep-check.mjs` reports `SWEEP DUE` (net added lines ≥ 1000 since the marker in `docs/reviews/.last-sweep-commit`, counting only code paths; deletions offset additions, so heavy-deletion periods correctly do not trigger).
- The post-commit hook prints the same notice automatically.
- Or the user asks for a sweep explicitly (threshold does not gate a requested sweep).

## Procedure

1. **Scope.** `node scripts/sweep-check.mjs --json` → note `marker`, `commits`, `net`. The range under review is `<marker>..HEAD`.
2. **Survey the range.** `git log --stat <marker>..HEAD` and read the plan/review artifacts in `docs/plans/` created during the range. Build a short list of themes (which systems changed most).
3. **Cross-cutting self-review.** Inspect the range with these lenses (details in `docs/operating-system/review-personas.md`):
   - duplication introduced across different commits (helpers that should merge)
   - contract drift: prompts vs parsers vs renderers vs docs
   - dead or orphaned code left by refactors in the range
   - `docs/systems/*.md` freshness against actual behavior changes (self-healing rule)
   - test coverage for the range's new code paths; false-confidence tests
   - security/billing regressions that individual reviews marked deferred and forgot
4. **Cross-model review.** Run `scripts/agent-review.sh --range <marker>..HEAD --out /tmp/sweep-review.txt` (routing per `docs/operating-system/review-personas.md`; costs reviewer-CLI tokens). Merge its findings with yours, deduplicated, each verified against the actual code before inclusion.
5. **Report.** Write `docs/reviews/commit-sweep-<YYYY-MM-DD>.md` with the 7-line greppable header (`docs/operating-system/doc-conventions.md`), the range and line stats, themed findings with severity and file:line, and a triage table (fix now / Linear issue / rejected with reason). Fix small BLOCKER/MAJOR items immediately when safe; file Linear issues for the rest per `docs/operating-system/linear-issue-format.md`.
6. **Advance the marker.** Write the current `git rev-parse HEAD` into `docs/reviews/.last-sweep-commit`. Commit the report and marker together with the message `chore(sweep): commit sweep <date> (<range summary>)`.

## Rules

- Never run the paid cross-model step from a hook or unattended schedule; a sweep is always an explicit agent/user action.
- Do not re-litigate findings already triaged in the range's review artifacts unless the code shows the triage was wrong.
- A sweep that finds nothing still produces a (short) report and advances the marker; silence is not evidence of a sweep.
