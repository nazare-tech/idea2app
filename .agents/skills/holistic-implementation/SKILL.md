---
name: holistic-implementation
description: This skill should be used for substantial feature, refactor, bug-fix, architecture, product, or implementation requests where Codex should first create and critique a holistic plan, ask clarifying questions, then implement the approved work in phases with red-green TDD, verification, code review, security review, remediation notes, and follow-through until complete.
---

# Holistic Implementation

Use this workflow for non-trivial implementation work. Skip it only for tiny, mechanical edits, direct questions, or urgent diagnostics where planning would add friction.

## Core Rule

Start with `plan-holistic` before implementation. Do not begin coding until the user explicitly approves the plan or asks to proceed.

## Workflow

1. Read `PROJECT_CONTEXT.md` before planning or answering architecture questions.
2. Invoke the `plan-holistic` skill for the user's request.
3. Create or update a plan file under `plans/` with:
   - Goal and assumptions
   - Clarifying questions
   - Architecture critique
   - Product and customer critique
   - Engineering implementation critique
   - Risk, security, and operations critique
   - Phased implementation checklist
   - Test strategy
   - Rollback or recovery notes where relevant
4. Ask the user the plan-holistic approval question: `Does this plan make sense as the first step?`
5. Ask any remaining high-value questions that would materially affect architecture, user experience, data model, security, or rollout.
6. After the user answers, update the plan file with decisions and scope changes before coding.
7. Implement in phases. For each phase:
   - Identify the smallest testable behavior.
   - Write or adjust a failing test first when the repo has a viable test surface.
   - Run the focused test and confirm the expected red state when practical.
   - Implement the smallest change that makes the test pass.
   - Run the focused test again and confirm green.
   - Refactor only after green, keeping changes scoped.
   - Update the plan checklist with completed and remaining work.
8. Use subagents for parallelizable, well-scoped exploration, implementation, or verification when useful. Keep ownership boundaries clear and avoid overlapping edits.
9. Continue through all phases. If the user has to say "finish the remaining work," reopen the plan checklist, identify incomplete items, and continue from the next unfinished phase rather than restarting.
10. After implementation, run the best available verification:
    - Unit, integration, typecheck, lint, or build checks for code changes.
    - Browser or visual verification for UI changes.
    - API requests, logs, or local validation for backend changes.
11. Perform a code review of the implemented diff from architecture and bug-risk perspectives. Record findings in the plan or a dedicated review markdown file.
12. Perform a security review for authentication, authorization, secrets, input validation, data access, payments, webhooks, SSR boundaries, and external API calls as applicable.
13. Write review and security findings to markdown before remediation. Prefer `plans/<same-slug>-review.md` unless the user requested a different path.
14. Implement the accepted review and security fixes using the same red-green verification loop where practical.
15. Rerun relevant verification after remediation.
16. Finish with a concise summary of:
    - What changed
    - What was verified
    - Any incomplete items or risks
    - Suggested next command or place to inspect

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
