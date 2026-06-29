# Planning Artifacts

`docs/plans/` is the canonical place for substantial implementation plans, reviews, recommendation feedback, and backend change history in this repo.

## Default Workflow

1. Create a plan before substantial implementation work.
2. Include clarifying questions with Recommendation A and Recommendation B choices, plus concrete trade-offs.
3. Select Recommendation A by default and continue implementation without waiting for approval unless a safety constraint, explicit user instruction, or `recommendation-selection-rules.md` points elsewhere.
4. Keep the plan current as assumptions become decisions.
5. After implementation, create or update a review artifact with verification, code-review findings, security-review findings when relevant, and remediation status.

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
