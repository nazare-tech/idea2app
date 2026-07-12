---
name: holistic-implementation
description: This skill should be used for substantial feature, refactor, bug-fix, architecture, product, or implementation requests where Codex should use the current branch unless the user explicitly asks for a new branch, create and critique a holistic plan, ask decision-oriented clarifying questions with recommendations, follow the active workspace approval or autonomy policy, then implement in phases with red-green TDD, verification, code review, security review, remediation notes, and follow-through until complete.
---

# Holistic Implementation

Use this workflow for non-trivial implementation work. Skip it only for tiny, mechanical edits, direct questions, or urgent diagnostics where planning would add friction.

## Core Rule

Start with a holistic plan before implementation.

The active workspace or user instructions decide whether to pause for approval or proceed autonomously after selecting recommended answers. If workspace instructions specify a default recommendation-selection policy, such as choosing Recommendation A unless a safety rule or explicit user instruction says otherwise, follow that policy. If no workspace or user instruction overrides the default, ask for approval before coding.

## Branch Rule

Stay on the current branch. Do not create or switch branches unless the user explicitly asks for a new branch.

## Workspace Instruction Rule

Before planning, read the active repo instructions and context sources, such as `AGENTS.md`, `.codex/AGENTS.md`, `PROJECT_CONTEXT.md`, or their local equivalents when they exist. Treat those files as the source of truth for:

- Plan location, naming, and metadata conventions.
- Whether to wait for approval or proceed autonomously.
- How to choose between Recommendation A, Recommendation B, or another option.
- Where to record reviews, backend history, lessons, remediation notes, and feedback.
- Required verification tools, browser workflows, credentials handling, or documentation updates.

If the workspace has no plan-location rule, prefer `docs/plans/<short-slug>-plan.md` when `docs/plans/` exists, otherwise use `plans/<short-slug>-plan.md`.

## Workflow

1. Read the repo's required context source before planning or answering architecture questions. If `PROJECT_CONTEXT.md` exists and repo instructions require it, read it first.
2. Identify the user's planning target from the prompt.
3. Inspect only the source files, docs, tests, configs, or runtime surfaces needed to make a grounded plan.
4. Run a runtime and change-impact analysis before finalizing the plan. For repeated work such as timers, polling, streams, subscriptions, retries, render or processing loops, queues, scheduled jobs, and cache refreshes, record expected and worst-case frequency, work performed per update, ownership/scope/lifetime, update propagation or consumer fan-out, and blast radius. For shared state, caches, persistence, and inter-system contracts, record reset or invalidation semantics, partial/duplicate/delayed/stale/out-of-order behavior, compatibility expectations, rollout behavior, and rollback or recovery seams. Frequently changing state or repeated work should live at the narrowest practical ownership boundary; placement at a wider boundary requires a measured reason.
5. Match each material runtime or change-impact risk to an observation capable of detecting it, such as profiling, tracing, timing, counters, contract tests, lifecycle tests, fault injection, logs, or real-flow verification. State a concrete acceptance threshold. Do not accept generic statements such as "performance considered" or rely on screenshots or unit tests for risks they cannot observe.
6. Run an architecture-improvement scouting pass before finalizing the plan. Identify concrete ways the work could make the system more durable, reusable, scalable, modular, secure, observable, or easier to evolve. Prefer task-relevant opportunities such as idempotent writes, resumable/durable intermediate state, ownership and permission checks at trust boundaries, parser/prompt/render contract alignment, dynamic compatibility safety nets, bounded structured-output repair, shared helpers for duplicated logic, clearer module boundaries, lazy/progressive loading, and rollback/recovery hooks.
7. For each architecture opportunity, state the benefit, trade-off, likely files or boundaries, and whether it is selected for this implementation, deferred, or intentionally rejected as over-engineering. Keep the opportunities scoped to the user's goal; do not expand into speculative platform work unless the workspace or user explicitly asks for it.
8. If the target is too ambiguous to produce a useful plan, ask concise clarifying questions only when the active workspace policy requires waiting. Otherwise, create the plan with explicit assumptions and recommended default answers.
9. For each clarifying question, provide two concrete recommended answers and briefly explain the trade-off of each recommendation. Use labels `Recommendation A` and `Recommendation B` unless the workspace asks for another format.
10. Select answers according to the active workspace policy. If the workspace gives no selection policy, mark the questions as open and ask for approval before implementation.
11. Save the plan as a markdown file. Use a user-specified path if provided. Otherwise follow the workspace plan-location rule; prefer `docs/plans/` when present.
12. Create or update the plan file with:
   - Front matter with implementation status when the workspace convention uses it.
   - Goal and assumptions.
   - Clarifying questions.
   - Two recommended answer options with trade-offs for each clarifying question.
   - Selected recommendation or open-decision status for each question.
   - Recommended first step.
   - Runtime and change-impact analysis, including repeated-work cadence, ownership/scope/lifetime, propagation fan-out, boundary and cache semantics, failure/recovery behavior, and risk-matched verification with acceptance thresholds.
   - Architecture improvement opportunities, including selected, deferred, or rejected opportunities with trade-offs.
   - Architecture critique.
   - Product and customer critique.
   - Engineering implementation critique.
   - Risk, security, and operations critique.
   - Phased implementation checklist.
   - Milestones.
   - Test strategy.
   - Rollback or recovery notes where relevant.
   - Open decisions.
