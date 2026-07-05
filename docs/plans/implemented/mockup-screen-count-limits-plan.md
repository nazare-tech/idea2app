---
implemented: true
implemented_at: 2026-06-09T05:25:40Z
implementation_summary: "Historical implementation of platform-specific screen limits. Current code has since superseded this with an exact two-screen skeleton-frame contract for every platform."
---

# Plan: Platform-Specific Mockup Screen Limits

> Current revalidation, 2026-06-22: this plan is implemented historical context, but its 1-2 desktop / 1-3 mobile contract is no longer the current behavior. The current code in `src/lib/mockup-design-plan.ts` enforces exactly two screens for every platform, `src/lib/openrouter-image-mockup-pipeline.ts` edits fixed two-frame storyboard skeletons, and `PROJECT_CONTEXT.md` is the current architecture source of truth. Do not use the screen-count ranges below for new implementation work.

## Goal
Update the mockup creator so desktop web and native desktop mockup prompts never place more than two desktop screens in a single text-to-image storyboard prompt, while mobile web and native mobile app prompts can use one, two, or three mobile screens. The result should protect desktop screen readability without weakening the mobile storyboard flow.

## Assumptions
- "Desktop native or web" maps to `desktop-web` and `native-desktop-app` in `src/lib/mockup-design-plan.ts`.
- "Mobile" maps to `mobile-web` and `native-mobile-app`.
- The intended source of truth should be code, not just prompt prose, because planner models can still return too many screens.
- We should allow a single screen for both desktop and mobile when complexity or readability calls for it, even though the current parser requires at least two screens.
- Existing saved mockups should continue rendering; this change only affects new planner outputs and new text-to-image prompts.
- Prompt Lab prompt-only mode should follow the same limits as production mockup generation because both use the same planner and image prompt helpers.

## Confirmed Decisions
- Accept one-screen plans across platforms: desktop platforms allow 1-2 screens, mobile platforms allow 1-3 screens.
- Normalize over-limit planner output by trimming to the platform maximum after the final effective platform is known.
- Add a desktop composition spec parallel to the mobile composition JSON, with max two equal-width desktop lanes and optional single-screen hero mode.
- Hard-cap mobile plans and prompts at three screens, including complex products.
- Update `PROJECT_CONTEXT.md` during implementation so the architecture source of truth reflects the new platform-specific limits.
- Follow the software-architect critique: centralize screen-count policy in a reusable platform-aware helper instead of relying on prompt prose alone.

## Clarifying Questions
1. Should the planner validator accept one-screen plans for every platform?
   - Selected Recommendation A: Accept 1-2 desktop screens and 1-3 mobile screens.
   - Trade-off: Matches your "either 1 or 2" desktop request and gives mobile a clean 1/2/3 range, but changes the existing schema contract from a minimum of two screens.
   - Recommendation B: Keep two as the minimum and only cap desktop at two, mobile at three.
   - Trade-off: Lower behavior change and less downstream risk, but it does not support the "it can either do 1 or 2 depending on complexity" desktop behavior.
2. When the planner returns too many screens, should we reject the run or normalize it?
   - Selected Recommendation A: Normalize by slicing to the platform max after parsing `primaryPlatform`.
   - Trade-off: More resilient and avoids wasting model calls, but silently drops lower-priority screens unless we record metadata or keep tests clear.
   - Recommendation B: Reject with a platform-specific validation error.
   - Trade-off: Stricter and easier to reason about, but users may see avoidable failures from otherwise usable planner output.
3. Should desktop prompts explicitly ask for "one or two full-width desktop frames" rather than only "desktop screens side by side"?
   - Selected Recommendation A: Add a desktop composition spec parallel to the mobile JSON, with max two equal-width desktop lanes and optional single-screen hero mode.
   - Trade-off: Stronger image-model guidance and better readability, but adds another prompt section to maintain.
   - Recommendation B: Add concise bullet rules to the existing output requirements only.
   - Trade-off: Smaller change, but less forceful for image models that need structural composition instructions.
4. Should mobile hard-cap at three in the planner prompt even for complex products?
   - Selected Recommendation A: Yes, mobile can choose 1, 2, or 3 screens, never 4.
   - Trade-off: Keeps phone lanes readable and aligns with your request, but complex flows may need a second generated option or a more selective happy path.
   - Recommendation B: Let mobile use four when the planner says the product is complex.
   - Trade-off: Preserves current complex-product behavior, but repeats the same compression problem on mobile at smaller scale.
