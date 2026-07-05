---
implemented: true
implemented_at: 2026-06-30T13:05:00Z
implementation_summary: "Implemented the four actionable document-structure tickets, fixed the intake normalized-question-count UI bug found during baseline creation, captured before/after artifacts for Idea 1.1 and Idea 2.1, and documented the real-UI-first workflow rule."
---

# Plan: Actionable Document Structure Updates

## Goal
Implement the four highly actionable document-structure Linear tickets: NAZ-66, NAZ-88, NAZ-92, and NAZ-96. Before changing behavior, create real baseline projects for standardized intake cases Idea 1.1 and Idea 2.1, generate the full onboarding artifact set, and save before artifacts so the changed output can be compared against after artifacts from the same cases.

## Assumptions
- Work stays on `main`; a checkpoint commit already captured the pre-work state as `a3cf1cf5`.
- Real local generation should use the existing local environment and authenticated test user, not fixtures or dummy env values.
- Bounded OpenRouter/Supabase spend is acceptable because the user explicitly requested full before/after project generation.
- The output changes should favor new generated documents; the user explicitly said not to care about backward compatibility.
- The core implementation surface is prompt contracts, parser/view-model tolerance, and renderer ordering, not database schema.
- During baseline creation, the real UI exposed an intake bug where platform-question normalization could collapse a 4-question AI response to 3 visible questions. This must be fixed before continuing through the UI.

## Clarifying Questions
1. How should baseline artifacts be captured?
   - Recommendation A: Capture raw markdown/metadata through authenticated app APIs or server-side reads, plus mockup image URLs and downloaded/proxied images where practical.
   - Trade-off: Best for diffing and repeatable review, but less visual than screenshots alone.
   - Recommendation B: Capture screenshots of every workspace section only.
   - Trade-off: Good visual evidence, but hard to diff generated text and brittle for long documents.
   - Selected: Recommendation A, with UI screenshots added for final verification because the user specifically asked for comparable saved sections and mockups.
2. How should the four tickets map into output structure?
   - Recommendation A: Make generated artifacts risk/action-first: Product Plan opens with goals, timeline, team, and success thresholds; First Version Plan consolidates core flow/features, clarifies validation thresholds, removes cut-list-style clutter, and surfaces next actions before build handoff.
   - Trade-off: Strongly addresses the tickets and founder comprehension, but changes the prompt contract and requires parser/render checks.
   - Recommendation B: Keep generated markdown mostly stable and only rearrange display sections in the React renderer.
   - Trade-off: Lower risk to prompt generation, but stored artifacts remain confusing and API/export output does not improve.
   - Selected: Recommendation A because the user does not require backward compatibility and wants the project document structure changed.
3. Should old completed tickets be reopened or edited in Linear?
   - Recommendation A: Do not alter Linear ticket state during implementation except final reporting; the user asked us to do the work, not triage statuses now.
   - Trade-off: Avoids incorrect workflow updates while code is still unverified.
   - Recommendation B: Move NAZ-66/88/92/96 to In Progress immediately.
   - Trade-off: More Linear bookkeeping, but adds tool churn before implementation outcome is known.
   - Selected: Recommendation A.

## Recommended First Step
Create and verify the before-capture harness for Idea 1.1 and Idea 2.1, because the value of the implementation depends on having comparable generated artifacts.

## Plan
1. Confirm or start the real local dev server, authenticate with `.env.e2e.local`, and create two baseline projects through the real `/projects/new` UI using Idea 1.1 and Idea 2.1. Status: completed for both baseline projects.
2. Fix the discovered intake question-count mismatch before continuing baseline creation. Status: completed with parser, UI guard, and regression tests.
3. Let onboarding generation complete for each baseline project. Save raw markdown/metadata for Overview, Market Research, Product Plan, First Version Plan, Design Mockups, and derived AI Prompts under `ui-evidence/2026-06-30-document-structure/before/`. Status: completed.
4. Implement prompt and rendering updates for NAZ-66, NAZ-88, NAZ-92, and NAZ-96 in focused phases. Status: completed.
5. Run parser/unit tests and type/lint checks relevant to planning documents. Status: completed.
6. Create two after projects using the same standardized intake cases, capture comparable artifacts under `ui-evidence/2026-06-30-document-structure/after/`, and save at least one representative workspace screenshot per project. Status: completed for raw artifacts and mockups. The in-app browser and Chrome controller both became unavailable after baseline creation, so the after projects were generated through the same server-side generation service and Supabase-backed queue pipeline instead of direct browser interaction. Screenshot evidence could not be captured for the after projects because the browser controllers were unavailable.
7. Review the diff, perform fresh-eyes/code/security review, remediate findings, and write a review artifact. Status: completed in `docs/plans/actionable-document-structure-review.md`.

