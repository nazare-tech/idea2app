# Plans And Reviews

Use these artifacts for substantial changes. Small mechanical edits may use a short checklist instead. Rules live in `docs/operating-system/planning-workflow.md`; this file is the folder's lifecycle summary.

## Lifecycle

1. Copy `plan-template.md` to `<slug>-plan.md` before implementation.
2. Record decisions as facts and check phases off while working.
3. Run the blocking opposite-CLI plan evaluation, save it beside the plan, and incorporate accepted findings before implementation.
4. Copy `review-template.md` to `<slug>-review.md` after implementation.
5. Record verification, real-flow evidence, two fresh-eyes passes, architecture/security findings, and remediation.
6. Run `node scripts/sweep-check.mjs --json` after the commit/remediation batch; if `due`, run the `commit-sweep` skill before pushing.
7. Update `backend-change-history.md` for backend/data/auth/persistence changes.
8. Set plan `implemented: true` only when required work and verification are complete.

Plans explain intended change. Reviews explain observed result. Do not rewrite history to hide changed decisions or failures.

## Naming

- Plans: `<short-slug>-plan.md`
- Reviews: `<short-slug>-review.md`
- Design-only planning: `<short-slug>-design.md`
- Durable recommendation rules: `recommendation-selection-rules.md`
- Backend and data-change history: `backend-change-history.md`
