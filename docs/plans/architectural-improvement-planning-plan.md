---
implemented: true
implemented_at: 2026-07-02T22:55:41Z
implementation_summary: Updated the holistic implementation skill and repo workflow docs so substantial plans must propose scoped architectural improvement opportunities and review them after implementation.
---

# Plan: Architectural Improvement Planning Loop

## Goal
Make holistic implementation plans consistently surface architectural improvement opportunities, so feature work naturally looks for durable, reusable, scalable, modular, secure, and evolvable design improvements before code is written and again during review.

## Assumptions
- The main reusable workflow lives in the global `holistic-implementation` skill.
- This repo should also reinforce the rule locally because `AGENTS.md`, `.codex/AGENTS.md`, and `docs/plans/README.md` are the project-specific sources future agents already read.
- This task is documentation/workflow-only and does not require UI verification or backend history.

## Clarifying Questions
1. Where should the architecture-improvement requirement live?
   - Recommendation A: Update the global holistic implementation skill and add repo-local reinforcement in planning docs.
   - Trade-off: Best coverage for future work in this repo and other repos, with a little duplication to keep the local contract durable.
   - Recommendation B: Update only this repo's docs.
   - Trade-off: Lower permission risk, but future holistic skill runs outside this repo would not inherit the behavior.
   - Selected: Recommendation A, because the user explicitly called out the holistic implementation skill and allowed writing it down elsewhere as needed.
2. How prescriptive should the new planning section be?
   - Recommendation A: Require a short "Architecture Improvement Opportunities" section with concrete patterns and per-opportunity trade-offs.
   - Trade-off: Keeps plans actionable without turning every task into a large refactor.
   - Recommendation B: Add a broad reminder inside the existing architecture critique only.
   - Trade-off: Less plan overhead, but easier for agents to skip or write vague critique.
   - Selected: Recommendation A, because the user's examples are concrete architectural improvements that should be proposed explicitly.

## Recommended First Step
Patch the holistic implementation skill template and workflow to require architecture improvement scouting during planning and architecture-retro review after implementation.

## Plan
1. [x] Update the holistic implementation skill with a required architecture-improvement opportunity pass and plan template section.
2. [x] Add repo-local reinforcement to `AGENTS.md`, `.codex/AGENTS.md`, and `docs/plans/README.md`.
3. [x] Create a review artifact documenting verification and residual risks.
4. [x] Mark this plan implemented after validation.

## Milestones
- Workflow updated: Future holistic plans include architecture improvement opportunities.
- Repo reinforcement updated: Project docs preserve the same expectation locally.
- Review complete: Text checks confirm the required terms and sections exist.

## Validation
- Run targeted `rg` checks for the new section names and guidance.
- Inspect the changed docs with `sed` to confirm wording is coherent.
- No UI evidence is meaningful because this changes agent workflow docs only.

## Risks And Mitigations
- Risk: The guidance encourages over-engineering.
- Mitigation: Require scoped, task-relevant opportunities with trade-offs and allow "none worth doing now" when justified.
- Risk: Global skill editing may require permission outside the repo workspace.
- Mitigation: Use the approved workflow for editing outside the repo if needed; keep repo-local reinforcement even if the global edit is blocked.

## Rollback Or Recovery
- Revert the documentation edits, or remove only the new architecture-improvement sections if the workflow proves too heavy.

## Open Decisions
- None.

## Critique

### Software Architect
- The workflow should push agents to identify boundary, persistence, contract, parser, idempotency, ownership, and recovery improvements before implementation, but it must keep those improvements scoped to the requested task.

### Product Manager
- Better architecture should translate into fewer regressions and less rework, but plans should still prioritize user value over speculative platform work.

### Customer Or End User
- Users benefit indirectly through more reliable generation, recovery, and security behavior. The plan should not add visible process overhead unless it improves delivery quality.

### Engineering Implementer
- The required section gives implementers a concrete checklist for reusable patterns without forcing every feature into a broad refactor.

### Risk, Security, Or Operations
- Security and operations opportunities should be considered even for feature work, especially ownership checks, durable state, retries, idempotency, and rollback paths.
