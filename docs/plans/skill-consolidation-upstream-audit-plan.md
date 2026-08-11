---
implemented: true
implemented_at: 2026-07-26T23:20:00Z
implementation_summary: Audited candidate families against official upstreams, consolidated stable CI and UI workflows into project routers, preserved actively updated dependencies, and documented deferred global retirement and starter-kit porting.
---

# Plan: Skill Consolidation Based on Upstream Stability

## Goal

Audit every previously proposed consolidation family against its declared upstream source, explain the requested brand/marketing/persona/content/video skills, and consolidate only families whose ownership and update history make a local front door safe. Preserve all existing leaf skills and unrelated working-tree changes.

## Assumptions

- “Constantly updated” means path-specific upstream activity or versioned plugin releases show ongoing maintenance, not merely repository-wide commits.
- A thin front-door router counts as consolidation because users gain one discoverable entrypoint while leaf workflows remain independently updateable.
- Existing leaf skills remain registered for compatibility. Removing or relocating them requires separate approval because that would delete or replace existing files.
- Global and plugin-owned skills should not be copied into this repository when their upstream remains active.
- No paid generation, external mutation, commit, push, or plugin installation is needed.

## Clarifying Questions

1. How should stable skills be consolidated?
   - Recommendation A: Add thin front-door routers; retain leaf skills.
   - Trade-off: Solves recall/routing while preserving update paths, but does not reduce raw registered-skill count.
   - Recommendation B: Move leaf bodies under one skill and remove old registrations.
   - Trade-off: Reduces registered count, but breaks compatibility and requires destructive file removal.
   - Selected: Recommendation A. User authorized consolidation, not deletion.
2. What should happen when provenance is missing or upstream is active?
   - Recommendation A: Keep skills separate and document why.
   - Trade-off: More names remain visible, but no stale fork is created.
   - Recommendation B: Consolidate from current snapshots anyway.
   - Trade-off: Immediate simplicity, recurring merge burden and silent drift.
   - Selected: Recommendation A.
3. Should provider-heavy Pika skills enter the generic starter kit?
   - Recommendation A: Explain and evaluate them first; keep them outside generic core unless user confirms usefulness.
   - Trade-off: Avoids provider/cost/tool assumptions in every project.
   - Recommendation B: Bundle them now.
   - Trade-off: Easier discovery, much larger and less portable starter.
   - Selected: Recommendation A, matching the user’s explicit request to explain before consolidating.

## Recommended First Step

Resolve provenance and path-specific upstream history for each family before writing any router.

## Runtime and Change-Impact Analysis

### Repeated Work

- Skill routing runs once when a matching user request arrives.
- Front-door work is one intent classification plus loading the chosen leaf skill.
- No timers, polling, queues, cache refreshes, or production runtime work are introduced.

### Ownership, Scope, And Lifetime

- Any new router belongs under `.agents/skills/<router>/`.
- Project-local router lifetime follows repository history; external leaves keep their original owner and update path.
- Existing `.claude/skills` links remain untouched unless a new project-local router is added, in which case a matching link may be added.

### Boundary And Cache Semantics

- Router contract: user intent maps to exactly one leaf or a documented chain.
- No leaf workflow, external API contract, cache, persistence, or application behavior changes.
- Active-upstream families stay separate to preserve forward compatibility.

### Failure And Recovery

- Ambiguous intent defaults to explanation or the narrowest read-only path.
- Missing leaf capability stops with a precise dependency message.
- Recovery for a bad new router is removing only that newly added router after approval; existing leaf skills remain intact.

### Risk-Matched Verification

| Risk | Observable evidence or test | Acceptance threshold |
|---|---|---|
| Stale upstream conclusion | Official source history plus local provenance/hash comparison | Every decision cites source, path, and recent update evidence or says provenance unresolved |
| Wrong routing | Positive and negative prompt cases reviewed against frontmatter | Every added router has unambiguous routes and exclusions |
| Broken references | Filesystem/reference validation | Every referenced local leaf exists |
| Existing work overwritten | `git status --short` and scoped diff | Only new plan/review/router files or explicit router documentation changes |
| Hidden paid action | Tool-call review | Zero paid generation or external mutations |

## Architecture Improvement Opportunities

