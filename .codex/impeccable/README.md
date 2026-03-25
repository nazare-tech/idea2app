# Impeccable for Idea2App

Vendored from: `https://github.com/pbakaus/impeccable`

## Why this is here

The upstream repository README references a prebuilt `dist/codex` bundle, but that bundle is not present in the GitHub repo. To make the guidance usable inside `idea2app`, the source skill files were copied into this repo-local Codex directory.

## Location

- Frontend design base skill: `.codex/impeccable/skills/frontend-design/SKILL.md`
- Supporting reference files: `.codex/impeccable/skills/frontend-design/reference/`
- Common follow-up skills:
  - `.codex/impeccable/skills/audit/SKILL.md`
  - `.codex/impeccable/skills/normalize/SKILL.md`
  - `.codex/impeccable/skills/polish/SKILL.md`
  - `.codex/impeccable/skills/critique/SKILL.md`

## Expected use in this repo

For frontend/UI work in Idea2App:
1. Start with `frontend-design`
2. Use `normalize`/`critique` during iteration when useful
3. Run `polish` before returning control
4. Run `audit` for a final quality/accessibility/perf sweep

This is repo-local guidance for Codex agents working on Idea2App frontend quality.
