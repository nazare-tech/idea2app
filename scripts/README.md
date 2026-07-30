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
| `post-commit-review.sh` | Reviews one immutable commit from a temporary depth-two tracked-files-only fetch, saves private capped `.git/agent-reviews/<sha>.{json,txt,stderr}`, reuses amend-equivalent reviewed patches, and classifies outages/timeouts. | `scripts/post-commit-review.sh [commit-sha]` (normally automatic; timeout 1200s, input 1.5 MB, output 1 MB) |
| `code-path-classification.mjs` | Shared source for post-commit reviewability and sweep code pathspecs. | `node scripts/code-path-classification.mjs --reviewable-stdin` |
| `sweep-check.mjs` | Net added-lines-of-code counter since last sweep marker (`docs/reviews/.last-sweep-commit`); powers the commit-sweep trigger. | `node scripts/sweep-check.mjs [--notify\|--json]` |
| `export-landing-sample.mjs` | Exports sample document/mockup content from a real project into `public/landing/samples/`; can capture feature preview PNGs. | see script header |
| `guard-webpack-chunky.mjs` | Post-build guard against oversized webpack vendor chunks. | `npm run guard:chunky` |
| `provision-free-production-qa.mjs` | Provisions the confirmed Free production QA identity for no-charge checkout tests. | see script header |
| `build-mobile-screen-gallery.mjs` | Splits Maker Compass two-phone mobile storyboards into standalone screen crops and builds a static gallery; requires local ImageMagick. | `node scripts/build-mobile-screen-gallery.mjs --root <batch-root> [--crop-map <json>] [--out <html>]` |
| `normalize-hero-reel-cutouts.mjs` | Removes edge-connected chroma from the ten image-edited hero phones and normalizes them to transparent 8-bit 576×1008 canvases with equal 880px device height; validates all outputs before safe publication and requires local ImageMagick. | `node scripts/normalize-hero-reel-cutouts.mjs --input-dir <dir> --output-dir <dir>` |
| `recolor-mockup-skeletons.mjs` | Replaces the saturated indigo placeholder fill in the mockup storyboard skeletons with a neutral grey by walking raw pixels through sharp, un-blending anti-aliased edges so borders keep no colour fringe. Removes the hue anchor that biased every generated mockup toward blue. | `node scripts/recolor-mockup-skeletons.mjs [--grey r,g,b] [--suffix -grey]` |
| `build-brand-variety-briefs.mts` | Prepares the brand-variety validation batch: assigns each case study its deterministic kit triad and writes per-idea generation briefs using the runtime kit prompt block. | `npx tsx scripts/build-brand-variety-briefs.mts [--runs <dir>] [--out <dir>]` |
| `run-brand-variety-batch.sh` | Drives the validation batch through Codex image generation, three ideas at a time, skipping completed ideas on re-run. | `scripts/run-brand-variety-batch.sh [batch-root] [max-parallel]` |
| `build-brand-variety-sheet.mjs` | Builds the self-contained review contact sheet (embedded thumbnails, kit captions) from a completed batch. | `node scripts/build-brand-variety-sheet.mjs [--root <dir>]` |
| `add-mobile-home-indicator.mjs` | Bakes an iOS home indicator into the grey native-mobile skeleton at detected frame geometry, so generated mockups respect the bottom safe area. Idempotent. | `node scripts/add-mobile-home-indicator.mjs [--file <png>]` |
| `build-mockup-brand-bank.mjs` | Author-time generator for the mockup brand-direction bank: fifteen OKLCH-authored kits with gamut clamping, tinted neutrals, WCAG AA checks, and deterministic per-project triads. Emits `docs/plans/mockup-brand-bank.json` plus an HTML contact sheet for review. | `node scripts/build-mockup-brand-bank.mjs` |

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
5. **Plain bash or Node (`.mjs`)** so both Codex and Claude Code can run and modify them; no per-agent tooling assumptions. Exception: a script that must import runtime TypeScript from `src/` (to exercise the exact production code path rather than a copy) uses a `.mts` extension and a `npx tsx` invocation, declared in its inventory row.