13. Show a concise plan summary in the response, including the selected recommendations, selected architecture opportunities, deferred opportunities, or unresolved decisions.
14. Follow the active workspace execution policy:
    - If it says to proceed autonomously, start implementation after writing the plan.
    - If it requires approval, ask: `Does this plan make sense as the first step?` and wait.
    - If the plan involves destructive action, overwriting existing files, spending money, secrets, authorization/RLS weakening, production changes, or missing credentials, stop and ask unless the user gave explicit authorization for that exact risk.
15. Ask any remaining high-value questions that would materially affect architecture, user experience, data model, security, rollout, cost, or reversibility. Include Recommendation A/B choices and trade-offs.
16. If the user answers or corrects recommendations, update the plan file with decisions, architecture opportunity selections, and scope changes before coding or before continuing.
17. Implement in phases. For each phase:
    - Identify the smallest testable behavior.
    - Write or adjust a failing test first when the repo has a viable test surface.
    - Run the focused test and confirm the expected red state when practical.
    - Implement the smallest change that makes the test pass.
    - Run the focused test again and confirm green.
    - Refactor only after green, keeping changes scoped.
    - Update the plan checklist with completed and remaining work.
18. Use subagents for parallelizable, well-scoped exploration, implementation, verification, review, or security analysis when the runtime provides them and the workspace authorizes their use. Keep ownership boundaries clear and avoid overlapping edits.
19. Continue through all phases. If the user has to say `finish the remaining work`, reopen the plan checklist, identify incomplete items, and continue from the next unfinished phase rather than restarting.
20. After implementation, run the best available verification:
    - Unit, integration, typecheck, lint, or build checks for code changes.
    - Browser or visual verification for UI changes.
    - Real user-flow verification through the application UI for UI, visual, user-flow, or user-visible backend changes.
    - Screenshot or video evidence for UI-visible behavior, shared in the user thread and recorded in the plan or review artifact when the workspace supports attachments or local artifact paths.
    - API requests, logs, migrations, RLS checks, or local validation for backend changes.
21. For UI-visible work, follow the Real User UI Verification section before Fresh-Eyes Self Review.
22. Run the Fresh-Eyes Self Review when code or behavior changed. Skip it only for non-code work, pure planning, or tiny mechanical edits, and record the deferral reason.
23. Perform a code review of the implemented diff from architecture and bug-risk perspectives. Explicitly check whether the selected architecture opportunities were implemented, whether any deferred opportunity has become necessary, and whether the implementation introduced new duplication, brittle contracts, non-idempotent paths, authorization gaps, or recovery blind spots. Record findings in the plan or a dedicated review markdown file.
24. Perform a security review for authentication, authorization, secrets, input validation, data access, payments, webhooks, SSR boundaries, external API calls, migrations, RLS policies, and credential handling as applicable.
25. Write review and security findings to markdown before remediation. Use the workspace review-location rule; otherwise prefer a sibling review file such as `docs/plans/<same-slug>-review.md` or `plans/<same-slug>-review.md`.
26. Implement accepted review and security fixes using the same red-green verification loop where practical.
27. Rerun relevant verification after remediation, including updated UI evidence when the remediation changes UI-visible behavior.
28. If the workspace requires backend, data, or operations history, update that history file for backend, database, auth/RLS, webhook, persistence, data-shape, queue, or external integration changes. Include intent, durable source of truth, verification, rollback, and follow-ups. Never record secrets.
29. If the user later corrects a selected recommendation or architecture opportunity, adjust the implementation when practical, ask for the root reason behind the corrected choice, and update the workspace's recommendation-selection or lessons file with the generalized rule.
30. After all planned phases, verification, review, security review, accepted remediation, and required history updates are complete, update the original plan file completion metadata at the top:
    - Set `implemented: true`.
    - Set `implemented_at: <ISO 8601 timestamp>`.
    - Add or update `implementation_summary:` with one concise sentence when useful.
    - If work is intentionally deferred or only partially implemented, leave `implemented: false` and record the remaining items or deferral reason instead.
