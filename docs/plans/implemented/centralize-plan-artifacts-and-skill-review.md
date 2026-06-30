# Review: Centralize Plan Artifacts And Skill

## Scope
- Updated the global `/Users/Mukul/.codex/skills/holistic-implementation/SKILL.md` outside the repo.
- Restored `/holistic-implementation` as the active default full workflow in `AGENTS.md`, with repo-local Recommendation A selection and feedback rules.
- Centralized former top-level `plans/` files, root planning/checklist files, security review/checklist files, post-launch running list, and `docs/superpowers` plan/design artifacts under `docs/plans/`.
- Updated markdown references to old plan locations.

## Verification
- Confirmed `find . -maxdepth 2 -type d -name plans -print` only returns `./docs/plans`.
- Confirmed plan/review/TODO/checklist markdown candidates outside cache/worktree directories are under `docs/plans/`, except the launch playbook template checklist that belongs to the playbook asset set.
- Searched for stale references to the old root planning files, old security docs, and old `docs/superpowers` plan/spec locations; no live stale references remain.
- Ran `git diff --check` on touched repo files.

## Code Review Findings
- No application runtime code was changed.
- The global skill now keeps full implementation rigor while allowing each workspace to define whether to wait for approval or proceed autonomously.
- `AGENTS.md` now uses `/holistic-implementation` by default again, while keeping Recommendation A selection local to this repo.

## Security Review Findings
- No secrets or credentials were added.
- The global skill explicitly says not to record secrets in backend/data history.
- Moving docs does not change Supabase, auth, RLS, or runtime behavior.

## Remediation Checklist
- [x] Make global skill generic instead of repo-specific.
- [x] Keep Recommendation A/B override rules local to this repo.
- [x] Centralize plan artifacts under `docs/plans/`.
- [x] Update stale markdown references.
- [x] Validate whitespace with `git diff --check`.
