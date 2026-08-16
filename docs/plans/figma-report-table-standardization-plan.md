---
implemented: true
implemented_at: 2026-08-14T18:15:48-07:00
implementation_summary: Standardized every project-page HTML table through one reusable ReportTable, added Feature Comparison-only Your Idea emphasis, preserved Pricing Comparison structure and external links, and verified desktop/narrow behavior in real Chrome.
---

# Plan: Figma Report Table Standardization

## Goal

Apply the Figma node `471:16243` table language to every HTML table rendered on real project pages through one reusable component, while preserving existing section headings, links, responsive overflow, and each document's current information structure.

## Assumptions

- "All tables on the actual product page" means HTML tables in the project workspace: structured Market Research tables, opportunistic Product Plan / First Version Plan tables, and legacy/streaming markdown tables.
- Positioning scorecards, First Version Plan card/grid transformations, and AI Prompt raw markdown previews are not HTML tables and stay unchanged.
- Pricing Comparison stays row-oriented and receives the common visual treatment without a `Your Idea` column or transposition.
- Existing saved Feature Comparison documents may name the user's concept in column two; the renderer presents that column as `Your Idea` for backward compatibility.

## Clarifying Questions

1. Should existing subsection headings change to match the Figma frame?
   - Recommendation A: Keep every current heading unchanged.
   - Trade-off: Preserves navigation and document contracts; the page does not copy the Figma frame's heading text or size.
   - Recommendation B: Rename and enlarge the Feature Comparison heading.
   - Trade-off: Closer to the isolated frame, but changes established page language and navigation.
   - Selected: Recommendation A, explicitly requested by the user.
2. Should Pricing Comparison be reshaped around a highlighted idea column?
   - Recommendation A: Keep its row-oriented content separate while applying the common table shell.
   - Trade-off: Preserves generated content and avoids a fragile transpose; it has no idea-column outline.
   - Recommendation B: Transpose products into columns.
   - Trade-off: Creates visual parity with Feature Comparison but changes document semantics and can produce very wide tables.
   - Selected: Recommendation A, explicitly requested by the user.
3. How many reusable variants should exist?
   - Recommendation A: One component with optional emphasis and normal composition props.
   - Trade-off: Small API, shared styling, rich and markdown tables remain possible without variant taxonomy.
   - Recommendation B: Separate standard, rich, and markdown variants.
   - Trade-off: More explicit contracts but unnecessary surface area for the current need.
   - Selected: Recommendation A, explicitly requested by the user.

## Recommended First Step

Add failing component and renderer assertions covering the shared shell, `Your Idea` column semantics, external links, Pricing Comparison independence, and dense/markdown consumers before changing markup.

## Runtime and Change-Impact Analysis

### Repeated Work

- No timers, polling, network calls, subscriptions, or generation loops change.
- Tables render when document content renders or streaming content commits. Expected work is linear in rendered rows and columns; worst case remains bounded by existing generated document size.
- Shared component adds no client state or effects.

### Ownership, Scope, And Lifetime

- Table presentation is owned by `src/components/ui/report-table.tsx` for the lifetime of each React render.
- Structured table semantics remain owned by their document renderers; the shared component owns only shell, typography, zebra rows, overflow, and optional column emphasis.
- Consumer fan-out: Market Research structured tables, planning-document fallback tables, streaming markdown tables, and project-composer markdown tables.

### Boundary And Cache Semantics

- No API, database, cache, queue, billing, or persistence contract changes.
- New Market Research prompt contract will request exact `Your Idea` in Feature Comparison; renderer normalization keeps older saved documents compatible.
- Pricing Comparison, arbitrary markdown headers, and linked competitor source data keep their current shapes.

### Failure And Recovery

- Malformed or partial markdown continues through existing ReactMarkdown and streaming sanitation paths.
- Missing competitor URLs keep the existing verified-source/search fallback behavior.
- Failure blast radius is visual table rendering only. Reverting the shared component and consumer wiring restores prior markup.

### Risk-Matched Verification

| Risk | Observable evidence or test | Acceptance threshold |
|---|---|---|
| Shared styling misses a project-page table | Source inventory plus renderer tests | Every actual HTML table path uses `ReportTable` |
| Idea emphasis applied to wrong table | Feature and Pricing fixture assertions | Feature column two is `Your Idea` and italic/outlined; Pricing headers and orientation remain unchanged |
| Competitor links regress | Static markup assertions | Linked competitor header retains safe external anchor behavior |
| Wide tables clip | Real Chrome desktop/narrow screenshots and scroll metrics | No document-page horizontal overflow; table wrapper scrolls when table exceeds container |
| Streaming or legacy rendering breaks | Focused markdown and streaming tests | Existing markdown/stream tests pass; partial tables remain withheld by current sanitizer |

