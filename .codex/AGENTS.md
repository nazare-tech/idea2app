# AGENT Instructions

## Workflow Orchestration

### 1. Autonomous Plan Default

* For any non-trivial task (3+ steps or architectural decisions), create or update a markdown plan in `docs/plans/`
* Include clarifying questions with Recommendation A/B options and trade-offs
* Pick Recommendation A by default and proceed without waiting unless repo/user instructions, safety constraints, or `docs/plans/recommendation-selection-rules.md` point elsewhere
* If something goes sideways, STOP and re-plan immediately – don't keep pushing
* Include verification steps, not just building
* Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy

* Use subagents liberally to keep main context window clean
* Offload research, exploration, and parallel analysis to subagents
* For complex problems, throw more compute at it via subagents
* One tack per subagent for focused execution

### 3. Self-Improvement Loop

* After ANY correction from the user: update `docs/plans/recommendation-selection-rules.md` with the generalized decision rule once the root reason is clear
* When the correction involves a previous Recommendation A/B choice, ask why the corrected option better matched the user's intent before recording the rule
* Write rules for yourself that prevent the same mistake
* Ruthlessly iterate on these lessons until mistake rate drops
* Review lessons at session start for relevant project

### 4. Verification Before Done

* Never mark a task complete without proving it works
* For UI, visual, user-flow, or user-visible backend changes, verify through the real local UI as a real user and capture screenshot or video evidence for the thread
* Save verification screenshots/videos under `ui-evidence/` using a date/task subfolder; this directory lives inside the repo working tree but is ignored by Git. Include the exact path in the task thread and plan/review
* Do not patch routes, use fixtures, mock providers, skip auth, use dummy env values, or shorten asynchronous waits just to make UI verification faster
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

1. **Plan First**: Write plan to `docs/plans/<short-slug>-plan.md` with checkable items
2. **Select Defaults**: Record clarifying questions, choose Recommendation A by default, and continue without waiting unless blocked by safety or explicit user direction
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add or update `docs/plans/<short-slug>-review.md`
6. **Capture Lessons**: Update `docs/plans/recommendation-selection-rules.md` after corrections
7. **Backend History**: For backend, Supabase, auth/RLS, persistence, webhook, or data-shape changes, update `docs/plans/backend-change-history.md`
8. **UI Evidence**: For UI-visible work, attach screenshot/video evidence in the task thread and record artifact paths in the review. Store those files under `ui-evidence/`, which lives inside the repo working tree but is ignored by Git

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
6. If the interaction includes motion, loading, generation progress, or multiple steps, capture a short video instead of only a static screenshot when the browser workflow supports it

### Anti-slop defaults

Avoid generic AI-style frontend choices unless explicitly requested:
- no default Inter/Roboto/system-font look
- no purple-blue gradient clichés
- no cards-inside-cards layout spam
- no gray text on colored backgrounds
- no decorative glassmorphism everywhere

Prefer intentional typography, tinted neutrals, clear hierarchy, strong spacing rhythm, and purposeful motion.
