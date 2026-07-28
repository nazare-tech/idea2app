---
implemented: true
implemented_at: 2026-07-25T00:00:00Z
implementation_summary: Starter kit rebuilt to v2 (18 → 40 files): router AGENTS.md, PROJECT_CONTEXT index plus docs/systems/_TEMPLATE.md, five new operating-system docs, testing/reviews templates, portable scripts/ and .githooks/ automation, and five refreshed skills; verified by a 33-check scratch-repo run with zero reviewer spend.
---

# Plan: Project Starter Kit v2

## Goal

Bring `project-starter-kit/` up to the processes Maker Compass actually runs today. The kit was snapshotted 2026-07-11 and predates the router `AGENTS.md`, the `docs/systems/` split with 7-line greppable headers, the automatic per-commit cross-model persona review, the net +1000 thermonuclear sweep, the UI verification/evidence discipline, and the scripts-as-tools convention. A new project seeded from the current kit would inherit the rules but none of the machinery that makes those rules stick.

## Assumptions

- The kit stays untracked inside this repo (user decision, 2026-07-25). No new git repo, no commit of `project-starter-kit/`.
- Full port scope (user decision): docs, rules, portable scripts, git hooks, and refreshed skills.
- Portability bar unchanged from v1: no Maker Compass routes, prompts, vendors, pricing, credentials, or product architecture. Placeholders beat invented architecture.
- The two reviewer CLIs (`codex`, `claude`) are a documented prerequisite of the review automation, not something the kit can install.
- Kit consumers may not use npm; hooks must degrade cleanly when lint/typecheck commands are not configured.

## Clarifying Questions

1. How should `docs/systems/` be seeded in the kit?
   - Recommendation A: ship one `_TEMPLATE.md` with the canonical 7-line header shape plus a recommended-doc table in `PROJECT_CONTEXT.md`.
   - Trade-off: smallest file count, zero invented architecture; consumer writes each doc from the template.
   - Recommendation B: ship 8-10 pre-named skeleton docs (architecture, tech-stack, ...) full of placeholders.
   - Trade-off: more visible structure, but ten placeholder files invite half-filled docs and contradict "invented architecture is worse than placeholders".
   - Selected: Recommendation A.
2. How portable should the git hooks be?
   - Recommendation A: keep POSIX `sh`, hoist lint/typecheck commands into an editable config block, and no-op with a notice when unset.
   - Trade-off: works on day one in a repo with no toolchain; consumer must remember to fill the commands in.
   - Recommendation B: keep the npm/eslint incantations hardcoded as in this repo.
   - Trade-off: zero-edit for JS repos, immediately broken for every other stack.
   - Selected: Recommendation A.
3. Which security-review skill ships?
   - Recommendation A: copy this repo's current 495-line skill, noting that code examples are Next.js/Supabase-flavored and should be adapted.
   - Trade-off: one maintained source of truth, real depth; some examples need translation for other stacks.
   - Recommendation B: keep v1's 40-line neutral checklist.
   - Trade-off: perfectly neutral, but materially weaker than what the repo actually uses.
   - Selected: Recommendation A.
4. Should the kit ship a `package.json` to wire `core.hooksPath`?
   - Recommendation A: no package.json; README and `scripts/README.md` document the one-line `git config core.hooksPath .githooks` plus the optional npm `prepare` script.
   - Trade-off: language-neutral; consumer runs one command.
   - Recommendation B: ship a JS-shaped package.json template.
   - Trade-off: convenient for Node projects, dead weight or confusing for others.
   - Selected: Recommendation A.

## Recommended First Step

Rewrite `AGENTS.md` as the router and `PROJECT_CONTEXT.md` as an index, since every other kit doc is addressed by that router; the remaining files fill the rows it declares.

## Runtime and Change-Impact Analysis

### Repeated Work

- The ported automation is the repeated work: `pre-commit` (per commit, lint + typecheck on staged code), `post-commit` (per commit, one paid opposite-CLI review of `<sha>^..<sha>` plus a sweep-marker check), `sweep-check.mjs` (per commit, pure git reads).
- Expected frequency: once per commit. Worst case: a commit storm during remediation, one bounded review each; review cost per commit is capped by a 1.5 MB input limit, 1 MB output cap, and a 1200s watchdog.
- Work per update: `pre-commit` runs the configured lint/typecheck commands; `post-commit-review.sh` performs a depth-two local fetch into a temp dir, builds a bounded diff/context bundle, and spends reviewer-CLI tokens.

