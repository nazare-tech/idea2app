---
implemented: true
implemented_at: 2026-07-12T06:05:00+05:30
summary: >
  All seven points shipped: AGENTS.md router (43 lines), zero-dep .githooks
  (eslint --fix + typecheck pre-commit, sweep notice post-commit),
  PROJECT_CONTEXT.md split verbatim into 10 docs/systems/ files with 7-line
  headers, Playwright smoke + paid-gated e2e with test inventory, review
  personas doc, scripts/agent-review.sh + sweep-check.mjs + scripts README,
  and the commit-sweep skill (marker seeded at 363914a1; sweep currently due
  at net +12,359). Deviation: reviewer model is gpt-5.6-terra (this Codex
  install rejects plain gpt-5.6). Cross-model review ran for real; all 5
  findings fixed. See agentic-workflow-upgrade-review.md.
---

# Agentic Workflow Upgrade Plan

## Summary (greppable)

Restructure the repo's agent operating system: AGENTS.md becomes a short router; PROJECT_CONTEXT.md
splits into docs/systems/ files with 7-line greppable headers; zero-dependency git hooks run
eslint --fix + typecheck at pre-commit; a net-1000-added-lines tracker (scripts/sweep-check.mjs,
marker file docs/reviews/.last-sweep-commit) triggers the commit-sweep skill; cross-agent review
routes Claude-implemented work to Codex CLI (gpt-5.6, medium reasoning) and Codex-implemented work
to Claude CLI (Opus 4.8, high thinking) via scripts/agent-review.sh; review personas doc; Playwright
free-tier smoke e2e plus docs/testing/test-inventory.md.

## Goal

Implement improvement points 1-7 agreed on 2026-07-11:

1. AGENTS.md router split (monolith → ~40-line router + focused operating-system docs)
2. Pre-commit hooks (eslint --fix on staged files + typecheck), zero new runtime cost
3. PROJECT_CONTEXT.md split into per-section docs with a 7-line greppable summary convention
4. Playwright smoke e2e suite + test inventory doc
5. Review personas doc (maintainability, security, performance, AI-smells, product/domain)
6. scripts/ buildout: README, `agent-review.sh`, `sweep-check.mjs`
7. Commit-sweep skill triggered by **net +1000 added lines of code** since the last sweep,
   with cross-model review routing:
   - Codex implemented → review with Claude CLI, model Opus 4.8, high thinking
   - Claude implemented → review with Codex CLI, model GPT 5.6, medium reasoning effort

## Assumptions

- `claude` and `codex` CLIs are installed and authenticated on this machine (verified: both on PATH).
- Git hooks themselves cost nothing; only agent-run reviews spend tokens, and only when an agent
  explicitly invokes them (never automatically from a hook).
- The thermo-nuclear review commit `363914a1` is the correct starting point for sweep line counting.
- Playwright browser download is acceptable (free, disk only). Paid intake-flow e2e must not run by
  default because it spends AI credits.
- Both Codex and Claude Code must be able to operate every mechanism (plain bash/node, skills
  mirrored in `.agents/skills/` and `.claude/skills/`).

## Clarifying Questions and Recommendation A/B Decisions

### D1: How to track "net 1000 added lines" for the sweep trigger

- **A (selected): stateless computation from a last-sweep marker.** `docs/reviews/.last-sweep-commit`
  stores the commit SHA of the last sweep. `scripts/sweep-check.mjs` runs
  `git diff --numstat <marker>..HEAD` over code paths (src, scripts, supabase, e2e; excluding
  lockfiles, docs, ui-evidence, generated files) and reports net lines (added − deleted). A
  post-commit hook prints a loud notice when net ≥ 1000. Agents also check during session wrap-up.
  - Benefit: no counter drift, survives rebase/amend/merge, one file to update per sweep, easy to
    reason about ("lines since commit X").
  - Trade-off: deletions offset additions across the whole window (this is exactly what the user
    asked for: delete 5000 + add 1000 → net negative → no sweep).
