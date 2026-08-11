---
name: commit-sweep
description: This skill should be used when net +1000 lines of code have landed since the last sweep, when the commit workflow detects a due sweep, or when the user asks to sweep recent commits. It fans a thermonuclear cross-commit audit out across parallel read-only finder subagents, verifies and remediates findings in the dispatching agent, writes a report, and advances the sweep marker.
---

# Commit Sweep

A periodic higher-altitude review across many commits, and this repo's **only automatic code review**: individual commits are not reviewed by the opposite CLI (cross-model review happens earlier, on the plan). The sweep applies thermonuclear standards both to per-commit defects nobody else looked for and to problems no isolated commit review could see: structural complexity growth, duplication across commits, contract drift, doc rot, dead code, weak tests, and creeping architecture violations.

Because nothing else audits the range, do not skim. Read the actual diffs, not just the plan artifacts that describe them.

Finding is parallel; judging is not. Read-only finder subagents sweep the range concurrently by lens group; the dispatching agent verifies, deduplicates, decides, and is the only one that edits files.

## Trigger

- `node scripts/sweep-check.mjs` reports `SWEEP DUE` (net added lines ≥ 1000 since the marker in `docs/reviews/.last-sweep-commit`, counting only code paths; deletions offset additions, so heavy-deletion periods correctly do not trigger).
- The post-commit hook prints the same notice automatically.
- Or the user asks for a sweep explicitly (threshold does not gate a requested sweep).

## Procedure

1. **Scope.** `node scripts/sweep-check.mjs --json` → note `marker`, `commits`, `net`. The range under review is `<marker>..HEAD`.
2. **Survey the range.** `git log --stat <marker>..HEAD` and read the plan/review artifacts in `docs/plans/` created during the range. Build a short list of themes (which systems changed most).
3. **Fan out the thermonuclear review.** Dispatch the finder groups below **in parallel, in one batch** (Claude Code: one message with multiple `Agent` calls, `Explore` or `general-purpose`; Codex: its subagent mechanism). Every finder gets the same preamble and one group's lenses:

   > Read-only review of commit range `<marker>..HEAD` in this repository. Apply `.agents/skills/thermo-nuclear-code-quality-review/SKILL.md` and the personas in `docs/operating-system/review-personas.md`. Read the actual diffs (`git diff <marker>..HEAD -- <paths>`) and enough surrounding code to judge behavior in context. Verify each finding against current file contents before reporting it. Do not edit, stage, or commit anything. Report only:
   > `<BLOCKER|MAJOR|MINOR> <persona> <file:line> — <problem>. <concrete failure or maintenance scenario>. Fix: <suggestion>.`
   > One line per finding, severity order, high conviction only, no praise and no diff summary. Output exactly `NO FINDINGS` if the range is clean under these lenses.

   | Finder | Lenses |
   |---|---|
   | `sweep:structure` | code-judo moves that delete branches/modes/layers, spaghetti growth, unjustified files crossing 1,000 lines, thin abstractions, identity wrappers, cast-heavy contracts, `any`/`unknown` escapes, boundary leaks |
   | `sweep:duplication` | near-duplicate helpers introduced in separate commits, logic that drifted out of its canonical layer, one-off components where shared ones exist |
   | `sweep:contracts` | contract drift among prompts, parsers, renderers, API payloads, database shapes, and typed registries; dynamic-compatibility gaps |
   | `sweep:correctness` | correctness, security, and billing defects in the range: ownership checks at trust boundaries, RLS assumptions, idempotency, charge/refund symmetry, swallowed errors, unvalidated input reaching prompts/HTML/redirects, retry and recovery gaps |
   | `sweep:tests-dead-code` | coverage for the range's new code paths, false-confidence tests that assert mocks, dead or orphaned code and stale compatibility paths left by refactors |
   | `sweep:docs` | `docs/systems/*.md` and `docs/operating-system/*.md` freshness against actual behavior changes (self-healing rule), plan/review artifacts left stale, `backend-change-history.md` gaps |

   Add a themed finder when step 2 surfaced a system that dominates the range (a UI-heavy range earns a product/UX and copy finder against the project's product and design sources of truth). Give large ranges a path split per finder so two agents do not re-read the same 3,000 lines.

   If subagents are unavailable in the runtime, run the groups serially in this agent and say so in the report. Never drop a group to save time.

4. **Verify and remediate.** Finder output is a lead, not a fact: verify every finding against actual code and earlier triage, and deduplicate across finders (the same defect will surface from two lenses with different wording). Fix safe findings, prioritizing every BLOCKER/MAJOR; run relevant tests. Only this agent edits files, so there is nothing to reconcile between finders. Commit code fixes before advancing the marker. File issues for remaining actionable work per `docs/operating-system/issue-tracker-format.md`; record rejected findings with reasons.
5. **Fresh-eyes passes.** Re-read the range and remediation twice. Confirm structural opportunities landed, deferred items remain justified, and no fix introduced new duplication, brittle contracts, authorization gaps, non-idempotent paths, or recovery blind spots.
6. **Report.** Write `docs/reviews/commit-sweep-<YYYY-MM-DD>.md` with the 7-line greppable header (`docs/operating-system/doc-conventions.md`), range and line stats, which finder groups ran and how (parallel subagents or serial fallback), themed findings with severity and file:line, verification, and a triage table (fixed / tracked issue / rejected with reason).
7. **Advance the marker.** After code remediation is complete, write that code `HEAD` SHA into `docs/reviews/.last-sweep-commit`. Commit report and marker together with `chore(sweep): commit sweep <date> (<range summary>)`.

## Rules

- Finders are read-only and same-model; verification, triage, edits, tests, and commits stay with the dispatching agent. Never let two subagents write to the working tree.
- Dispatch the finder batch in one message so the groups actually run concurrently. Sequential dispatch is the serial fallback wearing a costume.
- A cross-model range review is optional here and costs reviewer tokens: run `scripts/agent-review.sh --range <marker>..HEAD` only when the range carries auth, RLS, webhook, billing, or migration changes, and say so in the report.
- When invoked by the commit workflow because `due` is true, run automatically without asking again.
- Do not re-litigate findings already triaged in the range's review artifacts unless the code shows the triage was wrong.
- A sweep that finds nothing still produces a (short) report and advances the marker; silence is not evidence of a sweep.