### Ownership, Scope, And Lifetime

- New state in a consumer repo: `.git/agent-reviews/<sha>.{json,txt,stderr}` (untracked, mode 600, per-commit, never cleaned by the kit) and `docs/reviews/.last-sweep-commit` (tracked, single SHA line).
- Narrowest owner: the ledger lives under `.git/`, so it is per-clone and never pushed; the sweep marker is repo-wide because the sweep is a repo-wide audit.
- Lifecycle: ledger entries are written at commit time and read at wrap-up; the marker advances only after a sweep's remediation commits land.
- Fan-out: hooks activate only after the consumer runs `git config core.hooksPath .githooks`, so an unconfigured clone behaves exactly like a normal repo.

### Boundary And Cache Semantics

- Contract boundaries copied from this repo: the reviewer output contract (`<SEVERITY> <persona> <file:line> — problem. scenario. Fix: …` or `NO FINDINGS`), the ledger JSON shape (`commit/implementer/reviewer/status/timestamp` plus optional `failureClass/reason/patchId/parent/tree/duplicateOf`), and the classifier exit codes (0 reviewable, 3 no-match, other = failure).
- The review-reuse cache keys on patch ID + parent + tree + reviewer + artifact coherence; any ambiguity fails open to a fresh review. Classifier failure fails closed to "unreviewed".
- Compatibility: kit scripts must run under bare `sh`/`bash` and Node without repo-specific dependencies; the classifier's path config is the single edit point per consumer.

### Failure And Recovery

- Reviewer quota/network/auth/timeout failures record `failed` with a failure class and exit non-zero; the commit still exists and must be disclosed as unreviewed. Never silently substituted.
- Missing/incoherent sweep marker prints a loud message and exits without blocking commits.
- Blast radius of a kit defect: a consumer repo's commits stop being reviewed, or hooks reject commits. Recovery is `git config --unset core.hooksPath` plus `git commit --no-verify`, documented in the kit README.
- Rollback: the kit is untracked and self-contained; reverting means restoring the previous `project-starter-kit/` contents (a backup copy is taken before rewriting).

### Risk-Matched Verification

| Risk | Observable evidence or test | Acceptance threshold |
|---|---|---|
| Ported scripts are broken shell/JS | `sh -n` / `bash -n` on every `.sh`, `node --check` on every `.mjs` | all exit 0 |
| Classifier no longer matches a generic project layout | run `--reviewable-stdin` with code paths and with docs-only paths in a scratch repo | exit 0 for code, exit 3 for docs-only |
| Sweep trigger broken after path generalization | seed marker in scratch repo, add code lines, `sweep-check.mjs --json` | reports `net` > 0 and `due` flips at threshold |
| Review runner mis-handles skip/unknown paths | run `post-commit-review.sh` in scratch repo with no implementer, with `SKIP_AGENT_REVIEW=1`, and on a docs-only commit | statuses `unknown_implementer` (exit 1), `explicit_skip` (exit 0), `no_reviewable_paths` (exit 0); no paid call |
| Reviewer command drifted during the port | `agent-review.sh --implementer claude --dry-run` and `--implementer codex --dry-run` | prints the expected CLI incantation, spends nothing |
| Hooks break a non-JS consumer | scratch repo with hooks active and no lint/typecheck configured: commit a code file | commit succeeds with a notice |
| Maker Compass specifics leak into the kit | grep the kit for product/vendor/credential terms | no hits outside the optional stack overlay |

## Architecture Improvement Opportunities

- Single edit point for code paths: keep `code-path-classification.mjs` as the one place a consumer declares what "code" means, consumed by both the review runner and the sweep counter. Benefit: no drift between review scope and sweep scope. Trade-off: none material. Boundary: `scripts/code-path-classification.mjs`. **Selected.**
- Config block in the hooks instead of hardcoded npm commands: benefit is stack neutrality; trade-off is one manual edit per consumer. Boundary: `.githooks/pre-commit`. **Selected.**
- Kit self-audit script (`scripts/kit-audit.sh`) that greps a seeded project for unfilled `{{PLACEHOLDER}}` tokens: benefit is catching half-configured kits; trade-off is another script to maintain, and `grep -r "{{" .` already does it. **Rejected as over-engineering.**
- Automatic upstream sync from this repo into the kit: benefit is no future staleness; trade-off is a real tool with real failure modes for a one-consumer problem. **Deferred** (same call as v1; revisit when a second project consumes the kit).
- Ship `docs/systems/` skeletons for all ten areas: **Rejected** (see clarifying question 1).

