# Claude Project Entry Point

Before working:

1. Read `AGENTS.md`. It is a router: core rules plus a table pointing at the doc each task type needs. Read the doc your task needs, not all of them.
2. Read `PROJECT_CONTEXT.md` for the index into `docs/systems/` (architecture, data model, API surface, conventions, setup). `head -7 docs/systems/*.md` skims every system; `grep -ril <keyword> docs/` finds the owning doc.
3. Read only the task-relevant docs and source files after that.

Notes when applying `AGENTS.md` as Claude Code:

- Every rule there applies to Claude Code as written.
- Where a routed doc names another runtime's tooling (browser control, skill discovery paths), use the Claude Code equivalent. The intent (real browser, real local dev server, real auth from a git-ignored env file, evidence under `ui-evidence/<date>/<task-slug>/`) is unchanged.
- In `scripts/agent-review.sh` terms, work you implement has `--implementer claude`, so the cross-model reviewer is Codex.
- Skills live in `.agents/skills/`; this kit includes project-relative links in `.claude/skills/` for slash-command discovery.

Do not duplicate canonical rules here. One source of truth prevents instruction drift. If this project adds design or product source-of-truth docs (voice, visual system, principles), list them here and require reading them before UI, visual, motion, or copy work.
