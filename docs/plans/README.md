# Planning Artifacts

`docs/plans/` is the canonical place for substantial implementation plans, reviews, recommendation feedback, and backend change history in this repo.

## Default Workflow

1. Create a plan before substantial implementation work.
2. Include clarifying questions with Recommendation A and Recommendation B choices, plus concrete trade-offs.
3. Include an Architecture Improvement Opportunities section with scoped ways the work could improve durability, idempotency, ownership validation, prompt/parser/render contract sync, typed validation, bounded structured-output repair, recovery, observability, reuse, modularity, scalability, or progressive loading.
4. Include a Runtime and Change-Impact Analysis section that connects repeated work, state ownership, boundary semantics, and failure modes to their blast radius and observable verification.
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

### Repeated work
- Timers, polling, streams, subscriptions, retries, render loops, or other hot paths:
- Expected frequency and worst-case frequency:
- Work performed per update:

### State ownership
- New or changed state:
- Narrowest practical owner and lifetime:
- Rerender, recomputation, or consumer fan-out:
- Reset, unmount, navigation, retry, and completion behavior:

### Boundary and cache semantics
- Client-server, parser/renderer, queue, persistence, or third-party contract changes:
- Cache keys, invalidation, freshness, and stale-data behavior:
- Backward/forward compatibility and rollout behavior:

### Failure and recovery
- Partial, duplicate, delayed, stale, and out-of-order behavior:
- Failure blast radius:
- Kill switch, rollback seam, or recovery path:

### Risk-matched verification
| Risk | Observable evidence or test | Acceptance threshold |
|---|---|---|
| <Named risk> | <Profiler, timing, contract test, lifecycle test, real-flow capture, logs, etc.> | <Concrete pass condition> |

High-frequency state should live at the lowest practical ownership boundary. If it does not, record the measured reason. Do not use generic statements such as "performance considered"; connect each mechanism to its impact and an observation capable of detecting it.

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
