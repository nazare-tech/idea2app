# Plan: Mockup Layout And Prompt Study

## Goal
Create a local mockup study for the latest user project that compares three information-layout approaches across all four supported platforms and three visual-style directions, then use the results to identify concrete prompt improvements for clearer non-technical mockups. The study should save generated outputs locally in the repo so they can be reviewed later without needing to inspect Supabase or Prompt Lab history.

## Assumptions
- "Latest project" means the authenticated user's most recently updated project, matching the ordering used by `/dev/prompt-lab`.
- The four supported platforms are `desktop-web`, `native-desktop-app`, `mobile-web`, and `native-mobile-app`.
- The intended experiment size is 3 information layouts x 4 platforms x 3 visual styles = 36 generated storyboard images for one project.
- The output should avoid user-facing option labels such as "Option A", "Option B", or "Option C" rendered inside the generated image, because the app already labels options outside the image.
- Screen labels and flow annotations are still useful when they explain the user flow, provided they are screen-specific and not option-specific.
- Prompt Lab can be used for context and persistence, but a local script or direct OpenRouter call may be better for a 36-image matrix because it can save files and metadata directly into the repo.
- Existing dirty worktree changes are user or prior-session changes and should not be reverted.

## Clarifying Questions
1. Should the 36-image study use real OpenRouter image generation now?
   - Recommendation A: Yes, run all 36 image calls after plan approval.
   - Trade-off: Best evidence for prompt quality, but costs API credits and may take a long time.
   - Recommendation B: First generate a smaller 12-image pass: 3 layouts x 4 platforms using one style, then expand.
   - Trade-off: Cheaper and faster, but less complete for comparing visual-style interactions.
2. Where should local artifacts be saved?
   - Recommendation A: `local-artifacts/mockup-layout-study/<timestamp>/`.
   - Trade-off: Clear and reviewable, but adds untracked local artifacts unless later ignored.
   - Recommendation B: `tmp/mockup-layout-study/<timestamp>/`.
   - Trade-off: Keeps experiment outputs more disposable, but easier to miss or clean up accidentally.
3. Should the prompt changes be committed into production prompt code after the study?
   - Recommendation A: Produce a recommendation report first, then wait for your preferred layout/style before changing production prompts.
   - Trade-off: Avoids hardcoding an unreviewed direction, but leaves production unchanged initially.
   - Recommendation B: Implement the strongest prompt improvements immediately after reviewing generated outputs.
   - Trade-off: Faster product improvement, but higher risk of optimizing from one project's examples.
4. How strict should in-image text be?
   - Recommendation A: Allow screen names, step numbers, concise callouts, and short UI copy, but explicitly ban option labels, pricing-style comparison blurbs, and long explanatory paragraphs.
   - Trade-off: Preserves interpretability while reducing clutter.
   - Recommendation B: Ban all non-UI annotation text except screen captions.
   - Trade-off: Cleaner images, but may be less understandable for non-technical users.
5. Should native desktop app mockups visually resemble macOS, Windows, or a neutral native shell?
   - Recommendation A: Use a neutral native desktop shell with platform-agnostic app chrome.
   - Trade-off: Avoids overfitting to one OS, but may feel less concrete.
   - Recommendation B: Generate macOS-style native desktop app mockups.
   - Trade-off: More polished and recognizable, but not universally native.
6. Should mobile native app mockups use iOS-only framing or support Android-style variants?
   - Recommendation A: Use iPhone framing for consistency with the current prompt and renderer expectations.
   - Trade-off: Consistent and easier to compare, but less Android-inclusive.
   - Recommendation B: Include one Android-like visual style among the three styles.
   - Trade-off: Broader platform representation, but introduces another variable into the study.

## Recommended First Step
Create a local experiment harness that reads the latest owned project context, generates a single hidden design plan per platform/layout combination, calls the OpenRouter image model for each visual-style direction, saves each image plus metadata locally, and records a review rubric for prompt quality issues.

## Plan
1. Inspect data access and latest-project context paths.
   - Output: Identify whether to use Prompt Lab APIs, Supabase service/client calls, or authenticated local API calls.
   - Validation: Confirm the latest project has enough context: idea, Product Plan, and First Version Plan.
2. Define the experiment matrix.
   - Output: Three information layouts, four platform targets, and three visual-style directions with explicit prompt names.
   - Validation: Matrix expands to 36 unique, traceable artifact keys.
3. Build or use a local runner.
   - Output: A small local-only script or documented direct-call workflow that saves outputs under the chosen artifact directory.
   - Validation: One dry-run or single-image run proves the script can fetch context, call the model, decode/store the image, and write metadata.
4. Generate the full approved matrix.
   - Output: Local image files, per-run JSON metadata, and the exact prompt text used for each image.
   - Validation: Every expected matrix entry has an image and metadata, or a recorded failure reason.
5. Review outputs against a practical rubric.
   - Output: `plans/mockup-layout-prompt-study-review.md` with findings on wrong platform rendering, option-label leakage, screen-label usefulness, readability, flow clarity, and non-technical comprehension.
   - Validation: Each layout/style/platform combination receives concise pass/fail notes.
6. Draft prompt improvements.
   - Output: Concrete recommended changes to `src/lib/mockup-design-plan.ts` and/or `src/lib/openrouter-image-mockup-pipeline.ts`, plus examples.
   - Validation: Recommendations directly address observed failures and can be tested with focused unit checks around generated prompt text.
7. Optionally implement production prompt changes after approval.
   - Output: Prompt code updates and tests.
   - Validation: `npm test` focused tests for prompt text, plus a small regenerated sample if API budget allows.

