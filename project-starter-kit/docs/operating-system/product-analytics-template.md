# Product Analytics Contract

Optional for user-facing products. Delete when product analytics is irrelevant.

## Principles

- Define events from product questions, not from whatever is easiest to capture.
- Track a small funnel: impression/entry, reach, intentional action, successful outcome, trusted server transition, and failure where useful.
- Keep analytics evidence separate from business authority. Orders, permissions, subscriptions, and workflow state remain in canonical systems.
- Use controlled event names, schema versions, and allowlisted properties.
- Never collect secrets, credentials, raw content/prompts, DOM snapshots, full URLs/referrers, or sensitive personal data by default.
- Derive user, organization, plan, environment, and ownership context on a trusted server when possible.
- Make trusted lifecycle events idempotent. Analytics failure must not break core product behavior.
- Define retention, deletion, access, and analysis ownership before launch.

## Event Template

| Field | Definition |
|---|---|
| Name/version | `{{CONTROLLED_NAME}}` / `{{VERSION}}` |
| Product question | {{QUESTION THIS ANSWERS}} |
| Trigger | {{EXACT SUCCESSFUL OR FAILED TRANSITION}} |
| Source | client / trusted server |
| Allowed properties | {{SMALL NON-SENSITIVE ALLOWLIST}} |
| Idempotency | {{KEY OR NOT APPLICABLE}} |
| Metric/funnel | {{DERIVED MEASURE}} |
| Verification | {{HOW EVENT AND PROPERTIES ARE PROVED}} |

## Feature Review

For every new user-visible feature, entitlement, or trusted lifecycle transition:

1. Decide which impression, reach, action, outcome, or server transition is needed—or record why no event is warranted.
2. Update the typed/validated registry before emitting the event.
3. Test allowed and forbidden properties.
4. Verify the event through production-safe diagnostics without exposing payload content.
5. Update this contract and any derived metric definitions.
