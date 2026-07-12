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
| Substantial feature / refactor / bug fix / architecture | `docs/operating-system/planning-workflow.md` (plan files in `docs/plans/`, Recommendation A policy, `/holistic-implementation`) |
| Any UI, visual, user-flow, or user-visible backend change | `docs/operating-system/ui-verification.md` (real Chrome, `.env.e2e.local` auth, `ui-evidence/<date>/<task-slug>/`, Idea 1.1 intake test cases) |
| Wrap-up review of substantial work | `docs/operating-system/review-personas.md` + `scripts/agent-review.sh` (cross-model: Claude work → codex gpt-5.6-terra medium; Codex work → claude Opus 4.8 high thinking) |
| Backend / database / Supabase / auth / webhook / data-shape change | `docs/operating-system/planning-workflow.md` § backend change history → `docs/plans/backend-change-history.md` |
| Writing or updating tests | `docs/testing/test-inventory.md` and `docs/testing/e2e-guide.md` |
| New user-visible feature, flow, entitlement, or lifecycle transition | `docs/operating-system/product-analytics-event-taxonomy.md`; typed registry `src/lib/product-analytics/contracts.ts` (no autocapture, content, PII, URLs, DOM data, or raw error strings in events) |
| Raw research/meeting transcripts or pasted notes | `docs/operating-system/transcript-sanitization-protocol.md` (ask for missing transcript metadata first: when it happened, participant name for research, meeting title/attendees for meetings) |
| Creating/updating/closing Linear issues or attaching evidence | `docs/operating-system/linear-issue-format.md` (completion evidence attached to the issue, embedded inline in the verification comment via the Linear-hosted asset URL, verified by reading the saved comment back) |
| A message framed as "this is a marketing idea / marketing message" | `.agents/skills/marketing-idea-capture/SKILL.md` — run it before replying. Vault `/Users/Mukul/Documents/openclaw`, capture folder `Content Ideas & Marketing/` (other Marketing/personal-brand folders are inspiration, not destinations). Use `/opt/homebrew/bin/obsidian` with `vault=openclaw`; Obsidian must be running. Do not substitute direct filesystem writes for the CLI workflow. |
| Building or repeating multi-step tooling incantations | `scripts/README.md` (build a script when a task repeats) |
| "SWEEP DUE" notice or net +1000 code lines since last sweep | `.agents/skills/commit-sweep/SKILL.md`; check anytime with `node scripts/sweep-check.mjs` |

## Automation already active

- **Git hooks** (`.githooks/`, activated by `npm install` via the `prepare` script): pre-commit runs `eslint --fix` on staged files + typecheck; post-commit prints a sweep notice at net +1000 added code lines. Hooks never spend money.
- **Cross-model review** is required at wrap-up of substantial work; invoke via `scripts/agent-review.sh` (never from hooks — it costs tokens).
- Branch discipline: keep working on the current branch unless explicitly asked otherwise.

## Skills

Skills live in `.agents/skills/` (Codex) with symlinks in `.claude/skills/` (Claude Code); each self-describes in its `SKILL.md`. Invoke with `/skill-name` or by describing the need. Repo-critical: `/holistic-implementation` (default for substantial work), `commit-sweep`, `marketing-idea-capture`.
