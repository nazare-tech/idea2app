---
name: commit
description: This skill should be used when the user asks to commit current work and push it, e.g. "commit this", "commit and push", "commit in chunks and push", "ship what's uncommitted". It commits the current branch's uncommitted work in logical chunks and pushes that branch. It never merges other branches into main and never prunes branches.
---

# Commit and Push (current branch only)

## Overview

Guarded Git shipping workflow for the CURRENT branch: summarize uncommitted work, commit it in logical chunks, and push the branch to the remote.

Scope is deliberately narrow:

- **Only the current branch.** Never switch branches, never merge any other branch into `main`, never rebase other branches. If work exists on other branches, it stays there; mention it at most.
- **No branch pruning.** Never delete local or remote branches. If the user wants cleanup, that is a separate explicit request.
- **Commit + push, nothing more.** Committed-but-unpushed work on this branch is included in the push.

If the current branch is not the integration branch and the user asked for the work to land on `main`, stop and say so; do not merge on their behalf.

## Safety Rules

1. Inspect before changing: `git status --short --branch`, current branch, remote.
2. Never run `git reset --hard`, `git clean`, force pushes, or history rewrites.
3. Never commit secrets. If changes appear to include credentials, API keys, `.env` files, private keys, or tokens, stop and ask. (`.env*` is git-ignored here; treat any tracked exception with suspicion.)
4. Commit only files belonging to the work being shipped. Unrelated working-tree changes (another session's edits, tool lockfiles you didn't touch) stay uncommitted; list them in the final report. Include everything only when the user explicitly says "commit everything".
5. Never bypass hooks. This repo's `.githooks/pre-commit` runs `eslint --fix` + typecheck on staged code files and refuses partially staged files: stage files whole, and if the hook fails, fix the cause. No `--no-verify` unless the user explicitly asks.
6. Stop on conflicts, failed checks, or a rejected push. For a rejected push, `git fetch origin` and report the divergence; do not auto-rebase or force.

## Workflow

1. **Survey.** `git status --short --branch`, `git diff --stat`. Group the pending changes into logical chunks (docs, tooling, feature, tests, plans). Note unrelated changes to leave behind.
2. **Verify.** Run the narrowest reliable checks for the touched surface (`npm run typecheck`, `npm run lint`, targeted tests) when practical; the pre-commit hook re-enforces lint + typecheck on code files anyway.
3. **Commit in chunks.** Default to one commit per logical concern (matching repo history style, e.g. `docs(systems): ...`, `chore(hooks): ...`, `test(e2e): ...`). Single commit only when the change is genuinely one concern or the user asks. Stage each chunk by explicit paths, never `git add -A` unless the user said "everything". Subject imperative and concise; body only when the why is not obvious.
4. **Push.** `git push origin <current-branch>`. Report the pushed range.
5. **Sweep check (this repo).** Run `node scripts/sweep-check.mjs`. If it reports `SWEEP DUE`, tell the user the net line count and offer to run the `commit-sweep` skill (`.agents/skills/commit-sweep`) — it is the successor to the thermo-nuclear review and spends reviewer-CLI tokens, so it runs only on explicit confirmation, never automatically.
6. **Report.** Commits created (hash + subject), branch pushed, checks run, sweep status, and any files deliberately left uncommitted.

## Resources

- `scripts/git_ship_preflight.py`: optional non-destructive repository state reporter.
- `references/api_reference.md`: compact command reference.
