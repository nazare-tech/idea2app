---
implemented: true
implemented_at: 2026-07-30T04:48:07Z
implementation_summary: Refreshed audited upstream skills, retired redundant and legacy leaves recoverably, made marketing and brand state repository-local, and upgraded the starter kit with durable routing, review, provenance, and recovery contracts.
---

# Plan: Portable Marketing Core and Skill Refresh

## Goal

Refresh audited stale skills from their official upstreams, remove explicitly retired skills, rewrite marketing idea capture as a repository-local portable workflow, and upgrade the restored project starter kit with marketing, brand-foundation, CI, and UI-routing capabilities.

## Assumptions

- Update scope covers audited stale skills: Pika `vfx`, `build-a-brand`, `persona-builder`, and `content-director`; global `impeccable` and `playwright`.
- `4k-vfx`, global `ci-watcher`, `fix-ci`, `loop-on-ci`, `run-smoke-tests`, and `control-ui` are explicitly approved for removal.
- General `.agents/skills/vfx/SKILL.md` remains and may own 720p, 1080p, and 4K only after its 4K route is contract-tested before removal.
- Starter-kit brand foundation must work without Pika; `build-a-brand` is an enhanced capability, not a hard dependency.
- Marketing captures belong only to a repository explicitly designated by `marketing/README.md`, never a machine-specific vault or an arbitrary current Git root.
- Current-repository replacement routers already exist at `.agents/skills/ci-operator/SKILL.md` and `.agents/skills/ui-verification/SKILL.md`, with routes in `AGENTS.md`.
- The restored starter kit is untracked and must be snapshotted outside the repository before any edit.
- Existing unrelated dirty changes remain untouched.

## Clarifying Questions

1. How should marketing idea capture behave by default?
   - Recommendation A: Save a concise capture with raw idea, angle, ranked formats, hooks, and research needs; create full drafts only when asked.
   - Trade-off: Fast, low-noise capture; content expansion becomes a second step.
   - Recommendation B: Generate the existing full multi-platform draft pack every time.
   - Trade-off: Everything arrives immediately; files become large and passing ideas cost more time/context.
   - Selected: Recommendation A.
2. How should brand foundation enter the starter core?
   - Recommendation A: Add a runtime-neutral `brand/` template and required early workflow; bundle `build-a-brand` as the richer capability when tools and approved spend exist.
   - Trade-off: Every project gets useful brand context; advanced generation remains optional.
   - Recommendation B: Require `build-a-brand` for every new project.
   - Trade-off: Richer output; blocks projects without Pika or generation budget.
   - Selected: Recommendation A.
3. How should approved global removals be performed?
   - Recommendation A: Move exact global skill directories to a timestamped persistent quarantine outside repositories and Codex skill roots.
   - Trade-off: Skills stop loading, remain recoverable, and consume a small amount of backup storage.
   - Recommendation B: Permanently delete them.
   - Trade-off: Cleaner immediately; harder recovery.
   - Selected: Recommendation A.

## Recommended First Step

Stage official upstream skill copies in a temporary directory, compare them with local copies, and identify local overrides before replacing anything.

## Runtime and Change-Impact Analysis

### Repeated Work

- Marketing capture runs once per explicitly labeled idea.
- Default capture performs one repository-root lookup, one collision-safe path choice, and one local Markdown write.
- Full draft generation runs only when requested.
- Brand-foundation read occurs at project creation or before first visual/marketing work.
- No timers, polling, queues, or application runtime changes.

### Ownership, Scope, And Lifetime

- Marketing state lives under repository `marketing/`, owned by that project and versioned through normal Git policy.
- Brand state lives under repository `brand/`, serving product, design, and marketing work.
- Upstream skills remain source-owned; local copies record provenance and deliberate overrides.
- Vendored Apache-2.0/MIT skills retain their applicable license and notice files.
- Removed global skills move outside Codex discovery into a recoverable persistent quarantine directory.
- At runtime, resolve the user home directory, validate that it is an absolute non-root directory, and create a task-specific recovery base beneath its persistent documents area. Record the resolved absolute path; never use an unresolved environment variable as a move target.
- Starter-kit skill source/version metadata lives in a small portable manifest so intentional upstream copies and local overrides can be audited later.

### Boundary And Cache Semantics

