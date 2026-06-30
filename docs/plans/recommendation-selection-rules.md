# Recommendation Selection Rules

Use this file to generalize feedback about when the default Recommendation A should not be chosen.

## Default Rule

Choose Recommendation A for open clarifying questions and proceed without waiting when it is the simplest reasonable path, keeps scope controlled, preserves existing architecture, and can be verified locally.

## Override Rules

- If the user explicitly names a preference, constraint, option, or trade-off in the prompt, follow that instead of defaulting to Recommendation A.
- If Recommendation A would delete data, overwrite existing files, expose secrets, weaken auth/RLS, make irreversible production changes, require missing credentials, or incur open-ended/production spend, stop and ask before taking that step.
- Do not treat small, expected local QA spend from configured AI/API services as a blocker when that spend is necessary to verify the real user flow or capture durable test artifacts.
- If an existing repo pattern clearly favors Recommendation B, choose the repo pattern and record why.
- If Recommendation A optimizes implementation speed but Recommendation B better preserves user trust, data durability, security, or future maintainability, choose Recommendation B.
- If a correction reveals a durable preference, add a new rule below with the root reason, not just the surface-level choice.

## Feedback Capture Process

When the user says a different recommendation should have been chosen:

1. Update the implementation to match the corrected recommendation when practical.
2. Ask what underlying preference, constraint, or product principle made that option better.
3. Record the generalized rule in this file after the root reason is clear.
4. Link the plan or review artifact where the correction happened.

## Learned Rules

### 2026-06-29: Do Not Migrate Historical Backend Data By Default

- Prefer: Recommendation A when the safe current-path fix is to update new writes, current readers, or forward behavior without migrating older backend rows.
- Reason: Keep scope controlled and avoid unnecessary historical data migration risk. Older backend data should be migrated to a new schema or data shape only when the user explicitly asks for that migration.
- Example: When fixing future canonical mockup image URLs, update the save path for new `mockups.content` rows without automatically rewriting existing saved rows that used the older URL shape.

### 2026-06-30: Prefer Real Paid Verification For Durable QA Artifacts

- Prefer: Recommendation B when Recommendation A avoids small expected AI/API spend but Recommendation B runs the real local user flow and captures durable QA evidence, generated questions, reports, or fixtures.
- Reason: Avoiding small expected verification spend can create more future work than it saves. For Maker Compass, realistic intake/report QA depends on the actual AI-backed flow, so local verification should use configured real services unless the spend is open-ended, production-impacting, credential-blocked, destructive, or explicitly unsafe.
- Example: `docs/plans/standardized-intake-test-cases-plan.md` should have selected the live authenticated intake flow for capturing current follow-up questions instead of avoiding OpenRouter-backed generation only to save API budget.

Use this format for future entries:

```markdown
### YYYY-MM-DD: <short rule title>

- Prefer: Recommendation <A/B> when <condition>.
- Reason: <root preference or constraint>.
- Example: <plan/review file or brief scenario>.
```
