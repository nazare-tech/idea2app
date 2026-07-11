---
implemented: true
implemented_at: 2026-07-11T01:54:04Z
implementation_summary: Persisted evidence-backed competitor source pairs, added bounded safe mention linking across structured Market Research, preserved legacy behavior, and verified the result with tests plus real Chrome evidence.
linear_issue: https://linear.app/nazareworkspace/issue/NAZ-68/link-competitor-mentions-to-source-urls-in-market-research
---

# Plan: Link Competitor Mentions to Verified Source URLs

## Goal

Make every eligible direct-competitor name in the current structured Market Research experience a clickable, visibly underlined external link when that report contains a verified HTTP(S) URL for the competitor, while preserving the existing direct-competitor search fallback and legacy markdown rendering.

## Assumptions

- Validated live-research competitor pairs persisted in `analyses.metadata` are the canonical source for new reports; direct competitor H3 links remain the backward-compatible document-level source for existing reports.
- "Anywhere in a project page" applies to structured Market Research content and its Executive Summary companion because those surfaces share the same parsed report. Other documents will not invent or infer competitor URLs.
- Existing uncommitted workspace changes belong to the user and must be preserved. This task will avoid overlapping edits where possible and inspect any overlap before applying a patch.

## Clarifying Questions

1. Should inline mentions without a verified document URL link to a web search?
   - Recommendation A: Link inline prose only when a verified HTTP(S) URL exists; keep the current search fallback only in the explicit Direct Competitors table.
   - Trade-off: Avoids misleading inline links and false confidence, but some unverified competitor mentions remain plain text.
   - Recommendation B: Link every inline mention, using a search fallback when no source URL exists.
   - Trade-off: Maximizes clickability, but turns inferred names into search links and weakens the meaning of an inline source link.
   - Selected: Recommendation A, because NAZ-68 explicitly scopes dynamic links to known source URLs and requires false-positive protection.
2. Should legacy and malformed documents be rewritten at render time to add inferred links?
   - Recommendation A: Preserve legacy markdown behavior and add automatic mention linking only to the typed current renderer.
   - Trade-off: Keeps compatibility and rollback simple, but legacy prose gains links only when links already exist in its markdown.
   - Recommendation B: Rewrite legacy markdown strings before rendering by extracting and inserting links.
   - Trade-off: Expands coverage, but risks corrupting markdown, tables, or already-linked text.
   - Selected: Recommendation A, matching the issue acceptance criterion and repository compatibility policy.

## Recommended First Step

Add focused failing tests for verified inline mentions, exact-name boundaries, overlapping competitor names, repeated mentions, unsafe URL rejection, table/list/positioning coverage, and unchanged legacy markdown behavior.

## Architecture Improvement Opportunities

- Shared typed mention matcher: centralize exact-name matching and safe HTTP(S) URL filtering in a small utility used by all structured Market Research text surfaces. Benefit: one consistent false-positive and security contract. Trade-off: adds a focused module and tests. Likely boundaries: a dedicated competitor-link utility plus the Market Research renderer. Status: selected.
- Renderer extension hooks: add optional text/cell render callbacks to shared paragraph and table primitives instead of copying their styling into Market Research-only components. Benefit: preserves design-system consistency and supports future safe inline annotations. Trade-off: slightly widens shared component APIs. Likely boundary: `src/components/analysis/planning-blocks-shared.tsx`. Status: selected if the final code map confirms it is the smallest non-duplicative path.
- Persist validated competitor pairs in existing analysis JSON metadata: benefit is a durable source independent of model formatting, with no schema migration because both save paths already spread result metadata. Trade-off: adds a small data-shape contract and backend-history documentation. Likely boundaries: `src/lib/analysis-pipelines.ts`, typed Market Research parsing, `PROJECT_CONTEXT.md`, and backend change history. Status: selected after code-map verification; parsed H3 links remain the compatibility fallback.
- Link unverified mentions through search everywhere: benefit is universal clickability. Trade-off: weakens source semantics and increases false-positive risk. Status: deferred/rejected for inline prose; existing explicit comparison-table fallback remains.

