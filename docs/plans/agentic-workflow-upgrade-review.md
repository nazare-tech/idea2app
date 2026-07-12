# Agentic Workflow Upgrade — Review Artifact

Companion to `agentic-workflow-upgrade-plan.md`. Implemented 2026-07-11 by Claude Code (Fable 5).

## What shipped

1. **AGENTS.md router** (43 lines, was 195): core rules + task-type routing table. Monolith content moved to `docs/operating-system/planning-workflow.md`, `ui-verification.md`, `review-personas.md`, `doc-conventions.md`. Stale skills catalog (n8n, Vercel HUD, etc.) deleted; skills self-describe. CLAUDE.md updated to match.
2. **Pre-commit hooks** (`.githooks/`, zero deps, activated by npm `prepare`): `eslint --fix` on staged JS/TS + typecheck; refuses partially staged code files (see finding F1); skips doc-only commits. Post-commit prints the sweep notice. `git commit --no-verify` bypasses.
3. **PROJECT_CONTEXT.md split**: 1538-line monolith → index + 10 `docs/systems/*.md` docs, body content verbatim (line-count accounting: 1531 extracted = 1538 − 7 header lines; per-file `tail -n +10` diffs empty). Every doc has the 7-line greppable header per `doc-conventions.md`.
4. **Playwright e2e**: `playwright.config.ts` (loads `.env.e2e.local` itself), `e2e/smoke.spec.ts` (free tier), `e2e/paid-intake.spec.ts` (gated by `E2E_PAID_FLOWS=1`). `docs/testing/test-inventory.md` (all 86 unit test files categorized, coverage gaps named) + `docs/testing/e2e-guide.md`.
5. **Review personas doc** with cross-model routing (see 6).
6. **`scripts/agent-review.sh`**: implementer claude → `codex exec --sandbox read-only -m gpt-5.6-terra -c model_reasoning_effort=medium`; implementer codex → `MAX_THINKING_TOKENS=32000 claude -p --model claude-opus-4-8` with read-only allowed tools. Plus `scripts/README.md` inventory + tool-building conventions.
7. **Commit-sweep**: `scripts/sweep-check.mjs` (net added − deleted code lines since `docs/reviews/.last-sweep-commit`, threshold 1000, marker seeded at thermo-review commit `363914a1`), post-commit notice, `.agents/skills/commit-sweep/SKILL.md` (+ `.claude/skills` symlink).

Model-name deviation from the plan: the user asked for "GPT 5.6"; this Codex install (ChatGPT account) rejects `gpt-5.6`/`gpt-5.6-codex` with `invalid_request_error`. The working GPT 5.6 variant is **`gpt-5.6-terra`** (the install's own default model); scripts and docs use it, with the reason commented in `agent-review.sh`.

## Verification run

- `npm run lint`: clean for all new files. One pre-existing error (`src/components/layout/workspace-document-frame.tsx:52`, react-hooks/set-state-in-effect) and one pre-existing warning in `ui-evidence/` predate this work and are untouched.
- `npm run typecheck`: clean including Playwright files.
- `npm test`: 614/614 pass, 0 fail (full unit suite, 5.6s).
- Hooks, live: staged `let` auto-fixed to `const` and re-staged; typecheck gate ran; partially staged file correctly refused; doc-only commit path exits early; post-commit banner prints (currently SWEEP DUE, net +12,359 since `363914a1`).
- `sweep-check.mjs`: `--json` math spot-checked against `git diff --numstat`; binary and excluded paths (docs, lockfiles, ui-evidence) skipped.
- Playwright, real dev server + real `.env.e2e.local` auth: free tier 3/3 passed (landing render; idea-floor disable/enable on the `landing-idea-signup` button; real modal sign-in → `/projects` → wizard step 1 Next gating). Paid tier validated once deliberately (real `/api/intake/questions` generation, 21s, passed) then re-gated behind `E2E_PAID_FLOWS=1`.
- `agent-review.sh`: `--dry-run` verified for both routings; real end-to-end run executed (below).

No UI-visible product changes shipped, so no `ui-evidence/` capture applies; Playwright output and the live-hook transcript are the verification evidence.

## Cross-model review (codex gpt-5.6-terra, medium) — findings and triage

| # | Finding | Triage |
|---|---|---|
| F1 | MAJOR security `.githooks/pre-commit` — re-staging eslint-fixed files could pull unstaged hunks (unfinished work/secrets) into the commit | **Fixed**: hook now refuses partially staged code files with instructions; re-verified live |
| F2 | MAJOR maintainability `agent-review.sh` — untracked-only changes fell through to `HEAD~1..HEAD`, bypassing review | **Fixed**: dirtiness detected via `git status --porcelain`; verified |
| F3 | MAJOR AI-smells — fresh clones lack Playwright Chromium; `npm run e2e` would fail | **Fixed**: one-time `npx playwright install chromium` documented in `setup-and-build.md` Testing section and `e2e-guide.md` |
| F4 | MINOR doc drift — `setup-and-build.md` still directed `UI_TEST_*` in `.env.local` and told agents to avoid Chrome/Playwright, contradicting `ui-verification.md` | **Fixed**: now `E2E_TEST_*` in `.env.e2e.local`; browser guidance aligned with `ui-verification.md` (pre-existing drift surfaced by the new stale-doc rule working as designed) |
| F5 | MINOR doc drift — `@playwright/test` missing from `tech-stack.md` dev-tools table | **Fixed**: row + header line added |

## Architecture improvement review

- Selected opportunities landed: 7-line greppable headers (all new docs + 10 systems docs), single wrapper for cross-CLI review, stateless sweep trigger.
- Plan correction: the plan listed "CI mirror of pre-commit checks" as deferred, but `.github/workflows/ci.yml` already enforces lint/typecheck/test/build — the opportunity was already satisfied; no action needed.
- Deferred: per-feature re-organization of `docs/systems/` (evolves under the self-healing rule); visual regression testing (post-launch).
- No new duplication or brittle contracts observed; the sweep marker file is the only new state and is derivable-by-inspection (a commit SHA).

## Follow-ups

- **A sweep is due now**: net +12,359 lines across 56 commits since the thermo-nuclear review. Run the `commit-sweep` skill when ready (it spends reviewer tokens).
- Pre-existing lint error in `workspace-document-frame.tsx:52` will block the first commit that stages that file; fix it then or in the due sweep.
- The old AGENTS.md rules live on in the routed docs; if any behavior was intentionally dropped rather than moved, correct the routed doc, not the router.
