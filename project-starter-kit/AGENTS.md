# Agent Instructions (Router)

This file is a router: core rules and pointers only. Every rule applies to every agent runtime (Codex, Claude Code, or another CLI). Detailed workflows live in the docs below, read the one your task needs, not all of them. Docs under `docs/systems/` and `docs/operating-system/` carry a 7-line greppable header: `head -7 docs/systems/*.md` skims every system, `grep -ril <keyword> docs/` finds the right doc (convention: `docs/operating-system/doc-conventions.md`).

## Primary context

- **`PROJECT_CONTEXT.md`** is the index into `docs/systems/` (architecture, data model, API surface, coding conventions, setup, and whatever else this project needs). Trust these docs first; do not scan source files to "get an idea" of the project. Read specific source files only when the task edits them.
- If a change alters behavior a `docs/systems/` doc describes, update that doc in the same commit (self-healing rule).
- Treat the nearest nested `AGENTS.md` as additional instructions for that subtree.

## Core rules

- Explain what you're doing before you do it; if something breaks, explain it in plain English with the shortest decisive error.
- Ask before deleting files or replacing a whole file in a way that discards existing content. Scoped edits that preserve unrelated content may proceed. Preserve unrelated dirty worktree changes.
- Never hardcode or print secrets, credentials, cookies, tokens, or private keys. Use environment variables or the project's secret manager.
- Keep code simple and well-commented so the maintainer can learn from it. Prefer the smallest durable design over a local patch, and reuse established components, helpers, and contracts.
- If a request doesn't make sense or is technically unsound, say so and propose a workable alternative instead of doing it.
- Stay on the current branch unless the user explicitly asks for another branch.
- Use subagents for medium-or-larger parallelizable work (exploration, implementation, verification, review) whenever the runtime provides them; this is standing authorization. Skip them for small tasks or when the tool is unavailable, and say so.
- Proceed without waiting on reversible defaults. Stop for destructive actions, overwrites, missing credentials, secret exposure, weakened authorization, irreversible production changes, or unapproved/open-ended spend.

## Router

| When the task involves... | Read first |
|---|---|
| Substantial feature / refactor / bug fix / architecture | `docs/operating-system/planning-workflow.md` (plan file, blocking opposite-CLI plan evaluation, Recommendation A policy, `holistic-implementation` skill) |
| Any UI, visual, user-flow, or user-visible backend change | `.agents/skills/ui-verification/SKILL.md` + `docs/operating-system/ui-verification.md` (real browser, real auth, evidence under `ui-evidence/<date>/<task-slug>/`) |
| Watching, diagnosing, fixing, or looping on pull-request CI | `.agents/skills/ci-operator/SKILL.md` (`gh pr checks` is source of truth; watch/diagnose/fix/loop modes) |
| Committing or wrap-up review | `.agents/skills/commit/SKILL.md` + `docs/operating-system/review-personas.md` (cross-model review runs on the plan; code sweeps run at net +1000 lines) |
| Backend / database / auth / webhook / data-shape change | `docs/operating-system/planning-workflow.md` § backend change history → `docs/plans/backend-change-history.md` |
| Writing or updating tests | `docs/testing/test-inventory.md` and `docs/testing/e2e-guide.md` |
| New user-visible feature, flow, entitlement, or lifecycle transition | `docs/operating-system/product-analytics-template.md` (no autocapture, content, PII, URLs, DOM data, or raw error strings in events) |
| A new product/company idea or first brand direction | `docs/operating-system/brand-foundation.md`; establish or confirm `brand/brand.md` before UI, copy, or marketing hardens. Use `build-a-brand` only for the enhanced generated package and only after its cost gate. |
| A message framed as "this is a marketing idea / marketing message" | `.agents/skills/marketing-idea-capture/SKILL.md`; save beneath this repository's designated `marketing/`, concise by default, full drafts only when asked. |
| Drafting, rewriting, editing, or critiquing marketing copy | `.agents/skills/marketing-writing-style/SKILL.md`; apply the spoken-voice prose standard to agent-written copy, never to a preserved raw idea or quotation. |
| Raw research/meeting transcripts or pasted notes | `docs/operating-system/transcript-sanitization-protocol.md` (ask for missing transcript metadata first) |
| Creating/updating/closing issues or attaching evidence | `docs/operating-system/issue-tracker-format.md` |
| Building or repeating multi-step tooling incantations | `scripts/README.md` (build a script when a task repeats) |
| "SWEEP DUE" notice or net +1000 code lines since last sweep | `.agents/skills/commit-sweep/SKILL.md`; check anytime with `node scripts/sweep-check.mjs` |
| Stack-specific questions (React/Next.js projects only) | `docs/references/react-nextjs.md`; delete or replace it for other stacks |

## Automation available

These are opt-in. Activate with `git config core.hooksPath .githooks` (or an npm `prepare` script that runs it) once the project has real lint/typecheck commands.

- **Git hooks** (`.githooks/`): pre-commit runs configured lint and typecheck commands on staged code; post-commit only prints the +1000 sweep notice. Hooks never spend reviewer tokens.
- **Cross-model review**: substantial work gets one blocking opposite-CLI plan evaluation before implementation. Diff review is deliberate/on demand for sensitive work.
- **Thermonuclear sweep**: the automatic code-review layer. The active agent runs `commit-sweep` when net code growth is at least 1,000 lines.

## Learning loop

- When the user corrects a recommendation, adjust the implementation first when practical.
- Ask which underlying preference, constraint, or product principle made the correction better.
- Record the generalized root rule in `docs/plans/recommendation-selection-rules.md`; do not encode one-off surface preferences.

## Skills

Skills live in `.agents/skills/` with project-relative links in `.claude/skills/`; each self-describes in its `SKILL.md`. Invoke with `/skill-name` or by describing the need. Kit skills: `holistic-implementation`, `commit`, `commit-sweep`, `thermo-nuclear-code-quality-review`, `security-review`, `build-a-brand`, `marketing-idea-capture`, `marketing-writing-style`, `ci-operator`, `ui-verification`. Source and override metadata for bundled skills lives in `skills-manifest.json`.
