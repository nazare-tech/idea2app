---
implemented: false
implemented_at:
implementation_summary:
---

# Plan: Brand Document Tab With OpenAI Image Generation

## Goal
Add a new project document tab called **Brand** that can generate and display a brand kit for a project, including AI-generated visual brand assets from OpenAI image generation and concise brand guidance that founders can use before mockups, landing pages, and launch materials.

## Assumptions
- "Documents" means the project workspace document flow described in `PROJECT_CONTEXT.md`, not an external document editor.
- The Brand tab should appear in the left/scrollable document navigation near the other founder planning documents.
- Brand generation should be project-owned, authenticated, duplicate-protected, and consistent with existing active-singleton document behavior.
- The safest first implementation is to store Brand as an `analyses` row with `type = "brand-kit"` plus metadata, rather than introducing a new table. This matches how Marketing is stored as `analyses.type = "launch-plan"` and avoids a schema migration unless the product later needs richer asset management.
- Generated images should be saved in private Supabase Storage and served through an authenticated proxy, not exposed through public URLs.
- OpenAI's current docs show `gpt-image-2` as the latest GPT Image model for API image generation. The `chatgpt-image-latest` model page says it points to a previous ChatGPT image snapshot and recommends `gpt-image-2` for API use, so the recommended default is `gpt-image-2` with an env override if you explicitly want `chatgpt-image-latest`.

## Clarifying Questions
1. Should the tab label be exactly **Brand**, or should the document title be **Brand Kit** while the tab says **Brand**?
2. Should Brand be included in onboarding / Generate All by default, or should it be manually generated after MVP/Mockups?
3. What image assets should the first version generate: logo mark, app icon, social banner, hero visual, palette board, or something else?
4. Do you want direct OpenAI API usage with `OPENAI_API_KEY`, or should the implementation keep using OpenRouter for image models like current Mockups?
5. Should the default model be OpenAI-recommended `gpt-image-2`, or do you specifically want the `chatgpt-image-latest` alias despite the current docs recommending `gpt-image-2` for API use?
6. Should Brand cost credits? Mockups currently cost 0 credits; a Brand image kit may have real API cost and should either be bundled or explicitly priced.

## Recommended First Step
Confirm the model/default and scope of generated assets. The technical path is straightforward, but the product shape changes depending on whether Brand is a lightweight optional document or a required onboarding artifact.

## Plan
1. Add the Brand document type and navigation metadata.
   - Update `src/lib/document-definitions.ts` with `brand`.
   - Update `src/lib/document-sections.ts` with Brand anchors.
   - Update workspace tab policy and status initialization maps where `DocumentType` is exhaustively handled.
   - Validation: focused typecheck catches missed exhaustive mappings.

2. Add Brand document retrieval and rendering.
   - Fetch `analyses.type = "brand-kit"` in `src/app/(dashboard)/projects/[projectRef]/page.tsx`.
   - Update `ProjectWorkspace` status, version lookup, content lookup, metadata lookup, and generation polling counts.
   - Add Brand section rendering in `ScrollableContent`, with a typed renderer for generated JSON and a markdown fallback.
   - Validation: component/unit tests for status and renderer parsing where practical.

3. Build an OpenAI Brand generation pipeline.
   - Add a prompt module such as `src/lib/prompts/brand.ts`.
   - Add `src/lib/openai-brand-pipeline.ts` to call OpenAI image generation, parse base64 outputs, upload images to Supabase Storage, and return a stable JSON content contract.
   - Use `OPENAI_API_KEY`, `OPENAI_BRAND_IMAGE_MODEL`, `OPENAI_BRAND_IMAGE_TIMEOUT_MS`, and a storage bucket env var with safe defaults.
   - Recommended content contract:
     - `type: "openai-brand-kit"`
     - `model`
     - `generatedAt`
     - `assets[]` with `label`, `title`, `kind`, `imageUrl`, `storagePath`, `description`, `contentType`
     - `guidelines` with palette, typography direction, visual style, voice, and usage notes
   - Validation: pure tests for parsing image payloads, storage-path extraction, proxy URL construction, and renderer normalization.

4. Add authenticated Brand image serving.
   - Add `/api/brand/image` or a reusable `/api/documents/image` proxy.
   - Verify the user owns the project and the requested storage path belongs to a saved `brand-kit` analysis row for that project.
   - Enforce content type and size checks matching the mockup proxy pattern.
   - Validation: route-level tests if the repo has a practical route harness; otherwise focused code tests around path extraction and ownership-query shape.

5. Add `/api/brand/generate`.
   - Authenticate with Supabase.
   - Rate-limit per user/IP.
   - Validate `projectId`, project ownership, and input size.
   - Check `active-document-policy` for existing `brand-kit` before calling OpenAI.
   - Call the Brand pipeline, save `analyses` with `type = "brand-kit"`, and return JSON or NDJSON events if streaming status is useful.
   - Track metrics with `featureType`/source/model metadata.
   - Validation: tests for duplicate prevention and missing env errors where practical.

