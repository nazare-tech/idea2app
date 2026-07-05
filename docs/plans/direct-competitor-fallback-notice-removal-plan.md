---
implemented: true
implemented_at: 2026-07-05T15:22:54.5566112-04:00
implementation_summary: Removed the Direct Competitors live-research fallback notice from module rendering, markdown fallback rendering, AI fallback prompt instructions, and landing sample content while keeping conservative fallback competitor profiles visible.
---

# Direct Competitor Fallback Notice Removal Plan

## Goal

Remove the visible Direct Competitors fallback notice about unavailable live competitor research while preserving conservative fallback competitor candidates for existing and newly generated projects.

## Assumptions

- The user wants to remove the Direct Competitors notice shown in the screenshot, not suppress fallback competitor rows.
- Existing saved Market Research documents may already contain the disclaimer in markdown, so rendering must filter it.
- New generated Market Research documents should avoid adding that Direct Competitors intro paragraph.

## Clarifying Questions

- Should individual table cells still be allowed to say `Verification needed` or `Evidence insufficient` when a specific field is unknown?

Recommendation A: keep field-level uncertainty language, because it prevents unsupported precision while removing the section-level banner. Selected.

Recommendation B: remove all uncertainty wording from Direct Competitors. Rejected because it would make fallback candidates look more certain than they are.

## Implementation Phases

1. Update the competitive-analysis prompt so fallback mode still outputs 3-5 competitor candidates, but does not ask for a Direct Competitors intro disclaimer.
2. Add a display sanitizer for Direct Competitors markdown blocks that removes existing saved top-level unavailable/live-research disclaimer paragraphs.
3. Stop deriving and rendering the `directCompetitorEvidenceNotice` module banner.
4. Update focused parser, prompt, and renderer tests.
5. Update `PROJECT_CONTEXT.md` because the Market Research fallback contract changes.

## Test Strategy

- Run focused tests for `competitive-analysis-v2`, `competitive-analysis-prompt`, `analysis-pipelines`, and `competitive-analysis-document`.
- Run lint or broader tests only if focused tests expose wider issues.

## Rollback / Recovery

- Revert the prompt, parser, renderer, and context edits to restore the old visible verification notice.
- Existing saved documents are not mutated; the rendering sanitizer can be removed safely if the old notice is desired again.

## Architecture Improvement Opportunities

- Selected: centralize Direct Competitors disclaimer filtering in `src/lib/competitive-analysis-v2.ts` so module rendering and markdown fallback rendering share the same rule.
  Benefit: existing saved documents and new AI output are handled through one contract.
  Trade-off: one more parser helper.
  Likely files: `src/lib/competitive-analysis-v2.ts`, `src/components/analysis/competitive-analysis-document.tsx`.

- Deferred: database migration to rewrite existing saved analysis markdown.
  Benefit: removes stale content at rest.
  Trade-off: touches production data for a presentation-only issue.
  Likely boundaries: Supabase `analyses` rows.

- Rejected: suppress all uncertainty language in Direct Competitors.
  Benefit: cleaner table copy.
  Trade-off: raises risk of overclaiming when live research is unavailable.

## Candid Critique

- Architecture: filtering at render time is the least risky path for existing projects and avoids data churn.
- Product: the UI becomes less distracting while still showing useful competitor candidates.
- Customer: founders still get actionable comparison rows instead of an apology banner.
- Engineering: tests must cover both module rendering and markdown fallback, or a malformed existing document could still leak the old paragraph.
- Risk/security: no auth, RLS, or persistence changes. The main risk is over-sanitizing useful competitor notes, so the matcher should target live-research-unavailable disclaimer blocks only.
