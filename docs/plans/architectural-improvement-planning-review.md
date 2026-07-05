# Review: Architectural Improvement Planning Loop

## Scope
- Updated the global holistic implementation skill at `/Users/Mukul/.codex/skills/holistic-implementation/SKILL.md`.
- Updated repo-local planning and workflow docs: `AGENTS.md`, `.codex/AGENTS.md`, `docs/plans/README.md`, `docs/plans/recommendation-selection-rules.md`, and `PROJECT_CONTEXT.md`.
- Added the implementation plan at `docs/plans/architectural-improvement-planning-plan.md`.

## Verification
- Ran `rg -n "Architecture Improvement Opportunities|Architecture Improvement Review|architecture-improvement|Cross-Cutting Architecture Defaults|bounded structured-output repair|fastest local patch" ...` across the global skill and repo docs.
- Inspected the patched global skill workflow and review template with `sed`.
- Inspected the repo diff for only the intended documentation changes.
- UI evidence was not meaningful because this change only affects local workflow documentation and skill instructions.

## Fresh-Eyes Self Review
- Pass 1: Re-read the global skill workflow numbering and template placement. No issues found.
- Pass 2: Re-read the repo-local reinforcement points for duplication and scope creep. Kept the wording scoped to "substantial" work and selected/deferred/rejected opportunities to avoid forcing broad refactors.

## Code Review Findings
- None. This was a documentation and workflow-instruction change; no application code was modified by this task.

## Architecture Improvement Review
- Durability/idempotency: Added as required planning prompts in the global skill, repo instructions, plan README, recommendation rules, and project context.
- Ownership/security validation: Added as an explicit planning and review consideration.
- Contract sync: Added prompt/parser/render/nav/test contract alignment language to the global skill and repo docs.
- Structured-output validation and repair bounds: Added bounded repair and typed validation language to the global skill, repo docs, and project architecture defaults.
- Recovery behavior: Added rollback/recovery hooks, durable intermediate state, and recovery paths as recurring planning considerations.
- Shared abstractions or intentionally retained duplication: Added reusable helper/module-boundary guidance while preserving over-engineering guardrails.
- Follow-up risks: Future agents may still write vague opportunities; the new review section is intended to catch that by requiring selected/deferred/rejected status and post-implementation confirmation.

## Security Review Findings
- None. No auth, RLS, secrets, runtime code, or data access paths changed.

## Remediation Checklist
- [x] Add required architecture opportunity section to the holistic implementation skill.
- [x] Add repo-local reinforcement to planning docs.
- [x] Add recommendation-selection override for architectural durability over fastest local patch.
- [x] Document verification and residual risk.
