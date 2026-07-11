# Review: NAZ-68 Competitor Source Links

## Scope

- Evidence-backed competitor source persistence in Market Research analysis metadata.
- Safe exact-name linkification across the current structured Executive Summary and Market Research renderers.
- Streaming, existing-v2 compatibility, and legacy markdown behavior.
- Shared paragraph and table rendering hooks used by Market Research.

## Verification

- `npx tsc --noEmit` passed.
- Changed-file ESLint passed after remediation.
- Focused parser, pipeline, matcher, renderer, and streaming tests: 49 passed after remediation.
- Full test suite after remediation: 496 passed.
- `git diff --check` passed.
- Real Chrome, Plasma profile, authenticated local flow: fresh Idea 1.1 project `873d3feb-8a3a-48c5-963f-4926a82ea9b5` created through `/projects/new` at `http://localhost:3000/projects/873d3feb-8a3a-48c5-963f-4926a82ea9b5-signal-roadmap-intelligence-suite#executive-summary`. Viewport: 572x527. The configured Perplexity dependency was unavailable, so the primary current-pipeline run correctly persisted no eligible source pairs; DOM inspection found zero source-title anchors and retained the existing Direct Competitors search fallbacks.
- Positive compatibility evidence: saved v2 project `f43d97aa-09fc-4d31-b08e-875a6b8d9bdb` at `http://localhost:3000/projects/f43d97aa-09fc-4d31-b08e-875a6b8d9bdb-signal-driven-roadmap-intelligence#market-research-feature-matrix`, viewport 1144x933. DOM inspection found 11 source-backed links outside Direct Competitors across landscape overview, feature matrix, positioning, pricing, and gap analysis. Screenshot: `ui-evidence/2026-07-10/naz-68-competitor-source-links/feature-matrix-competitor-links.png`.
- Linear progress comment `e1295665-e632-47e7-aa78-6a28324076d2` was saved and read back successfully. The owner explicitly approved uploading the screenshot after the privacy risk was disclosed, but the execution environment still denied the outbound transfer because Linear attachment storage is treated as an untrusted external destination. NAZ-68 remains In Progress until the owner manually attaches the local artifact, after which the Linear-hosted asset can be embedded, read back, and the issue moved to Done.

## Fresh-Eyes Self Review

- Pass 1 reviewed the URL pipeline, parsed structured model, every custom Market Research text surface, shared render hooks, and streaming reuse. Found missing table-header and positioning-axis linkification; fixed by routing those model-derived strings through the shared renderer.
- Pass 2 reviewed false positives, untrusted URLs, metadata provenance, and streaming performance. Found case-insensitive common-word collisions, private/credentialed URL acceptance, unbounded regex inputs, per-text regex recompilation, and synthesized-H3 promotion in new/streaming content. Fixed all findings and reran 49 focused tests plus typecheck.

## Code Review Findings

- [P1, fixed] Competitor-per-column table headers and positioning axis text bypassed linkification. Shared table headers and all positioning labels now use `CompetitorMentionText`.
- [P2, fixed] Single-token brands could link lowercase ordinary prose. Single-token names now require exact case; multi-word names retain boundary-aware case-insensitive matching.
- [P2, fixed] Streaming recompiled the source regex for every text node. The provider now memoizes one bounded compiled matcher per source set.
- [P3, noted] `src/lib/analysis-pipelines.ts` contains unrelated user work for tier-model routing. The NAZ-68 patch is limited to imports, competitor metadata, URL normalization, and helper logic; staging must remain selective if the user later commits only this issue.

## Architecture Improvement Review

- Selected opportunity landed: validated competitor sources are persisted in existing JSON metadata with no schema migration, while parsed H3 links provide a no-rewrite compatibility fallback only for older v2 rows.
- Selected opportunity landed: one shared bounded matcher and one link presentation component cover saved and streaming structured renderers.
- Selected opportunity landed: shared paragraph/table primitives gained optional rendering hooks rather than Market Research copying their layout and typography.
- Deferred/rejected opportunities remain valid: no historical metadata migration, no generic MarkdownRenderer mutation, and no search fallback for inline prose.
- No new duplication, non-idempotent path, authorization gap, or recovery blind spot was found after remediation.

## Security Review Findings

- [P2, fixed] Perplexity-only and synthesized H3 URLs could be promoted as evidence-backed inline links. New metadata requires a matching successful Tavily extraction; explicit empty metadata fails closed; streaming disables parsed-source fallback.
- [P2, fixed] URL validation allowed credentials, local/private destinations, IP literals, non-public suffixes, and noncanonical forms. The validator now canonicalizes and rejects those destinations.
- [P3, fixed] Unbounded source metadata could create oversized regex work. Limits now cap source count, name length, and total pattern size.
- No raw HTML, XSS, or tabnabbing path was introduced. React escapes names and `target="_blank"` links use `rel="noreferrer"`.

## Remediation Checklist

- [x] Link table headers and positioning text.
- [x] Add common-word false-positive protection.
- [x] Enforce public canonical HTTP(S) URLs and evidence-backed metadata.
- [x] Bound and memoize mention matching.
- [x] Preserve direct-table fallback and legacy markdown behavior.
- [x] Complete final full-suite/lint rerun.
- [x] Capture and record UI evidence.
- [ ] Attach evidence and verification comment to NAZ-68, then read it back.
  - Blocked by the execution environment's outbound-data policy even after explicit owner approval. Manual owner upload of the local screenshot is required; the non-completion progress comment has been updated and read back.
