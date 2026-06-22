# Review: Competitive Analysis Live Data Bug

## Scope
- `src/lib/analysis-pipelines.ts`
- `src/lib/perplexity.ts`
- `src/lib/prompts/competitive-analysis.ts`
- `src/app/api/analysis/[type]/route.ts`
- `src/lib/document-generation-service.ts`
- `src/lib/competitive-analysis-v2.ts`
- `src/lib/analysis-pipelines.test.ts`
- `src/lib/competitive-analysis-prompt.test.ts`

## Account Diagnosis
- The two most recent Nazara account projects had saved `competitive-analysis` rows with zero H3 competitor profiles and zero competitor links.
- Their queue items were marked `done`, so the generation pipeline completed and saved fallback Market Research rather than failing/retrying.
- Earlier projects from the same account had competitor profiles, but they used the older prompt version that could still output inferred named profiles despite missing live data.
- Local environment variable names did not include `PERPLEXITY_API_KEY` or `TAVILY_API_KEY`; Vercel env-name verification could not run because local Vercel token/team values were not populated.
- Root cause found in code: `buildCompetitorContext()` returned the non-empty sentinel string `No competitor data gathered from external search.` for empty Perplexity results, while `buildCompetitiveAnalysisUserPrompt()` treated any non-empty context as live research.

## Verification
- `node --import tsx --test src/lib/analysis-pipelines.test.ts src/lib/competitive-analysis-prompt.test.ts` passed.
- `node --import tsx --test src/lib/analysis-pipelines.test.ts src/lib/competitive-analysis-prompt.test.ts src/lib/competitive-analysis-v2.test.ts src/components/analysis/competitive-analysis-document.test.tsx` passed.
- `node --import tsx --test src/lib/analysis-pipelines.test.ts src/lib/perplexity.test.ts src/lib/competitive-analysis-prompt.test.ts src/lib/competitive-analysis-v2.test.ts src/components/analysis/competitive-analysis-document.test.tsx` passed after remediation.
- `npm run typecheck` passed before unrelated Cloudflare/auth worktree changes appeared. A later rerun was blocked by missing unrelated modules: `@/lib/auth/current-user`, `@/lib/cloudflare/projects`, `@/lib/cloudflare/d1`, and `@/lib/cloudflare/env`.
- `npm run lint` passed with one pre-existing warning in `output/playwright/prod-full-flow.mjs`.
- `npm test` passed before remediation: 354 tests.
- `npm test` passed after remediation: 357 tests.
- `npm run build` initially failed because sandboxed network blocked Google Fonts; rerun with network approval passed before the unrelated Cloudflare/auth typecheck blocker appeared.

## Fresh-Eyes Self Review
- Pass 1 reviewed the modified pipeline, Perplexity parser, and prompt branch. No issues found.
- Pass 2 reviewed the manual route, onboarding document-generation metadata path, and new tests. No issues found.

## Code Review Findings
- Independent review found two diagnostic correctness issues:
  - `competitor_search_status` could say `found` when Perplexity returned parsed competitors but none had usable URLs.
  - Perplexity prose/no-JSON responses were classified as empty rather than parse failures.
- Both issues were remediated.
- The fix keeps graceful degradation but no longer routes empty/unusable competitor results through the live-research prompt branch.
- New metadata records `live_research` status, competitor counts, usable competitor counts, context availability, and Tavily extraction status for future diagnosis.

## Security Review Findings
- No hardcoded secrets were added.
- Provider configuration still uses environment variables.
- Saved metadata contains status/count booleans only, not API keys, raw Perplexity responses, Tavily page content, user credentials, or sensitive provider payloads.
- Logs include status/count fields and existing error normalization, not secret values.
- Supabase inspection used service credentials locally without printing them.

## Remediation Checklist
- [x] Replace empty competitor sentinel context with an actual empty context.
- [x] Treat the legacy empty-search sentinel as no live research in the prompt builder.
- [x] Filter live competitor context to named competitors with usable `http` URLs.
- [x] Preserve Perplexity parse-failure provenance.
- [x] Mark parsed competitors without usable URLs as `unusable` in diagnostics.
- [x] Mark non-empty Perplexity prose/no-JSON responses as parse failures.
- [x] Save live-research diagnostic metadata on both manual and onboarding generation paths.
- [x] Add focused regression tests.
- [x] Run focused tests, full tests, typecheck, lint, and build.
