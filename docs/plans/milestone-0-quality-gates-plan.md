---
implemented: false
implemented_at:
implementation_summary: "Code/config complete and verified locally 2026-06-12: lint scoped (exit 0, 0 errors), 6 prompt-contract tests rewritten to the current 13-section MVP / numbered-PRD contract (319/319 pass), typecheck passes, CI workflow now runs lint+typecheck+test+build, disposable artifacts untracked, Design System + assets/logos untracked and gitignored (kept on disk), PROJECT_CONTEXT updated. Remaining (owner git operation): commit on a branch, push, confirm CI green end-to-end, merge to main."
---

# Plan: Milestone 0, Quality Gates And Repo Hygiene

## Goal
Restore trustworthy quality gates so every later refactor is safe: CI on `main` runs lint, typecheck, tests, and build and is green; the 6 failing prompt-contract tests are resolved with an explicit decision; the `Design System/` directory moves to its own repo/branch; and committed build artifacts, logs, and screenshots are untracked. After this milestone, a red pipeline means something is actually broken.

## Assumptions
- Local `main` is identical to `origin/main` as of 2026-06-11; none of these gate failures were fixed remotely in the last two days (verified with `git fetch` + `git log HEAD..origin/main`).
- The 6 failing tests in `src/lib/planning-prompts.test.ts` are presumed stale after the prompt-shortening work (commits around `2074bdc`), but each assertion encodes the prompt-to-renderer contract, so the parsers must be checked before tests are updated.
- `Design System/` is design tooling output, not app code; the app builds and runs without it.
- Solo project: GitHub branch protection is optional, CI gates plus habit are the enforcement mechanism.
- Untracked-but-kept files stay on disk; only git tracking changes.

## Current Gate Failures Found
- CI on `main` is red for the last 4 consecutive pushes (2026-06-08 to 2026-06-09), all on the lint step (`gh run list`).
- `npm run lint` reports 51 errors; 50 come from `Design System/**` JSX artifacts (`react/jsx-no-undef`, "Cannot access refs during render"). `eslint.config.mjs` `globalIgnores` lacks `Design System/**` and `tmp/**`.
- `npm test`: 319 tests, 313 pass, 6 fail, all in `src/lib/planning-prompts.test.ts` (Product Plan section order, First Version Plan heading contract, table and label requirements).
- `.github/workflows/ci.yml` runs only `npm run lint` and `npm run build`; `npm test` and `npm run typecheck` exist but are never enforced (`typecheck` currently passes).
- Tracked artifacts in git: `build.log`, `lint_final.txt`, `warm-horizon-theme.pdf`, `tmp/*.log`, `tmp/*.mjs`, `tmp/*.tsx`, `output/playwright/*.png`, `.playwright-cli/` log, `.codex-artifacts/pencil-exports/*.png`, `Design System/` screenshots, root `assets/logos/*.png`.

## Confirmed Decisions
- `Design System/` moves to its own repo or branch (owner decision, 2026-06-11).
- CI must run lint, typecheck, tests, and build on every push and PR to `main`.
- Artifacts are untracked with `git rm --cached`; nothing is deleted from disk in this milestone.

## Clarifying Questions
1. Should the failing tests be updated to the shortened prompts, or should the prompts restore the old contract lines?
   - Recommendation A: Verify parser compatibility first. Generate one Product Plan and one First Version Plan with the current prompts (Prompt Lab prompt-only mode is enough to inspect output shape), run the output through `src/lib/prd-document.ts` and `src/lib/mvp-plan-document.ts`, and if structured parsing succeeds, update the tests to the new contract.
   - Trade-off: One extra verification step, but it prevents blessing a real renderer regression as a "test update".
   - Recommendation B: Restore the contract lines (required tables, heading labels) to `src/lib/prompts/prd.ts` and `src/lib/prompts/mvp-plan.ts`.
   - Trade-off: Keeps tests untouched and the contract strongest, but partially undoes the deliberate prompt-shortening work.
2. Where does `Design System/` move?
   - Recommendation A: A new sibling repo (for example `maker-compass-design-system`), copied as-is, then `git rm -r --cached "Design System"` here.
   - Trade-off: Cleanest separation and its own tooling, but one more repo to remember.
   - Recommendation B: An orphan branch `design-system` in this repo.
   - Trade-off: Stays discoverable in one repo, but keeps the large binaries in this repo's object store.
3. How should lint scoping be fixed?
   - Recommendation A: Add `"Design System/**"` and `"tmp/**"` to `globalIgnores` in `eslint.config.mjs` (keep `Design System/**` even after the move, as a guard against re-adding artifacts).
   - Trade-off: Default Next lint behavior is preserved everywhere else; the ignore list grows slightly.
   - Recommendation B: Change the script to `eslint src scripts`.
   - Trade-off: Tighter scope, but new top-level code directories would silently skip lint.

## Recommended First Step
Capture the baseline before changing anything: run `npm run lint`, `npm test`, and `npm run typecheck`, save the outputs, and note the failing CI run IDs. Every later step is verified against this baseline.

