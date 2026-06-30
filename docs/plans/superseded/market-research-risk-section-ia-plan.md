---
implemented: true
implemented_at: 2026-06-22T06:17:48Z
implementation_summary: Moved Market Research risks after Direct Competitors, removed visible SWOT quadrants from the contract and renderer, and added paired risk/competitor-response rendering.
---

# Plan: Market Research Risk Section IA

## Goal
Make the Market Research risk section easier to scan by removing the visible SWOT quadrant cards, moving risks earlier in the report, and rendering each risk with a distinct competitor-response treatment.

## Recommendation
Place `Risks & Competitor Responses` immediately after `Direct Competitors` and before `Feature Comparison`.

Reasoning: founders should see who they are up against, then the threat model, then the detailed comparison tables. Putting risks near the end makes them feel like appendix material; putting them above direct competitors removes the evidence context.

## Assumptions
- The visible `Internal / Positive`, `Internal / Negative`, `External / Positive`, and `External / Negative` cards are the SWOT matrix currently rendered inside the risk section.
- New Market Research output can change shape without preserving every existing saved report.
- Existing saved reports should not crash if they include the old `SWOT Analysis` H2, but the visible designed renderer can stop showing that framework.
- The best UX is paired risk/response rows, not two unrelated numbered lists, because each response should stay attached to the risk it answers.

## Clarifying Questions
1. Should new reports still generate a `SWOT Analysis` section at all?
   - Recommendation A: Remove it from the v2 prompt contract and hide legacy SWOT in the designed renderer.
   - Trade-off: Less framework noise and fewer tokens, but old saved markdown has an extra H2 to tolerate.
   - Recommendation B: Keep SWOT in markdown but do not render it in the workspace.
   - Trade-off: Lower parser churn, but future generations still spend words on content users will not see.
2. How should risk and response be displayed?
   - Recommendation A: Use paired rows: `Risk` and `Competitor response` labels inside each numbered item.
   - Trade-off: Preserves cause/effect and scans well, but asks the prompt for a stricter bullet shape.
   - Recommendation B: Use two separate lists under `Risks` and `Competitor Responses`.
   - Trade-off: Simple visually, but users must mentally match list item 01 to response 01.
3. Should the sidebar/nav order change to match the document order?
   - Recommendation A: Yes, move the nav item above `Feature Comparison`.
   - Trade-off: Keeps scroll order and navigation consistent, but changes familiar anchor ordering.
   - Recommendation B: Only change the content order.
   - Trade-off: Smaller change, but nav feels wrong when it jumps around.

## Recommended First Step
Implement Recommendation A for all three questions: remove SWOT from the future v2 contract, tolerate old SWOT as legacy content, render paired risk/response rows, and move the risk section plus nav item above `Feature Comparison`.

## Plan
1. Update the Market Research v2 contract in `src/lib/competitive-analysis-v2.ts`:
   - Move `Risks & Competitor Responses` after `Direct Competitors`.
   - Remove `SWOT Analysis` from the required future section order.
   - Add structured parsing for paired risk/response items, with fallback for older plain bullets.
   - Tolerate legacy `SWOT Analysis` sections without rendering them.
2. Update generation instructions in `src/lib/prompts/competitive-analysis.ts`:
   - Remove the SWOT requirement.
   - Require 3-5 bullets shaped as `**Risk:** ... **Competitor response:** ...`.
3. Update the Market Research renderer in `src/components/analysis/competitive-analysis-document.tsx`:
   - Remove `SWOTCard` from the risk section.
   - Render paired rows with visible `Risk` and `Competitor response` sublabels.
   - Move the risk section above `Feature Comparison` in both full document and workspace detail views.
4. Update nav and fallback section ordering in:
   - `src/lib/document-sections.ts`
   - `src/components/analysis/competitive-analysis-document.tsx`
5. Update focused tests:
   - Parser tests for the new section order and risk/response parsing.
   - Renderer tests proving SWOT quadrant labels are absent and risk/response labels are present.
   - Prompt tests proving the prompt no longer asks for SWOT and does ask for paired risks.
6. Verify with focused tests, typecheck/lint as needed, and browser-check the current Market Research page.
7. Update `PROJECT_CONTEXT.md` because this changes the artifact contract.

## Milestones
- Contract updated: future documents expect the new order and paired risk/response bullets.
- Renderer updated: no visible SWOT quadrants in `Risks & Competitor Responses`.
- Navigation updated: risks appear before feature comparison.
- Verification complete: tests pass and the live workspace reflects the new section treatment.

## Validation
- Run `node --import tsx --test src/lib/competitive-analysis-v2.test.ts src/lib/competitive-analysis-prompt.test.ts src/components/analysis/competitive-analysis-document.test.tsx`.
- Run `npm run typecheck`.
- Use the in-app browser on the current project page to confirm:
  - SWOT quadrant labels are gone from the risk section.
  - `Risk` and `Competitor response` sublabels are visible.
  - The section appears before `Feature Comparison`.

## Risks And Mitigations
- Existing v2 documents with old `SWOT Analysis` could become invalid: normalize and ignore legacy SWOT when present.
- Existing plain risk bullets may not split cleanly into risk/response pairs: render them under a neutral fallback label instead of fabricating a response.
- Prompt drift could reintroduce SWOT: add tests against the system prompt text.

## Rollback Or Recovery
Revert the contract/order changes and re-enable `SWOTCard` in the risk section. Saved markdown is not migrated, so rollback is a code-only recovery.

## Open Decisions
- Decision: Use paired risk/response rows instead of two separate lists.
- Decision: Remove SWOT from future generation and hide legacy SWOT in the designed renderer.
- Decision: Move the sidebar/nav item above `Feature Comparison`.

## Critique

### Software Architect
- Removing `SWOT Analysis` from the strict H2 order is the right long-term contract change, but compatibility must be explicit because old saved documents carry that H2.

### Product Manager
- Risks belong early because they frame whether the opportunity is worth pursuing. They should not interrupt the executive summary, but they should appear before detailed feature and pricing comparison.

### Customer Or End User
- Founders do not need a SWOT lesson here. They need to know what can go wrong and how incumbents will likely react.

### Engineering Implementer
- The renderer should avoid heuristically inventing competitor responses from old bullets. Strict new output plus graceful fallback is safer.

### Risk, Security, Or Operations
- This is low security risk. The main operational risk is changing a strict AI-output contract without updating tests and prompt-lab defaults.