5. Should `PROJECT_CONTEXT.md` be updated during implementation?
   - Selected Recommendation A: Yes, update the Mockup Generation and Dev Prompt Lab sections.
   - Trade-off: Keeps the architecture source of truth current, as required by project instructions, but expands the diff.
   - Recommendation B: Skip docs because this is prompt behavior only.
   - Trade-off: Smaller diff, but violates the project instruction to update context when architecture or generation behavior changes.

## Recommended First Step
Write focused failing tests for platform-specific screen limits before changing production code. The first red tests should cover desktop planner output with three screens, mobile planner output with four screens, one-screen desktop acceptance, and generated prompt text that clearly says desktop storyboards may use only one or two desktop screens while mobile storyboards may use up to three phone screens.

## Plan
1. [x] Confirm existing behavior and create red tests.
   - Add or adjust tests in `src/lib/mockup-design-plan.test.ts` for platform-specific limits.
   - Add or adjust tests in `src/lib/openrouter-image-mockup-pipeline.test.ts` for prompt wording and composition rules.
   - Expected red state: current parser accepts 3-4 desktop screens and 4 mobile screens, rejects one-screen plans, and prompt fallback still says `2-4`.
2. [x] Centralize screen-limit rules.
   - Add small helpers/constants in `src/lib/mockup-design-plan.ts`, such as `getMockupScreenLimitForPlatform(platform)` and `clampMockupDesignPlanScreens(plan)`.
   - Define desktop range as `min: 1, max: 2`; mobile range as `min: 1, max: 3`.
   - Use `primaryPlatform` after normalization so aliases like "Native desktop app" apply correctly.
3. [x] Update planner instructions and parser behavior.
   - Replace the current "Choose 2 screens for very simple products, 3 for normal products, and 4 for complex products" rule with platform-specific guidance.
   - Parse `primaryPlatform` before validating screen count.
   - Normalize over-limit screen arrays by keeping the earliest/highest-priority happy-path screens.
   - Update validation errors to mention the platform-specific allowed range.
4. [x] Update final image prompt composition.
   - Change the no-design-plan fallback from "Choose 2-4 screens" to platform-aware language.
   - For desktop platforms, add a dedicated desktop composition spec: one or two desktop app screens only, max two equal-width desktop lanes, optional single-screen hero mode, no third desktop screen, preserve readable full desktop proportions, and use one detailed screen when the flow is complex.
   - For mobile platforms, keep the existing mobile composition JSON but cap the lane count at three and update fallback `screenCount` from `2-4` to `1-3`.
5. [x] Ensure Prompt Lab uses the same constraints.
   - Because Prompt Lab calls `parseMockupDesignPlan`, `applyPromptLabMockupPlatformOverride`, and `buildMockupImagePromptForOption`, verify prompt-only output follows the same screen limits.
   - If platform override happens after parsing, handle the edge case where the planner returns three screens for mobile but the user overrides to desktop. The safest implementation is to apply the override before final screen limit normalization.
6. [x] Update documentation.
   - Update `PROJECT_CONTEXT.md` to say hidden mockup plans choose 1-2 desktop screens or 1-3 mobile screens, and that Prompt Lab prompt-only bundles use the same platform-specific limits.
7. [x] Run verification and review.
   - Run focused tests for mockup design plans, OpenRouter mockup image prompts, and Prompt Lab behavior.
   - Run `npm run typecheck`.
   - Run focused ESLint on touched TypeScript files.
   - If UI text changes in Prompt Lab are made, use the in-app browser to visually confirm the control/output still appears correctly.
   - Complete Fresh-Eyes Self Review, code review, security review, remediation, and final plan metadata update after implementation.

## Implementation Notes
- Added `getMockupScreenLimitForPlatform()` and `normalizeMockupDesignPlanScreens()` as the shared source of truth.
- Parser output now supports 1-2 desktop screens and 1-3 mobile screens, trimming over-limit model output by priority and flow order.
- Prompt Lab platform overrides now normalize screen counts after the final effective platform is known.
- Desktop prompts now include a dedicated composition JSON that forbids third desktop screens and compressed desktop thumbnails.
- Mobile prompts now use a 1-3 fallback range instead of the old 2-4 range.
- Review artifact: `docs/plans/implemented/mockup-screen-count-limits-review.md`.

