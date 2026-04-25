# Plan: Separate Overview From Market Research

## Goal
Fix the workspace document split so Overview only contains high-level executive content and market research-only modules, especially competitor profiles, appear only in Market Research. The implementation should also prevent future AI/output-contract drift by aligning section navigation, rendering logic, tests, and, if needed, the Competitive Research v2 prompt/API metadata contract.

## Decisions And Assumptions
- The duplicated segment reported at `/projects/65b38e33-34e7-4e61-a4cf-3a7157ea4783-elite-pet-concierge#overview` is caused by `CompetitiveOverviewSection` rendering `CompetitorProfiles` inside `overview-founder-verdict`.
- Overview should include only `Executive Summary` and `Founder Verdict`.
- `Strategic Recommendations` should not appear in Overview. For now, they should remain near the end of Market Research because they are synthesized from competitive context; PRD can consume the insight later but should not own competitive strategy itself.
- Market Research should own direct competitors, matrices, pricing, audience segments, positioning, GTM signals, gap analysis, differentiation, moat, SWOT, risks, MVP wedge recommendation, and strategic recommendations.
- Existing Competitive Research v2 documents should continue rendering without regeneration.
- Future generation metadata should explicitly define which workspace section each module belongs to. Existing rows should continue to render using a deterministic default map.

## Clarifying Questions
1. Is the desired Overview “Founder Verdict” visual supposed to use the existing dark `PencilCard` founder verdict treatment from the full competitive document?

## Recommended First Step
Write a focused regression test against `CompetitiveOverviewSection` and `CompetitiveDetailSection` proving that competitor profile cards render in Market Research but not Overview, and that Overview renders the actual founder verdict content. This gives a concrete red state before changing JSX.

## Implementation Status
- [x] Audited current Overview and Market Research split.
- [x] Added focused red-state regression tests.
- [x] Limited Overview to Executive Summary and Founder Verdict.
- [x] Moved strategic recommendations out of Overview and into Market Research.
- [x] Restored Audience Segments and GTM / Distribution Signals in Market Research.
- [x] Added explicit Competitive Research v2 workspace section ownership metadata.
- [x] Updated the prompt contract to describe workspace ownership.
- [x] Ran tests, typecheck, targeted lint, and documented review/security notes.
- [x] Completed authenticated browser visual verification in Arc.

## Plan
1. Audit current split and contracts.
   - Inspect `src/components/analysis/competitive-analysis-document.tsx`, `src/lib/competitive-analysis-v2.ts`, `src/lib/document-sections.ts`, `src/components/layout/scrollable-content.tsx`, and `src/lib/prompts/competitive-analysis.ts`.
   - Output: list every structured module currently rendered in Overview versus Market Research and identify mismatches with nav labels.
   - Validation: confirm duplicated `CompetitorProfiles` path and any other misplaced overview modules.

2. Add focused tests for the expected split.
   - Update or add tests near `src/components/analysis/competitive-analysis-document.test.tsx`.
   - Assert Overview does not include direct competitor profile headings/cards.
   - Assert Overview includes Founder Verdict content.
   - Assert Market Research includes Direct Competitors.
   - Validation: run the focused test and confirm it fails before implementation where practical.

3. Fix Overview rendering.
   - Replace the `CompetitorProfiles` block inside `overview-founder-verdict` with the actual founder verdict rendering, likely by reusing or extracting the existing founder verdict card logic already used in the full `CompetitiveAnalysisDocument`.
   - Keep Overview section IDs aligned with `SCROLLABLE_NAV_ITEMS`.
   - Remove `overview-strategic-recommendations` from the Overview render path and nav.
   - Avoid changing generated markdown shape unless the parser lacks enough founder verdict fields.
   - Validation: focused component test passes.

4. Audit and correct other misplaced Overview modules.
   - Compare Overview JSX with `SCROLLABLE_NAV_ITEMS` and Competitive Research v2 section order.
   - Move or remove any market-research modules from Overview.
   - If `Strategic Recommendations` is intentionally duplicated in the full all-in-one document and Overview split, preserve it only where the workspace split expects it.
   - Validation: tests cover absence of market-only labels/content in Overview.

