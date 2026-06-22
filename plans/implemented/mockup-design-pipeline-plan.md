# Plan: Happy-Path Multi-Screen Mockup Generation

> Current revalidation, 2026-06-22: this remains useful historical context for the hidden mockup design-plan pipeline, but the "two to four screens" storyboard detail has been superseded. Current code uses fixed two-frame skeleton storyboards and exactly two planned screens for every platform.

## Goal
Replace the current single-screen, loosely inferred mockup generation flow with a design-planning pipeline that produces three coherent visual directions, each represented by one storyboard image containing two to four populated MVP screens. The user-facing workspace should show three generated images grouped by option, while each image visually contains the selected happy-path screens. The screen map and design brief remain internal metadata used to guide generation, recovery, debugging, and future regeneration.

## Assumptions
- The user-facing Product Plan and First Version Plan should stay readable and should not expose a formal screen map unless a future editing workflow needs it.
- The internal design plan should be generated from project intake context, Product Plan, and First Version Plan before any image calls.
- The first implementation should generate three images total: 3 visual directions x 1 storyboard image per direction.
- Each storyboard image should contain two to four screens selected from the MVP happy path, depending on product complexity.
- Desktop-first mockups should render as one wide horizontal storyboard image containing desktop screens.
- Mobile-first mockups should render as one horizontal storyboard image containing phone screens.
- Existing OpenRouter image generation remains the default image provider.
- Existing Supabase Storage mockup image proxy and ownership checks should be reused.
- Prompt Lab should eventually support the new design-plan prompt path, but production generation should come first.

## Decisions From User
- The platform intake question is required for every new project.
- The platform question should be single-choice and should not include combined "both desktop and mobile" options.
- Future users should be able to override the platform before mockup generation, but that control is deferred for a later iteration. The architecture should not make this hard later.
- The internal planner may choose two screens for simple products, three for normal products, and four for complex products.
- The three option image calls should run sequentially for Vercel Hobby safety.
- The generated design plan should be stored in `mockups.metadata` and should not be shown to the user.
- Each option image should be a horizontal strip/storyboard whether it contains two, three, or four screens.
- The planner should generate screen captions, and those captions should be shown in the UI.
- Existing saved mockups do not need first-class legacy renderer support for this change because they will be deleted separately later.
- Option storyboard generation should remain on `/api/mockups/generate-option`.
- The v2 pipeline does not need to be feature-flagged.
- Image prompts should request an appropriate large/wide image composition so storyboard screens are inspectable.
- Final required platform chip labels are `Desktop web`, `Mobile web`, `Native mobile app`, and `Native desktop app`.
- OpenRouter supports image-generation configuration through `image_config.aspect_ratio` and `image_config.image_size` for models that support those fields, but support is model-dependent. The implementation should request a wide aspect ratio and high resolution, then verify the decoded image dimensions instead of assuming exact pixel control.
- Default image configuration should be `image_config: { aspect_ratio: "21:9", image_size: "2K" }`, with a config/env override to test `"4K"` if storyboard legibility is not good enough.
- Mobile mockups should use a Figma-style user-flow canvas: phone screens shown side by side on a clean white canvas with short captions.
- Mobile storyboard image prompts should use a structured composition JSON based on the preferred reference: same-width iPhone 17 Pro portrait frames, fixed top labels, neutral arrows between screens, optional side rationale cards, and same-width vertical continuation or scroll cues instead of wider phone frames.

## Remaining Clarifying Questions
- None before implementation.

## Recommended First Step
Add an internal design-plan generation function with a strict JSON schema and focused tests before touching image generation. This validates that the PRD/MVP context can reliably become a platform, happy-path scenario, two to four selected screens, and three coherent design directions.

## Plan
1. Update intake question generation so the wizard can ask where the first version should primarily live.
   - Add prompt guidance in `src/lib/prompts/intake-wizard.ts`.
   - Make this a required single-choice question for every new project.
   - Use only mutually exclusive platform choices: `Desktop web`, `Mobile web`, `Native mobile app`, and `Native desktop app`.
   - Do not include combined options such as `Both`, `Desktop first responsive`, or `Mobile first responsive`.
   - Keep the answer as structured intake context; do not add a new DB column unless existing intake JSON cannot support it.
   - Validate with intake question tests and summary tests.

