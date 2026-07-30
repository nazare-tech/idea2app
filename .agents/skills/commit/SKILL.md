---
name: commit
description: This skill should be used when the user asks to commit current work and push it, e.g. "commit this", "commit and push", "commit in chunks and push", or "ship what's uncommitted". It commits logical chunks on the current branch, runs any due same-model thermonuclear sweep, then pushes.
---

# Commit and Push (current branch only)

## Overview

Guarded Git shipping workflow for the CURRENT branch: summarize uncommitted work, commit logical chunks, run any due thermonuclear sweep, then push.

Scope is deliberately narrow:

- **Only the current branch.** Never switch branches, never merge any other branch into `main`, never rebase other branches. If work exists on other branches, it stays there; mention it at most.
- **No branch pruning.** Never delete local or remote branches. If the user wants cleanup, that is a separate explicit request.
- **No per-commit cross-model review.** Commits do not block on a reviewer. Cross-model review happens earlier, as the blocking plan evaluation in `docs/operating-system/planning-workflow.md`. Request an on-demand `scripts/agent-review.sh --range <base>..HEAD` only when the diff touches auth, RLS, webhooks, billing, or migrations, and say so in the report.
- **Sweep before push.** A due net-plus-1,000-line sweep runs automatically after the chunks land, fanned out across read-only finder subagents and remediated in this agent; do not ask again.

If the current branch is not the integration branch and the user asked for the work to land on `main`, stop and say so; do not merge on their behalf.

## Safety Rules

1. Inspect before changing: `git status --short --branch`, current branch, remote.
2. Never run `git reset --hard`, `git clean`, force pushes, or history rewrites.
3. Never commit secrets. If changes appear to include credentials, API keys, `.env` files, private keys, or tokens, stop and ask. (`.env*` is git-ignored here; treat any tracked exception with suspicion.)
4. Commit only files belonging to the work being shipped. Unrelated working-tree changes (another session's edits, tool lockfiles you didn't touch) stay uncommitted; list them in the final report. Include everything only when the user explicitly says "commit everything".
5. Never bypass hooks. This repo's `.githooks/pre-commit` runs `eslint --fix` + typecheck on staged code files and refuses partially staged files: stage files whole, and if the hook fails, fix the cause. No `--no-verify` unless the user explicitly asks.
6. Stop on conflicts, failed checks, or a rejected push. For a rejected push, `git fetch origin` and report the divergence; do not auto-rebase or force.
7. Never call an unavailable, skipped, or failed reviewer a pass. That applies to any on-demand review run here and to the plan evaluation being reported upstream.

## Workflow

1. **Survey.** `git status --short --branch`, `git diff --stat`. Group the pending changes into logical chunks (docs, tooling, feature, tests, plans). Note unrelated changes to leave behind.
2. **Verify.** Run the narrowest reliable checks for the touched surface (`npm run typecheck`, `npm run lint`, targeted tests) when practical; the pre-commit hook re-enforces lint + typecheck on code files anyway.
3. **Commit base chunks.** Default to one commit per logical concern (matching repo history style, e.g. `docs(systems): ...`, `chore(hooks): ...`, `test(e2e): ...`). Single commit only when the change is genuinely one concern or the user asks. Stage each chunk by explicit paths, never `git add -A` unless the user said "everything". Subject imperative and concise; body only when the why is not obvious. Commits are not reviewed by a hook, so nothing here waits on a reviewer.
4. **Self-review the finished diff.** Read `git diff <base>..HEAD` once as a reviewer, not as the author: leftover debug code, half-applied renames, dead branches, docs that now contradict the code (self-healing rule), tests that assert the mock. Fix what you find in a follow-up chunk. For diffs touching auth, RLS, webhooks, billing, or migrations, run `scripts/agent-review.sh --range <base>..HEAD` and remediate before push.
5. **Run the thermonuclear sweep automatically.** After the chunks land, run `node scripts/sweep-check.mjs --json`. When `due` is true, immediately invoke `.agents/skills/commit-sweep`. It fans the repo-local `thermo-nuclear-code-quality-review` lenses across parallel read-only finder subagents over the full marker range, then verifies, fixes, and triages findings in this agent, writes the report, and advances the marker. Do not ask for confirmation.
6. **Push.** Only after the self-review pass and any due sweep complete, run `git push origin <current-branch>`. Report the pushed range.
7. **Report.** List commits created (hash + subject), what the self-review changed, any on-demand cross-model review and its result, sweep range/result, branch pushed, checks run, and files deliberately left uncommitted.

## Resources

- `scripts/git_ship_preflight.py`: optional non-destructive repository state reporter.
- `references/api_reference.md`: compact command reference.
