---
implemented: false
implemented_at:
implementation_summary:
---

# Plan: {{TITLE}}

## Goal
{{OUTCOME}}

## Assumptions
- {{ASSUMPTION}}

## Clarifying Questions
1. {{DECISION}}
   - Recommendation A: {{OPTION}}
   - Trade-off: {{BENEFIT/COST}}
   - Recommendation B: {{OPTION}}
   - Trade-off: {{BENEFIT/COST}}
   - Selected: {{A/B/OPEN + REASON}}

## Recommended First Step
{{SMALLEST VALIDATION}}

## Cross-Model Plan Evaluation
- Artifact: `docs/plans/{{SLUG}}-plan-eval.md`
- Findings accepted:
- Findings rejected with reason:
- Re-evaluation required after material revision: yes/no

## Runtime And Change-Impact Analysis

### Repeated Work
- Trigger/cadence, expected and worst-case frequency:
- Work per update:

### Ownership, Scope, And Lifetime
- Narrowest owner:
- Start, stop, reset, navigation, retry, restart, completion:
- Propagation/fan-out:

### Boundary And Cache Semantics
- Contract changes:
- Cache keys, freshness, invalidation:
- Compatibility, rollout, mixed versions:

### Failure And Recovery
- Partial, duplicate, delayed, stale, out-of-order behavior:
- Blast radius:
- Kill switch, rollback, recovery:

### Risk-Matched Verification

| Risk | Observable evidence | Acceptance threshold |
|---|---|---|
| {{RISK}} | {{TEST/TRACE/LOG/PROFILE/REAL FLOW}} | {{PASS CONDITION}} |

## Architecture Improvement Opportunities

| Opportunity | Benefit | Trade-off | Boundaries/files | Status |
|---|---|---|---|---|
| {{CHANGE}} | {{BENEFIT}} | {{COST}} | {{BOUNDARY}} | Selected/deferred/rejected |

## Implementation Phases
- [ ] {{PHASE + VALIDATION}}

## Test Strategy
- {{FOCUSED AND FULL CHECKS}}

## Rollback Or Recovery
- {{SAFE BACKOUT}}

## Open Decisions
- None.

## Critique

### Software Architect
- {{CRITIQUE}}

### Product Manager
- {{CRITIQUE}}

### Customer Or End User
- {{CRITIQUE}}

### Engineering Implementer
- {{CRITIQUE}}

### Risk, Security, Or Operations
- {{CRITIQUE}}