- Thin front doors with independent leaves: selected. Improves discovery without creating update forks.
- Skill provenance manifest: deferred to the broader starter-kit manifest task; useful, but not required to answer this focused consolidation request.
- De-registering leaf skills: rejected for this task because it requires deletion and harms compatibility.
- One universal orchestrator: rejected. Trigger surface and context would become too broad.

## Plan

1. Inventory local provenance and current hashes for each proposed family.
2. Check official upstream path history and compare current upstream contents where possible.
3. Classify families as stable, active, locally owned, or unresolved.
4. Explain requested Pika/marketing skills with inputs, outputs, dependencies, costs, and likely Maker Compass value.
5. Add thin front-door routers only for stable or locally owned families not already consolidated.
6. Validate frontmatter, references, trigger examples, repository diff, and documentation consistency.
7. Run two fresh-eyes reviews; write review artifact; remediate findings.

## Milestones

- Audit complete: every family has evidence-backed status.
- Decision complete: every family has consolidate/keep-separate/defer outcome.
- Implementation complete: only approved stable routers added.
- Verification complete: references, triggers, and diff pass.

## Validation

- Parse new skill frontmatter.
- Check every local skill reference exists.
- Review positive/negative routing examples.
- Run `git diff --check` on task-owned files.
- Confirm no existing unrelated changes were modified.

## Risks And Mitigations

- Upstream history may be unavailable: mark provenance unresolved; do not consolidate.
- Repository activity may overstate skill activity: use path-specific history.
- Thin router may duplicate existing orchestration: inspect current leaf chains first; add nothing when consolidation already exists.
- Plugin caches may update independently: never vendor active plugin skills.

## Rollback Or Recovery

No existing leaf is removed. Reverting consists only of removing newly added router/plan/review files after approval.

## Audit Results

### Consolidated

- `ci-operator`: selected. Cursor Team Kit source paths for `ci-watcher`, `fix-ci`, and `loop-on-ci` last changed on 2026-04-30. Added one project-local watch/diagnose/fix/loop front door. Kept `github:gh-fix-ci` plugin-owned.
- `ui-verification`: selected. Cursor Team Kit `run-smoke-tests` and `control-ui` paths last changed on 2026-02-17 and 2026-04-30. Added one project-local router. Kept Playwright, Browser, and Chrome externally managed.

### Already Consolidated

- Shipping: `commit` already invokes `commit-sweep`, which invokes `thermo-nuclear-code-quality-review`. No new wrapper needed.
- `content-director`: already one front door with four lazy format playbooks.
- Tufte toolkit: already reduced to assessment, rendering, and a routing skill after benchmarking.

### Kept Separate

- `vfx` and `4k-vfx`: active Pika upstream updates on 2026-07-09 and 2026-07-20. This audit originally kept them separate. Superseded on 2026-07-29 by the user-approved decision to retain general `vfx` and retire the redundant fixed-4K sibling after a field-by-field coverage check.
- `build-a-brand`, `persona-builder`, and `content-director`: active Pika upstream sync on 2026-07-20. Keep updateable.
- Caveman suite: 16 releases through 2026-07-03; local copies match current upstream. `caveman-help` already provides suite discovery.
- `impeccable`: actively maintained and locally stale; upstream already consolidated its own command family.
- Browser, Chrome, GitHub CI plugin, and Playwright: externally versioned. Installed Playwright copy is stale relative to upstream package-name fix.
- Theme Factory: path-stable but semantically distinct; keep separate.
- Müller-Brockmann, Vignelli, and NYT data-viz: path-stable but upstream lacks a redistribution license; do not vendor or merge into starter kit.

### Starter-Kit Copy

- Deferred. `project-starter-kit/` disappeared from the working tree during this task. Recreating it could conflict with another session, so routers were added only to current project.

## Open Decisions

- Whether useful Pika/marketing skills should later become an optional starter-kit profile. User decision after explanations.

## Critique

### Software Architect

- Stability alone does not prove semantic cohesion. Consolidate only families sharing intent, workflow, dependencies, and output contracts.

### Product Manager

- Main value is fewer concepts users must remember. A router that merely lists skills without making a decision provides little value.

### Customer Or End User

- Skill names must describe outcomes, not internal implementation jargon.

### Engineering Implementer

- Preserve upstream ownership. Local wrappers should stay short and contain no copied leaf logic.

### Risk, Security, Or Operations

- Media skills may spend money or upload user media. Explanations must expose those requirements before recommendation or use.
