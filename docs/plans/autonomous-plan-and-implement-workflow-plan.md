---
implemented: true
implemented_at: 2026-06-29T14:12:32Z
implementation_summary: Added durable repo-local defaults for autonomous Recommendation A selection and feedback/history files under docs/plans; later refined so /holistic-implementation remains the active full workflow skill.
---

# Plan: Autonomous Plan And Implement Workflow

## Goal
Update repo instructions so substantial work starts with a plan and clarifying Recommendation A/B trade-offs, defaults to Recommendation A without waiting, completes implementation and verification, and captures later feedback as generalized decision rules.

Update after follow-up: `/holistic-implementation` remains the active full workflow skill; this repo's `AGENTS.md` supplies the autonomous Recommendation A selection and feedback-capture policy.

## Assumptions
- The recommendation-selection behavior should be repo-local; the full workflow can live in the global Codex skill.
- `docs/plans/` should be the canonical location for plans, reviews, recommendation feedback, and backend change history.
- The workflow should still stop for destructive, secret-bearing, costly, security-sensitive, or irreversible actions.
- Backend history should be human-readable even when Supabase, migrations, or git also preserve technical history.

## Clarifying Questions
1. Should the repo keep using `/holistic-implementation` by default?
   - Recommendation A: Stop using it by default and encode the desired autonomous workflow in `AGENTS.md`.
   - Trade-off: Matches the desired no-wait flow, but duplicates some skill guidance locally.
   - Recommendation B: Edit the global skill itself.
   - Trade-off: Applies everywhere, but may affect other repos that still want approval before implementation.
   - Selected: Recommendation A.
2. Where should recommendation feedback live?
   - Recommendation A: Store generalized rules in `docs/plans/recommendation-selection-rules.md`.
   - Trade-off: Keeps feedback close to plans, but agents must remember to read/update it.
   - Recommendation B: Store feedback only in `.codex/AGENTS.md`.
   - Trade-off: Easier for agent startup, but less connected to plan/review artifacts.
   - Selected: Recommendation A.
3. Should backend history be separate from plan/review files?
   - Recommendation A: Add `docs/plans/backend-change-history.md`.
   - Trade-off: Creates one durable backend log, but requires an extra update for backend work.
   - Recommendation B: Rely on individual plans, reviews, Supabase history, and git.
   - Trade-off: Avoids another file, but spreads operational history across several sources.
   - Selected: Recommendation A.

## Recommended First Step
Update `AGENTS.md` and `.codex/AGENTS.md` so both instruction layers agree on the autonomous default and feedback capture flow.

## Plan
1. Replace the default `/holistic-implementation` instruction in `AGENTS.md` with the autonomous plan-and-implement workflow.
2. Mark `/holistic-implementation` as an explicit legacy skill only.
3. Align `.codex/AGENTS.md` task-management guidance with `docs/plans/`, default Recommendation A selection, and feedback capture.
4. Add `docs/plans/README.md` to document naming and metadata conventions.
5. Add `docs/plans/recommendation-selection-rules.md` for generalized feedback and override rules.
6. Add `docs/plans/backend-change-history.md` for durable backend change notes.
7. Add review notes and run basic markdown/diff validation.

## Validation
- Inspect the diff for contradictions with the requested workflow.
- Run `git diff --check` to catch whitespace issues.
- Confirm no application code or backend behavior was changed for this instruction-only update.

## Risks And Mitigations
- Risk: The global skill may still be triggered by skill metadata.
  - Mitigation: Repo instructions now say to use the local autonomous workflow unless the user explicitly asks for `/holistic-implementation`.
- Risk: Agents may over-apply Recommendation A when safety matters.
  - Mitigation: Explicit stop conditions cover destructive, security-sensitive, costly, irreversible, and credential-dependent actions.
- Risk: Feedback becomes too specific to one incident.
  - Mitigation: The recommendation rules file requires capturing the root reason before recording a rule.

## Rollback Or Recovery
Revert the changes to `AGENTS.md`, `.codex/AGENTS.md`, and the new `docs/plans` workflow files. No app data, database schema, or runtime behavior is affected.

## Open Decisions
- Decision: Use `docs/plans/` as the canonical planning and workflow-feedback location.
- Decision: Keep the global holistic implementation skill unchanged.
- Decision: Default to Recommendation A while preserving explicit safety stops.

## Critique

### Software Architect
- Keeping the workflow local to the repo avoids surprising other projects and fits the existing `docs/plans` convention.

### Product Manager
- The flow reduces approval bottlenecks while still leaving a clear path for later correction and learning.

### Customer Or End User
- The main benefit is faster execution. The main risk is a wrong default choice, handled by the feedback loop and generalized rule capture.

### Engineering Implementer
- The instructions are explicit enough to follow, but future agents must consistently read `AGENTS.md` and relevant `docs/plans` files before substantial work.

### Risk, Security, Or Operations
- The stop conditions are necessary. Recommendation A should never override data safety, secrets handling, RLS/auth boundaries, or production-risk checks.