- Marketing path contract: `marketing/ideas/YYYY/MM/YYYY-MM-DD-<slug>.md`; every collision deterministically creates `-v2`, `-v3`, and so on, never overwrite.
- Starter projects remain usable without Pika. `build-a-brand` may run only when capability and cost gates pass.
- `vfx --resolution 4k` replaces `4k-vfx` only after a pre-deletion contract smoke proves that 4K selects Seedance `standard` and emits `resolution: 4k`.
- Current-repository `.agents/skills/ci-operator/` and `.agents/skills/ui-verification/` replace the deleted global leaves only after a direct per-leaf contract crosswalk proves coverage; starter-kit copies make the same front doors available in future projects.
- The starter kit must use the main repository's current blocking plan-stage cross-model review model before new skills are layered onto it; its stale per-commit paid-review language and automation must not survive.

### Failure And Recovery

- Missing Git repository: do not silently write into an ephemeral workspace. Warn that capture would be unversioned and request an explicit persistent project directory before writing.
- Missing marketing designation: do not infer that any Git root is the intended target. Ask the user to confirm the repo, then create its `marketing/README.md` designation before first capture.
- Existing marketing filename: allocate `-v2`, `-v3`, and so on deterministically. Never overwrite.
- Upstream install/download failure: preserve current skill and report exact failure.
- Local skill divergence: stop replacement until override is understood.
- Global skill removal recovery: move directory back from the reported persistent quarantine path, which is validated to be outside the repository and Codex skill roots.
- Tracked `4k-vfx` recovery: restore from Git history.
- Starter-kit edit recovery: restore the exact pre-edit snapshot from the reported persistent backup path.

### Risk-Matched Verification

| Risk | Observable evidence or test | Acceptance threshold |
|---|---|---|
| Upstream update overwrites local behavior | Recursive diff before replacement plus post-update targeted grep | Every local-only difference is preserved or documented |
| `4k-vfx` removal strands 4K rendering | Pre-deletion field-by-field crosswalk of the retiring and surviving instruction contracts | Every 4K capability, parameter, gate, failure path, and delivery step is present in `vfx`; surviving route selects `standard`, passes `resolution: 4k`, and has no dependency on `4k-vfx` |
| Marketing writes outside repo | Trigger/path test cases and absolute-path scan | Zero machine-specific vault paths; every destination begins `marketing/` |
| Capture overwrites an idea | Collision workflow review | Existing files always create versioned siblings |
| Dangling removed-skill references | Repository and global skill-root `rg` scan | No active router/skill references to removed leaves except historical docs |
| Consolidated CI/UI routes lose behavior | Direct source-to-router crosswalk and isolated scenario evaluation for each retired leaf | `ci-watcher`→Watch, `fix-ci`→Fix, `loop-on-ci`→Loop, `run-smoke-tests`→Smoke Suite, and `control-ui`→Local Harness/external driver all have positive instruction-level coverage; any failing leaf remains installed |
| Starter requires unavailable Pika | Brand workflow capability test | Runtime-neutral template path remains complete without Pika |
| Untracked starter edits cannot be recovered | Pre-edit recursive snapshot and checksum/diff inventory | Snapshot exists in persistent storage outside repository and skill discovery roots before first starter-kit write, and restore command is recorded |
| Broken skill structure | Skill validator and symlink checks | Every changed/bundled skill validates; every intended runtime link resolves |

## Architecture Improvement Opportunities

- Progressive marketing modes: selected. Keeps capture fast while retaining full drafting capability.
- Runtime-neutral brand contract plus enhanced skill: selected. Avoids provider lock-in.
- Explicit local override metadata for `vfx`: selected. Prevents future updater from silently restoring retired sibling guidance.
- Starter-kit skill source manifest: selected. It records upstream repository/path/revision and local overrides without implementing an updater.
- Copy all founder/media skills into starter core: rejected. Only brand and portable marketing belong in this core.

## Plan

