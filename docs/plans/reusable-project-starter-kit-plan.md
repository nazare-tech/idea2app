---
implemented: true
implemented_at: 2026-07-11T21:47:14Z
implementation_summary: Created a self-contained, framework-neutral project starter kit with portable rules, context, decision lessons, delivery/review templates, privacy protocols, optional overlays, and compact skills.
---

# Plan: Reusable Project Starter Kit

## Goal

Create a self-contained `project-starter-kit/` that can seed unrelated software projects with the strongest reusable instructions, templates, decision rules, and lightweight skills learned here, without carrying Maker Compass product assumptions.

## Assumptions

- The kit should work for React/Next.js projects but remain framework-neutral by default.
- Source files remain untouched; the kit is a curated new snapshot, not a move or deletion.
- `AGENTS.md` is canonical. `CLAUDE.md` is a short compatibility entrypoint to avoid duplicated rules.
- Product-specific architecture, pricing, analytics event names, QA credentials, routes, and vendor choices stay excluded.

## Clarifying Questions

1. Should the kit copy every current rule and skill?
   - Recommendation A: Curate only portable material and document exclusions.
   - Trade-off: Smaller, safer starting point; future source changes do not automatically sync.
   - Recommendation B: Mirror all files.
   - Trade-off: Complete snapshot, but carries obsolete and Maker Compass-specific assumptions.
   - Selected: Recommendation A.
2. Should framework-specific rules be mandatory?
   - Recommendation A: Keep core rules framework-neutral; isolate optional React/Next.js guidance.
   - Trade-off: Broad reuse with one optional layer.
   - Recommendation B: Optimize the whole kit for this repo's current stack.
   - Trade-off: Faster for similar apps, misleading for unrelated projects.
   - Selected: Recommendation A.
3. How should Claude and Codex instruction files coexist?
   - Recommendation A: Keep full rules in `AGENTS.md`; make `CLAUDE.md` point to it and `PROJECT_CONTEXT.md`.
   - Trade-off: One source of truth; depends on the agent following the pointer.
   - Recommendation B: Duplicate full rules in both files.
   - Trade-off: Easier discovery, guaranteed drift.
   - Selected: Recommendation A.

## Recommended First Step

Inventory instruction-like files and classify each as universal, optional stack-specific, or product-specific/excluded.

## Runtime and Change-Impact Analysis

### Repeated Work
- No application runtime changes. Human/agent reads happen once per task or project setup.
- Worst case is excess prompt context from oversized instructions; keep canonical files concise and route to optional references.

### Ownership, Scope, And Lifetime
- New state: copied starter folder only.
- Owner: new project's repository root after copying.
- Updates are manual and visible through normal Git review.

### Boundary And Cache Semantics
- Contract: agents must read `PROJECT_CONTEXT.md` before architecture work and follow `AGENTS.md`.
- No cache or compatibility impact on Maker Compass runtime.

### Failure And Recovery
- Main risk: stale placeholders or product-specific leakage.
- Recovery: remove the new folder; no existing file is changed.

### Risk-Matched Verification

| Risk | Evidence | Acceptance threshold |
|---|---|---|
| Product-specific leakage | Case-insensitive scan for Maker Compass routes, names, credentials, and provider defaults | Zero unintended matches |
| Broken internal references | Extract/check relative Markdown paths and inspect tree | All referenced kit files exist |
| Missing core workflow | Content assertions for plan, verification, safety, review, context, recommendation rules | Every category present |

## Architecture Improvement Opportunities

- Canonical instruction source: selected. `AGENTS.md` owns rules; compatibility files point to it. Avoids drift.
- Optional stack overlay: selected. React/Next.js advice lives in a separate reference.
- Reusable templates: selected. Plans, reviews, backend history, and context become fill-in files.
- Runtime-neutral core plus documented skill discovery: selected. `AGENTS.md` remains executable guidance without skills; README documents that `.agents/skills/` discovery is Codex-compatible and other runtimes may need installation/linking.
- Automated sync with this repo: deferred. Adds maintenance machinery before another consumer exists.
- Copy every skill: rejected. Many are third-party, large, environment-specific, or domain-specific.

## Implementation Phases

1. Build folder structure and usage guide.
2. Add universal instructions and templates.
3. Add generalized learned recommendation rules and optional React/Next.js overlay.
4. Add two compact reusable skills: holistic delivery and security review.
5. Verify contents, links, leakage, and review findings.

All phases completed. Review and remediation: `docs/plans/reusable-project-starter-kit-review.md`.

## Test Strategy

- Tree/file inventory.
- Targeted `rg` assertions for required and forbidden content.
- Markdown relative-link checker.
- Runtime compatibility check: the README must explain skill discovery differences and the core workflow must remain complete without loading a skill.
- `git diff --check` limited to new kit and plan/review artifacts.

## Rollback Or Recovery

Delete only the newly added kit and its plan/review artifacts after explicit user approval. No runtime or data rollback exists because no application behavior changes.

## Open Decisions

- None. Recommendation A selected under repository policy.

## Critique

### Software Architect
- A starter must encode process contracts, not freeze one product's architecture. Keep context as placeholders.

### Product Manager
- The kit should reduce setup time immediately. A short copy checklist matters more than exhaustive historical knowledge.

### Customer Or End User
- Users need clear “copy, replace placeholders, remove irrelevant overlays” steps.

### Engineering Implementer
- Avoid duplicated prose across entrypoints. Optional references should be discoverable but not always loaded.

### Risk, Security, Or Operations
- Never ship credentials, account IDs, internal URLs, raw transcripts, or project-specific authorization assumptions in a reusable starter.
