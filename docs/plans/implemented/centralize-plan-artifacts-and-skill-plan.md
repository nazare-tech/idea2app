---
implemented: true
implemented_at: 2026-06-29T14:40:11Z
implementation_summary: Updated the global holistic implementation skill to defer execution policy to workspace instructions and centralized plan/review artifacts under docs/plans.
---

# Plan: Centralize Plan Artifacts And Update Holistic Skill

## Goal
Move repo plan/review artifacts into `docs/plans/` and update the global `holistic-implementation` skill so it contains the full implementation workflow while deferring Recommendation A/B selection behavior to repo-level instructions.

## Assumptions
- The global skill should remain reusable across repos and should not read this repo's `docs/plans/recommendation-selection-rules.md`.
- This repo's `AGENTS.md` should own the autonomous "pick Recommendation A by default" behavior.
- Former top-level `plans/` artifacts are implementation plans/reviews and should be moved to `docs/plans/`.
- Cache/vendor/worktree planning files under `.npm-cache` and `.claude` should not be centralized as project plan artifacts.
- Project plan/design artifacts under `docs/superpowers` should be centralized under `docs/plans/superpowers/`.

## Clarifying Questions
1. Should the global skill include the full workflow or only a pointer to repo rules?
   - Recommendation A: Include the full workflow generically, but state that workspace instructions decide whether to wait or proceed.
   - Trade-off: Keeps the skill useful everywhere without hardcoding this repo's Recommendation A default.
   - Recommendation B: Hardcode the autonomous Recommendation A behavior into the global skill.
   - Trade-off: Simpler for this repo, but changes behavior for every repo using the skill.
   - Selected: Recommendation A.
2. Where should old `plans/` files move?
   - Recommendation A: Move the entire top-level `plans/` contents into `docs/plans/`, preserving `implemented/` and `superseded/` subfolders.
   - Trade-off: Centralizes history with minimal filename churn, but leaves subfolders under `docs/plans`.
   - Recommendation B: Flatten every file directly into `docs/plans/`.
   - Trade-off: Makes one directory exhaustive, but creates a noisy folder and risks name collisions.
   - Selected: Recommendation A.
3. Should root-level TODO/QA files be moved too?
   - Recommendation A: Move only files that are clearly plan/test-plan artifacts and leave broad TODOs unless they are explicitly part of implementation planning.
   - Trade-off: Avoids misclassifying unrelated project notes.
   - Recommendation B: Move every TODO/review-looking markdown file into `docs/plans/`.
   - Trade-off: More aggressive centralization, but may bury active root docs.
   - Selected: Recommendation A.

## Recommended First Step
Update the global skill text first, then move the top-level `plans/` tree into `docs/plans/` and fix references to old paths.

## Plan
1. Rewrite the global `holistic-implementation` skill so plan locations and approval/autonomy behavior are configurable by workspace instructions.
2. Move top-level `plans/implemented/*`, `plans/superseded/*`, and direct `plans/*.md` files under matching `docs/plans/` locations.
3. Move clearly plan-like root artifacts into `docs/plans/` if they are project planning/test-plan files.
4. Move `docs/superpowers` plan/design artifacts under `docs/plans/superpowers/`.
5. Search for references to old paths and update repo docs/instructions where needed.
6. Validate with `find`, `rg`, and `git diff --check`.

## Implementation Notes
- Updated `/Users/Mukul/.codex/skills/holistic-implementation/SKILL.md` so the skill keeps the full holistic workflow but reads workspace instructions for plan location, approval/autonomy behavior, recommendation selection, review locations, backend history, and feedback capture.
- Kept Recommendation A/B selection rules local to this repo through `AGENTS.md` and `docs/plans/recommendation-selection-rules.md`.
- Moved the former top-level `plans/` tree into `docs/plans/`, preserving `implemented/` and `superseded/`.
- Moved root planning/checklist artifacts into `docs/plans/`: manual tasks TODO, QA test plan, style duplication TODO, UI performance TODO, security review, security release checklist, and post-launch V2 running list.
- Moved `docs/superpowers` plan/design artifacts into `docs/plans/superpowers/`.
- Updated markdown references from old locations to the new `docs/plans` paths.

## Validation
- Confirmed no plan/review markdown files remain under the former top-level `plans/` directory.
- Confirmed `docs/plans/` contains the moved artifacts.
- Confirmed the global skill prefers workspace plan-location rules and uses `docs/plans/` when present.
- Ran `git diff --check` on touched tracked files.

## Risks And Mitigations
- Risk: Moving untracked plan files may be noisy.
  - Mitigation: Preserve filenames and subdirectories so history stays intelligible.
- Risk: Editing a global skill affects other repos.
  - Mitigation: Keep the skill generic and let workspace instructions control approval/autonomy.
- Risk: Root TODO files may have ambiguous ownership.
  - Mitigation: Only move clearly plan/test-plan artifacts and report anything left alone.

## Rollback Or Recovery
Move centralized files back to their original paths and restore the prior global skill content from shell history or git/manual diff. No app runtime code or database state is changed.

## Open Decisions
- Decision: Keep Recommendation A selection rules in repo instructions and `docs/plans/recommendation-selection-rules.md`.
- Decision: Preserve `implemented/` and `superseded/` subdirectories under `docs/plans/`.

## Critique

### Software Architect
- A generic skill plus repo-local selection rules is the right separation of concerns.

### Product Manager
- Centralizing plans reduces confusion about where to find decisions and reviews.

### Customer Or End User
- There is no product-facing behavior change.

### Engineering Implementer
- The main work is mechanical file movement and reference cleanup; validation should focus on paths and instruction consistency.

### Risk, Security, Or Operations
- The global skill edit requires elevated filesystem access because it is outside the repo. The content change should not include secrets or environment-specific credentials.