2. Create an internal mockup design planner.
   - Add a new module such as `src/lib/mockup-design-plan.ts` or `src/lib/prompts/mockup-design-plan.ts`.
   - Inputs: project name, original idea/intake summary, Product Plan if available, First Version Plan, and optional existing platform preference.
   - Output strict JSON with:
     - `version`
     - `primaryPlatform`
     - `happyPathScenario`
     - `persona`
     - `screens[2..4]` with `name`, `flowStep`, `caption`, `purpose`, `happyPathState`, `dataToShow`, `priority`
     - `directions[3]` with label A/B/C, name, layout strategy, navigation pattern, density, visual tone, reusable UI motifs, and consistency notes
   - Include fallback logic if Product Plan is missing during manual generation.
   - Add parser/validator tests for valid, malformed, and partial AI responses.

3. Thread the design plan into production mockup generation.
   - Update `generateOpenRouterImageMockup()` and `generateOpenRouterImageMockupOption()` in `src/lib/openrouter-image-mockup-pipeline.ts`.
   - Keep option-level generation, but make each option prompt request a storyboard image containing the selected two to four screens.
   - Request a horizontal storyboard strip containing the two to four screens chosen by the planner.
   - Use the design direction brief consistently across all screens shown inside the storyboard.
   - Keep image prompts explicit that every screen is populated, happy-path, and not empty/login/onboarding unless that screen is selected by the plan.
   - Request a large, inspectable image composition using `image_config` when supported. Default target: wide `21:9` storyboard with `image_size: "2K"`; allow an override to test `"4K"` if needed.
   - Decode generated images and record actual width/height in metadata so the renderer can handle provider variance.
   - Add metadata for run id, design plan, selected screens, model, and generated timestamps.

4. Update storage/content format for the new renderer path.
   - Add a new content shape, for example `openrouter-image-mockup-v2`.
   - Shape should group options:
     - option label/title/description
     - storyboard image URL, storage path, content type
     - screens array with screen name, caption, purpose, and happy-path state used inside the storyboard
   - Make the new renderer the target path. Keep only minimal defensive parsing for old content if it is cheap, because old saved mockups are planned for separate deletion.
   - Add tests for the new v2 format.

5. Keep option-level recovery and retry.
   - Extend manual generation metadata so recovery understands that each option image contains two to four internal screens.
   - Storage paths should be deterministic, for example:
     - `{projectId}/{runId}/option-a-storyboard.png`
     - `{projectId}/{runId}/option-b-storyboard.png`
   - Update `/api/mockups/recover-options` so it reconstructs which option storyboard images already exist.
   - Finalization should require all three option storyboard images for v2.

6. Update mockup API routes.
   - `/api/mockups/generate`: server-side all-in-one generation should produce v2 content.
   - `/api/mockups/generate-option`: generate one option storyboard containing the selected two to four screens.
   - `/api/mockups/finalize`: accept grouped option storyboard payloads.
   - `/api/mockups/fixture`: create v2 fixtures with three options, each image visibly containing two to four screens for local UI verification.
   - Keep the route names stable; do not add a v2 feature flag.

7. Update the workspace generation UI.
   - In `project-workspace.tsx`, track progress by option.
   - Show clear progress states such as `Generating Option A storyboard`.
   - Preserve retry behavior without spending credits on already uploaded images.
   - Avoid blocking the whole workflow if recovery can reconstruct previously completed screens.

8. Update the mockup renderer.
   - In `src/components/ui/mockup-renderer.tsx`, render v2 content as three option sections.
   - Each option section displays one storyboard image plus the screen names/captions used to generate it.
   - Desktop storyboard images should have stable wide dimensions and horizontal scrolling or overflow handling when needed.
   - Mobile storyboard images should look like a Figma user-flow canvas: white background, phone screens side by side, short captions, no decorative device clutter beyond simple phone frames if useful.
   - Show option name, direction summary, and short screen captions.
   - Legacy OpenRouter, Stitch, json-render, and ASCII mockup rendering does not need to be preserved as a product requirement for this change.

9. Add Prompt Lab support after production path is stable.
   - Let Prompt Lab generate or inspect the internal design plan.
   - Allow single option storyboard regeneration.
   - Avoid letting Prompt Lab system drafts overwrite generated user context, matching current Prompt Lab constraints.

10. Update documentation.
   - Update `PROJECT_CONTEXT.md` because this changes mockup architecture and generation behavior.
   - Document new env vars only if added.
   - Document expected timing and recovery behavior for three sequential image calls, each representing two to four screens.

