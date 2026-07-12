# Review: Per-Commit Cross-Model Review and Thermonuclear Sweep

## Scope

- Automatic opposite-CLI persona review for every code/workflow commit.
- Exact-SHA local review ledger and failure classification.
- Same-session thermonuclear commit sweep after net +1,000 code lines.
- Commit/commit-sweep/thermonuclear skill portability across Codex and Claude.
- Hook, workflow, operating-system, scripts, and test documentation.

## Verification

- Focused red-green suite: `node --import tsx --test src/lib/post-commit-review.test.ts` -> 16 pass, 0 fail.
- Full unit suite: `npm test` -> 630 pass, 0 fail after all final hardening cases.
- TypeScript: `npm run typecheck` passed after final test typing changes.
- Task ESLint: `npx eslint src/lib/post-commit-review.test.ts` passed.
- Shell syntax: `bash -n scripts/agent-review.sh scripts/post-commit-review.sh .githooks/post-commit` passed.
- Diff hygiene: `git diff --check` passed.
- Routing dry runs passed for Codex-to-Claude and Claude-to-Codex with tools disabled and bounded prompt sizes.
- Full `npm run lint` remains blocked by the pre-existing `react-hooks/set-state-in-effect` error at `src/components/layout/workspace-document-frame.tsx:52`; unrelated evidence files also produce two warnings. No task file lint errors remain.
- Cross-model wrap-up review was attempted from a disposable worktree containing only this task. The sandbox denied the external Claude transfer even after the user authorized cross-model CLI reviews. Per user policy, this is recorded as unavailable rather than substituted or called a pass. Multiple independent internal code/security reviewers completed iterative reviews instead.
- UI evidence is not meaningful: this changes developer/agent Git workflow only, not product UI or user-visible backend behavior.

## Fresh-Eyes Self Review

### Pass 1

- Found workflow-only commits were excluded from the original path filter; added `.agents/skills/`, `.claude/skills/`, workflow docs, and root agent/build configs.
- Found noisy reviewer output containing one `NO FINDINGS` line could pass; changed acceptance to exact whole-output equality.
- Found local artifact permissions were too broad; added `umask 077` and atomic JSON status replacement.
- Corrected reviewer-outage behavior to match user instruction: continue batch/sweep/push, but disclose every unreviewed SHA.

### Pass 2

- Reframed reviewer security boundary: exact SHA/parent depth-two fetch, no stored remote, Git-blob-only context, symlink rejection, bounded full changed files plus system docs, whole-bundle secret scan, empty non-repo CLI startup, no model tools, Claude safe mode, and ephemeral auth-only Codex home.
- Added 1,200-second watchdog with process-group TERM/KILL, external INT/TERM cleanup, resistant-child tests, root-commit support, old-SHA retry, early interrupted status, and output caps.
- Fixed watchdog child/orphan and escalation races exposed by tests.
- Re-ran focused tests, typecheck, task lint, shell syntax, and diff hygiene after remediation.

## Code Review Findings

- Fixed, major: mutable `review-personas.md` was initially trusted reviewer instruction. Persona contract now lives in `agent-review.sh`; every repo file is untrusted material.
- Fixed, major: failed per-commit review status could ambiguously suppress the thermonuclear sweep. Recorded failures/skips remain sweep-eligible while never becoming passes.
- Fixed, major: diff-only context could not support maintainability/doc lenses. Bundle now includes regular Git blobs for full changed text files and all system docs within the input cap.
- Fixed, major: watchdog originally killed only its wrapper PID and could cancel delayed SIGKILL early. Reviewer runs in a dedicated process group; timeout and interruption terminate descendants; resistant-child tests cover TERM/HUP behavior.
- Fixed, minor: root commit used an invalid parent range; empty-tree object/range is now supported and tested.
- Fixed, minor: depth-two HEAD clone could not retry an older failed SHA; runner fetches the requested SHA and parent explicitly.
- Fixed, minor: hook comment contradicted the chosen non-blocking outage policy.
- No unresolved blocker/major findings after final internal re-review.

## Architecture Improvement Review

- Selected durable local ledger landed: `.git/agent-reviews/<sha>.{json,txt,stderr}` records exact pass/findings/failure/skip state without dirtying the worktree.
- Selected strict implementer routing landed: known Codex/Claude environments route oppositely; unknown runtimes skip loudly instead of guessing.
- Selected same-session thermonuclear sweep landed: commit workflow runs it automatically after chunk/review remediation and before push; commit-sweep no longer duplicates the cross-model range review.
- Selected portability landed: repo-local thermonuclear skill plus Claude symlink.
- Deferred pre-push enforcement remains valid: local ledgers do not travel across clones/cherry-picks, and user selected disclosure rather than blocking when reviewer quota is unavailable.
- Rejected nested hook-driven same-model sweep remains correct: a shell hook cannot reuse the active agent session or know the end of a chunk batch.

