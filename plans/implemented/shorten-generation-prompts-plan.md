---
implemented: true
implemented_at: 2026-06-09T07:03:28Z
implementation_summary: Compact mockup briefs now feed the hidden planner, final image prompts are built from validated A/B/C design plans without raw MVP context, and Prompt Lab exposes the compact brief, hidden JSON, and final prompt as separate stages.
---

# Plan: Shorten Mockup Generation Prompts

## Goal

Reduce the size and ambiguity of mockup generation in production and Prompt Lab without degrading mockup quality. The target is now both prompt stages: the hidden planner should receive a compact mockup brief instead of whole upstream documents, and the final image prompt should be built directly from the validated planner output instead of re-sending MVP/persona/product-plan text.

## Assumptions

- The current prompt bloat exists in two places:
  - `buildMockupDesignPlanUserPrompt()` can include project idea, intake context, Product Plan up to 9,000 chars, and First Version Plan up to 12,000 chars.
  - `buildOpenRouterMockupImagePrompt()` includes `mvpPlan.slice(0, 7000)` in every option-level image prompt.
- The hidden `mockup-design-plan-v1` JSON is still the right compression boundary for image generation, but the planner itself should receive a compact deterministic brief, not raw full documents.
- We should keep production and Prompt Lab using the same final image-prompt builder, so the ChatGPT-ready prompt shown in Prompt Lab matches what production would send to OpenRouter.
- The planner should not generate a new persona. If a target user/persona is needed, it should be extracted from Product Plan or First Version Plan into the compact brief before the planner call.
- Shorter prompts should preserve concrete product details: realistic data, screen names, happy-path state, visual direction, platform constraints, and output requirements.
- This work has not launched broadly, so we do not need backward compatibility for the current bloated prompt shape.
- Default visual directions should not be product-direction inputs. If the planner fails to return A/B/C directions, generation should fail or retry instead of silently substituting generic defaults.

## User Decisions Captured

- Significantly reduce what goes into step 3, the hidden planner prompt.
- Minimum planner input should be:
  - project name
  - selected primary platform from intake or Prompt Lab override
  - compact target user/persona summary extracted from existing Product Plan or First Version Plan, not generated again
  - compact MVP workflow/scope summary extracted from the First Version Plan
  - compact list of candidate core screens/features extracted from Product Plan or First Version Plan
- Step 4 should still generate exactly three directions A/B/C.
- Step 4 should not generate a fresh persona. The schema should use an input-derived `targetUser` or omit persona entirely.
- Step 6 should not use generic option defaults as fallbacks for product direction. A/B/C should come from the hidden plan.
- Step 7 should not include raw MVP Plan context. The final image prompt should be generated from the validated/stored hidden plan and minimal static rendering rules only.

## Decisions From Review

- Replace the hidden plan `persona` field with `targetUser`, and fill it from the compact brief rather than asking the planner to invent a persona.
- Target roughly 2,000-4,000 characters for the compact mockup brief / planner prompt input.
- If the planner omits A/B/C directions or required screen data, treat the output as invalid and retry or fail with a clear error.
- In Prompt Lab, show the compact mockup brief, hidden design-plan JSON, and final image prompt as separate inspectable stages.
- Record prompt-size metadata in production mockup generations.

## Clarifying Questions

1. Should the first implementation also change the hidden plan schema to remove `persona`?
   - Recommendation A: Replace `persona` with `targetUser` and fill it from the compact brief, not model invention.
   - Trade-off: This is semantically cleaner and matches the product direction, but requires test updates wherever `MockupDesignPlan.persona` is expected.
   - Recommendation B: Keep the field name `persona` temporarily but instruct the planner to copy/summarize the provided target user only.
   - Trade-off: This is less code churn, but preserves a misleading schema name.

2. What should the target planner-prompt budget be?
   - Recommendation A: Target roughly 2,000-4,000 characters for the compact mockup brief.
   - Trade-off: This forces clear extraction and avoids sending whole documents, but requires deterministic brief-building to be good enough.
   - Recommendation B: Target roughly 5,000-7,000 characters.
   - Trade-off: This is safer for complex products, but may keep too much irrelevant upstream document text.

3. What should happen if the planner omits A/B/C directions or required screen data?
   - Recommendation A: Treat it as invalid and retry/fail with a clear error.
   - Trade-off: This avoids generic fallback mockups but may expose planner failures more often until the prompt/schema is solid.
   - Recommendation B: Deterministically repair only small omissions, such as missing captions, while still failing when directions are missing.
   - Trade-off: This improves resilience but must be tightly scoped so we do not recreate broad defaults.

