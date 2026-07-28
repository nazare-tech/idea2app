# Review: Project Starter Kit v2

## Scope

`project-starter-kit/` (untracked, 18 files → 40 files). New: router `AGENTS.md`, index `PROJECT_CONTEXT.md` + `docs/systems/_TEMPLATE.md`, five `docs/operating-system/` docs (`doc-conventions`, `planning-workflow`, `review-personas`, `ui-verification`, `issue-tracker-format`), `docs/testing/` templates, `docs/reviews/README.md`, `scripts/` (4 tools + README), `.githooks/` (2 hooks), and five refreshed skills. Removed: `holistic-delivery` skill (superseded by `holistic-implementation`), v1's 40-line `security-review` (superseded by the repo's 495-line skill), commit-skill scaffold placeholders.

No file outside `project-starter-kit/` and `docs/plans/starter-kit-v2-{plan,review}.md` was changed. Nothing was committed.

## Verification

Throwaway git repo at `<scratchpad>/kit-test`, seeded from the kit, driven by `<scratchpad>/kit-verify.sh`. 33/33 checks pass, zero reviewer tokens spent (every reviewer path exercised via `--dry-run`, `SKIP_AGENT_REVIEW=1`, unknown-implementer, docs-only skip, or the secret gate).

| Risk from the plan | Evidence | Result |
|---|---|---|
| Broken shell/JS after the port | `bash -n` × 2, `sh -n` × 2, `node --check` × 2 | all exit 0 |
| Classifier no longer fits a generic tree | `--reviewable-stdin` with code paths, docs-only paths, `AGENTS.md`, bad usage | exits 0 / 3 / 0 / 2 |
| Sweep trigger broken after path generalization | seeded marker; `--json` counts `net:1` after one code line; `SWEEP_THRESHOLD=1` flips `due:true` and prints the notice; unseeded/bad marker handled | pass, incl. exit 2 on a marker SHA not in the repo |
| Runner mis-handles skip/unknown paths | `post-commit-review.sh` with no implementer (exit 1, `unknown_implementer`), docs-only commit (exit 0, `no_reviewable_paths`), `SKIP_AGENT_REVIEW=1` (exit 0, `explicit_skip`) | pass; ledger JSON written mode 600 |
| Reviewer command drifted | `--dry-run` for both implementers; `CODEX_REVIEW_MODEL=my-model` override; `--help` | correct opposite-CLI routing, override honored |
| Secret leaves the repo via the reviewer | commit containing an `sk-ant-`-shaped literal, then `agent-review.sh --range HEAD~1..HEAD` | exit 4, refused before any CLI launch |
| Hooks break a non-JS consumer | hooks active with `LINT_CMD`/`TYPECHECK_CMD` empty | commit succeeds, prints the "not configured" notice |
| Hooks still enforce when configured | configured commands: normal commit passes; partially staged code file refused; failing fixer fails the commit | pass |
| Product specifics leak into the kit | grep for product/vendor/credential terms across the kit | no hits (only `exact`/`example` substring false positives) |
| Router promises a file that does not exist | every router row and cross-reference resolved against the tree | 16/16 targets present |

## Real-Flow Evidence

Not applicable: no UI, no runtime surface. The kit's "real flow" is a fresh repo consuming it, which is exactly what the scratch-repo run above exercises.

## Fresh-Eyes Self Review

### Pass 1

Read every new and modified kit file against the tree.

- `docs/operating-system/README.md` claimed every doc in the folder carries the 7-line header; four v1 templates do not. Fixed both ways: `doc-conventions.md` now exempts `*-template.md`, and the README says "every non-template doc".
- `transcript-sanitization-protocol.md` is a protocol, not a template, and was missing its header. Added one; then corrected line 6, which overstated retention ("deleted afterward") versus the body's actual rule (ignored private path, agreed retention policy).
- `security-review/cloud-infrastructure-security.md` shipped unreferenced from its own `SKILL.md`. Added a Resources pointer so infrastructure work finds it.

### Pass 2

Re-read the ported scripts and hooks for repo-only assumptions.

- `agent-review.sh --help` printed `sed -n '2,15p'`, stale after the header grew by five lines; now `2,20p`. Verified by running `--help`.
- Undocumented runtime prerequisites: the runner needs `perl` (session-leader isolation) and `bash` (arrays), not just `node`/`git`. Added to `scripts/README.md` setup.
- Commit skill carried scaffold junk (`assets/example_asset.txt`, `scripts/example.py`, a compatibility wrapper for a script that sits beside it). Removed; `git_ship_preflight.py` and `references/api_reference.md` kept and still referenced by the skill.
- Re-ran the full verification after all fixes: 33/33 still pass.