5. Align prompt/API contract only if needed.
   - If render-time fixes are enough, leave stored content shape unchanged.
   - Add an explicit module-to-workspace-section map in the competitive-analysis v2 contract/metadata defaults so future generation and renderers have one source of truth for workspace ownership.
   - If the parser cannot reliably expose founder verdict as structured data, adjust `src/lib/competitive-analysis-v2.ts` parser and `src/lib/prompts/competitive-analysis.ts` prompt tests to make the contract explicit.
   - If metadata/version changes are needed, update `COMPETITIVE_ANALYSIS_V2_PROMPT_VERSION` or metadata builders carefully so legacy rows still render.
   - Validation: parser and prompt tests pass.

6. Visual verification.
   - Run the local app, open the affected project or a project with v2 competitive analysis, and verify Overview no longer contains direct competitor profile cards.
   - Verify Market Research still contains competitor profiles.
   - Capture/check the Overview and Market Research sections in a browser viewport close to `1427x1174`.

7. Review and remediation.
   - Create `plans/competitive-overview-market-research-separation-review.md`.
   - Record code review findings, security review findings, verification commands, and remediation checklist.
   - Implement any accepted fixes and rerun focused verification.

## Milestones
- Regression test added: tests describe the intended Overview/Market Research ownership.
- Rendering fixed: competitor profiles appear only in Market Research.
- Contract aligned: prompt/parser/API metadata updated only if required.
- Verified: focused tests and browser visual check pass.
- Review complete: review/security notes written and remediation handled or explicitly deferred.

## Validation
- `npm test -- src/components/analysis/competitive-analysis-document.test.tsx` or the repo's equivalent focused test command.
- Parser/prompt tests if touched, such as `src/lib/competitive-analysis-v2.test.ts` and `src/lib/competitive-analysis-prompt.test.ts`.
- `npm run lint` or the nearest available static check if runtime permits.
- Browser verification of `#overview` and `#market-research` after starting the dev server.

## Risks And Mitigations
- Risk: Founder verdict data exists but current component has no reusable card for it. Mitigation: extract the existing card JSX into a small reusable component rather than duplicating markup.
- Risk: Legacy competitive documents lack clean founder verdict structure. Mitigation: keep markdown fallback behavior and use existing parser fallbacks where possible.
- Risk: Removing a duplicated module makes Overview feel too sparse. Mitigation: keep high-signal summary, verdict, and recommendations; optionally include MVP wedge if approved.
- Risk: Prompt changes could invalidate older tests or generation assumptions. Mitigation: only change prompts/API metadata if render/parser tests prove the current contract is insufficient.
- Risk: Visual fixes regress navigation anchors. Mitigation: keep section IDs stable and test/render all `SCROLLABLE_NAV_ITEMS` anchors.

## Open Decisions
- Whether the existing dark `PencilCard` founder verdict treatment should be kept exactly or slightly simplified for the shorter Overview.

## Critique

### Software Architect
- The plan keeps the canonical generated document unchanged unless necessary, which reduces migration risk. The main architectural point to watch is avoiding two separate founder verdict render implementations that drift over time.

### Product Manager
- The plan directly addresses the reported duplicate and includes a broader audit of Overview content, but it should avoid scope creep into a full document taxonomy redesign unless the audit finds a real user-facing mismatch.

### Customer Or End User
- Users expect Overview to be concise and directional. Removing competitor cards from Overview should make the first section easier to scan, but only if the replacement founder verdict is visible and useful.

### Engineering Implementer
- The likely code change is small, but the test setup may take more care because the current test likely renders the full document rather than the split workspace sections. Keep the first test narrow.

### Risk, Security, Or Operations
- This is mostly presentation logic and does not touch auth, secrets, or data access. The operational risk is generation-contract drift; tests around parser/prompt expectations are the right guardrail.
