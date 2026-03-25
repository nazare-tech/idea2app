# AGENT Instructions

## Workflow Orchestration

### 1. Plan Mode Default

* Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
* If something goes sideways, STOP and re-plan immediately – don't keep pushing
* Use plan mode for verification steps, not just building
* Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy

* Use subagents liberally to keep main context window clean
* Offload research, exploration, and parallel analysis to subagents
* For complex problems, throw more compute at it via subagents
* One tack per subagent for focused execution

### 3. Self-Improvement Loop

* After ANY correction from the user: update `tasks/lessons.md` with the pattern
* Write rules for yourself that prevent the same mistake
* Ruthlessly iterate on these lessons until mistake rate drops
* Review lessons at session start for relevant project

### 4. Verification Before Done

* Never mark a task complete without proving it works
* Diff behavior between main and your changes when relevant
* Ask yourself: "Would a staff engineer approve this?"
* Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)

* For non-trivial changes: pause and ask "is there a more elegant way?"
* If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
* Skip this for simple, obvious fixes – don't over-engineer
* Challenge your own work before presenting it

### 6. Autonomous Bug Fixing

* When given a bug report: just fix it. Don't ask for hand-holding
* Point at logs, errors, failing tests – then resolve them
* Zero context switching required from the user
* Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles

* **Simplicity First**: Make every change as simple as possible. Impact minimal code.
* **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
* **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

## Frontend Design Standard (Impeccable)

For any frontend/UI work in this repo, use the vendored Impeccable design guidance under `.codex/impeccable/`.

### Required flow for frontend tasks

1. Read `.codex/impeccable/skills/frontend-design/SKILL.md`
2. Consult relevant references under `.codex/impeccable/skills/frontend-design/reference/`
3. Implement with a clear aesthetic direction instead of generic AI UI patterns
4. Before returning control, run a self-review using:
   - `.codex/impeccable/skills/polish/SKILL.md`
   - `.codex/impeccable/skills/audit/SKILL.md`
5. If changes are visual, capture a screenshot as part of validation

### Anti-slop defaults

Avoid generic AI-style frontend choices unless explicitly requested:
- no default Inter/Roboto/system-font look
- no purple-blue gradient clichés
- no cards-inside-cards layout spam
- no gray text on colored backgrounds
- no decorative glassmorphism everywhere

Prefer intentional typography, tinted neutrals, clear hierarchy, strong spacing rhythm, and purposeful motion.