## Architecture Improvement Opportunities

- **Selected — one composable `ReportTable` boundary:** centralizes Figma shell and responsive behavior while accepting normal semantic table children; trade-off is consumers still own cell-specific semantics. Likely files: `src/components/ui/report-table.tsx`, structured renderers, markdown renderer.
- **Selected — prompt/renderer compatibility:** require `Your Idea` for future Feature Comparison output while normalizing existing column-two labels at render time; trade-off is a deliberately section-specific compatibility rule. Likely files: competitive prompt and renderer.
- **Deferred — preserve arbitrary inline markdown in parsed table cells:** would require parser data-shape changes across planning renderers. Current verified competitor links are reconstructed safely, and changing parser contracts is disproportionate to this visual task.
- **Rejected — table variant taxonomy:** user explicitly requested no three-variant design; optional emphasis props cover the needed difference.

## Plan

1. Add focused failing tests for shared shell and Market Research semantics.
2. Create one reusable `ReportTable` component using project tokens and Figma measurements.
3. Migrate `DataTable`, Direct Competitors, and ReactMarkdown table rendering to that component.
4. Apply `Your Idea` label, italic cells, and continuous body-column outline to Feature Comparison only; preserve competitor links.
5. Update future-generation prompt contract, system docs, and test inventory.
6. Run focused tests, typecheck, lint, real Chrome desktop/narrow verification, fresh-eyes review, and implementation/security review.

## Milestones

- Shared component: every real project-page HTML table uses one presentation boundary.
- Figma semantics: Feature Comparison emphasizes `Your Idea`; all tables share dark header, warm zebra rows, rounded outline, compact typography, and responsive scrolling.
- Verification: automated suite and real existing-project UI evidence pass without paid generation.

## Validation

- Focused component, competitive renderer, prompt, planning renderer, markdown renderer, and streaming tests.
- `npm run typecheck`, targeted ESLint, `git diff --check`.
- Real Chrome using an existing project at desktop and narrow viewport; no new project or paid generation.

## Risks And Mitigations

- Rich Direct Competitors cells may become cramped: retain existing column width classes and minimum table width inside shared shell.
- Generic markdown tables may need adaptive widths: retain existing colgroup width heuristics.
- Continuous column outline can conflict with rounded outer border: draw emphasis on body cells only, matching Figma, with top and bottom edges on first/last body rows.
- Saved docs may use unusual Feature Comparison column order: apply normalization only to the established second column, covered by current prompt/sample contracts.

## Rollback Or Recovery

Revert the shared component, consumer migrations, prompt line, tests, and docs. No data migration, cache invalidation, regeneration, or cleanup is required.

## Open Decisions

None.

## Plan Evaluation

- Opposite-model evaluation was attempted twice before implementation.
- Both Claude reviewer calls exited successfully with zero output. The empty artifacts are `figma-report-table-standardization-plan-eval.md` and `figma-report-table-standardization-plan-eval-retry.md`.
- Reviewer unavailable; plan formally unevaluated. No cross-model coverage claimed.

## Implementation Results

- All direct project UI table markup now lives in `src/components/ui/report-table.tsx`; structured and markdown renderers compose through that boundary.
- Feature Comparison renders its second header as `Your Idea` and marks its body cells for italic, continuous-column emphasis. Pricing Comparison keeps its authored row orientation with no emphasis marker.
- The table scroll region is keyboard focusable, labeled, visibly focused, and contains horizontal overflow without widening the document.
- Verification passed: 50 focused tests, TypeScript, targeted ESLint, `git diff --check`, and the full production build including the chunky/vendor guard.
- Real Chrome evidence was captured from an authenticated existing project at desktop and narrow widths in `ui-evidence/2026-08-14/figma-report-table-standardization/`. No project or paid generation was created.
- Fresh-eyes review found one keyboard-scroll accessibility gap; it was remediated before completion. No security or trust-boundary findings were identified.

## Critique

### Software Architect

- One composable component reduces duplication without turning semantic differences into a variant hierarchy. Parser-format preservation remains intentionally out of scope.

### Product Manager

- Standardized tables improve scanability across reports. Keeping headings and Pricing Comparison structure avoids changing established document meaning.

### Customer Or End User

- `Your Idea` becomes immediately visible where side-by-side competitive comparison makes that distinction useful. Other tables gain consistency without misleading emphasis.

### Engineering Implementer

- ReactMarkdown children and rich compound cells require a component that composes semantic HTML rather than accepting strings only. Existing width heuristics and links must survive migration.

### Risk, Security, Or Operations

- No trust boundary changes. External links must retain `target="_blank"` and safe `rel`; no raw HTML or untrusted URL handling is added.
