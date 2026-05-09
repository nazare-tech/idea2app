---
name: holistic-implementation
description: This skill should be used for substantial feature, refactor, bug-fix, architecture, product, or implementation requests where Codex should create a thread-specific branch, create and critique a holistic plan, ask clarifying questions, then implement the approved work in phases with red-green TDD, verification, code review, security review, remediation notes, and follow-through until complete.
---

# Holistic Implementation

Use this workflow for non-trivial implementation work. Skip it only for tiny, mechanical edits, direct questions, or urgent diagnostics where planning would add friction.

## Core Rule

Start with a holistic plan before implementation. Do not begin coding until the user explicitly approves the plan or asks to proceed.

## Branch Rule

Before changing files for a particular thread, create or switch to a new branch specifically for that thread. Prefer the repository's branch naming convention when one exists; otherwise use a concise `codex/<short-thread-slug>` branch name.

## Workflow

1. Read `PROJECT_CONTEXT.md` before planning or answering architecture questions.
2. Identify the user's planning target from the prompt.
3. If the target is too ambiguous to produce a useful plan, ask 3-15 concise clarifying questions before writing the file.
4. If there is enough information to make a reasonable first pass, create the plan first using explicit assumptions, then include 3-15 clarifying questions in the plan and in the response.
5. Save the plan as a markdown file. Use a user-specified path if provided. Otherwise create a sensible filename in the current workspace, such as `plans/<short-slug>-plan.md`; create the `plans/` directory if needed.
6. Create or update the plan file with:
   - Goal and assumptions
   - Clarifying questions
   - Recommended first step
   - Architecture critique
   - Product and customer critique
   - Engineering implementation critique
   - Risk, security, and operations critique
   - Phased implementation checklist
   - Milestones
   - Test strategy
   - Rollback or recovery notes where relevant
   - Open decisions
7. Ask the user the approval question: `Does this plan make sense as the first step?`
8. Show a candid critique after the approval question. Always include:
   - Software architect
   - Product manager
   - Customer or end user
   - Engineering implementer
   - Risk, security, or operations reviewer
9. Do not start executing the plan unless the user explicitly asks.
10. Ask any remaining high-value questions that would materially affect architecture, user experience, data model, security, or rollout.
11. After the user answers, update the plan file with decisions and scope changes before coding.
12. Implement in phases. For each phase:
   - Identify the smallest testable behavior.
   - Write or adjust a failing test first when the repo has a viable test surface.
   - Run the focused test and confirm the expected red state when practical.
   - Implement the smallest change that makes the test pass.
   - Run the focused test again and confirm green.
   - Refactor only after green, keeping changes scoped.
   - Update the plan checklist with completed and remaining work.
13. Use subagents for parallelizable, well-scoped exploration, implementation, or verification when useful. Keep ownership boundaries clear and avoid overlapping edits.
14. Continue through all phases. If the user has to say "finish the remaining work," reopen the plan checklist, identify incomplete items, and continue from the next unfinished phase rather than restarting.
15. After implementation, run the best available verification:
    - Unit, integration, typecheck, lint, or build checks for code changes.
    - Browser or visual verification for UI changes.
    - API requests, logs, or local validation for backend changes.
16. Perform a code review of the implemented diff from architecture and bug-risk perspectives. Record findings in the plan or a dedicated review markdown file.
17. Perform a security review for authentication, authorization, secrets, input validation, data access, payments, webhooks, SSR boundaries, and external API calls as applicable.
18. Write review and security findings to markdown before remediation. Prefer `plans/<same-slug>-review.md` unless the user requested a different path.
19. Implement the accepted review and security fixes using the same red-green verification loop where practical.
20. Rerun relevant verification after remediation.
21. Finish with a concise summary of:
    - What changed
    - What was verified
    - Any incomplete items or risks
    - Suggested next command or place to inspect

## Plan File Structure

Use this structure unless the user's request clearly calls for a different one:

```markdown
# Plan: <Clear Title>

## Goal
<One paragraph describing the outcome.>

## Assumptions
- <Assumption 1>
- <Assumption 2>

## Clarifying Questions
1. <Question 1>
2. <Question 2>
3. <Question 3>

## Recommended First Step
<The first concrete step to validate direction before doing larger work.>

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
- <Decision needed>

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
- Make the critique candid and useful, not performative.
- If the plan involves code, include likely files or modules to inspect, testing strategy, and rollback considerations.
- If the plan involves product or business work, include target users, success criteria, research needs, and launch or feedback loop.

## TDD Guidance

Prefer red-green TDD, but be honest when a true red state is impractical because the repo lacks test harnesses or the change is primarily visual. In that case, create the closest useful validation first, such as a reproduction script, failing typecheck expectation, focused browser assertion, or documented manual test case.

## Review Output

Use markdown for implementation review artifacts:

```markdown
# Review: <Feature Or Change>

## Scope
- <Files or behavior reviewed>

## Verification
- <Commands or browser checks run>

## Code Review Findings
- <Finding, severity, file, and fix status>

## Security Review Findings
- <Finding, severity, file, and fix status>

## Remediation Checklist
- [ ] <Fix>
```

## Completion Standard

Treat the work as incomplete until planned phases, tests, code review, security review, and accepted remediation are done or explicitly deferred with a reason.
