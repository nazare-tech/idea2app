# Git Shipping Command Reference

Use this reference after reading the main workflow in `SKILL.md`. Scope: commit and push the CURRENT branch only. No branch merging, no pruning.

## Inspection

```bash
git status --short --branch
git branch --show-current
git remote -v
git diff --stat
git diff --check
```

## Commit (chunked)

Stage each logical chunk by explicit paths; never `git add -A` unless the user said "commit everything":

```bash
git add <paths for this chunk>
git status --short          # confirm staged scope before every commit
git commit -m "<type(scope): imperative summary>"
```

Skip `git commit` when nothing is staged. The repo's `.githooks/pre-commit` runs its configured fixer + typecheck on staged code files and refuses partially staged files; fix causes instead of bypassing. `.githooks/post-commit` only prints the sweep notice: no reviewer runs, nothing blocks.

## Review and sweep

Self-review the finished diff (`git diff <base>..HEAD`) as a reviewer rather than the author, and fix what that turns up. For auth, RLS, webhook, billing, or migration diffs, get a cross-model second opinion on demand:

```bash
scripts/agent-review.sh --range <base>..HEAD          # bounded, tools disabled, costs reviewer tokens
scripts/post-commit-review.sh <sha>                   # one immutable commit, isolated snapshot + ledger
```

Never call an unavailable or failed reviewer a pass. Then run:

```bash
node scripts/sweep-check.mjs --json
```

When `due` is true, invoke `commit-sweep` automatically. It fans thermonuclear review across the marker range using parallel read-only finder subagents, verifies and remediates in this agent, and is the only automatic code review in this repo.

## Push

```bash
git push origin "$(git branch --show-current)"
```

On rejection: `git fetch origin`, report the divergence, stop. No auto-rebase, no force push.

## Never

`git merge` into `main` from this workflow, `git switch` to other branches, `git branch -d/-D`, `git push origin --delete`, `git push --force`, `git reset --hard`, `git clean`, `--no-verify` (unless the user explicitly asks).
