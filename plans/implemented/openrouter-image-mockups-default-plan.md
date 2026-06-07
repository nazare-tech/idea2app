# Plan: OpenRouter Image Mockups Default Route

## Goal
Create a new mockup generation route that uses ChatGPT/OpenAI image generation through OpenRouter only, make that path the product default for manual mockup generation and onboarding/server-side mockup generation, and retain the existing Stitch code and proxy paths for backwards compatibility with already-saved mockups and possible future rollback.

## Assumptions
- The default OpenRouter model should be `openai/gpt-5.4-image-2`, because OpenRouter currently lists it as an image-output OpenAI model that combines GPT-5.4 with GPT Image 2.
- OpenAI’s latest GPT Image family in official docs is `gpt-image-2`, but OpenRouter exposes its own model IDs; this implementation should use OpenRouter’s supported model ID rather than calling OpenAI directly.
- The generated mockup output should include three static image alternatives, preserving the current compare-three-directions product experience from Stitch.
- Generated image bytes should be uploaded to Supabase Storage; `mockups.content` should store durable image URLs and metadata, not large base64 payloads.
- `/api/mockups/generate` should become the default OpenRouter-image route. Stitch can remain behind existing library code and, if needed, a clearly named legacy route.
- Mockup generation should not consume credits. This work should align with the project-based pricing migration and avoid adding new credit-facing UI or billing dependencies.
- The model should be configurable through `OPENROUTER_MOCKUP_IMAGE_MODEL`, defaulting to `openai/gpt-5.4-image-2`.
- Existing Stitch mockup rows must continue rendering through the current `{ type: "stitch", options: [...] }` contract and `/api/stitch/html`.
- The user wants no OpenAI API fallback. Missing `OPENROUTER_API_KEY`, missing image output, moderation failures, or OpenRouter outages should fail the mockup generation clearly without attempting direct OpenAI API calls.
- There should be no remaining user-facing idle "Generate All" button. If any such control remains, clean it up as part of this implementation; backend queue/executor routes may remain for onboarding and durable generation.

## Clarifying Questions
1. Resolved: Generate three alternatives.
2. Resolved: Static image mockups are acceptable; include concise metadata/descriptions where useful.
3. Resolved: Store generated image files in Supabase Storage and persist URLs in `mockups.content`.
4. Resolved: OpenRouter image generation should become the default for `/api/mockups/generate`.
5. Resolved: Mockup generation should not use credits because the product is moving to project-based pricing.
6. Open: Should there be an internal provider flag such as `MOCKUP_PROVIDER=openrouter-image|stitch`, or should rollback require a code change?
7. Open: What image aspect ratio should be standard for app mockups: desktop 16:9, portrait mobile, or both?
8. Resolved: The model should be configurable via `OPENROUTER_MOCKUP_IMAGE_MODEL`, with `openai/gpt-5.4-image-2` as the default.
9. Resolved: The download button should simply download the generated image.

## Recommended First Step
Implement and test the new shared OpenRouter image mockup pipeline first, including Supabase Storage upload and a normalized three-option JSON contract, before repointing `/api/mockups/generate` and the server-side document generation service.

## Plan
1. Add a dedicated OpenRouter image mockup pipeline.
   - Create `src/lib/openrouter-image-mockup-pipeline.ts`.
   - Use the existing `openai` SDK with `baseURL: "https://openrouter.ai/api/v1"` and `apiKey: process.env.OPENROUTER_API_KEY`.
   - Call `/chat/completions` with an image-output model and `modalities: ["image", "text"]`.
   - Use `openai/gpt-5.4-image-2` by default, configurable through `OPENROUTER_MOCKUP_IMAGE_MODEL`.
   - Generate three distinct alternatives with labels A, B, and C. Prefer three separate calls or a loop with variant-specific prompts so each saved image maps cleanly to one option.
   - Do not import or call OpenAI’s direct Images API.
   - Validation: unit-test response parsing for `message.images[].image_url.url` and failure when no image is returned.

2. Add Supabase Storage persistence for generated images.
   - Choose or create a private/public bucket for generated mockup assets, for example `mockups`.
   - Decode OpenRouter image data URLs server-side and upload each option as a PNG/WebP under a project/user-scoped path.
   - Persist storage URLs, object paths, dimensions if available, model ID, and generated timestamp in `mockups.content` and `mockups.metadata`.
   - Validation: targeted storage test or manual run verifies uploaded objects are readable by the owning user and do not expose unrelated users' assets.

3. Define a new persisted mockup format.
   - Example:
     ```json
     {
       "type": "openrouter-image",
       "model": "openai/gpt-5.4-image-2",
       "options": [
         {
           "label": "A",
           "title": "Primary product mockup",
           "imageUrl": "https://...",
           "storagePath": "mockups/<projectId>/<mockupId>/option-a.png",
           "description": "..."
         }
       ]
     }
     ```
   - Validation: parser test confirms the renderer can distinguish `openrouter-image`, `stitch`, existing JSON-render specs, and legacy markdown.

