# Agent Tool Scripts
Inventory of repo automation scripts plus the conventions for building new agent tools; agents are expected to grow this folder whenever a task repeats.
Key tools: agent-review.sh routes opposite-CLI persona review; post-commit-review.sh records per-code-commit status; sweep-check.mjs detects the net +1000 thermonuclear trigger.
Hooks in .githooks/ (pre-commit eslint --fix + typecheck; post-commit paid cross-model review + sweep notice) are activated by npm prepare via core.hooksPath.
Other scripts: export-landing-sample.mjs (landing sample content + preview captures), guard-webpack-chunky.mjs (build guard), provision-free-production-qa.mjs (QA identity).
Conventions: every script self-documents with --help or a header comment, never prints secrets, exits non-zero on failure, and gets a row in the inventory table below.
Automatic post-commit review intentionally spends opposite-CLI reviewer tokens for code commits; docs-only commits skip it, and failures are stored locally and reported.
---

## Inventory

| Script | Purpose | Invocation |
|---|---|---|
| `agent-review.sh` | Routes a bounded diff and embedded persona contract to the opposite CLI with model tools disabled. | `scripts/agent-review.sh [--range A..B] [--review-root DIR] [--personas x,y] [--dry-run]` |
| `post-commit-review.sh` | Reviews one immutable commit from a temporary depth-two tracked-files-only fetch, saves private capped `.git/agent-reviews/<sha>.{json,txt,stderr}`, and classifies outages/timeouts. | `scripts/post-commit-review.sh [commit-sha]` (normally automatic; timeout 1200s, input 1.5 MB, output 1 MB) |
| `sweep-check.mjs` | Net added-lines-of-code counter since last sweep marker (`docs/reviews/.last-sweep-commit`); powers the commit-sweep trigger. | `node scripts/sweep-check.mjs [--notify\|--json]` |
| `export-landing-sample.mjs` | Exports sample document/mockup content from a real project into `public/landing/samples/`; can capture feature preview PNGs. | see script header |
| `guard-webpack-chunky.mjs` | Post-build guard against oversized webpack vendor chunks. | `npm run guard:chunky` |
| `provision-free-production-qa.mjs` | Provisions the confirmed Free production QA identity for no-charge checkout tests. | see script header |

Git hooks (versioned in `.githooks/`, activated by `npm install` through the `prepare` script):

| Hook | Behavior |
|---|---|
| `pre-commit` | `eslint --fix` on staged JS/TS (re-stages fixes), then `npm run typecheck`. Skips doc-only commits. Bypass: `git commit --no-verify`. |
| `post-commit` | Synchronously reviews code commits with the opposite CLI, records status locally, then prints the net ≥1000 sweep notice. Docs-only commits skip paid review. |

## Conventions for new scripts

1. **Build a tool when a task repeats.** If you compose the same multi-step incantation twice, turn it into a script here and add it to the inventory table in the same commit.
2. **Self-documenting**: `--help` for anything with flags; otherwise a header comment stating purpose, usage, and side effects.
3. **Safe by default**: read-only unless the name says otherwise; never print or log secrets (`.env*` values); exit non-zero on failure so hooks and agents can rely on exit codes.
4. **Declare spend**: a script that calls a paid API or CLI must say so in its header. `post-commit-review.sh` is the sole project-authorized automatic paid path; new automatic spend still requires explicit user approval.
5. **Plain bash or Node (`.mjs`)** so both Codex and Claude Code can run and modify them; no per-agent tooling assumptions.