4. How should Prompt Lab present the shortened prompt flow?
   - Recommendation A: Show only the final compact ChatGPT-ready prompt plus the hidden design-plan JSON inspector.
   - Trade-off: This keeps the workflow clean and mirrors production, but users see less of the raw source context that influenced the planner.
   - Recommendation B: Show the compact mockup brief, hidden design-plan JSON, and final image prompt as separate inspectable stages.
   - Trade-off: This is better for debugging prompt quality, but adds more UI surface.

5. Should we record prompt-size metadata for production mockup generations?
   - Recommendation A: Record final prompt character counts, prompt version, selected platform, and option labels in `mockups.metadata`.
   - Trade-off: This makes regressions and cost issues easier to diagnose with minimal product impact.
   - Recommendation B: Avoid new metadata and keep the implementation purely prompt-level.
   - Trade-off: This keeps the saved shape smaller, but future prompt bloat will be harder to detect.

## Recommended First Step

Add focused failing tests around a new compact mockup-brief builder and the final image-prompt builder. The tests should construct deliberately huge Product Plan and First Version Plan inputs, assert that the planner prompt only receives the compact fields, assert that the final image prompt does not include raw upstream document text, and assert that missing A/B/C directions are treated as invalid rather than replaced by generic defaults.

## Plan

1. Audit the current mockup prompt flow.
   - Confirm all production and Prompt Lab paths that call `buildOpenRouterMockupImagePrompt()` or `buildMockupImagePromptForOption()`.
   - Confirm whether any caller still depends on raw MVP text in the final image prompt.
   - Output: short implementation notes in this plan before code changes.

2. Write red tests for compact planner input and final prompt size/content.
   - Add tests in `src/lib/openrouter-image-mockup-pipeline.test.ts`.
   - Add or extend tests in `src/lib/mockup-design-plan.test.ts`.
   - Cover oversized Product Plan and First Version Plan inputs.
   - Assert the planner prompt includes only compact product name, selected platform, target user, MVP workflow/scope, candidate screens/features, and constraints.
   - Assert the final image prompt excludes raw First Version Plan body and keeps the fields the image model needs.
   - Assert missing A/B/C directions fail validation instead of using generic option defaults.
   - Validation: focused tests fail on current behavior because raw upstream context and fallback defaults are still present.

3. Introduce a compact mockup brief before the hidden planner call.
   - Create a deterministic brief builder, likely near `src/lib/mockup-design-plan.ts` or in a small adjacent module.
   - Keep the compact brief in the 2,000-4,000 character range for normal products.
   - Extract only:
     - project name
     - selected primary platform from intake or Prompt Lab override
     - target user summary from Product Plan or First Version Plan
     - MVP goal / workflow summary
     - in-scope MVP capabilities
     - candidate screens/features
     - any critical constraints that affect UI
   - Stop passing full `idea`, full `intakeContext`, full `productPlan`, and full `mvpPlan` to the planner prompt.

4. Revise the hidden design-plan schema and prompt.
   - Keep exactly three directions A/B/C.
   - Replace `persona` with `targetUser`.
   - Remove generated persona behavior.
   - Require A/B/C directions to be present and complete.
   - Treat invalid planner output as a retryable/failable error rather than repairing broad missing fields with defaults.
   - Keep platform-specific screen limits.

5. Build the final image prompt directly from the hidden plan.
   - Create a final prompt that uses:
     - project name
     - selected option direction from hidden plan
     - selected platform
     - target user if retained in the plan
     - happy-path scenario
     - screens and data from hidden plan
     - static image/canvas/rendering rules
   - Remove `mvpPlan.slice(0, 7000)` entirely from the normal design-plan path.
   - If no valid design plan exists, fail/retry instead of generating a generic prompt.

6. Wire production and Prompt Lab to the same compact flow.
   - Keep `buildMockupImagePromptForOption()` as the common public helper.
   - Ensure Prompt Lab prompt-only mode returns the same compact final prompt it would send to the image model.
   - Expose the compact mockup brief, hidden design-plan JSON, and final image prompt as separate inspectable Prompt Lab stages.

7. Add prompt-size metadata.
   - Record compact brief length, planner prompt length, prompt version, and final prompt character count for each generated option where practical.
   - Prefer metadata fields that do not affect rendering, such as `image_prompt_version`, `image_prompt_char_counts`, and `image_prompt_budget`.
   - Do not store the full prompt unless there is already an established debug-only pattern.

