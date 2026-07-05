---
implemented: true
implemented_at: 2026-07-05T14:44:53.1516781-04:00
implementation_summary: Added AI Prompts as a display-only derived row in post-submit onboarding and manual Generate All progress while keeping the durable generation queue unchanged.
---

# AI Prompts Derived Progress Row Plan

## Goal

Show AI Prompts in the post-submit onboarding progress UI and manual Generate All progress list without turning AI Prompts into a real generation artifact.

## Assumptions

- AI Prompts remains derived from Product Plan and First Version Plan.
- It must not create a database table, queue item, credit charge, external AI call, or PDF export type.
- The row should reassure users that the handoff prompt section is part of the generated workspace.

## Clarifying Questions

- Should AI Prompts be a real queue item? Recommendation A: no, keep it display-only. The user accepted this recommendation.

## Recommendation A/B Choices

- Recommendation A: Add AI Prompts as a derived display row whose status is calculated from upstream PRD/MVP readiness. Selected because it matches the current architecture.
- Recommendation B: Add `ai-prompts` to `GENERATE_ALL_QUEUE_ORDER`. Rejected because it would imply persistence, costs, and executor behavior that the project context explicitly avoids.

## Selected Recommendation

Recommendation A.

## Implementation Phases

1. Add an `ai-prompts` loading row key and default onboarding loading row.
2. Derive onboarding AI Prompts status from PRD and MVP completion plus upstream queue activity.
3. Add a display-only AI Prompts row to the manual Generate All block after Design Mockups.
4. Add or update tests proving AI Prompts is visible but not part of the actual generation queue.

## Test Strategy

- Focused tests for onboarding row mapping.
- Focused tests for intake loading panel status/icon typing.
- Focused Generate All helper tests to ensure the actual queue order remains unchanged.
- Typecheck and lint touched files.

## Rollback Or Recovery Notes

Revert the display-row additions and tests. No persisted data or migrations are involved.

## Architecture Improvement Opportunities

- Selected: Keep derived display logic separate from durable queue construction. Benefit: users see the section in progress UI without expanding backend state.
- Deferred: Centralize derived-progress-row helpers shared by onboarding and manual Generate All. Benefit: reduces duplication. Trade-off: current logic is small and introducing shared UI helper indirection may be premature.
- Rejected: Add AI Prompts to document definitions. Benefit: easier generic row rendering. Trade-off: it would make a non-document look like a real document type.

## Candid Critique

- Architecture: The approach preserves the source-of-truth contract but adds some UI-only derivation.
- Product: The loading experience now matches the final workspace promise more clearly.
- Customer: Users should no longer wonder where AI Prompts went during generation.
- Engineering: Tests need to guard against accidentally making AI Prompts a queued item later.
- Risk/Security: No auth, persistence, secret, or external API surface changes.