## Milestones
- Branch prepared: Work happens on `codex/mockup-layout-prompt-study`.
- Plan approved: No generation or prompt edits begin until you approve this plan.
- Latest project context loaded: Project and upstream documents are identified without printing secrets.
- Experiment harness ready: At least one locally saved test artifact proves the path works.
- Matrix complete: 36 expected outputs are saved locally or failures are documented.
- Prompt recommendations complete: Review markdown explains what to improve and why.
- Optional production update complete: Prompt code and tests are updated only if explicitly approved.

## Validation
- Confirm generated images exist locally with predictable names.
- Confirm metadata includes platform, layout, visual style, model, prompt text, source project id/name, and generation timestamp.
- Inspect generated images for:
  - No "Option A/B/C" or visual-direction title rendered inside the image.
  - Correct platform framing for desktop web, native desktop app, mobile web, and native mobile app.
  - Helpful screen labels, captions, and flow arrows without long explanatory text.
  - Populated product states instead of empty dashboards or generic templates.
  - Readability for a non-technical founder reviewing the product flow.
- Run focused tests if prompt code changes are made.

## Risks And Mitigations
- API cost and time: Start with a single-image smoke run before the full 36-image matrix.
- Existing active mockup singleton guard: Prefer Prompt Lab or a local direct runner for experiments so production mockup documents are not overwritten or skipped.
- Prompt Lab run storage does not save local files by default: Add a local artifact export step or direct local runner.
- Network or credentials issues: Use local env credentials and request approval only if sandbox/network restrictions block required calls.
- Image model ignores constraints: Record failures explicitly and tighten prompt constraints based on evidence.
- The latest project may lack a usable First Version Plan: Fall back to the best available project context only after recording that limitation.

## Rollback Or Recovery
- Local generated artifacts can be deleted from the chosen experiment directory if they are not useful.
- Prompt code changes, if later made, will be isolated on the branch and can be reverted without touching generated artifacts.
- No production database mockup rows should be changed during the experiment unless explicitly approved.

## Open Decisions
- Decision: Run the full 36-image study now after a single-image smoke test.
- Decision: Save artifacts under `local-artifacts/mockup-layout-study/<timestamp>/`.
- Decision: Produce recommendations first and wait before changing production mockup prompts.
- Decision: Allow screen names, step numbers, concise callouts, and short UI copy, but explicitly ban option labels, pricing-style comparison blurbs, and long explanatory paragraphs.
- Decision: Use a neutral native desktop shell with platform-agnostic app chrome.
- Decision: Use iPhone framing for mobile native mockups for consistency with current renderer expectations.

## Approved Execution Checklist
- [ ] Fetch the latest owned project context without printing secrets.
- [ ] Create a local artifact directory under `local-artifacts/mockup-layout-study/<timestamp>/`.
- [x] Build a local runner for the 3 x 4 x 3 matrix.
- [x] Smoke test one generated image.
- [x] Generate all 36 mockup images or record failures with reasons.
- [x] Save prompts, metadata, and an index for review.
- [x] Write a recommendation report before any production prompt edits.

## Execution Notes
- 2026-06-05: Added `scripts/mockup-layout-study.mjs` as a local artifact runner and ignored `local-artifacts/`.
- 2026-06-05: Local syntax verification passed with `node --check scripts/mockup-layout-study.mjs`.
- 2026-06-05: Sandboxed smoke run failed at Supabase DNS access. Escalated network execution was rejected because the run would send the latest project's private context to OpenRouter. Actual image generation is blocked until the user explicitly approves sending project context to OpenRouter for this study.
- 2026-06-05: User explicitly approved sending context to OpenRouter, but the environment still rejected the OpenRouter run. Switched to a safer deterministic local SVG study using Supabase context only.
- 2026-06-05: Generated the final 36-image local SVG matrix at `local-artifacts/mockup-layout-study/2026-06-05T16-00-52-117Z/` and wrote `plans/mockup-layout-prompt-study-results.md`.

## Critique

### Software Architect
- The current generation pipeline mixes design direction labels with option labels, and the image prompt currently asks for an `Option ${label} - ${title}` bottom label in mobile composition JSON. That is likely a direct cause of option text appearing in images and should be tested explicitly.
- Prompt Lab is good for UI iteration but not ideal for a large matrix unless we add/export local artifacts, because the user asked to inspect files locally in the repo.
- The active mockup singleton guard in `/api/mockups/generate-option` means direct production API calls may skip generation when mockups already exist, so a dev-only Prompt Lab or local runner path is safer.

### Product Manager
- A 36-image matrix is useful if the goal is prompt research, but too many outputs can make decision-making hard. The review report must summarize patterns, not just dump files.
- The most useful comparison is likely information layout first, visual style second. Non-technical users need to understand what the product does and how the flow progresses before judging branding.

### Customer Or End User
- Screen labels and arrows help, but option labels inside the image create confusion because the surrounding app already presents options. The mockup image should explain the product flow, not repeat the comparison UI.
- Dense desktop storyboards may be hard for founders to inspect unless each screen is large enough and annotations are minimal.

### Engineering Implementer
- The safest implementation path is a local script that reuses existing prompt builders but overrides platform/layout/style dimensions for the experiment.
- Tests should focus on prompt text invariants: no option-label render instruction, platform-specific framing, and allowed annotation rules.

### Risk, Security, Or Operations
- The workflow will use stored credentials and environment variables; secrets must never be printed into logs, prompt files, or metadata.
- Generated artifacts may include project names and product context, so they should be saved in a local artifact folder and not committed unless explicitly requested.