31. Finish with a concise summary of:
    - What changed.
    - What was verified.
    - Screenshot or video evidence paths for UI-visible changes, or why UI evidence was not meaningful or was blocked.
    - Any incomplete items or risks.
    - Suggested next command or place to inspect.

## Plan File Structure

Use this structure unless the user's request or workspace convention clearly calls for a different one:

```markdown
---
implemented: false
implemented_at:
implementation_summary:
---

# Plan: <Clear Title>

## Goal
<One paragraph describing the outcome.>

## Assumptions
- <Assumption 1>
- <Assumption 2>

## Clarifying Questions
1. <Question 1>
   - Recommendation A: <Concrete answer and when to choose it>
   - Trade-off: <Benefit and cost>
   - Recommendation B: <Concrete answer and when to choose it>
   - Trade-off: <Benefit and cost>
   - Selected: <Recommendation A/B/open, with reason>
2. <Question 2>
   - Recommendation A: <Concrete answer and when to choose it>
   - Trade-off: <Benefit and cost>
   - Recommendation B: <Concrete answer and when to choose it>
   - Trade-off: <Benefit and cost>
   - Selected: <Recommendation A/B/open, with reason>

## Recommended First Step
<The first concrete step to validate direction before doing larger work.>

## Runtime and Change-Impact Analysis

### Repeated Work
- <Timers, polling, streams, subscriptions, retries, render/processing loops, queues, scheduled jobs, cache refreshes, or other hot paths>
- Expected and worst-case frequency: <Cadence or volume>
- Work per update: <Computation, I/O, allocation, serialization, propagation, or external calls>

### Ownership, Scope, And Lifetime
- New or changed state/resource: <State, connection, task, cache entry, buffer, or other resource>
- Narrowest practical owner, scope, and lifetime: <Boundary and lifecycle>
- Update propagation, recomputation, or consumer fan-out: <Affected dependents>
- Reset, disposal, navigation, retry, restart, and completion behavior: <Lifecycle semantics>

### Boundary And Cache Semantics
- Contract changes: <Client/server, parser/renderer, service/service, queue, persistence, event, or third-party boundaries>
- Cache keys, invalidation, freshness, and stale-data behavior: <Rules or not applicable>
- Backward/forward compatibility, rollout, and mixed-version behavior: <Expectations>

### Failure And Recovery
- Partial, duplicate, delayed, stale, and out-of-order behavior: <Expected handling>
- Failure blast radius: <Affected users, requests, workers, data, or subsystems>
- Kill switch, rollback seam, or recovery path: <Mechanism>

### Risk-Matched Verification
| Risk | Observable evidence or test | Acceptance threshold |
|---|---|---|
| <Named risk> | <Profiling, tracing, timing, counters, contract/lifecycle/fault tests, logs, real-flow evidence, etc.> | <Concrete pass condition> |

## Architecture Improvement Opportunities
- <Opportunity>: <Benefit, trade-off, likely files or boundaries, and selected/deferred/rejected status>
- <Opportunity>: <Benefit, trade-off, likely files or boundaries, and selected/deferred/rejected status>

## Plan
1. <Step with concrete output and validation>
2. <Step with concrete output and validation>
3. <Step with concrete output and validation>

## Milestones
- <Milestone>: <definition of done>

## Validation
- <How to confirm the work is correct>

## Risks And Mitigations
- <Risk>: <Mitigation>

## Rollback Or Recovery
- <How to back out or recover if the implementation causes problems>

## Open Decisions
- <Decision needed or `None`>

## Critique

### Software Architect
- <Critique>

### Product Manager
- <Critique>

### Customer Or End User
- <Critique>

### Engineering Implementer
- <Critique>

### Risk, Security, Or Operations
- <Critique>
```

## Plan Quality Bar

