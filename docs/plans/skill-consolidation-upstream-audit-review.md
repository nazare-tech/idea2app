# Review: Skill Consolidation Based on Upstream Stability

## Scope

- Audited previously proposed CI, UI, caveman, design, shipping, Pika, brand, persona, and content skill families.
- Added `.agents/skills/ci-operator/` and `.agents/skills/ui-verification/`.
- Added matching `.claude/skills/` discovery symlinks.
- Routed current project through both front doors in `AGENTS.md`.
- Preserved all existing leaf and externally managed skills.

## Upstream Evidence

- Cursor Team Kit CI targets last changed on 2026-04-30; smoke/control targets last changed on 2026-02-17 and 2026-04-30. Audited repository commit: `ba7b5907843e1e21ec692418c180e1f912cbf7d3`.
- Pika `vfx`, `4k-vfx`, `build-a-brand`, `persona-builder`, and `content-director` changed on 2026-07-09 and 2026-07-20. Kept separate.
- Caveman published 16 releases through 2026-07-03. Local files match current upstream. Kept separate.
- Impeccable changed through 2026-07-26 and local copy is stale. Kept separate.
- Theme Factory is path-stable but distinct. Kept separate.
- Müller-Brockmann, Vignelli, and NYT data-viz are path-stable but source repository has no redistribution license. Not vendored.
- Browser, Chrome, GitHub CI plugin, and Playwright remain externally managed. Installed Playwright instructions contain a package-name bug fixed upstream.

## Verification

- `python3 .agents/skills/skill-creator/scripts/quick_validate.py .agents/skills/ci-operator` — passed.
- `python3 .agents/skills/skill-creator/scripts/quick_validate.py .agents/skills/ui-verification` — passed.
- `git diff --check` plus trailing-whitespace scan on task-owned files — passed after final remediation.
- Local reference and license existence checks — passed.
- Claude symlink targets resolved to both new skills.
- No UI evidence: skills/docs only; no application UI or runtime behavior changed.

## Fresh-Eyes Self Review

### Pass 1

- Found missing read-only CI diagnosis mode. Added `diagnose` with explicit no-mutation contract.
- Found missing Claude discovery links. Added both symlinks.
- Confirmed UI router defers to repository policy and preserves real-browser evidence requirements.

### Pass 2

- Independent review found target-PR ambiguity, server-cleanup conflict, stale Playwright dependency, over-broad external-provider blocking, weak provenance, and legacy-trigger collision.
- Added explicit PR target precedence and branch-match guard.
- Qualified cleanup under project policy.
- Added Playwright freshness gate.
- Allowed evidence-backed local reproduction for unavailable external providers.
- Added exact source URLs and audited commit.
- Added project-level supersession rule for legacy global triggers.

## Code Review Findings

- P1 legacy global triggers remain installed outside repository. Mitigated inside this project through explicit `AGENTS.md` supersession. Global deletion or overwrite requires separate user approval.
- P1 starter-kit copy could not be updated because `project-starter-kit/` disappeared concurrently. Recreating it was rejected as unsafe.
- P2 local Playwright skill is stale. Router fails safely instead of vendoring or silently following broken installation guidance. Updating external skill remains separate work.
- No remaining project-router correctness finding after remediation.

## Architecture Improvement Review

- Selected: thin front doors plus independent external drivers. Landed.
- Selected: preserve leaf workflows and update ownership. Landed.
- Deferred: global skill retirement/deprecation shims. Requires destructive overwrite/removal approval.
- Deferred: starter-kit copy. Source directory unavailable.
- Rejected: Pika, caveman, design, and universal mega-skill merges.

## Security Review Findings

- No secrets, credentials, application data, network services, or production state added.
- CI router separates read-only diagnosis from mutation and requires target-branch match before fixes.
- UI router preserves real authentication/provider policy and blocks fake verification.
- MIT attribution and license included for Cursor-derived workflow concepts.

## Remediation Checklist

- [x] Add diagnosis-only CI mode.
- [x] Add target PR and branch guard.
- [x] Add external-provider local-reproduction exception.
- [x] Add stale Playwright gate.
- [x] Reconcile UI cleanup with project server policy.
- [x] Add provenance URLs, audited commit, and MIT license.
- [x] Add Claude discovery symlinks.
- [x] Supersede legacy global triggers inside current project.
- [ ] Retire or replace legacy global skills after explicit approval.
- [ ] Port routers into starter kit after its directory is restored or relocated.