- **B (rejected): per-commit accumulating counter file.** A post-commit hook adds each commit's net
  delta to a counter. Rejected: rebases/amends/cherry-picks corrupt the count, counter file causes
  merge conflicts, and the state is not derivable from git history.
- Cost note: the hook only prints; nothing in the hook path calls a paid API. The sweep review
  itself costs CLI tokens only when an agent runs the skill.

### D2: Hook manager

- **A (selected): versioned `.githooks/` + `git config core.hooksPath .githooks` wired through the
  npm `prepare` script.** Zero dependencies, transparent shell scripts, works identically for
  Claude, Codex, and humans; `npm install` activates it on any clone.
- **B (rejected): husky + lint-staged.** More conventional, but two dev dependencies for what two
  short shell scripts do, and lint-staged's stash/restore behavior has edge cases with partially
  staged files.

### D3: Pre-commit scope

- **A (selected): `eslint --fix` on staged JS/TS files (re-staging fixed files) + `tsc --noEmit`.**
  Fast enough for every commit; catches the classes of problems reviews kept re-finding.
- **B (rejected): also run the full unit test suite pre-commit.** 86 test files is too slow for
  every commit; tests stay in the review/sweep workflow and CI-equivalent full validations.
- Known caveat (documented in the hook): re-staging an eslint-fixed file stages the whole file,
  which can pull in unstaged hunks of that same file.

### D4: Cross-agent review invocation

- **A (selected): one wrapper script `scripts/agent-review.sh`** that takes `--implementer
  claude|codex` (auto-detected from `CLAUDECODE=1` when omitted) plus an optional commit range, and
  shells out to the *other* CLI:
  - implementer claude → `codex exec --sandbox read-only -m gpt-5.6 -c model_reasoning_effort=medium`
  - implementer codex → `MAX_THINKING_TOKENS=32000 claude -p --model claude-opus-4-8` restricted to
    read-only tools
- **B (rejected): document raw CLI incantations in a doc and have each agent compose its own
  command.** Incantation drift is exactly what a wrapper script prevents.

### D5: PROJECT_CONTEXT.md split granularity

- **A (selected): split along the existing numbered sections** into ~10 `docs/systems/` files,
  content preserved verbatim, each gaining a 7-line greppable header; PROJECT_CONTEXT.md becomes a
  short index. Zero content-loss risk; finer per-feature splits can evolve under the self-healing
  docs rule.
- **B (rejected): re-organize by product feature (intake, market-research, composer, billing...)
  in the same pass.** Better end state but requires rewriting dense interleaved content; high risk
  of dropping load-bearing facts. Do it incrementally later.

### D6: Playwright tiers

- **A (selected): free smoke tier by default** (landing renders, idea-floor validation, real
  sign-in via `.env.e2e.local`, dashboard loads, wizard step 1). The paid full-intake flow (Idea
  1.1 through generation) is a separate spec skipped unless `E2E_PAID_FLOWS=1`.
- **B (rejected): full intake generation in the default suite.** Spends real AI credits on every
  run; violates "no open-ended spend" defaults.

## Implementation Phases

1. **Phase 0**: this plan file.
2. **Phase 1 — docs restructure**: split PROJECT_CONTEXT.md into `docs/systems/`; write
   `docs/operating-system/doc-conventions.md` (7-line header convention, self-healing docs rule),
   `planning-workflow.md`, `ui-verification.md`, `review-personas.md` (includes cross-model
   routing); rewrite AGENTS.md as router; small CLAUDE.md touch-up.
3. **Phase 2 — hooks**: `.githooks/pre-commit`, `.githooks/post-commit`, `prepare` script,
   activate locally.
4. **Phase 3 — scripts**: `scripts/README.md`, `scripts/sweep-check.mjs`, `scripts/agent-review.sh`,
   seed `docs/reviews/.last-sweep-commit` with `363914a1`.
5. **Phase 4 — commit-sweep skill**: `.agents/skills/commit-sweep/SKILL.md` + `.claude/skills`
   symlink.