- Keep the plan specific enough that the next action is obvious.
- Prefer phased plans with validation after each meaningful step.
- Separate assumptions from facts.
- Call out dependencies, sequencing constraints, and unknowns.
- Trace material runtime mechanisms from cadence or trigger through ownership, work, propagation, failure impact, and measurable evidence.
- Keep frequently changing state and repeated work at the narrowest practical ownership boundary unless measurement justifies a wider scope.
- Match verification to the risk being claimed; do not use a test or artifact that cannot observe the failure mode.
- Make the critique candid and useful, not performative.
- If the plan involves code, include likely files or modules to inspect, testing strategy, and rollback considerations.
- If the plan involves product or business work, include target users, success criteria, research needs, and launch or feedback loop.
- Clarifying questions must be decision-oriented. Do not ask open-ended questions without also giving two concrete recommended answers and concise trade-offs, so the user can choose or correct direction quickly.
- Record selected recommendations when the workspace policy chooses defaults.
- Record genuinely blocked or safety-sensitive decisions as open decisions instead of pretending they are settled.

## TDD Guidance

Prefer red-green TDD, but be honest when a true red state is impractical because the repo lacks test harnesses or the change is primarily visual. In that case, create the closest useful validation first, such as a reproduction script, failing typecheck expectation, focused browser assertion, API request, migration dry-run, or documented manual test case.

## Real User UI Verification

For UI, visual, user-flow, or user-visible backend changes, verify through the real application UI as a user would experience it. Use the active workspace's preferred browser workflow, auth flow, test credentials, local environment, and artifact-capture conventions.

Do not patch routes, stub providers, use fixture modes, bypass auth, use dummy environment values, disable database calls, shorten waits, or skip real image/AI generation only to make verification faster. If the real dependency is unavailable, blocked, unsafe, credential-gated, or would spend money unexpectedly, stop and report that blocker instead of faking the UI path.

Capture evidence for UI-visible changes:

- Use screenshots for static states.
- Use short video when motion, loading, generation progress, streaming, or multi-step flows matter.
- Share the evidence in the user thread when the interface supports it, and record artifact paths, route, viewport, and tested state in the plan or review.
- Avoid exposing secrets, raw credentials, private keys, tokens, or unrelated private user data in screenshots or videos.

For backend changes, look for the real UI path that proves the backend behavior when one exists. If only API, log, database, migration, or RLS verification is meaningful, explain why there is no useful UI evidence.

## Fresh-Eyes Self Review

Use these passes after implementation verification and before the formal code/security review when code or behavior changed:

1. Read all newly written code and existing code modified during the task with fresh eyes. Look carefully for obvious bugs, errors, problems, confusing logic, mismatched assumptions, edge-case failures, naming drift, incomplete states, or user-facing inconsistencies. Fix anything uncovered and rerun the most relevant focused verification.
2. Repeat the review from scratch after the first pass. Be deliberately meticulous about blunders, mistakes, oversights, omissions, misconceptions, regressions, and integration gaps. Fix anything uncovered and rerun focused verification where practical.

Record these passes in the plan or review artifact with the files reviewed, issues found, fixes made, and verification rerun. If no issues are found, record that explicitly.

## Review Output

Use markdown for implementation review artifacts:

```markdown
# Review: <Feature Or Change>

## Scope
- <Files or behavior reviewed>

## Verification
- <Commands or browser checks run>

## Fresh-Eyes Self Review
- <Passes run, issues found, fixes made, and verification rerun>

## Code Review Findings
- <Finding, severity, file, and fix status>

## Architecture Improvement Review
- <Whether selected opportunities landed, deferred opportunities remain valid, and any new architecture risks were found>

## Security Review Findings
- <Finding, severity, file, and fix status>

## Remediation Checklist
- [ ] <Fix>
```

## Backend And Data History

When backend, database, auth/RLS, webhook, persistence, queue, external API, or data-shape behavior changes, record a durable history entry if the workspace has a history file. Include:

- Plan and review links.
- Durable source of truth.
- Schema or data-shape changes.
- Auth, RLS, or permission changes.
- Runtime/API behavior changes.
- Migration or deployment steps.
- Verification.
- Rollback or recovery.
- Follow-ups.

Never record secrets, tokens, passwords, private keys, or raw credential values.

## Recommendation Feedback Loop

When the user says a different recommendation should have been chosen:

1. Do not defend the old choice by default.
2. Update the implementation to match the corrected recommendation when practical.
3. Ask what underlying preference, constraint, or product principle made the corrected recommendation better.
4. Record the generalized rule in the workspace's lessons or recommendation-selection file after the root reason is clear.
5. Link the relevant plan or review artifact when useful.

## Completion Standard

Treat the work as incomplete until planned phases, tests, real user UI verification and evidence when applicable, Fresh-Eyes Self Review when applicable, code review, security review, accepted remediation, required history or feedback updates, and the final plan metadata update are done or explicitly deferred with a reason.
