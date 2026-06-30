# Review: Remove Market Research Risks

## Scope
- Market Research v2 contract and parser
- Competitive analysis generation prompts
- Market Research renderer and section navigation
- Explainable-term glossary entries
- Focused parser, prompt, nav, and renderer tests
- Project architecture documentation

## Verification
- `node --import tsx --test src/lib/competitive-analysis-v2.test.ts src/lib/competitive-analysis-prompt.test.ts src/lib/document-sections.test.ts src/components/analysis/competitive-analysis-document.test.tsx`
- `npm run typecheck`
- `npm run lint` passed with the existing unrelated warning in `output/playwright/prod-full-flow.mjs`.
- In-app browser DOM verification on the real local workspace confirmed:
  - `Market Research` nav no longer includes `Risks & Competitor Responses`.
  - `market-research-risks` is not rendered.
  - `Direct Competitors`, `Market Landscape`, and `Feature Comparison` still render.

## Fresh-Eyes Review
- Pass 1: Checked prompt, parser, renderer, nav, glossary, tests, and docs for stale references. Removed active references and left only absence assertions or historical plan text.
- Pass 2: Rechecked existing-project behavior and added parser stripping for old removed `Risks & Competitor Responses` / `SWOT Analysis` H2 sections so deletion is not required to remove the subsection from the UI.

## Code Review Findings
- None found.

## Security Review Findings
- None found. No auth, authorization, external API, secret handling, or data-access rules were changed.

## Data Deletion Note
- Existing project deletion was not performed. It is not required for the new-project behavior or current UI removal, and deleting projects is a separate destructive data operation that should be scoped explicitly before execution.

## Remediation Checklist
- [x] No remediation required.