6. **Phase 5 — e2e**: `@playwright/test` dev dependency, `playwright.config.ts`, `e2e/` smoke
   specs, `docs/testing/test-inventory.md` (delegated inventory of the 86 unit test files),
   `docs/testing/e2e-guide.md` (how to write tests, what to avoid).
7. **Phase 6 — verification**: run hooks against a scratch commit, run `sweep-check.mjs`, run
   `npm run lint` + `typecheck`, run Playwright smoke against the real dev server, dry-run
   `agent-review.sh --dry-run`.

## Test Strategy

- Hooks: stage a file with a fixable lint violation, run `.githooks/pre-commit` directly, confirm
  fix + typecheck runs; confirm post-commit notice logic via `sweep-check.mjs` with a temporary
  low threshold.
- sweep-check: assert net-line math against `git diff --numstat` by hand for the seeded range.
- agent-review.sh: `--dry-run` prints the exact command for both implementer values; a real
  smoke invocation only if cheap.
- Playwright: run the smoke suite against the real local dev server with real `.env.e2e.local`
  auth; save evidence under `ui-evidence/2026-07-11/agentic-workflow-upgrade/`.
- Docs: `grep -c` the 7-line headers; verify no content lines were lost in the split
  (line-count accounting of extracted ranges vs originals).

## Rollback / Recovery

- Docs split: original PROJECT_CONTEXT.md content is preserved in git history; the split is
  additive files + an index rewrite. Revert = `git checkout` the prior PROJECT_CONTEXT.md and
  delete `docs/systems/`.
- Hooks: `git config --unset core.hooksPath` disables instantly; hooks are versioned files.
- Playwright: dev-dependency + config only; no runtime coupling.
- Sweep skill: delete the skill folder and marker file; nothing else references them.

## Architecture Improvement Opportunities

- **Greppable 7-line doc headers** (selected): makes every system doc discoverable by `grep` for
  both agents; documented as a convention, enforced by review personas.
- **Wrapper script for cross-CLI review** (selected): single incantation surface, models/effort
  levels change in one file.
- **Stateless sweep trigger** (selected): derivable from git alone; no fragile state.
- **CI mirror of pre-commit checks** (deferred): GitHub Actions running lint/typecheck/test on
  push would catch hook bypasses (`--no-verify`); deferred, no CI infra decision yet.
- **Per-feature systems docs** (deferred): D5-B; evolve incrementally under the self-healing rule.
- **Visual regression via Playwright screenshots** (rejected for now): tweet point 15; real cost
  and flake burden pre-launch; revisit post-launch.

## Runtime and Change-Impact Analysis

- App runtime: untouched. No src/ behavior changes; the only package.json changes are a `prepare`
  script, `e2e:*` scripts, and a dev dependency. `npm run build` unaffected (verify guard:chunky
  still runs).
- AI generation, queues, billing: untouched.
- Developer runtime: every commit now pays eslint-on-staged + typecheck (~seconds). Escape hatch:
  `git commit --no-verify` (documented, discouraged).
- Agent runtime: AGENTS.md shrinks (less per-message context); pointers must resolve, so the
  router is verified against the actual file tree before finishing.
- Playwright: new dev-only dependency; browsers stored in `~/Library/Caches/ms-playwright`.

## Candid Critique

- **Architecture**: split-by-section (D5-A) preserves an imperfect taxonomy; accepted consciously
  to avoid content-loss risk. The index must make the taxonomy searchable.
- **Product**: none of this is user-visible; the payoff is faster, safer future feature work.
- **Customer**: no impact; e2e smoke protects sign-in and intake entry, the two highest-value
  funnels.
- **Engineering**: biggest risk is the docs split silently dropping lines; mitigated with
  line-count accounting. Second risk: hook friction annoys future you; mitigated by keeping
  pre-commit under ~30s and documenting `--no-verify`.
- **Risk/Security**: `agent-review.sh` runs reviewer CLIs read-only (`--sandbox read-only` /
  restricted allowed tools). Hooks never call paid APIs. `.env.e2e.local` values are read only by
  Playwright at runtime and never logged.