4. Repoint the default mockup API route to OpenRouter image generation.
   - Update `src/app/api/mockups/generate/route.ts` so it uses the new OpenRouter image pipeline by default.
   - Remove credit consumption and refund behavior from this route. Keep auth, ownership, rate limit, active-document skip, streaming/local stage events, project status update, and metrics.
   - Save rows to `mockups` with `model_used` set to the actual OpenRouter image model and `metadata.source` set to `openrouter-image`.
   - If preserving a manual Stitch trigger is useful, add a clearly named legacy route such as `src/app/api/mockups/generate-stitch/route.ts`; otherwise keep Stitch only as library/rendering compatibility code.
   - Validation: route-level test or targeted manual request verifies missing auth, invalid body, missing `OPENROUTER_API_KEY`, duplicate active document skip, successful storage upload, and successful row insert shape.

5. Make OpenRouter image generation the default product path.
   - Keep manual mockup generation pointed at `/api/mockups/generate`; the route itself now owns the OpenRouter default.
   - Update `src/lib/document-generation-service.ts` so Generate All/onboarding mockups call `generateOpenRouterImageMockup()` instead of `generateStitchMockup()`.
   - Update queue item metadata/model defaults so mockups record `OPENROUTER_MOCKUP_IMAGE_MODEL` and `source: "openrouter-image"`.
   - Remove remaining mockup credit checks/cost displays from user-facing generation UI.
   - Keep `src/lib/stitch-pipeline.ts`, `src/lib/stitch/client.ts`, and `/api/stitch/html` unchanged for existing saved Stitch content.
   - Validation: generate-all helper/service tests confirm mockups still depend on MVP and save to `mockups`, but now use `metadata.source: "openrouter-image"` and do not consume credits.

6. Update rendering for the new image contract.
   - Extend `src/components/ui/mockup-renderer.tsx` and `src/components/layout/scrollable-content.tsx` to render `{ type: "openrouter-image" }`.
   - Present three image options with title/description and a simple "Download" button that downloads the selected/generated image file.
   - Avoid calling `/api/stitch/html` for OpenRouter image mockups.
   - Validation: render tests or Playwright screenshot verifies image mockups display in the workspace and document view without breaking existing Stitch mockups.

7. Audit and remove remaining user-facing Generate All and credits UI.
   - Search for visible "Generate All" buttons/blocks and remove any idle/manual Generate All entry points that remain.
   - Keep backend queue/status/executor code where it is still used for onboarding or durable server-side generation.
   - Search for "credits" text in document generation UI, billing copy, TODO/roadmap docs, and mockup generation routes.
   - Update `TODO.md` or the closest roadmap checklist with a project-based pricing cleanup item so future work tracks removal of remaining credit-based concepts.
   - Validation: UI smoke test confirms users do not see credit costs or a manual Generate All button in the normal workspace flow.

8. Update metrics, model defaults, and docs.
   - Add `openrouter-image` to `AISource` if metrics typing needs it.
   - Update `src/lib/document-definitions.ts` or related default model config so mockups show the OpenRouter image model, not Claude/Stitch.
   - Update `src/lib/utils.ts`, token economics helpers, and tests as needed so mockups no longer require or display a credit cost.
   - Update `PROJECT_CONTEXT.md` because this is an architectural provider change.
   - Validation: TypeScript and lint catch source/model typing mismatches.

9. Preserve Stitch as legacy/optional.
   - Leave existing Stitch files intact.
   - Optionally add a clearly named legacy endpoint, such as `/api/mockups/generate-stitch`, if an internal manual Stitch trigger is still desired.
   - Keep `/api/stitch/html` because saved Stitch mockups need it.
   - Validation: open an existing Stitch mockup and confirm its iframe/html preview still works.

10. Verify end to end.
   - Run `npm test` for affected unit tests.
   - Run `npm run lint`.
   - Start the app with `npm run dev`.
   - Manually generate mockups from a project that has an MVP plan.
   - Confirm the default route uses OpenRouter, uploads three images to Supabase Storage, the `mockups` row saves `metadata.source = "openrouter-image"`, no credits are consumed, and no direct OpenAI API key is required.

## Milestones
- Completed: Contract approved: three alternatives, Supabase Storage, default route repointing, no credits, and configurable model are decided.
- Completed: Pipeline complete: OpenRouter image generation returns a normalized mockup JSON object and has parser tests.
- Completed: Storage complete: generated images are uploaded to Supabase Storage and referenced from mockup JSON.
- Completed: Route complete: `/api/mockups/generate` uses OpenRouter image generation with auth, active-document, rate-limit, and metrics behavior, but no credit billing.
- Completed: Default switched: manual generation and onboarding/server-side mockup generation use OpenRouter image generation by default.
- Completed: Renderer complete: new image mockups and existing Stitch mockups both render correctly.
- Completed: UI cleanup complete: no normal user-facing credit costs or manual idle Generate All button remain in the mockup/workspace generation flow.
- Completed: Documentation updated: `PROJECT_CONTEXT.md` accurately describes the new default and retained Stitch compatibility.