## Security Review Findings

- Fixed, blocker: live-repo reviewer tools could read ignored secrets/unrelated dirty files. Model tools are now disabled; outbound content is locally assembled from a bounded exact-SHA Git bundle.
- Fixed, blocker: tracked symlinks could dereference host secrets during context assembly. Context comes from regular Git blobs only; mode `120000` and non-blob entries are skipped. Absolute escaping-symlink test proves host content never enters prompt.
- Fixed, major: full context could bypass diff-only secret scanning. Secret scan now runs over the entire outbound bundle and fails closed without printing the value.
- Fixed, major: repo/global `CLAUDE.md` or `AGENTS.md` could influence reviewer startup. Both CLIs launch from an empty non-repo directory; Claude uses safe mode/empty setting sources/strict MCP/no tools; Codex uses an ephemeral auth-only home, ignores config/rules, and disables shell/browser/apps/computer/multi-agent.
- Fixed, major: automatic CLI calls had no cost/hang boundary. Input is capped at 1.5 MB, output artifacts at 1 MB, wall time at 1,200 seconds, and reviewer process groups receive TERM then KILL.
- Accepted minor: capped private review artifacts remain in `.git/agent-reviews/` until manually removed. Automatic retention deletion was not added because project rules require consent before deleting existing files.
- Accepted minor: a very small signal race exists between spawning the session leader and `setsid`; durable interrupted status and process-group tests cover normal failure paths.

## Per-Commit Review Round 1 (post-landing, 2026-07-12)

First live run of the hook over the landing batch (6 commits). Codex reviewed 5; the Pika skill-pack commit failed review with `input_too_large` and is disclosed as unreviewed.

Accepted and fixed:

- Major, security (`53611ac`): secret gate missed OpenRouter `sk-or-v1-...` keys. Added `sk-or(-v[0-9]+)?-` to the token prefix alternation plus a red-green test committing an OpenRouter-shaped key.
- Major, product UX (`53611ac`): a code commit from a non-agent terminal recorded `skipped/unknown_implementer` and exited 0, so the hook stayed quiet. Runner now checks reviewable paths first; a code commit with an unknown implementer still records the skip but exits non-zero so the post-commit hook prints the NOT REVIEWED warning. Docs-only commits from unknown terminals stay quiet successes.
- Major, performance (`53611ac`): the 1 MB output cap was enforced only after reviewer exit. The watchdog now polls artifact sizes every 2 s and TERM/KILLs the reviewer process group on crossing the cap; post-wait classification stays `output_too_large`. Covered by a runaway-reviewer test asserting kill well before timeout.
- Major, maintainability (`adb2e8d`): `planning-workflow.md` invoked `scripts/sweep-check.mjs` without `node`. Fixed to `node scripts/sweep-check.mjs --json`.
- Major (narrowed), product UX (`fc3b9d6`): marketing-idea-capture could claim a saved path without verifying the save. Steps 4/6 now require read-back verification and explicit failure reporting with full content in chat; CLI failure is a save failure, never a silent filesystem fallback.

Rejected with reasons:

- Rejected, security (`fc3b9d6`, marketing-idea-capture auto-persistence without consent): the skill exists to capture the user's own marketing ideas into their own vault; AGENTS.md routes only messages the user explicitly frames as marketing ideas, so the framing is the consent. Adding a confirmation step would defeat the capture workflow the user designed.
- Rejected, AI-smells (`fc3b9d6`, thermo-nuclear skill fixes findings before presenting them): deliberate design. The sweep skill's contract (commit-sweep, AGENTS.md automation section) is fix-then-report inside the pre-authorized sweep; remediation is not an unrequested side effect.
- Not accepted as stated, security (`53611ac` generic assignment "excludes hyphens"): the `[A-Za-z0-9_=-]` value class already includes `-`; only the missing `sk-or-` prefix was real and is fixed.

## Remediation Checklist

- [x] Route every code/workflow commit to the opposite CLI.
- [x] Persist exact-SHA review status and output privately under `.git`.
- [x] Classify quota, rate, network, auth, timeout, snapshot, size, sensitive-input, interruption, and reviewer failures.
- [x] Continue on reviewer outage while explicitly disclosing unreviewed SHAs.
- [x] Review remediation commits and bound repeated unchanged review/fix rounds.
- [x] Automatically run same-session thermonuclear sweep when due.
- [x] Remove duplicate cross-model range review from commit-sweep.
- [x] Vendor thermonuclear skill for both agent runtimes.
- [x] Isolate reviewer startup/context from repo, host secrets, tools, and global instructions.
- [x] Add red-green tests for routing, filters, root/old SHAs, secret/symlink isolation, tool disablement, failures, timeout, and interruption.
- [x] Update agent router, operating-system docs, scripts inventory, skill references, and test inventory.
