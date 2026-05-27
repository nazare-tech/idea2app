---
name: commit
description: This skill should be used when the user asks Codex to commit all current work, merge the active branch into main, prune merged branches, and push the resulting state to the remote repository.
---

# Commit Merge Prune Push

## Overview

Execute a guarded Git shipping workflow for requests like "commit everything and merge to main", "ship this branch", "merge to main and prune branches", or "commit all, push main, clean branches".

Treat the workflow as high impact. It creates commits, mutates `main`, pushes to the remote, and may delete branch refs. Prefer explicit status summaries and confirmations before any destructive branch deletion.

## Trigger Examples

- "commit everything, merge to main, prune branches and push to remote"
- "ship this branch to main and clean up merged branches"
- "commit all current changes and push main"
- "merge this work into main and prune stale branches"

## Required Safety Rules

1. Inspect repository state before changing it. Run `git status --short --branch`, identify the current branch, identify the default integration branch, and check the remote.
2. Never run `git reset --hard`, `git clean`, force push, or delete unmerged branches unless the user explicitly asks for that exact destructive action.
3. Never commit secrets. If staged or unstaged changes appear to include credentials, API keys, `.env` files, private keys, tokens, or generated credential dumps, stop and ask for direction.
4. Preserve user work. Do not revert unrelated changes. If the request says "commit everything", include all current tracked and untracked changes after summarizing them.
5. Treat branch pruning as destructive. Delete only branches that Git reports as merged into `main`. Never delete `main`, `master`, the current branch, protected release branches, or unmerged branches.
6. Stop on merge conflicts, failed checks, rejected pushes, or uncertain branch state. Explain the blocker and leave the repository in the safest understandable state.

## Preflight

Run the bundled preflight helper when available:

```bash
python3 .agents/skills/commit/scripts/git_ship_preflight.py
```

Use the output to summarize:

- current branch
- upstream branch
- remote URLs
- changed files
- local branches already merged into the integration branch
- branches with unmerged work

If the helper is unavailable, collect the same information with direct Git commands.

## Workflow

1. Establish context.
   - Read `PROJECT_CONTEXT.md` when present.
   - Check `AGENTS.md` when present.
   - Determine whether the integration branch is `main` or `master`. Prefer `main` when both exist unless repo history clearly indicates otherwise.

2. Summarize pending changes.
   - Run `git status --short`.
   - Run `git diff --stat`.
   - Run `git diff --check` when practical.
   - Inspect suspicious files before staging, especially env files, generated dumps, lockfiles, and large binary assets.

3. Verify before committing.
   - Run the narrowest reliable checks for the touched surface when practical.
   - For JavaScript or TypeScript projects, prefer `npm run typecheck` and `npm run lint` when available.
   - If checks are too slow or blocked, report exactly what was skipped and why.

4. Commit all current changes.
   - Run `git add -A`.
   - Re-run `git status --short` to confirm the staged scope.
   - Create one clear commit unless the user requested multiple commits.
   - Use a concise imperative commit message that reflects the actual diff.
   - If there are no changes to commit, skip the commit step and continue only if merge or push work remains.

5. Update the remote view.
   - Run `git fetch --prune origin`.
   - If network access is blocked by the sandbox, request escalation for the same Git command rather than inventing a workaround.

6. Merge into the integration branch.
   - Remember the source branch before switching.
   - Switch to the integration branch with `git switch main` or the detected branch name.
   - Update it with `git pull --ff-only origin main`.
   - Merge the source branch using the repository's established merge style. If no clear style exists, use normal `git merge <source-branch>` and allow fast-forward when possible.
   - Stop and report if conflicts occur.

7. Push the integration branch.
   - Run `git push origin main` or the detected integration branch.
   - Report push success and the branch pushed.

8. Prune merged branches.
   - List local merged branches with `git branch --merged main`.
   - Exclude `main`, `master`, the current branch, release branches, and any branch that is not clearly disposable.
   - Delete only merged local branches with `git branch -d <branch>`.
   - For remote branch deletion, list exact remote branches first. Delete remote source or merged branches only when the user explicitly requested branch pruning in the same request or confirms the list.
   - Prefer `git push origin --delete <branch>` only for branches confirmed merged into the pushed integration branch.

9. Final verification.
   - Run `git status --short --branch`.
   - Confirm the integration branch is clean and up to date with its upstream.
   - Report commits created, branch merged, branches pruned, remote pushed, checks run, and any residual warnings.

## Command Reference

Load `references/api_reference.md` for a compact Git command reference and pruning decision checklist.

## Resources

- `scripts/git_ship_preflight.py`: non-destructive repository state reporter.
- `scripts/example.py`: compatibility wrapper for the preflight helper.
- `references/api_reference.md`: command reference and pruning checklist.
- `assets/example_asset.txt`: notes that no output assets are required for this skill.
