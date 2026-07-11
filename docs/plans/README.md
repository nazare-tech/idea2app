# Planning Artifacts

`docs/plans/` is the canonical place for substantial implementation plans, reviews, recommendation feedback, and backend change history in this repo.

## Default Workflow

1. Create a plan before substantial implementation work.
2. Include clarifying questions with Recommendation A and Recommendation B choices, plus concrete trade-offs.
3. Include an Architecture Improvement Opportunities section with scoped ways the work could improve durability, idempotency, ownership validation, prompt/parser/render contract sync, typed validation, bounded structured-output repair, recovery, observability, reuse, modularity, scalability, or progressive loading.
4. Include the framework-agnostic Runtime and Change-Impact Analysis defined by the global `/holistic-implementation` skill. In this repo, explicitly apply it to AI generation, polling/streaming, queues and partial-content persistence, shared state, client-server payloads, cache invalidation, billing-adjacent data, and real-flow verification.
5. For each architecture opportunity, record the benefit, trade-off, likely files or boundaries, and whether it is selected, deferred, or rejected as over-engineering for this task.
6. Select Recommendation A by default and continue implementation without waiting for approval unless a safety constraint, explicit user instruction, or `recommendation-selection-rules.md` points elsewhere.
7. Keep the plan current as assumptions become decisions.
8. After implementation, create or update a review artifact with verification, architecture improvement review, code-review findings, security-review findings when relevant, and remediation status.

## Naming

- Plans: `<short-slug>-plan.md`
- Reviews: `<short-slug>-review.md`
- Design-only planning can use `<short-slug>-design.md`
- Durable recommendation rules: `recommendation-selection-rules.md`
- Backend and data-change history: `backend-change-history.md`

## Required Plan Metadata

Use front matter for implementation plans when practical:

```markdown
---
implemented: false
implemented_at:
implementation_summary:
---
```

Set `implemented: true` only after the planned implementation, verification, review, and accepted remediation are complete.

## Required Architecture Sections

Substantial plans should include:

```markdown
## Runtime and Change-Impact Analysis
- Follow the canonical framework-agnostic structure in `/holistic-implementation`.
- Maker Compass emphasis: AI generation cadence and cost; polling/streaming and queue lifecycles; partial-content durability; shared-state propagation; client-server compatibility; cache invalidation; billing-adjacent freshness; and real-flow evidence matched to each named risk.

## Architecture Improvement Opportunities
- <Opportunity>: <Benefit, trade-off, likely files or boundaries, and selected/deferred/rejected status>
```

Review artifacts should include:

```markdown
## Architecture Improvement Review
- Durability/idempotency:
- Ownership/security validation:
- Contract sync:
- Structured-output validation and repair bounds:
- Recovery behavior:
- Shared abstractions or intentionally retained duplication:
- Follow-up risks:
```