8. Update documentation.
   - Update `PROJECT_CONTEXT.md` under Mockup Generation and Dev Prompt Lab to describe the compact mockup brief, the no-generated-persona rule, the A/B/C direction contract, and the fact that raw MVP/persona source is no longer sent after the hidden design plan exists.

9. Verify behavior.
   - Run the focused prompt tests.
   - Run typecheck.
   - Use Prompt Lab in the browser to generate a prompt-only mockup bundle and inspect that the final ChatGPT prompt is visibly shorter and still detailed.
   - If image generation is enabled later, run one fixture or one real option only after confirming the prompt text.

## Milestones

- Prompt audit complete: all planner and final image-prompt call sites are identified.
- Red test complete: current behavior is proven to include raw oversized planner/final context and fallback defaults.
- Compact mockup brief complete: planner receives only the minimum product/mockup fields.
- Hidden plan schema complete: target user is copied from input or omitted, not generated.
- Compact prompt builder complete: final prompt is structured and budgeted.
- Prompt Lab parity complete: ChatGPT-ready prompt uses the same builder as production.
- Metadata/documentation complete: prompt budget is visible in code and context docs.
- Verification complete: tests, typecheck, and Prompt Lab visual inspection pass.

## Validation

- `node --import tsx --test src/lib/openrouter-image-mockup-pipeline.test.ts`
- `npm run typecheck`
- `git diff --check`
- Browser check in `/dev/prompt-lab`:
  - Select Design Mockups.
  - Run planner-option mode with image generation disabled.
  - Confirm the planner prompt uses the compact mockup brief, not full Product Plan / First Version Plan text.
  - Confirm the output prompt no longer contains the full First Version Plan/persona/MVP sections.
  - Confirm platform-specific instructions and screen-level details remain present.

## Risks And Mitigations

- Risk: Shortening the prompt makes image outputs more generic.
  - Mitigation: Preserve concrete `dataToShow`, `happyPathState`, product name, platform, and visual direction fields from the design plan.
- Risk: The hidden planner output is sometimes too thin, and removing raw MVP context exposes that weakness.
  - Mitigation: Strengthen planner validation or add a tightly capped deterministic fallback summary only when required fields are empty.
- Risk: Deterministic extraction misses an important product nuance.
  - Mitigation: Extract from known structured document sections first and add tests with representative Product Plan / First Version Plan fixtures.
- Risk: Removing generic defaults causes more visible generation failures.
  - Mitigation: Allow one planner retry with stricter repair instructions, but do not silently substitute product-direction defaults.
- Risk: Prompt Lab and production diverge.
  - Mitigation: Keep one exported final-prompt builder and test it directly.
- Risk: Metadata changes add noise or schema assumptions.
  - Mitigation: Store only simple JSON metadata fields and avoid migrations unless a queryable column is truly needed.
- Risk: The final prompt is shorter but still too long for ChatGPT UI.
  - Mitigation: Add a character-budget test and inspect the actual Prompt Lab text area output.

## Rollback Or Recovery

- Revert the compact brief/final prompt changes and restore the previous planner/final prompt inputs if mockup quality drops sharply.
- Keep the hidden design plan schema unchanged so existing saved mockups remain renderable.
- If metadata causes issues, remove only the new metadata fields; rendering should not depend on them.
- If Prompt Lab output becomes confusing, keep the compact builder but adjust the UI copy/inspector rather than reintroducing long source context.

## Open Decisions

- Exact final image prompt character budget after removing raw MVP context.
- Whether planner retry should happen once automatically inside the pipeline or surface immediately as a failed generation for manual retry.

## Critique

### Software Architect

- The cleanest pipeline is compact deterministic brief -> hidden A/B/C design plan -> final image prompt -> image. Sending full documents into the planner and then again into the image prompt weakens the architecture and makes output failures harder to diagnose.

### Product Manager

- The product goal is better mockups, not just smaller prompts. The implementation should be judged by whether users get more reliable and inspectable mockups, especially across platform variants, not by prompt length alone.

### Customer Or End User

- Users will not care that prompts are shorter if the resulting images lose specificity. The compact prompt must keep real product data, visible workflow state, and clear screen labels so the mockup still feels like their product.

### Engineering Implementer

- The biggest implementation risks are brittle extraction and schema churn. Centralize compact brief extraction, centralize final prompt building, and make missing planner fields explicit validation failures.

### Risk, Security, Or Operations

- Shorter prompts reduce external vendor exposure and may reduce cost/latency, but the prompt still contains user-provided product context normalized through model output. Keep the existing untrusted-context stance and avoid storing full final prompts unless there is a specific debug need.