## Validation
- Unit tests for OpenRouter image response parsing, no-image failure, and mockup format detection.
- Storage validation for upload path construction, content type, and URL/path persistence.
- Route validation for unauthorized requests, invalid body, duplicate active document skip, missing `OPENROUTER_API_KEY`, OpenRouter no-image failure, and successful storage-backed row insert.
- Integration/manual test for `/api/mockups/generate` with a real project and MVP plan.
- Generate All/onboarding test confirming mockups still run after MVP and save a valid output ID.
- UI audit confirming no standard workspace flow exposes credit costs or a manual idle Generate All button.
- Visual verification in the workspace and full document view for new image mockups and an existing Stitch mockup.
- Source audit confirming there is no direct OpenAI image API call and no fallback to OpenAI API.

## Risks And Mitigations
- Supabase Storage permissions could expose generated assets too broadly: use project/user-scoped paths, choose bucket visibility intentionally, and verify ownership before proxying or signing URLs if private storage is used.
- OpenRouter model naming can change: use `OPENROUTER_MOCKUP_IMAGE_MODEL` and fail loudly if the selected model returns no images.
- Image models may not generate UI text reliably enough for product mockups: prompt for high-level screen composition and pair each image with generated structured notes.
- Static images lose Stitch’s live HTML preview/export: update UI copy and download behavior so users understand they are viewing generated image mockups.
- Streaming response shape may differ across OpenRouter models: implement a non-streaming first pass, then add streaming events only around local stages unless image streaming is needed.
- Moderation or provider errors may be more common for image generation: surface clear user-facing errors and avoid credit/refund complexity because this path is project-bundled.
- Removing credit UI may reveal older docs or routes that still assume credits: treat this implementation as a scoped mockup/default-route change plus a roadmap/TODO item for broader credit-system cleanup.

## Open Decisions
- Default aspect ratio and whether to support desktop/mobile pairs.
- Whether to add `MOCKUP_PROVIDER` as a controlled rollback switch.
- Whether Supabase Storage mockup assets should be public URLs or private signed URLs.
- Whether to keep a callable `/api/mockups/generate-stitch` legacy endpoint or preserve Stitch only for existing content rendering.

## Research Notes
- OpenRouter’s image generation docs say image generation is supported through Chat Completions and Responses, models can be discovered with `output_modalities=image`, and image results are returned on assistant messages, often as base64 data URLs.
- OpenRouter’s current image model list includes `openai/gpt-5.4-image-2` with `output_modalities: ["image", "text"]`.
- OpenRouter’s image generation server tool defaults to `openai/gpt-image-1`, but it is beta and not the best fit if the requirement is the latest OpenAI image model through OpenRouter.
- OpenAI’s current image guide names `gpt-image-2` as the latest GPT Image model family, but direct OpenAI API calls are out of scope for this implementation.

## Critique

### Software Architect
- The plan correctly avoids deleting Stitch and keeps backwards compatibility. Supabase Storage is the right direction for three durable image alternatives, but it introduces bucket policy and lifecycle concerns that must be handled deliberately.
- A shared pipeline is better than putting OpenRouter logic directly in the route because Generate All already needs the same behavior.

### Product Manager
- Static image mockups may be easier for users to understand visually, but they remove Stitch’s interactive HTML preview. The product should clearly frame the new output as generated mockup images unless HTML is added later.
- Three alternatives preserve the current comparison value proposition better than a single generated image.
- Removing credit language aligns with the project-based pricing direction and should reduce billing confusion, but the broader credits cleanup needs its own tracked pass.

### Customer Or End User
- Users likely care less about provider details and more about getting useful, inspectable mockups. The generated images should be large, downloadable, and paired with concise explanations of layout decisions.
- If text in the generated UI is imperfect, the app should not pretend the image is implementation-ready.
- A button labeled simply "Download" is appropriate as long as it downloads the actual image the user is viewing.

### Engineering Implementer
- The safest implementation path is to add the new pipeline and storage upload first, test it directly, then repoint `/api/mockups/generate`, then switch the server-side document generation service. That keeps the blast radius contained.
- The renderer already has format detection, so adding `openrouter-image` as another top-level type should be straightforward if the content contract stays simple.
- The Generate All wording is overloaded: backend queue code may remain necessary, while public idle controls should be removed or kept hidden. Implementation should distinguish backend orchestration from visible user controls.

### Risk, Security, Or Operations
- No fallback to OpenAI API must be enforced by code structure and tests, not just configuration. There should be no direct OpenAI Images client anywhere in the new path.
- Image generation is expensive and potentially slow, so rate limits, max duration, and clear error handling should remain first-class even though the user-facing credit system is being removed from this path.
