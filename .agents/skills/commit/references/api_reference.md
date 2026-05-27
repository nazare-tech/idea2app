# Git Shipping Command Reference

Use this reference after reading the main workflow in `SKILL.md`.

## Inspection

```bash
git status --short --branch
git branch --show-current
git remote -v
git diff --stat
git diff --check
git branch --merged main
git branch --no-merged main
```

## Commit

```bash
git add -A
git status --short
git commit -m "<imperative summary>"
```

Skip `git commit` when no changes are staged.

## Merge To Main

```bash
git fetch --prune origin
git switch main
git pull --ff-only origin main
git merge <source-branch>
git push origin main
```

Substitute `master` only when the repository has no `main` branch or clearly uses `master` as the integration branch.

## Pruning Checklist

Delete local branches only when all conditions are true:

1. `git branch --merged main` lists the branch.
2. The branch is not `main`, `master`, the current branch, a release branch, or a protected branch.
3. The branch name is expected from the just-completed work or is explicitly approved by the user.

Use:

```bash
git branch -d <branch>
```

Delete remote branches only when the user explicitly requested pruning or confirms the exact branch list:

```bash
git push origin --delete <branch>
```

Never use `git branch -D`, `git push --force`, `git reset --hard`, or `git clean` in this workflow.