## Milestones
- Limits Defined: Platform-specific min/max rules exist in one reusable place and are covered by unit tests.
- Planner Contract Updated: Planner prompt and parser enforce 1-2 desktop screens and 1-3 mobile screens.
- Image Prompt Updated: Final text-to-image prompt cannot ask for three desktop screens and cannot ask for four mobile screens.
- Prompt Lab Verified: Prompt-only ChatGPT prompt output respects the same limits, including platform override cases.
- Documentation Current: `PROJECT_CONTEXT.md` matches the implemented behavior.

## Validation
- `node --import tsx --test src/lib/mockup-design-plan.test.ts`
- `node --import tsx --test src/lib/openrouter-image-mockup-pipeline.test.ts`
- `node --import tsx --test src/lib/prompt-lab.test.ts`
- `npm run typecheck`
- Focused ESLint on touched files, likely:
  - `npx eslint src/lib/mockup-design-plan.ts src/lib/mockup-design-plan.test.ts src/lib/openrouter-image-mockup-pipeline.ts src/lib/openrouter-image-mockup-pipeline.test.ts src/lib/prompt-lab.ts src/lib/prompt-lab.test.ts`
- Optional manual Prompt Lab verification in the Codex in-app browser if implementation touches visible UI labels or output formatting.

## Risks And Mitigations
- Risk: The planner returns four useful screens and normalization drops important context.
  - Mitigation: Keep screens ordered by `flowStep`, prefer P0 screens, and instruct the planner to select only the highest-value happy-path moments for the platform.
- Risk: Platform override after parsing creates mismatched limits.
  - Mitigation: Apply screen-limit normalization after the final effective platform is known.
- Risk: A one-screen plan breaks downstream rendering assumptions.
  - Mitigation: Add tests for one-screen parsed plans and prompt generation, and inspect any renderer assumptions only if tests or types reveal coupling.
- Risk: Prompt wording alone is not enough to stop image models from drawing extra desktop panels.
  - Mitigation: Add explicit negative instructions: no third desktop screen, no compressed desktop thumbnails, no browser chrome fillers.
- Risk: Existing generated mockups with four screens are affected.
  - Mitigation: Keep rendering/parsing of saved mockup content unchanged; only new planner/image prompt generation should change.

## Rollback Or Recovery
- Revert the constants/helper and prompt wording changes in `src/lib/mockup-design-plan.ts` and `src/lib/openrouter-image-mockup-pipeline.ts`.
- Restore the previous `2-4` screen parser validation and planner prompt rule.
- Revert the `PROJECT_CONTEXT.md` update.
- Existing saved mockup images and metadata should not require data rollback because this plan does not change storage format.

## Open Decisions
- Whether to record a metadata flag when screens were trimmed by platform limits. Current implementation default: do not add storage metadata unless the code already has a natural metadata field for it, because the primary behavior should be deterministic and test-covered.

## Critique

### Software Architect
- The current design has screen-count policy embedded in prompt prose and parser validation. This should become a reusable platform-aware helper so planner parsing, Prompt Lab overrides, and final prompt generation cannot drift.
- Applying Prompt Lab platform overrides after parsing is a subtle integration risk. The final effective platform must be the one used for screen-count normalization.

### Product Manager
- The product value is stronger if users can inspect desktop designs at realistic scale. Limiting desktop storyboards to one or two screens is a good trade even if it shows less of the flow per image.
- For complex desktop products, the UI may need to choose the most valuable moments rather than trying to show the whole journey in one option.

### Customer Or End User
- Users want mockups they can evaluate visually. Three desktop frames in one image can become thumbnails, which undermines trust in the generated design direction.
- A single desktop screen can feel less like a "flow"; captions and the selected happy-path state need to make clear why that screen was chosen.

### Engineering Implementer
- This is not only a prompt edit. Tests should lock behavior because model output is unreliable and Prompt Lab overrides can change platform after the planner responds.
- The smallest durable implementation is likely: central limit helper, parse/normalize function, prompt text updates, and focused tests.

### Risk, Security, Or Operations
- Security risk is low because this change does not introduce new data access, auth, secrets, payments, or external services.
- Operational risk is moderate: stricter limits could change output quality and reduce coverage in generated storyboard images. Prompt-only mode provides a low-cost way to inspect final prompts before spending image credits.