## Plan

1. Map the current parser, typed view model, structured renderers, streaming reuse, metadata save paths, and fallback markdown path.
2. Add red tests for metadata persistence, safe URL extraction, and mention-to-link behavior across representative structured surfaces.
3. Persist validated live-research competitor pairs in existing analysis metadata, merge them with parsed H3 links for compatibility, and implement a reusable exact-name link matcher plus underlined external-link renderer across paragraphs, lists, tables, competitor detail text, and positioning content.
4. Run focused unit/component tests, typecheck, and lint for changed files.
5. Verify through the real authenticated local UI using a fresh Idea 1.1 project, capture screenshot evidence under `ui-evidence/2026-07-10/naz-68-competitor-source-links/`, and record route, viewport, and state.
6. Perform two fresh-eyes passes, formal code review, and security review; remediate findings and rerun verification.
7. Attach the screenshot to NAZ-68, embed the Linear-hosted asset in a verification comment, read the saved comment back, and complete the issue only after all acceptance criteria are evidenced.

## Milestones

- Contract covered: tests demonstrate verified-only exact matching and safe URL handling.
- Renderer complete: all structured Market Research text primitives use the shared mention linker.
- Compatibility complete: legacy markdown remains unchanged and existing direct competitor behavior still passes.
- QA complete: real local UI screenshot demonstrates underlined external competitor links outside Direct Competitors; the fresh Idea 1.1 run separately demonstrates the fail-closed state when live research is unavailable.
- Ticket complete: NAZ-68 contains inline visual evidence and a verification summary.

## Validation

- Focused parser and renderer tests.
- Full TypeScript typecheck.
- ESLint on changed source and test files.
- Existing Market Research component and parser test suites.
- Real Chrome verification on the current workspace, authenticated with `.env.e2e.local` without exposing credentials.
- Link inspection confirms `target="_blank"`, safe `rel`, visible underline, verified destination, and keyboard focusability.

## Risks And Mitigations

- Partial-name false positives: require letter/number boundaries and prefer the longest eligible competitor name at each position.
- Unsafe generated URLs: accept only absolute HTTP(S) URLs before exposing them to custom anchors.
- Nested or duplicated links: operate on typed plain-text fields in the current renderer, not on raw markdown or existing React anchor nodes.
- Streaming drift: rely on the same structured body components and shared link provider used by final rendering.
- Dirty worktree overlap: review diffs before each patch and do not revert unrelated user changes.

## Rollback Or Recovery

Remove the mention-link wrapper integration and optional shared rendering hooks; the underlying stored markdown and parsed document data remain unchanged. No migration, persistence rewrite, or destructive action is involved.

## Open Decisions

- None. Repository policy selects Recommendation A and permits implementation to proceed.

## Critique

### Software Architect

- A render-time typed matcher is appropriately scoped, and the authoritative live-research pairs should be persisted in existing JSON metadata before generation output can drift. Parsed H3 links remain a compatibility fallback rather than a second competing authority. The matcher must remain independent of presentation so coverage can be tested without relying only on HTML snapshots.

### Product Manager

- Underlined links improve research traceability, but a link visually implies evidence. Restricting inline links to known URLs protects user trust; the explicit Direct Competitors table can retain its clearly navigational search fallback.

### Customer Or End User

- Users should be able to follow a named competitor without hunting for its profile. Consistent underline and external-tab behavior make that affordance recognizable. Unverified competitors should not look equally sourced.

### Engineering Implementer

- The main implementation risk is missing one of several plain-string render paths. Tests should cover paragraph, list, table, position label, rationale, and repeated mention cases, not only the competitor heading.

### Risk, Security, Or Operations

- Generated markdown and provider results are untrusted content. Persisted pairs and custom anchors must never accept `javascript:`, `data:`, relative, or malformed URLs. The metadata data-shape change needs project-context and backend-history documentation, but no database migration, auth, billing, or operational change.
