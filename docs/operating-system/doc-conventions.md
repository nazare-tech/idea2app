# Documentation Conventions
Defines the 7-line greppable header convention, the self-healing docs rule, and the docs/systems/ layout that replaced the PROJECT_CONTEXT.md monolith.
Every doc in docs/systems/ and docs/operating-system/ starts with a title line plus six dense summary lines so `head -7` gives the gist and grep finds the right doc.
The self-healing rule: any agent that changes behavior a doc describes must update that doc in the same change; review personas own doc freshness per system.
PROJECT_CONTEXT.md is now an index pointing into docs/systems/ (architecture, database-schema, api-endpoints, coding-conventions, setup-and-build, and more).
Discovery workflow for agents: `head -7 docs/systems/*.md docs/operating-system/*.md` or grep a keyword, then open only the matching doc.
Related: docs/operating-system/planning-workflow.md, review-personas.md, ui-verification.md; router at AGENTS.md.
---

## The 7-line header

Every markdown doc under `docs/systems/` and `docs/operating-system/` begins with exactly this shape:

```
Line 1:   # Title
Lines 2-7: six dense single-line summary sentences (no blank lines)
Line 8:   ---
Line 9:   blank
Line 10+: body
```

Rules for the six summary lines:

- Complete sentences, one per line, roughly 100-160 characters each.
- Pack in the grep bait: file paths, table names, route paths, contract names, distinctive product terms.
- Optimize for two readers: `head -7` (does this doc cover what I need?) and `grep -l <keyword> docs/**/*.md` (which doc mentions it?).
- No marketing language, no "this document describes". State facts.

## Discovery workflow

Before scanning source files to "get an idea" of a system:

```bash
head -7 docs/systems/*.md            # skim all system gists in one screen
grep -ril "<keyword>" docs/systems/ docs/operating-system/
```

Open only the doc(s) that hit. Trust the docs first; read source when the task edits it.

## Self-healing docs rule

- If a change alters behavior described in a `docs/systems/` doc, update that doc **in the same commit**. This replaces the old "update PROJECT_CONTEXT.md" rule.
- If a change creates a new system with no doc, create one (with the 7-line header) and add it to the PROJECT_CONTEXT.md index.
- If you find a doc that contradicts the code, fix the doc as part of your task and note it in your plan/review artifact. A wrong doc is worse than no doc.
- Review personas (`docs/operating-system/review-personas.md`) each own a set of system docs and check freshness during reviews and commit sweeps.

## Layout

| Location | Contents |
|---|---|
| `PROJECT_CONTEXT.md` | Index + project one-liner. No system detail lives here anymore. |
| `docs/systems/` | Per-system source-of-truth docs (split from the old PROJECT_CONTEXT.md monolith). |
| `docs/operating-system/` | How agents work in this repo: planning, verification, review, conventions, formats. |
| `docs/testing/` | Test inventory and e2e guide. |
| `docs/plans/` | Per-task plan and review artifacts (see planning-workflow.md). |
| `docs/reviews/` | Cross-commit sweep reviews and standalone review reports. |
