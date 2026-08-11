# Reusable Project Starter Kit

Copy this folder's **contents** into a new repository, then customize the placeholders before asking an agent to build.

Version 4 (2026-07-30). v4 adds a portable spoken-voice marketing writing standard and wires it into marketing drafting and critique.

## Start here

1. Copy this directory's entire contents into the new repository root, including dotfiles. This includes `AGENTS.md`, `CLAUDE.md`, `PROJECT_CONTEXT.md`, `.agents/`, `.claude/`, `.githooks/`, `brand/`, `marketing/`, `docs/`, `scripts/`, and `skills-manifest.json`.
2. Merge `.gitignore.template` into the new project's `.gitignore`; do not replace useful existing rules blindly.
3. Replace every `{{PLACEHOLDER}}` in `PROJECT_CONTEXT.md`, starting with its seven header lines. Find stragglers later with `grep -rn "{{" .`.
4. Capture the first-pass product identity in `brand/brand.md` after the idea and audience are understandable. Keep unknowns explicit; `build-a-brand` is an optional richer route, not a blocker.
5. Delete what does not apply: `docs/references/react-nextjs.md` for non-React work, `docs/operating-system/issue-tracker-format.md` if there is no tracker, `docs/testing/e2e-guide.md` until there is an e2e suite.
6. Fill in real commands (install, dev, test, lint, typecheck, build) in `docs/systems/setup-and-build.md`, created from `docs/systems/_TEMPLATE.md`.
7. Commit the customized baseline **before** feature work.
8. Turn on the automation (optional but recommended, see below).

## Turning on the automation

The hooks and review scripts are inert until you activate them, so a fresh repo can commit on day one.

```bash
git config core.hooksPath .githooks
```

Then:

- **Pre-commit checks**: set `LINT_CMD` and `TYPECHECK_CMD` in `.githooks/pre-commit`. Unset, the hook is a no-op.
- **Cross-model plan evaluation**: install and sign in to both reviewer CLIs (`codex` and `claude`), set `CODEX_REVIEW_MODEL` / `CLAUDE_REVIEW_MODEL` in `scripts/agent-review.sh`, and confirm with `scripts/agent-review.sh --implementer claude --plan docs/plans/plan-template.md --dry-run`.
- **Code-path definition**: edit the three config blocks in `scripts/code-path-classification.mjs` to match this project's tree. They decide what counts as code for both review and sweep.
- **Sweep tracking**: `git rev-parse HEAD > docs/reviews/.last-sweep-commit` after the first commit.

**Reviewer calls may spend money; hooks do not.** Substantial work calls the opposite CLI once on the plan before implementation. Diff reviews are on demand. `git commit --no-verify` bypasses pre-commit checks and should not replace fixing them. Details in `scripts/README.md`.

## What is included

| Path | Purpose |
|---|---|
| `AGENTS.md` | Canonical cross-agent rules, as a router table pointing at the doc each task needs. |
| `CLAUDE.md` | Thin runtime-specific entrypoint; adds no rules of its own. |
| `PROJECT_CONTEXT.md` | Index into `docs/systems/` plus the sources-of-truth table. |
| `docs/systems/_TEMPLATE.md` | The 7-line greppable header shape and section scaffold for every system doc. |
| `docs/operating-system/` | How agents work: planning workflow, UI verification, review personas, doc conventions, transcript protocol, issue-tracker format, analytics template, research/meeting templates. |
| `docs/plans/` | Plan, review, recommendation-rules, and backend-history templates. |
| `docs/reviews/` | Sweep reports and the sweep marker. |
| `docs/testing/` | Test inventory and e2e guide templates. |
| `docs/references/react-nextjs.md` | Optional stack overlay. |
| `brand/` | Runtime-neutral brand foundation, candidate updates, and optional generated packages. |
| `marketing/` | Local idea captures, drafts, campaigns, and research; nothing auto-publishes. |
| `scripts/` | `agent-review.sh`, `post-commit-review.sh`, `code-path-classification.mjs`, `sweep-check.mjs`, plus the conventions for growing this folder. |
| `.githooks/` | `pre-commit` (configured lint + typecheck) and `post-commit` (sweep notice only). |
| `.agents/skills/` | Core implementation/review skills plus `build-a-brand`, portable marketing capture and writing style, CI operator, and UI verification. |
| `.claude/skills/` | Project-relative links to every bundled skill for Claude Code discovery. |
| `skills-manifest.json` | Source revisions, licenses, and intentional local overrides for bundled skills. |

## The loop this kit encodes

1. A new idea gets a concise `brand/brand.md` foundation before UI, copy, or marketing hardens.
2. Substantial work starts with a plan file and a blocking opposite-CLI plan evaluation.
3. UI-visible work is verified through the real UI with evidence under `ui-evidence/<date>/<task-slug>/`.
4. Marketing ideas save locally under `marketing/ideas/`; full drafts are opt-in and follow the bundled spoken-voice writing standard.
5. Every net +1000 lines of code triggers the same-model thermonuclear sweep.
6. Docs heal themselves, and corrections become generalized recommendation rules.

## Skill runtime compatibility

The rules and templates work without skill discovery. Bundled `.agents/skills/` files use the Codex-compatible project layout, and `.claude/skills/` contains relative links for Claude Code. If another runtime does not discover them, follow the equivalent router entry in `AGENTS.md`.

## Deliberate exclusions

- Source-project routes, data models, prompts, pricing, UI, vendors, metrics, test accounts, and browser profile details.
- Historical implementation plans and examples whose value depends on old product decisions.
- Pre-filled `docs/systems/` docs. Invented architecture is worse than explicit placeholders.
- Most large third-party or domain skills. `build-a-brand` is the deliberate founder-core exception; its source, license, and local output override are recorded in `skills-manifest.json`.
- A `package.json`: this kit is language-neutral. Node projects should add `"prepare": "git config core.hooksPath .githooks || exit 0"`.

## Maintenance

Keep `AGENTS.md` canonical. Other entrypoints link to it instead of copying its contents. Add generalized lessons to `docs/plans/recommendation-selection-rules.md` only after the root reason is understood. This kit is a curated snapshot, not an automatic mirror: audit `skills-manifest.json`, compare upstream, preserve deliberate overrides, and port changes intentionally.
