# Source Provenance

Maintainer-only note: paths below refer to the upstream Maker Compass repository used to build this portable package. Runtime use does not require that repository or these files.

Contracts synchronized from Maker Compass on 2026-07-22.

Primary source files:

- `src/lib/prompts/intake-wizard.ts`
- `src/lib/prompts/competitor-search.ts`
- `src/lib/prompts/competitive-analysis.ts`
- `src/lib/competitive-analysis-v2.ts`
- active `PRD_SYSTEM_PROMPT` in `src/lib/prompts/prd.ts`
- `src/lib/prompts/mvp-plan.ts`
- `src/lib/mockups/design-plan.ts`
- `buildOpenRouterMockupImagePrompt` in `src/lib/mockups/openrouter-image-pipeline.ts`
- `src/components/analysis/ai-prompt-files.tsx`
- `src/lib/document-definitions.ts`

Excluded after source inspection:

- inactive `PREVIOUS_PRD_SYSTEM_PROMPT`;
- exported but unused legacy `src/lib/prompts/mockups.ts` json-render flow;
- hidden/manual Tech Spec;
- archived Launch Plan;
- auxiliary Project Composer;
- vendor-specific OpenRouter, Supabase, billing, queue, and storage orchestration.

Refresh this reference plus the artifact contracts when the upstream product’s active prompts, required headings, mockup planner schema, skeleton assets, or derived prompt-file list changes.
