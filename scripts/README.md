# Agent Tool Scripts
Inventory of repo automation scripts plus the conventions for building new agent tools; agents are expected to grow this folder whenever a task repeats.
Key tools: agent-review.sh (cross-model review routing: Claude work → codex gpt-5.6-terra medium; Codex work → claude Opus 4.8 high thinking), sweep-check.mjs (net +1000 line sweep trigger).
Hooks in .githooks/ (pre-commit eslint --fix + typecheck, post-commit sweep notice) are activated by the npm prepare script via git config core.hooksPath .githooks.
Other scripts: export-landing-sample.mjs (landing sample content + preview captures), guard-webpack-chunky.mjs (build guard), provision-free-production-qa.mjs (QA identity).
Conventions: every script self-documents with --help or a header comment, never prints secrets, exits non-zero on failure, and gets a row in the inventory table below.
Nothing in this folder auto-spends money; scripts that shell out to paid CLIs (agent-review.sh) run only when an agent or human invokes them explicitly.
---

## Inventory

| Script | Purpose | Invocation |
|---|---|---|
| `agent-review.sh` | Cross-model review: routes to the CLI/model that did not implement the work. Read-only reviewer. | `scripts/agent-review.sh [--range A..B] [--personas x,y] [--dry-run]` |
| `sweep-check.mjs` | Net added-lines-of-code counter since last sweep marker (`docs/reviews/.last-sweep-commit`); powers the commit-sweep trigger. | `node scripts/sweep-check.mjs [--notify\|--json]` |
| `export-landing-sample.mjs` | Exports sample document/mockup content from a real project into `public/landing/samples/`; can capture feature preview PNGs. | see script header |
| `guard-webpack-chunky.mjs` | Post-build guard against oversized webpack vendor chunks. | `npm run guard:chunky` |
| `provision-free-production-qa.mjs` | Provisions the confirmed Free production QA identity for no-charge checkout tests. | see script header |

Git hooks (versioned in `.githooks/`, activated by `npm install` through the `prepare` script):

| Hook | Behavior |
|---|---|
| `pre-commit` | `eslint --fix` on staged JS/TS (re-stages fixes), then `npm run typecheck`. Skips doc-only commits. Bypass: `git commit --no-verify`. |
| `post-commit` | Prints a loud notice when `sweep-check.mjs` reports net ≥ 1000 added lines since the last sweep. Never blocks, never spends. |

## Conventions for new scripts

1. **Build a tool when a task repeats.** If you compose the same multi-step incantation twice, turn it into a script here and add it to the inventory table in the same commit.
2. **Self-documenting**: `--help` for anything with flags; otherwise a header comment stating purpose, usage, and side effects.
3. **Safe by default**: read-only unless the name says otherwise; never print or log secrets (`.env*` values); exit non-zero on failure so hooks and agents can rely on exit codes.
4. **No hidden spend**: a script that calls a paid API or CLI must say so in its header and must never be wired into an automatic path (hooks, build) — explicit invocation only.
5. **Plain bash or Node (`.mjs`)** so both Codex and Claude Code can run and modify them; no per-agent tooling assumptions.
