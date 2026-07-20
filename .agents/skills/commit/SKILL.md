---
name: commit
description: This skill should be used when the user asks to commit current work and push it, e.g. "commit this", "commit and push", "commit in chunks and push", or "ship what's uncommitted". It commits logical chunks on the current branch, collects the automatic opposite-CLI persona review for every code commit, remediates findings, runs any due same-model thermonuclear sweep, then pushes.
---

# Commit and Push (current branch only)

## Overview

Guarded Git shipping workflow for the CURRENT branch: summarize uncommitted work, commit logical chunks, verify every automatic per-commit review, remediate findings, run any due thermonuclear sweep, then push.

Scope is deliberately narrow:

- **Only the current branch.** Never switch branches, never merge any other branch into `main`, never rebase other branches. If work exists on other branches, it stays there; mention it at most.
- **No branch pruning.** Never delete local or remote branches. If the user wants cleanup, that is a separate explicit request.
- **Review before push.** Every code commit is reviewed by the opposite CLI through the post-commit hook. Findings are verified and remediated before push.
- **Sweep before push.** A due net-plus-1,000-line sweep runs automatically in the current agent after chunk and review remediation; do not ask again.

If the current branch is not the integration branch and the user asked for the work to land on `main`, stop and say so; do not merge on their behalf.

## Safety Rules

1. Inspect before changing: `git status --short --branch`, current branch, remote.
2. Never run `git reset --hard`, `git clean`, force pushes, or history rewrites.
3. Never commit secrets. If changes appear to include credentials, API keys, `.env` files, private keys, or tokens, stop and ask. (`.env*` is git-ignored here; treat any tracked exception with suspicion.)
4. Commit only files belonging to the work being shipped. Unrelated working-tree changes (another session's edits, tool lockfiles you didn't touch) stay uncommitted; list them in the final report. Include everything only when the user explicitly says "commit everything".
5. Never bypass hooks. This repo's `.githooks/pre-commit` runs `eslint --fix` + typecheck on staged code files and refuses partially staged files: stage files whole, and if the hook fails, fix the cause. No `--no-verify` unless the user explicitly asks.
6. Stop on conflicts, failed checks, or a rejected push. For a rejected push, `git fetch origin` and report the divergence; do not auto-rebase or force.
7. Never call an unavailable, skipped, or failed reviewer a pass. Continue the requested batch/push when necessary, but report every exact unreviewed SHA and reason.
8. `SKIP_AGENT_REVIEW=1` is an emergency escape hatch only when the user explicitly requests a skip. Its recorded `explicit_skip` status must appear in the final report.

## Workflow

1. **Survey.** `git status --short --branch`, `git diff --stat`. Group the pending changes into logical chunks (docs, tooling, feature, tests, plans). Note unrelated changes to leave behind.
2. **Verify.** Run the narrowest reliable checks for the touched surface (`npm run typecheck`, `npm run lint`, targeted tests) when practical; the pre-commit hook re-enforces lint + typecheck on code files anyway.
3. **Commit base chunks.** Default to one commit per logical concern (matching repo history style, e.g. `docs(systems): ...`, `chore(hooks): ...`, `test(e2e): ...`). Single commit only when the change is genuinely one concern or the user asks. Stage each chunk by explicit paths, never `git add -A` unless the user said "everything". Subject imperative and concise; body only when the why is not obvious. Ensure the hook can identify the active agent (`CLAUDECODE=1` for Claude Code or `CODEX_THREAD_ID` for Codex; use `AGENT_IMPLEMENTER=claude|codex` explicitly when needed).
4. **Collect per-commit reviews.** After every commit, read `.git/agent-reviews/<sha>.json` and its sibling `.txt`:
   - `passed`: record the pass.
     A `passed` or `findings` entry with `reason: duplicate_patch` reuses a message-only rewrite with the same patch, parent, resulting tree, reviewer, and coherent artifact; record its `duplicateOf` SHA as coverage evidence.
   - `findings`: keep creating the planned base chunks, then deduplicate all findings and verify each against final `HEAD` before changing code.
   - `failed`: keep the batch moving, record the SHA and failure class (`usage_limit`, `rate_limit`, `network`, `auth`, `timeout`, `snapshot_error`, `input_too_large`, `output_too_large`, `sensitive_input`, `interrupted`, or `reviewer_error`), and tell the user in the final report. Never substitute the current model silently or call the commit reviewed.
   - `skipped/no_reviewable_paths`: valid only for a docs-only commit.
   - `skipped/unknown_implementer` or `skipped/explicit_skip`: not reviewed; continue only with an explicit final disclosure.
5. **Remediate and re-review.** Fix every verified finding; record rejected findings with reasons in the task review artifact. Commit fixes in logical remediation chunks. Those code commits receive the same automatic cross-model review. Repeat until clean, but stop after three materially unchanged review/fix rounds and report unresolved findings instead of looping indefinitely.
6. **Run the thermonuclear sweep automatically.** After base/remediation commits and status collection, run `node scripts/sweep-check.mjs --json`; durably recorded/disclosed failed or skipped reviews remain sweep-eligible even though they are not passes. When `due` is true, immediately invoke `.agents/skills/commit-sweep` in the current agent. It applies the repo-local `thermo-nuclear-code-quality-review` skill across the full marker range, fixes/triages findings, writes the report, and advances the marker. It does not run another cross-model range review because per-commit review was already attempted. Do not ask for confirmation. If the sweep creates code-fix commits, collect their automatic per-commit reviews before the sweep report/marker commit.
7. **Push.** Only after per-commit reviews, remediation, and any due sweep complete, run `git push origin <current-branch>`. Report the pushed range.
8. **Report.** List commits created (hash + subject), reviewer/status per code commit, remediations/rejections, sweep range/result, branch pushed, checks run, and files deliberately left uncommitted.

## Resources

- `scripts/git_ship_preflight.py`: optional non-destructive repository state reporter.
- `references/api_reference.md`: compact command reference.
