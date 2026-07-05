# Review: Competitive Overview And Market Research Separation

## Scope
- `src/components/analysis/competitive-analysis-document.tsx`
- `src/lib/document-sections.ts`
- `src/lib/competitive-analysis-v2.ts`
- `src/lib/prompts/competitive-analysis.ts`
- `src/app/api/analysis/[type]/route.ts`
- `src/lib/document-generation-service.ts`
- Competitive analysis focused tests

## Verification
- `node --import tsx --test src/components/analysis/competitive-analysis-document.test.tsx src/lib/competitive-analysis-v2.test.ts src/lib/competitive-analysis-prompt.test.ts` passed.
- `npm test` passed with 172 tests.
- `npx tsc --noEmit` passed.
- Targeted ESLint on changed files passed.
- Full `npm run lint` is blocked by an unrelated `@next/next/no-sync-scripts` error in `src/app/layout.tsx` from a live-script injection outside this change; earlier lint warnings in unrelated files remain.
- Authenticated visual check completed in Arc at `http://localhost:3000/projects/65b38e33-34e7-4e61-a4cf-3a7157ea4783-elite-pet-concierge#overview`.
- Confirmed Overview sidebar only lists `Executive Summary` and `Founder Verdict`.
- Confirmed Overview content only shows the Overview header, `Market Snapshot & Entry Thesis`, and `Founder Verdict`.
- Confirmed `Competitor Profiles & Fast Comparison`, `Audience Segments`, and `GTM / Distribution Signals` render under Market Research.

## Code Review Findings
- Fixed: Overview previously rendered `CompetitorProfiles` under the `overview-founder-verdict` anchor. It now renders a standalone Founder Verdict card.
- Fixed: Overview previously included competitive landscape signals through `SnapshotHero`. It now renders only the executive summary and founder verdict.
- Fixed: Strategic Recommendations were removed from Overview and added to Market Research.
- Fixed: Audience Segments and GTM / Distribution Signals were missing from the split Market Research view; both now render there.
- Fixed: Market Research nav order now follows render order.

## Security Review Findings
- No auth, authorization, secret handling, payment, or external fetch behavior changed.
- New metadata is deterministic section ownership data only and contains no user input or secrets.
- Existing legacy rendering behavior remains unchanged.

## Remediation Checklist
- [x] Add regression tests for Overview excluding market-only modules.
- [x] Add regression tests for Market Research owning audience, GTM, and strategic modules.
- [x] Add explicit Competitive Research v2 workspace section ownership map.
- [x] Store workspace section ownership in new competitive-analysis metadata.
- [x] Update prompt contract so future generations know Overview is summary plus founder verdict only.
- [x] Run focused tests, full test suite, typecheck, and targeted lint.
