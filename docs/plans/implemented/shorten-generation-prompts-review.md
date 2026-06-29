# Review: Shorten Mockup Generation Prompts

## Scope

- `src/lib/mockup-design-plan.ts`
- `src/lib/openrouter-image-mockup-pipeline.ts`
- `src/lib/prompt-lab.ts`
- `src/components/dev/prompt-lab-client.tsx`
- Related tests, fixture route, mockup content type, and `PROJECT_CONTEXT.md`

## Verification

- `node --import tsx --test src/lib/mockup-design-plan.test.ts src/lib/openrouter-image-mockup-pipeline.test.ts src/lib/prompt-lab.test.ts`
- `npm run typecheck`
- `git diff --check`
- Browser verification at `http://localhost:3000/dev/prompt-lab`: selected `Design Mockups` and confirmed separate `Compact mockup brief`, `Generated hidden design plan JSON`, and `ChatGPT image prompt` panels appear.

## Fresh-Eyes Review

- Pass 1: Reviewed the compact brief extraction, final prompt generation, Prompt Lab metadata/UI, and planner retry path. Found and fixed platform extraction so it considers all available context instead of stopping at the first non-empty string.
- Pass 2: Rechecked stale `persona`, raw MVP context, and generic direction fallback references. Remaining `persona` references are Product Plan text aliases or prompt copy saying not to invent one; production mockup plan schema uses `targetUser`.

## Code Review Findings

- No blocking findings after remediation.
- Residual risk: deterministic section extraction is intentionally simple and may miss nuance in malformed planning docs. Tests now cover the compact brief behavior and oversized source-document exclusion.

## Security Review Findings

- No blocking findings.
- The compact brief remains wrapped as untrusted product context through `buildSecurePrompt`.
- Reducing raw Product Plan / First Version Plan forwarding reduces external model data exposure.
- No secrets, auth changes, database migrations, or new external APIs were introduced.

## Remediation Checklist

- [x] Remove raw MVP context from final image prompts.
- [x] Replace generated planner persona with input-derived `targetUser`.
- [x] Fail/retry invalid planner output instead of silently using broad defaults.
- [x] Add prompt-size metadata.
- [x] Expose compact brief separately in Prompt Lab.