1. Audit official upstream revisions and local differences.
2. Run blocking cross-model plan evaluation, incorporate accepted findings, and rerun evaluation after this material plan revision.
3. Resolve and validate the current user's home directory; create a task-specific persistent recovery directory outside the repository and every skill root. Create and verify an exact recursive starter-kit snapshot there; record its absolute restore path before any starter-kit write.
4. Synchronize the starter kit's stale review documentation/automation with the main repository's current blocking plan-stage cross-model evaluation model, while preserving its generic placeholders.
5. Stage and update approved stale skills; preserve provenance and local overrides.
6. Build a field-by-field crosswalk from the retiring `4k-vfx` contract to `vfx`: required capabilities, all-frame/audio analysis, 4K prompt, cost approval, provider/model/resolution, reference inputs, prohibited parameters, polling/delivery, and failure recovery. Also assert frontmatter accepts `4k`, Stage 0 selects Seedance `standard`, and Stage 7 passes `resolution: 4k`. Only after every field passes, remove the sibling `4k-vfx`, its lock/settings entries, and dead links. If any field fails, keep `4k-vfx` and report the blocker.
7. Compare every exact global legacy skill with its surviving current-project route and write a five-row coverage artifact. Remove each legacy directory only when its own mapping has positive instruction-level coverage; a failing leaf remains installed. Move passing leaves to the validated persistent quarantine and verify they are absent from discovery roots.
8. Rewrite `marketing-idea-capture` for local repository storage and progressive output. Require a `marketing/README.md` designation or explicit user confirmation before first write; require an explicit persistent target when no Git root exists.
9. Add `marketing/` and `brand/` structures to current repository and starter kit without replacing existing marketing artifacts.
10. Port the full updated `build-a-brand` bundle, `ci-operator`, `ui-verification`, and portable marketing skill into the starter kit; add runtime links, a source manifest, brand/marketing routing, and README guidance.
11. Run contract/scenario smokes for VFX, marketing, brand, CI, and UI; validate skills, links, references, portability, deletion destinations, and scoped diffs.
12. Run fresh-eyes review, write review artifact, remediate findings, mark plan complete.

## Milestones

- Upstreams staged and compared.
- Starter kit snapshotted and its review model synchronized.
- Surviving VFX and current CI/UI replacement paths behavior-checked.
- Approved removals complete and recoverable.
- Portable marketing workflow validated.
- Starter brand/marketing core complete.
- Final review clean.

## Validation

- Official upstream commit/hash comparison.
- Confirmed validator `.agents/skills/skill-creator/scripts/quick_validate.py` for changed project and starter skills, plus explicit `test -L`/`readlink` checks for runtime symlinks.
- Marketing trigger/path/content test fixtures.
- VFX 4K contract assertion compares every retiring-skill field with the surviving instruction path, including `standard` + `resolution: 4k` + explicit cost approval before generation.
- After removal, offer an opt-in live 4K render probe as the only end-to-end provider check. No paid render is fired without a user-provided clip and explicit spend authorization; when absent, report live rendering as unverified rather than implying static validation proved provider execution.
- CI coverage artifact proves status-only→Watch, diagnose-only→Diagnose, focused fix→Fix, and keep-going-until-green→Loop. UI coverage proves existing smoke suites→Smoke Suite and local/browser-CDP work→Local Harness, with external Chrome/browser/Playwright drivers intentionally remaining externally managed.
- Optional read-only live PR/browser probes add integration evidence when dependencies are available, but removal gates are the positive per-leaf instruction crosswalks because these skills are routing documents, not executable drivers.
- `rg` scans for absolute Obsidian paths and retired active references.
- Symlink resolution checks.
- Starter snapshot existence, inventory, and out-of-repository location checks.
- `git diff --check` and focused working-tree audit.
- No UI evidence: workflow/skill/documentation-only change.

## Risks And Mitigations

- Restored starter kit is untracked: snapshot it to validated persistent storage outside the repository and skill roots before editing, then report the exact recovery path.
- Pika upstream changes frequently: retain source metadata and update path; do not merge its workflows.
- Global skill updates affect future sessions, not current in-memory catalog: report restart/new-turn requirement.
- Marketing files may contain unpublished strategy: local repository policy decides whether to commit; skill must not publish or send externally.

## Rollback Or Recovery

- Restore tracked files through Git.
- Move global skills back from the recorded persistent quarantine directory.
- Restore previous marketing skill from Git history.
- Restore the full starter kit from the recorded persistent backup directory; do not delete or overwrite the edited kit without explicit approval.

## Open Decisions

- None. Recommendation A selected under repository policy.

## Critique

### Software Architect

- Brand and marketing need durable repository contracts, not instructions tied to one laptop.

### Product Manager

- Brand foundation should happen early enough to shape product voice and interface, but never block idea validation on paid generation.

### Customer Or End User

- Capturing an idea must feel instant; giant draft packs should be opt-in.

### Engineering Implementer

- Upstream replacement must distinguish source updates from local overrides before copying.

### Risk, Security, Or Operations

- Marketing content may be private. Keep writes local, never auto-publish, never overwrite, and avoid machine-specific external stores.