## Plan

1. Back up the current kit to the scratchpad, then rewrite `AGENTS.md` as a router table and `PROJECT_CONTEXT.md` as an index with a `docs/systems/_TEMPLATE.md`; update `CLAUDE.md`.
2. Add `docs/operating-system/`: `doc-conventions.md`, `planning-workflow.md`, `review-personas.md`, `ui-verification.md`, `issue-tracker-format.md`; refresh `README.md`. Keep transcript protocol, research/meeting templates, analytics template.
3. Port automation: `scripts/{agent-review.sh,post-commit-review.sh,code-path-classification.mjs,sweep-check.mjs}`, `.githooks/{pre-commit,post-commit}`, `scripts/README.md`, `docs/reviews/README.md` with the marker instructions.
4. Refresh skills: replace `holistic-delivery` with `holistic-implementation`, add `commit`, `commit-sweep`, `thermo-nuclear-code-quality-review`, upgrade `security-review`.
5. Add `docs/testing/{test-inventory.md,e2e-guide.md}` templates; refresh `docs/plans/README.md` for the review/sweep loop.
6. Rewrite the kit `README.md` (setup order, hook activation, reviewer CLI prerequisites, exclusions, maintenance) and extend `.gitignore.template`.
7. Verify in a throwaway git repo under the scratchpad per the risk table; fix findings.
8. Write `docs/plans/starter-kit-v2-review.md`, remediate, then set this plan's metadata.

## Milestones

- Structure milestone: router + index + system template in place, kit self-consistent.
- Automation milestone: scripts and hooks run green in a scratch repo with zero paid calls.
- Documentation milestone: README and operating-system docs describe exactly what ships.

## Validation

- Scratch-repo end-to-end run of the risk table above.
- Cross-check every row of the kit router against a file that exists in the kit.
- Portability grep for Maker Compass terms.

## Risks And Mitigations

- Ported scripts silently assume this repo's layout: mitigated by running them in a scratch repo, not this one.
- Kit rewrite loses useful v1 wording: mitigated by a scratchpad backup and by keeping v1 files that are still current (selection rules, transcript protocol, plan/review templates).
- Consumer accidentally spends reviewer tokens before understanding the flow: mitigated by README prerequisites, `--dry-run`, and `SKIP_AGENT_REVIEW=1` documentation.

## Rollback Or Recovery

Restore `project-starter-kit/` from the scratchpad backup. The kit is untracked, so no repo history is affected; no runtime, database, or production surface is touched by this work.

## Open Decisions

- None.

## Critique

### Software Architect

The valuable, hard-to-reinvent part of this repo's process is the review/sweep machinery, not the prose. Porting the prose without the machinery is what made v1 go stale in two weeks. The one real coupling risk is `code-path-classification.mjs`: it is the shared definition of "code" for two consumers, and a consumer who edits it carelessly silently narrows both review and sweep scope. Documenting it as the single edit point is worth more than any additional abstraction.

### Product Manager

The kit's user is one person starting a new project under time pressure. Setup cost is the product. Nine steps of README is already near the limit; the automation must be opt-in in one command (`git config core.hooksPath .githooks`) and must not block a first commit when nothing is configured yet.

### Customer Or End User

Someone seeding a non-JS project will hit the hooks first. If `pre-commit` fails because `npm` does not exist, they will delete the hooks and lose the review loop with them. Degrading to a notice is the difference between the kit being adopted and being stripped.

### Engineering Implementer

Most of this is copy-then-generalize, and the temptation is to rewrite scripts while porting. The scripts here carry hard-won fixes (partial-staged refusal, group SIGKILL, patch-ID reuse fail-open, output caps). Copy them intact; change only the path/command configuration surface, or the kit inherits bugs this repo already fixed.

### Risk, Security, Or Operations

The kit ships a script that spends money automatically on every commit. That must be stated in the README, in `scripts/README.md`, and in the script header, with the escape hatches (`SKIP_AGENT_REVIEW=1`, `--dry-run`, unsetting `core.hooksPath`) next to it. The secret-shaped-input refusal and the tracked-files-only snapshot must survive the port verbatim; they are what keeps a consumer's `.env` out of an external reviewer CLI.