## Milestones
- Baseline captured: two real before projects exist and have saved artifact files.
- Structure implemented: prompts/parser/renderers reflect the four tickets.
- Verification complete: focused tests and real UI/artifact comparison pass.
- Review complete: review artifact records verification, code findings, security findings, and remediation.

## Validation
- Real UI project creation for Idea 1.1 and Idea 2.1 before the implementation:
  - Idea 1.1 project: `6d18736f-3a08-4bf8-bc77-07cb73241038`
  - Idea 2.1 project: `d34bfd78-fe07-4e2c-b1d5-288b06aa6c37`
- Intake question-count regression test: normalized question sets must still include 4-5 questions before the UI can render Step 2.
- Saved before artifact directories contain markdown or JSON for all generated sections plus mockup metadata:
  - `ui-evidence/2026-06-30-document-structure/before/idea-1.1/`
  - `ui-evidence/2026-06-30-document-structure/before/idea-2.1/`
- After artifact generation through the server-side generation pipeline:
  - Idea 1.1 after project: `ce31de52-f5eb-4562-bae7-a0821538e09b`
  - Idea 2.1 after project: `4df96f00-3582-472f-83ab-50ecb4d6c8c4`
- Saved after artifact directories contain markdown or JSON for all generated sections plus mockup metadata:
  - `ui-evidence/2026-06-30-document-structure/after/idea-1.1/`
  - `ui-evidence/2026-06-30-document-structure/after/idea-2.1/`
- Focused tests for Product Plan and First Version Plan parsing/render view models.
- Completed verification commands:
  - `node --import tsx --test src/lib/planning-prompts.test.ts src/lib/prd-document.test.ts src/lib/mvp-plan-document.test.ts src/lib/document-sections.test.ts`
  - `node --import tsx --test src/components/analysis/planning-document-blocks.test.tsx`
  - `node --import tsx --test src/lib/intake-question-generation.test.ts src/lib/intake-required-questions.test.ts`
  - `node --import tsx --test src/lib/mockup-design-plan.test.ts`
  - `npm run typecheck`
- UI evidence:
  - Question-count fix screenshot: `ui-evidence/2026-06-30-intake-question-count-fix/idea-1-1-step-2-four-questions-viewport.png`
  - Baseline raw artifacts are stored under `ui-evidence/2026-06-30-document-structure/before/`.
  - After raw artifacts and mockup metadata are stored under `ui-evidence/2026-06-30-document-structure/after/`.

## Implementation Notes
- `AGENTS.md` and `docs/plans/recommendation-selection-rules.md` now record the durable workflow rule: when a normal user would complete a task through the UI and the UI exposes a bug, fix that UI/user-flow bug before bypassing with lower-level API/database access.
- Product Plan generation is now orientation-first: overview, goals, team/milestones, and success metrics appear before personas and dense requirements.
- First Version Plan generation is now risk/action-first: key risks, validation actions, consolidated core user flows, tactical shortcuts, AI-friendly build sequence, and clearer validation thresholds.
- Workspace renderers and section navigation were updated to match the new structure while retaining enough parser aliases for existing stored documents.
- The generated AI Prompts section no longer treats AI Build Guardrails as a current generated section because the prompt contract removed it as redundant.

## Risks And Mitigations
- Real generation can be slow or fail externally: capture failures plainly and use retry only through the real app flow.
- Prompt changes can break parser assumptions: update parser tests before changing prompt text where practical.
- Output quality can regress in unexpected ways: compare before/after raw markdown for both domains, not only screenshots.
- Mockup generation can spend money and time: proceed because the user explicitly requested full project generation including mockups.

## Rollback Or Recovery
- Revert this implementation commit or restore the prompt constants/render changes from checkpoint `a3cf1cf5`.
- Baseline and after projects are additive test data; no production data deletion is planned.
- If generation creates partial projects, preserve their evidence and document the failure instead of deleting them.

## Open Decisions
- None. Defaults follow the repository recommendation-selection rule: choose Recommendation A unless a hard safety constraint points elsewhere.

## Critique

### Software Architect
- Updating generated structure at the prompt contract level is the correct durable change, but it must be paired with parser tolerance and tests because stored markdown is the source for UI rendering and export.

### Product Manager
- The four tickets point in the same direction: founders need the plan to orient around risks, goals, timeline, validation, and first actions before dense implementation detail.

### Customer Or End User
- The biggest risk is over-optimizing internal section taxonomy while the user still wants a clear next action. The after artifacts should be judged on scanability and confidence, not only structural compliance.

### Engineering Implementer
- The repo already has parser/view-model layers. Reuse them and keep changes scoped instead of building a parallel renderer.

### Risk, Security, Or Operations
- No auth/RLS/schema changes are expected. The main operational risk is real AI generation cost and runtime flakiness, which is intentionally accepted for this QA pass.
