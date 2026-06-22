# Linear Issue Format

Linear is the source of truth for actionable work. Repo docs should link to Linear issues, not maintain a separate task backlog.

## Issue Body Template

```md
## Source

Research:
Meeting:
Decision:

## Problem / Context

## Sanitized Evidence

Paraphrased evidence only. Do not paste raw transcript excerpts.

## Proposed Action

## Acceptance Criteria

- [ ] 

## Non-Goals

## Notes
```

## Label Taxonomy

Use labels to describe source, product area, type, and special risk. Do not use labels for status, assignee, cycle, due date, or priority when Linear has native fields for those.

### Source Labels

```text
source:research
source:meeting
source:customer
source:internal
source:slack
```

### Area Labels

```text
area:onboarding
area:workspace
area:generation
area:market-research
area:product-plan
area:first-version-plan
area:mockups
area:prompt-lab
area:billing
area:auth
area:landing
area:infra
```

### Type Labels

The Linear workspace already has these canonical labels:

```text
Feature
Improvement
Bug
```

Use these additional type labels when the existing labels are not specific enough:

```text
type:ux
type:tech-debt
type:decision-followup
type:investigation
type:experiment
```

### Risk Labels

```text
risk:privacy
risk:security
risk:revenue
risk:stability
```

## Labeling Guidance

- Every transcript-derived issue should have exactly one `source:*` label.
- Add one or more `area:*` labels when the product surface is clear.
- Add one work-type label such as `Feature`, `Improvement`, `Bug`, or one `type:*` label.
- Add `risk:*` labels only when the risk is materially relevant.
- Use `source:slack` only when Slack is the source of the issue. Do not use Slack as the task tracker.