## Code Review Findings

- MINOR, `scripts/code-path-classification.mjs`: generalizing the prefixes (`src/ lib/ app/ scripts/ migrations/ tests/ e2e/`) makes the classifier lenient by default. A consumer with an unusual tree who forgets to edit it gets *fewer* reviewed commits with no warning. Mitigated by naming it the single edit point in three places (script header, `scripts/README.md`, kit README) rather than adding a runtime check that would misfire on legitimate layouts. Status: accepted as designed.
- MINOR, `.githooks/pre-commit`: `$LINT_CMD` is intentionally word-split so a command with flags works. A path with spaces in the *command* string would break; file arguments are still `xargs -0`-safe. Documented by example in the config block. Status: accepted.
- MINOR, kit `README.md`: setup is now 7 steps plus an automation section. Longer than v1's 6 steps, which is the honest cost of shipping machinery. Mitigated by making every automation step optional and inert until activated. Status: accepted.
- Not a finding, recorded: `agent-review.sh` ships this machine's working model IDs as defaults rather than `{{PLACEHOLDER}}`s. A wrong ID surfaces as a `reviewer_error` (an unreviewed commit, loudly reported), never as a false pass, and a working default beats a placeholder that must be filled before the first `--dry-run`.

## Architecture Improvement Review

- **Selected and landed**: single-source code-path definition shared by review and sweep (`code-path-classification.mjs` config blocks, consumed by `post-commit-review.sh` and `sweep-check.mjs`); config block in `pre-commit` instead of hardcoded npm/eslint; config block in `agent-review.sh` for reviewer models, effort, thinking tokens, and system-docs directory.
- **Rejected, still correct**: a kit self-audit script for unfilled placeholders. `grep -rn "{{" .` is in the README and does the same job with no maintenance.
- **Deferred, still correct**: automatic upstream sync from this repo into the kit. Still one consumer; the README states the kit is a curated snapshot requiring deliberate porting. Revisit at a second consumer.
- **New risks introduced**: none found. No duplication added (scripts are copies with a config surface, not forks with divergent logic); no non-idempotent path (all kit tooling is read-only except the ledger under `.git/`); no authorization surface; the recovery path is `git config --unset core.hooksPath`, documented in two places.

## Security Review Findings

- No credentials, tokens, cookies, or credential-shaped values in any kit file. Verified by grep and by the review scripts' own secret gate firing correctly in the scratch repo.
- The secret-refusal regex, the tracked-files-only depth-two snapshot, the `umask 077` ledger, the 1.5 MB input cap, the 1 MB output cap, and the tool-disabled reviewer launch all survived the port verbatim and were exercised (secret gate, ledger mode 600) rather than assumed.
- `.gitignore.template` now also excludes `local-artifacts/` and `tmp/`, keeps `.env*` excluded with `.env.example` allowed, and documents that review artifacts live under `.git/` (never tracked) while the sweep marker is tracked deliberately.
- The kit ships automatic paid spend. Disclosed in the script header, `scripts/README.md`, the kit `README.md` ("**This spends money.**"), and `AGENTS.md`, each with the escape hatches next to it.
- No secrets are printed by any kit script; the review runner prints SHAs, statuses, and failure classes only.

## Remediation Checklist

- [x] Exempt `*-template.md` from the 7-line header rule; correct the operating-system README claim.
- [x] Add the 7-line header to `transcript-sanitization-protocol.md` and align line 6 with the body's retention wording.
- [x] Reference `cloud-infrastructure-security.md` from the security-review skill.
- [x] Fix the stale `--help` line range in `agent-review.sh`.
- [x] Document `perl`/`bash`/`node`/`git` and reviewer-CLI prerequisites.
- [x] Remove commit-skill scaffold placeholder files.
- [x] Re-run the full scratch-repo verification after remediation (33/33).

## Remaining Risks

- The kit remains a curated snapshot with no automatic sync. It will drift again as this repo's processes evolve; the README says so, and this review is the record of what "current" meant on 2026-07-25.
- Reviewer model IDs and CLI flags are install-specific and will age. `--dry-run` is the cheap check before trusting the automation, and a bad ID fails loudly as unreviewed.
- The kit is untracked by user decision, so it has no history and is not backed up by this repo. A v1 copy sits in the session scratchpad only, which is not durable storage.
