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

Skip `git commit` when nothing is staged. The repo's `.githooks/pre-commit` runs `eslint --fix` + typecheck on staged code files and refuses partially staged files; fix causes instead of bypassing.

## Push

```bash
git push origin "$(git branch --show-current)"
```

On rejection: `git fetch origin`, report the divergence, stop. No auto-rebase, no force push.

## Sweep check (after push)

```bash
node scripts/sweep-check.mjs
```

If `SWEEP DUE`: offer the `commit-sweep` skill (`.agents/skills/commit-sweep`). It spends reviewer-CLI tokens; run only on explicit user confirmation.

## Never

`git merge` into `main` from this workflow, `git switch` to other branches, `git branch -d/-D`, `git push origin --delete`, `git push --force`, `git reset --hard`, `git clean`, `--no-verify` (unless the user explicitly asks).
