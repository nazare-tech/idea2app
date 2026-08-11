# Recommendation Selection Rules

## Default

Choose Recommendation A when it is the simplest reasonable path, controls scope, preserves current architecture, is reversible, and can be verified locally.

## Overrides

- Explicit user preferences or constraints override the default.
- Stop before deletion, overwrite, secret exposure, weakened authorization, irreversible production changes, missing credentials, or open-ended/unapproved spend.
- Prefer trust, durability, security, maintainability, idempotency, ownership validation, typed contracts, recovery, and observability over the fastest patch when scope remains proportionate.
- Prefer an established repository pattern over a generic default unless that pattern is the problem being fixed.
- Do not migrate historical data by default. Update future writes/readers first unless old data must change for correctness or the user explicitly requests migration.
- Test the normal user path for user-visible work. If it exposes a bug, fix that path before using a lower-level API or database bypass.
- API/server success is not equivalent proof of a required UI flow. Recover the environment/browser; otherwise report a blocker.
- Use fresh entities created through the current pipeline when testing transient states or current output contracts. Old entities are compatibility evidence only.
- Accept temporary provider/data-quality risk only when the user explicitly accepts it, risk is visible and bounded, the change is reversible, rollback exists, and the missing trust layer is tracked. Never apply this to authorization, secrets, data loss, or irreversible production risk.

## Feedback Capture

After a corrected recommendation:

1. Adjust the implementation when practical.
2. Ask for the root preference, constraint, or product principle.
3. Record the generalized rule, not the one-off surface choice.
4. Link supporting plan/review evidence.

## Entry Template

```markdown
### YYYY-MM-DD: {{RULE TITLE}}

- Prefer: Recommendation {{A/B}} when {{CONDITION}}.
- Reason: {{ROOT PREFERENCE OR CONSTRAINT}}.
- Example: {{PLAN/REVIEW OR SHORT SCENARIO}}.
```