## Milestones
- Design Plan Contract: strict JSON design plan generation exists and is tested.
- V2 Generation Format: production pipeline can generate and save three storyboard images with grouped screen metadata.
- Recovery: partially completed runs can resume without regenerating completed option storyboard images.
- Renderer: workspace displays grouped options with clear multi-screen storyboards.
- Documentation: `PROJECT_CONTEXT.md` reflects the new architecture.

## Validation
- Unit tests for intake prompt constraints, design-plan parsing, v2 content parsing, storage path helpers, and recovery reconstruction.
- Focused route/helper tests for finalization requiring three option storyboard images.
- Local fixture route produces a v2 mockup without OpenRouter credits.
- Browser verification of the workspace mockup renderer:
  - desktop platform content shows wide screens in horizontal option strips
  - mobile platform content shows phone-screen storyboards cleanly
  - captions and option headings do not overlap
- If feasible, one local Prompt Lab or fixture run should validate the end-to-end UI without paid image calls.

## Risks And Mitigations
- Risk: Storyboard images may make individual screen details harder to inspect.
  - Mitigation: Prompt for a wide, high-resolution composition with clearly separated labeled screens and avoid tiny UI text.
- Risk: Option images may still be slow or fail.
  - Mitigation: Generate and persist one option storyboard at a time, expose progress, and recover completed option images before retrying.
- Risk: A single storyboard image may show inconsistent details across the selected screens.
  - Mitigation: Generate a detailed direction brief once and include every selected screen spec in the same prompt so the model designs them as one coherent product.
- Risk: The internal planner may choose weak or generic screens.
  - Mitigation: Use a strict prompt requiring screens from the core happy path and test fixtures across B2B SaaS, consumer mobile, marketplace, and AI workflow products.
- Risk: New content format could make old saved mockups unusable.
  - Mitigation: This is acceptable for the planned product direction because old mockups will be deleted separately. Do not delete existing records as part of this implementation without explicit approval.
- Risk: Intake platform preference could over-constrain later design decisions.
  - Mitigation: Keep the stored platform value isolated in structured intake metadata so a later mockup-generation override control can supersede it without a schema migration.
- Risk: Stored metadata may become large.
  - Mitigation: Store concise structured design plans and avoid embedding full PRD/MVP text in metadata.

## Rollback Or Recovery
- Keep route names stable so the UI can fall back to retry/finalize behavior if an option storyboard fails.
- No v2 feature flag is planned.
- If v2 finalization fails, recovered storage paths can be reused because storyboard image paths are deterministic by run id and option.
- If renderer issues appear, v2 rows can fall back to a simple option image list because all storyboard images are stored independently and proxied through existing ownership checks.

## Open Decisions
- None before implementation.

## Implementation Progress
- [x] Required primary-platform intake question and server-side answer validation
- [x] Hidden mockup design-plan prompt, parser, and tests
- [x] OpenRouter storyboard v2 content format with parser support
- [x] Option-level storyboard generation, recovery, finalization, and fixture route updates
- [x] Workspace retry state for the in-flight design plan
- [x] Storyboard renderer with horizontal overflow handling and screen captions
- [x] Prompt Lab compatibility with storyboard mockup output
- [x] Structured mobile storyboard composition prompt for consistent iPhone 17 Pro-style user-flow images
- [x] `PROJECT_CONTEXT.md` architecture/env updates
- [x] Final verification, code review, security review, and remediation notes

## Critique

### Software Architect
- The proposed pipeline is directionally correct because it separates planning from rendering and keeps image generation close to the existing option-level architecture. Three storyboard image calls fit the current recovery model much better than nine separate files, though durable background jobs would still be cleaner long term.

### Product Manager
- The hidden screen map avoids cluttering the user-facing MVP doc, which is the right product decision. The risk is that users may disagree with selected screens but have no way to correct them. A later "Regenerate mockups with notes" or "change platform" control may be needed, but the first version should keep the flow automatic.

### Customer Or End User
- Happy-path populated storyboards will be much more useful than empty dashboards. Users will better understand the product flow because each option shows multiple connected screens. The tradeoff is legibility: each storyboard must be large enough for users to inspect screen-level decisions.

### Engineering Implementer
- The largest implementation surface is not the prompt; it is the data contract and recovery state. Build v2 fixtures and parser tests first, then wire the expensive OpenRouter calls last. Do not update the renderer before the content format is stable.

### Risk, Security, Or Operations
- The design planner and image prompts must treat PRD/MVP/intake text as untrusted context, not instructions. Storage proxy ownership checks should remain unchanged. Rate limiting still matters, but three image calls keeps provider cost and operational risk closer to the current system.
