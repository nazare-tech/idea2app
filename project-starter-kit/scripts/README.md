# Agent Tool Scripts
Inventory of repo automation scripts plus the conventions for building new agent tools; agents are expected to grow this folder whenever a task repeats.
Key tools: agent-review.sh runs blocking opposite-CLI plan evaluation and on-demand diff review; post-commit-review.sh remains an opt-in immutable-commit reviewer; sweep-check.mjs detects the net +1000 thermonuclear trigger.
Hooks in .githooks/ (pre-commit configured lint + typecheck; post-commit sweep notice only) activate only after `git config core.hooksPath .githooks`.
code-path-classification.mjs is the single definition of "code" for this repo: both the review runner and the sweep counter read it, so review and sweep scope cannot drift.
Conventions: every script self-documents with --help or a header comment, never prints secrets, exits non-zero on failure, and gets a row in the inventory table below.
No hook spends reviewer tokens. Substantial plans use one blocking opposite-CLI evaluation before implementation; diff reviews are deliberate and on demand.
---

## Setup

Runtime prerequisites for the automation: `git`, `node` (the two `.mjs` tools and the review runner's JSON/watchdog helpers), `bash` (the review scripts use arrays), `perl` (session-leader isolation in `post-commit-review.sh`), and both reviewer CLIs. All but the CLIs ship with macOS and most Linux distributions.

```bash
git config core.hooksPath .githooks     # activate the hooks in this clone
```

For Node projects, make that automatic: add `"prepare": "git config core.hooksPath .githooks || exit 0"` to `package.json` so `npm install` wires it up.

Before cross-model review can work:

1. Install both reviewer CLIs (`codex` and `claude`) and sign in to each.
2. Set `CODEX_REVIEW_MODEL` / `CLAUDE_REVIEW_MODEL` in `scripts/agent-review.sh` to model IDs those installs accept.
3. Confirm with `scripts/agent-review.sh --implementer claude --plan docs/plans/plan-template.md --dry-run` (prints the command, spends nothing).
4. Edit the three config blocks in `scripts/code-path-classification.mjs` to match this project's tree.
5. Fill `LINT_CMD` / `TYPECHECK_CMD` in `.githooks/pre-commit`.
6. Seed `docs/reviews/.last-sweep-commit` with the current commit SHA to enable sweep tracking.

`git commit --no-verify` skips pre-commit checks, and `git config --unset core.hooksPath` disables both hooks. Neither is a substitute for fixing a failed check.

## Inventory

| Script | Purpose | Invocation |
|---|---|---|
| `agent-review.sh` | Routes a plan or bounded diff to the opposite CLI with model tools disabled. Costs reviewer tokens except in dry-run mode. | `scripts/agent-review.sh [--plan FILE | --range A..B] [--review-root DIR] [--personas x,y] [--dry-run]` |
| `post-commit-review.sh` | Opt-in review of one immutable commit from a temporary tracked-files-only fetch, with private capped local evidence. | `scripts/post-commit-review.sh [commit-sha]` (deliberate only; timeout 1200s, input 1.5 MB, output 1 MB) |
| `code-path-classification.mjs` | Shared source for post-commit reviewability and sweep code pathspecs. Edit its config blocks per project. | `node scripts/code-path-classification.mjs --reviewable-stdin` |
| `sweep-check.mjs` | Net added-lines-of-code counter since the last sweep marker (`docs/reviews/.last-sweep-commit`); powers the commit-sweep trigger. Never calls a paid API. | `node scripts/sweep-check.mjs [--notify\|--json]` |

Git hooks (versioned in `.githooks/`):

| Hook | Behavior |
|---|---|
| `pre-commit` | Runs the configured fixer on staged code files (re-staging fixes; refuses partially staged files), then the configured typecheck. No-op when neither is configured. Bypass: `git commit --no-verify`. |
| `post-commit` | Prints the net +1000 sweep notice. Never calls a reviewer or paid API. |

## Conventions for new scripts

1. **Build a tool when a task repeats.** If you compose the same multi-step incantation twice, turn it into a script here and add it to the inventory table in the same commit.
2. **Self-documenting**: `--help` for anything with flags; otherwise a header comment stating purpose, usage, and side effects.
3. **Safe by default**: read-only unless the name says otherwise; never print or log secrets (`.env*` values); exit non-zero on failure so hooks and agents can rely on exit codes.
4. **Declare spend**: a script that calls a paid API or CLI must say so in its header. No automatic paid path is authorized by this kit; new automatic spend requires explicit user approval.
5. **Plain shell or Node (`.mjs`)** so every agent runtime can run and modify them; no per-agent tooling assumptions.
