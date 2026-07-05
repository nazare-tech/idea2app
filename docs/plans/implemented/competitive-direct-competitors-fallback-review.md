# Review: Competitive Direct Competitors Fallback

## Summary

Restored visible Direct Competitors when live Perplexity/Tavily research is unavailable or empty. The fallback now asks the synthesis model for conservative evidence-limited competitor candidates, and the renderer keeps those H3 profiles visible with a verification notice instead of suppressing the section.

## Files Reviewed

- `src/lib/prompts/competitive-analysis.ts`
- `src/lib/competitive-analysis-v2.ts`
- `src/components/analysis/competitive-analysis-document.tsx`
- `src/lib/analysis-pipelines.test.ts`
- `src/lib/competitive-analysis-prompt.test.ts`
- `src/lib/competitive-analysis-v2.test.ts`
- `src/components/analysis/competitive-analysis-document.test.tsx`
- `PROJECT_CONTEXT.md`

## Verification

- `node --import tsx --test src/lib/analysis-pipelines.test.ts src/lib/competitive-analysis-prompt.test.ts src/lib/competitive-analysis-v2.test.ts src/components/analysis/competitive-analysis-document.test.tsx`
- `npm.cmd run typecheck -- --pretty false`
- `npm.cmd run lint`
- `npm.cmd test`

## Code Review Notes

- The parser no longer treats no-live-research wording as a reason to discard H3 competitor profiles.
- The renderer shows an evidence notice when fallback candidates are present, while keeping the existing empty state for documents with no H3 profiles.
- The prompt still forbids fake URLs, exact pricing, and unsupported company-specific claims in fallback mode.

## Security Review Notes

- No credentials, environment variables, or provider responses are logged or exposed.
- Prompt construction continues to use `buildSecurePrompt`.
- The change affects generated content and rendering only; it does not alter authentication, ownership checks, database policies, or external API calling permissions.