6. Wire Brand into Generate All only if approved.
   - If Brand is included by default, add it to `GENERATE_ALL_QUEUE_ORDER`, `GENERATION_ALL_DEFAULT_MODELS`, `GENERATION_ALL_ACTION_MAP`, dependency mapping, onboarding queue definitions, onboarding loading rows, and status endpoints.
   - Recommended dependency: Brand depends on MVP if it should reflect product scope; Brand can run after Competitive if it should shape positioning earlier.
   - Validation: update generation queue tests for order, dependencies, cost, skipped existing documents, and onboarding row mapping.

7. Update docs and configuration.
   - Update `PROJECT_CONTEXT.md` because this adds a document type and external provider configuration.
   - Update setup docs or README env section with OpenAI image env variables.
   - Avoid writing any secret values into docs or code.

8. Verify and review.
   - Run `npm test`.
   - Run `npm run lint`.
   - Run `npm run build` if feasible.
   - Start the dev server and visually verify Brand nav, empty state, generation state, generated image display, and authenticated image loading.
   - Write `docs/plans/brand-document-tab-review.md` with code review findings, security review findings, and remediation checklist before final fixes.

## Milestones
- Navigation milestone: Brand appears as a document tab/section with correct pending/done status.
- Generation milestone: `/api/brand/generate` creates one active Brand document and refuses duplicate generation without charging/calling OpenAI.
- Asset milestone: generated images are stored privately and displayed only through an authenticated ownership-checked proxy.
- Pipeline milestone: optional Generate All/onboarding behavior is consistent with dependencies, status polling, and retry behavior.
- Verification milestone: tests, lint/build, browser visual checks, review notes, and remediation are complete.

## Validation
- Unit tests:
  - document definitions include Brand where expected.
  - active document policy maps `brand` to `analyses.type = "brand-kit"`.
  - Brand JSON parser accepts valid content and rejects malformed content gracefully.
  - image parsing rejects empty/oversized/unsupported payloads.
  - queue dependency tests pass if Brand joins Generate All.
- API validation:
  - unauthenticated requests return 401.
  - wrong-project requests return 404.
  - duplicate Brand documents return a skipped existing-document payload.
  - missing `OPENAI_API_KEY` returns a clear server error without exposing secrets.
- Visual validation:
  - Brand tab visible.
  - Empty state visible before generation.
  - Loading/generating state visible during generation.
  - Generated assets render without broken images or layout overlap on desktop and mobile.

## Risks And Mitigations
- OpenAI model naming ambiguity: use `gpt-image-2` by default because current OpenAI docs recommend it for API image generation; keep `OPENAI_BRAND_IMAGE_MODEL` for explicit override.
- API cost and latency: generate a small fixed set of assets first, set route timeouts, rate-limit the route, and avoid automatic Generate All inclusion unless approved.
- Private image access mistakes: do not reuse public URLs; verify project ownership and stored path membership in the proxy route.
- Queue blast radius: keep Brand manual first unless Generate All inclusion is explicitly approved.
- Schema churn: use the existing `analyses` table first; migrate later only if Brand needs versioned asset libraries, editable style tokens, or per-asset lifecycle management.

## Open Decisions
- Exact default image model: `gpt-image-2` vs `chatgpt-image-latest`.
- Direct OpenAI vs OpenRouter provider path.
- Asset set and count.
- Whether Brand participates in onboarding / Generate All.
- Credit cost.
- Tab order: recommended order is MVP Plan -> Brand -> Mockups -> Marketing.

## Critique

### Software Architect
- Reusing `analyses` minimizes schema risk and matches Marketing, but Brand assets are more structured than a normal analysis. If Brand becomes a reusable design system surface, a dedicated `brand_kits` table will become cleaner.
- A separate authenticated Brand image proxy avoids weakening the existing mockup proxy's ownership checks.

### Product Manager
- Brand can help founders make mockups and launch assets feel coherent, but only if the output is concrete. The first version should generate a small set of useful assets rather than a broad, vague brand essay.
- Including Brand in onboarding may slow first-project readiness. Manual generation is a safer launch unless Brand is core to the product promise.

### Customer Or End User
- Users will expect downloadable/usable assets, not just pretty previews. The renderer should make each asset easy to inspect and should label what it is for.
- If a generated logo is weak, users need an obvious regenerate/version path eventually. The current active-singleton policy means v1 should either accept one output or explicitly defer versioning.

### Engineering Implementer
- The main code risk is exhaustive `DocumentType` handling across the workspace. TypeScript will help, but the current code has repeated switch statements and maps that all need updates.
- The existing mockup pipeline can be used as a pattern, but direct OpenAI Images API response shape differs from OpenRouter chat-completions image payloads, so tests should cover parsing separately.

### Risk, Security, Or Operations
- Do not expose generated storage paths unless the proxy re-verifies ownership and path membership against saved Brand content.
- Do not hardcode API keys. Use environment variables only.
- Log model IDs and request status, but never log prompts if they may contain sensitive project details unless existing metrics policy already permits it.
