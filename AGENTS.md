# Agent Instructions (Router)

This file is a router: core rules and pointers only. Written addressing Codex; every rule applies equally to Claude Code. Detailed workflows live in the docs below — read the one your task needs, not all of them. Docs carry a 7-line greppable header: `head -7 docs/systems/*.md` skims every system, `grep -ril <keyword> docs/` finds the right doc (convention: `docs/operating-system/doc-conventions.md`).

## Primary context

- **`PROJECT_CONTEXT.md`** is the index into `docs/systems/` (architecture, database schema, API endpoints, coding conventions, setup, credits/billing, and more). Trust these docs first; do not scan source files to "get an idea" of the project. Read specific source files only when the task edits them.
- If a change alters behavior a `docs/systems/` doc describes, update that doc in the same commit (self-healing rule).

## Core rules

- Explain what you're doing before you do it; if something breaks, explain it in plain English.
- Ask before deleting or overwriting existing files.
- Never hardcode passwords or API keys; use environment variables.
- Keep code simple and well-commented so the maintainer can learn from it.
- If a request doesn't make sense, say so instead of doing it.
- Use subagents for medium-or-larger parallelizable work (exploration, implementation, verification, review) whenever the runtime provides them; this is standing authorization. Skip them only for small tasks or when the tool is unavailable, and say so.

## Router

| When the task involves... | Read first |
|---|---|
| Substantial feature / refactor / bug fix / architecture | `docs/operating-system/planning-workflow.md` (plan files in `docs/plans/`, blocking cross-model plan evaluation, Recommendation A policy, `/holistic-implementation`) |
| Any UI, visual, user-flow, or user-visible backend change | `.agents/skills/ui-verification/SKILL.md` + `docs/operating-system/ui-verification.md` (real Chrome, `.env.e2e.local` auth, `ui-evidence/<date>/<task-slug>/`, Idea 1.1 intake test cases) |
| Watching, diagnosing, fixing, or looping on pull-request CI | `.agents/skills/ci-operator/SKILL.md` (one front door for watch / fix / loop; `gh pr checks` is source of truth) |
| Committing or wrap-up review | `.agents/skills/commit/SKILL.md` + `docs/operating-system/review-personas.md` (commits are not reviewed per commit; cross-model runs on the plan, Claude work → Codex and Codex work → Claude) |
| Backend / database / Supabase / auth / webhook / data-shape change | `docs/operating-system/planning-workflow.md` § backend change history → `docs/plans/backend-change-history.md` |
| Writing or updating tests | `docs/testing/test-inventory.md` and `docs/testing/e2e-guide.md` |
| New user-visible feature, flow, entitlement, or lifecycle transition | `docs/operating-system/product-analytics-event-taxonomy.md`; typed registry `src/lib/product-analytics/contracts.ts` (no autocapture, content, PII, URLs, DOM data, or raw error strings in events) |
| Raw research/meeting transcripts or pasted notes | `docs/operating-system/transcript-sanitization-protocol.md` (ask for missing transcript metadata first: when it happened, participant name for research, meeting title/attendees for meetings) |
| Creating/updating/closing Linear issues or attaching evidence | `docs/operating-system/linear-issue-format.md` (completion evidence attached to the issue, embedded inline in the verification comment via the Linear-hosted asset URL, verified by reading the saved comment back) |
| A message framed as "this is a marketing idea / marketing message" | `.agents/skills/marketing-idea-capture/SKILL.md` — run it before replying. Vault `/Users/Mukul/Documents/openclaw`, capture folder `Content Ideas & Marketing/` (other Marketing/personal-brand folders are inspiration, not destinations). Use `/opt/homebrew/bin/obsidian` with `vault=openclaw`; Obsidian must be running. Do not substitute direct filesystem writes for the CLI workflow. |
| Building or repeating multi-step tooling incantations | `scripts/README.md` (build a script when a task repeats) |
| "SWEEP DUE" notice or net +1000 code lines since last sweep | `.agents/skills/commit-sweep/SKILL.md`; check anytime with `node scripts/sweep-check.mjs` |

## Automation already active

- **Git hooks** (`.githooks/`, activated by `npm install` via `prepare`): pre-commit runs `eslint --fix` + typecheck; post-commit only prints the +1000 sweep notice. No hook spends reviewer tokens and no hook blocks a commit.
- **Cross-model review runs on the plan, not the commit**: before implementing substantial work, `scripts/agent-review.sh --plan docs/plans/<task>-plan.md` gets a blocking opposite-CLI evaluation (Claude work → Codex, Codex work → Claude). Fold findings into the plan, record rejections, then build. A reviewer outage means the plan is unevaluated; say so, never self-evaluate and call it coverage. Diff-level cross-model review is on demand (`--range`), expected for auth, RLS, webhook, billing, and migration diffs.
- **Thermonuclear sweep**: the only automatic code review. The active agent runs `commit-sweep` when net code growth is ≥1000 lines, before push. It fans the lens groups out across parallel read-only finder subagents; verification, triage, and every edit stay with the dispatching agent.
- Branch discipline: keep working on the current branch unless explicitly asked otherwise.
- Project routers supersede legacy global `ci-watcher`, `fix-ci`, `loop-on-ci`, `run-smoke-tests`, and `control-ui` triggers here. Route matching work through `ci-operator` or `ui-verification`; keep plugin-owned GitHub, Playwright, Browser, and Chrome drivers external.

## Skills

Skills live in `.agents/skills/` (Codex) with symlinks in `.claude/skills/` (Claude Code); each self-describes in its `SKILL.md`. Invoke with `/skill-name` or by describing the need. Repo-critical: `/holistic-implementation` (default for substantial work), `commit`, `commit-sweep`, `thermo-nuclear-code-quality-review`, `ui-verification`, `ci-operator`, `marketing-idea-capture`.
