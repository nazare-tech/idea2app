---
name: ci-operator
description: This skill should be used when a user asks to watch pull-request CI, diagnose or fix failing checks, or keep iterating until all required checks are green. It consolidates watch, fix, and loop behavior behind one front door while keeping GitHub and CI-provider integrations externally updateable.
---

# CI Operator

Route CI work through one workflow. Keep `gh pr checks` as source of truth for every check attached to the pull request. Use GitHub Actions logs only for checks hosted by GitHub Actions; report external-provider links without pretending their logs are available.

## Select Mode

Choose mode from requested outcome:

- `watch`: inspect current checks, wait when requested, then report status.
- `diagnose`: inspect failed checks and explain root cause without changing code.
- `fix`: diagnose current failures, implement focused fixes, verify locally, then report what must run remotely.
- `loop`: repeat watch, diagnose, fix, verify, and recheck until green or genuinely blocked.

Default to `watch` when request asks only for status. Use `diagnose` for “why did CI fail?” or review-only requests. Default to `fix` when failures exist and user asks to repair them. Use `loop` only when user asks to keep going until green.

## Resolve Pull Request

1. Confirm current branch with `git branch --show-current`.
2. Confirm GitHub CLI authentication with `gh auth status`.
3. Resolve explicit pull-request number or URL when supplied; otherwise resolve current branch with `gh pr view --json number,url,headRefName`. Retain the resolved number as `<pr>` and pass it to every later `gh pr` invocation; bare `gh pr` commands silently retarget the checked-out branch's pull request.
4. Stop with exact missing prerequisite when authentication fails or branch has no pull request.
5. Before `fix` or `loop`, compare target `headRefName` with checked-out branch. Stop instead of editing when they differ; never diagnose one pull request while changing another branch.

## Inspect Checks

Run:

```bash
gh pr checks <pr> --json name,bucket,state,workflow,link
```

If installed `gh` rejects a field, rerun using fields listed by its error. Treat returned PR check set as authoritative; `gh run list` alone omits non-GitHub checks.

For a failed GitHub Actions check, resolve its run from check link and inspect focused logs:

```bash
gh run view <run-id> --log-failed
```

Use `github:gh-fix-ci` when available and task needs plugin-provided PR metadata or patch context. Keep `gh` for Actions checks and logs. Never copy plugin-owned implementation into this skill.

## Watch Mode

1. Report passed, failed, pending, or unavailable status.
2. When checks remain pending and user asked to wait, run:

   ```bash
   gh pr checks <pr> --watch --fail-fast
   ```

3. Re-read full check set after watch exits.
4. Return PR URL, failed/pending check names, links, shortest decisive failure excerpt, and next action.

## Diagnose Mode

1. Inspect every failed check enough to separate root failure from downstream cancellations or duplicates.
2. Extract shortest decisive error and relevant file, test, job, or service.
3. Compare failure against pull-request changes when patch context is available.
4. Report evidence-backed cause, uncertainty, and focused fix proposal.
5. Do not edit, commit, push, rerun, or mutate external state.

## Fix Mode

1. Run Diagnose Mode, then identify first actionable root failure.
2. Explain root cause before editing.
3. Apply smallest durable fix within requested scope.
4. Run narrowest local verification capable of observing failure.
5. Re-read current check set after any authorized push.
6. Keep unavailable external-provider APIs and logs report-only. Reproduce and fix repository code locally when check link, visible error, or local command provides enough evidence.

Do not push, merge, rebase, bypass hooks, or create commits unless user request or active shipping workflow authorizes those actions.

## Loop Mode

1. Run Fix Mode for one root cause.
2. Use project shipping workflow for any authorized commit and push.
3. Re-read full PR check set after every push.
4. Watch pending checks.
5. Repeat until green.
6. Retry suspected flakes once; report evidence instead of hiding recurring instability.
7. Stop when same blocking condition repeats without meaningful new action, credentials are missing, evidence is insufficient to reproduce an unavailable external-provider failure, or next step needs new authority.

## Output Contract

Return:

- Mode used
- Pull request number and URL
- Current status
- Root failure and shortest decisive excerpt
- Fixes and verification, when applicable
- External or unverified checks
- Exact next action or blocker

## Provenance

Consolidates stable workflow concepts adapted from Cursor Team Kit:

- `https://github.com/cursor/plugins/blob/main/cursor-team-kit/agents/ci-watcher.md`
- `https://github.com/cursor/plugins/blob/main/cursor-team-kit/skills/fix-ci/SKILL.md`
- `https://github.com/cursor/plugins/blob/main/cursor-team-kit/skills/loop-on-ci/SKILL.md`

Audited at Cursor Plugins commit `ba7b5907843e1e21ec692418c180e1f912cbf7d3` on 2026-07-26; target paths last changed on 2026-04-30. Preserve external GitHub plugin ownership. See `LICENSE.txt`.