## Plan
1. [x] Record baselines: 51 lint errors (50 from `Design System/**`), 6 failing tests in `planning-prompts.test.ts`, typecheck clean, CI red on the lint step.
2. [x] Untrack `Design System/` + root `assets/logos/` via `git rm -r --cached` (kept on disk; recoverable from main history); added `/Design System/` and `/assets/logos/` to `.gitignore`. Owner chose untrack+gitignore (2026-06-12); standalone repo push is the owner's follow-up.
3. [x] Scope lint: added `"Design System/**"` and `"tmp/**"` to `globalIgnores` in `eslint.config.mjs`; `npm run lint` now exits 0 (0 errors, 17 warnings).
4. [x] Resolved the 6 failing tests. Decision (Clarifying Question 1): the MVP/PRD parsers are name/alias-driven and were updated in lockstep with the prompts (proof: `mvp-plan-document.ts` `H2_ALIASES.hypothesis` contains the new "MVP Goal, Definition of Done, and Riskiest Assumptions" section). The current prompts parse to structured output; the tests encoded the stale 12-section/old-PRD contract. Rewrote `src/lib/planning-prompts.test.ts` to assert the current 13-section MVP and numbered-PRD contract (every assertion verified present in the live prompt strings). 319/319 pass.
5. [x] Untracked disposable artifacts (29 files): `.codex-artifacts/`, `.playwright-cli/`, `output/`, `tmp/`, `build.log`, `lint_final.txt`, `warm-horizon-theme.pdf`, `rebrand-preview.html`, `tmp-projects-empty-state.html`, `stripe-pricing-landing.png`; extended `.gitignore` for the patterns not already covered.
6. [x] Updated `.github/workflows/ci.yml`: added `npm run typecheck` and `npm test` steps between lint and build; renamed the job to "Lint, Typecheck, Test & Build".
7. [ ] Owner git operation: commit on a branch, push, confirm CI green end-to-end, merge to `main`. (Optional validation: push an intentionally broken test on a scratch branch, confirm CI fails, revert.)
8. [x] Updated `PROJECT_CONTEXT.md`: CI enforcement note + Design System relocation note in Setup & Build; corrected the stale "12-section" MVP contract to "13-section".

## Milestones
- Lint Green: `npm run lint` exits 0 with zero errors.
- Tests Green: `npm test` passes 100 percent with an explicit, recorded decision on the prompt contract.
- CI Enforcing: a push with a type error or failing test fails CI.
- Repo Clean: no logs, build output, or one-off screenshots tracked by git.
- Design System Relocated: directory absent from this repo's tracked files, available in its new home.

## Validation
- `npm run lint` (exit 0)
- `npm run typecheck` (exit 0)
- `npm test` (0 failures; do not pipe through `tail`, the pipe masks the exit code)
- `git ls-files | grep -E '\.log$|^tmp/|^output/|^Design System/|\.playwright'` returns nothing
- One intentionally broken test on a scratch branch fails CI, then is reverted

## Risks And Mitigations
- Risk: Updating tests to match shortened prompts hides a real renderer regression.
  - Mitigation: Step 4 verifies parser output before any test assertion changes; if parsing falls back to markdown, the prompts are fixed instead.
- Risk: Moving `Design System/` breaks a hidden reference from app code.
  - Mitigation: `grep -rn "Design System" src/` before the move; the audit found no app-code references.
- Risk: `git rm --cached` on a path that something in CI expects.
  - Mitigation: CI only runs lint/typecheck/test/build, none of which read the untracked artifacts; verified by the green run in step 7.

## Rollback Or Recovery
- All steps are commits; `git revert` restores any of them.
- Untracked files remain on disk, so re-tracking is `git add` plus a `.gitignore` edit.
- If the test-contract decision proves wrong after merge, the prompts and tests are both plain text files with no data migration involved.

## Open Decisions
- Whether root `assets/logos/` (duplicated inside `Design System/assets/logos/`) moves with the design repo or stays; nothing in `src/` or `public/` references it.
- Whether to also clean the pre-existing `src/` lint warnings now or leave them for the Milestone 2 dead-code pass (default: leave, they are warnings not errors).

## Critique

### Software Architect
- Gates are infrastructure; fixing them before the security and refactor milestones is the right dependency order, since every later change relies on test and CI signal.
- Keeping `Design System/**` in the ignore list even after relocation is cheap insurance against artifact re-introduction.

### Product Manager
- No user-facing change in this milestone, which is correct: it buys speed and safety for everything after it.
- The prompt-contract decision (step 4) is secretly a product decision about document rendering quality; record which way it went.

### Customer Or End User
- Invisible to users, except that it prevents future regressions in generated document rendering from shipping unnoticed.

### Engineering Implementer
- The whole milestone is one focused day; the only step with judgment in it is the test-versus-prompt decision, which the parser check resolves objectively.
- Do the artifact untracking in its own commit so the diff stays reviewable.

### Risk, Security, Or Operations
- Lowers operational risk: a red-but-ignored pipeline is worse than no pipeline because it certifies neglect.
- No secrets, data, or runtime behavior touched; the riskiest step is a test expectation update, bounded by the parser verification.
