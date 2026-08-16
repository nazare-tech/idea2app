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
- Use subagents only for concrete independent work that materially reduces elapsed time or risk. Routine UI changes, local refactors, focused bugs, docs, and small code changes do not require subagents. Default maximum: one scout and one verifier; exceed it only when the user asks for broad parallel work.

## Lean default

- Start ordinary implementation with a short working plan in commentary, then build.
- Use focused tests while editing and one consolidated validation pass at the end.
- Run one real-browser verification pass for UI changes, in Chrome by default. Add another browser only for browser-specific behavior, a discovered defect, or an explicit user request.
- Run the production build once after implementation stabilizes; rerun only after a build-relevant fix.
- Use one consolidated code/security review. Apply the security lens only when the change handles secrets, auth, untrusted input, external side effects, privileged processes, or sensitive data.
- Update the smallest relevant system document. Create a detailed plan/review artifact only for high-risk work or when the user requests one.

## Router

| When the task involves... | Read first |
|---|---|
| High-risk change: auth/RLS, billing, webhook, migration, destructive data operation, security-sensitive process execution, or broad cross-system architecture | `docs/operating-system/planning-workflow.md` (plan files in `docs/plans/`, blocking cross-model plan evaluation, Recommendation A policy, `/holistic-implementation`) |
| Any UI, visual, user-flow, or user-visible backend change | `.agents/skills/ui-verification/SKILL.md` + `docs/operating-system/ui-verification.md` (real Chrome, `.env.e2e.local` auth, `ui-evidence/<date>/<task-slug>/`, Idea 1.1 intake test cases) |
| Watching, diagnosing, fixing, or looping on pull-request CI | `.agents/skills/ci-operator/SKILL.md` (one front door for watch / fix / loop; `gh pr checks` is source of truth) |
| Committing or wrap-up review | `.agents/skills/commit/SKILL.md` + `docs/operating-system/review-personas.md` (commits are not reviewed per commit; cross-model runs on the plan, Claude work → Codex and Codex work → Claude) |
| Backend / database / Supabase / auth / webhook / data-shape change | `docs/operating-system/planning-workflow.md` § backend change history → `docs/plans/backend-change-history.md` |
| Writing or updating tests | `docs/testing/test-inventory.md` and `docs/testing/e2e-guide.md` |
| New user-visible feature, flow, entitlement, or lifecycle transition | `docs/operating-system/product-analytics-event-taxonomy.md`; typed registry `src/lib/product-analytics/contracts.ts` (no autocapture, content, PII, URLs, DOM data, or raw error strings in events) |
| Raw research/meeting transcripts or pasted notes | `docs/operating-system/transcript-sanitization-protocol.md` (ask for missing transcript metadata first: when it happened, participant name for research, meeting title/attendees for meetings) |
| Creating/updating/closing Linear issues or attaching evidence | `docs/operating-system/linear-issue-format.md` (completion evidence attached to the issue, embedded inline in the verification comment via the Linear-hosted asset URL, verified by reading the saved comment back) |
| A new product/company idea or first brand direction | `docs/operating-system/brand-foundation.md`; establish or confirm `brand/brand.md` before UI, copy, or marketing work. Use `.agents/skills/build-a-brand/SKILL.md` only for the enhanced visual package and only after its paid-generation gate. |
| A message framed as "this is a marketing idea / marketing message" | `.agents/skills/marketing-idea-capture/SKILL.md` — run it before replying. Save locally beneath the designated repository's `marketing/`; default to concise capture and develop full drafts only when asked. |
| Building or repeating multi-step tooling incantations | `scripts/README.md` (build a script when a task repeats) |
| "SWEEP DUE" notice or net +1000 code lines since last sweep | `.agents/skills/commit-sweep/SKILL.md`; check anytime with `node scripts/sweep-check.mjs` |

## Automation already active

- **Git hooks** (`.githooks/`, activated by `npm install` via `prepare`): pre-commit runs `eslint --fix` + typecheck; post-commit only prints the +1000 sweep notice. No hook spends reviewer tokens and no hook blocks a commit.
- **Cross-model review is risk-triggered, not size-triggered**: before auth/RLS, billing, webhook, migration, destructive-data, security-sensitive process-execution, or broad cross-system architecture work, `scripts/agent-review.sh --plan docs/plans/<task>-plan.md` gets a blocking opposite-CLI evaluation (Claude work → Codex, Codex work → Claude). Fold findings into the plan, record rejections, then build. For ordinary features, UI changes, local refactors, and focused bugs, skip blocking cross-model evaluation unless the user requests it. Diff-level cross-model review remains on demand (`--range`) and expected for auth, RLS, webhook, billing, and migration diffs.
- **Thermonuclear sweep**: the only automatic code review. The active agent runs `commit-sweep` when net code growth is ≥1000 lines, before push. It fans the lens groups out across parallel read-only finder subagents; verification, triage, and every edit stay with the dispatching agent.
- Branch discipline: keep working on the current branch unless explicitly asked otherwise.
- Retired global `ci-watcher`, `fix-ci`, `loop-on-ci`, `run-smoke-tests`, and `control-ui` workflows are consolidated here. Route matching work through `ci-operator` or `ui-verification`; keep plugin-owned GitHub, Playwright, Browser, and Chrome drivers external.

## Skills

Skills live in `.agents/skills/` (Codex) with symlinks in `.claude/skills/` (Claude Code); each self-describes in its `SKILL.md`. Invoke with `/skill-name` or by describing the need. Before refreshing a skill listed in `skills-overrides.json`, preserve and re-verify its deliberate local changes. Repo-critical: `/holistic-implementation` (default for the high-risk categories above), `commit`, `commit-sweep`, `thermo-nuclear-code-quality-review`, `ui-verification`, `ci-operator`, `marketing-idea-capture`.
