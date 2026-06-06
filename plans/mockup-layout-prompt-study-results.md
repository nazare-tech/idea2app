# Results: Mockup Layout Prompt Study

## Artifact Set
- Latest project: Money Quest Kids Finance App
- Final local artifact directory: `local-artifacts/mockup-layout-study/2026-06-05T16-00-52-117Z/`
- Images: 36 SVG files
- Prompts: 36 prompt text files
- Metadata: 36 JSON files
- Index: `local-artifacts/mockup-layout-study/2026-06-05T16-00-52-117Z/README.md`

## Execution Note
OpenRouter image generation through Prompt Lab or the local runner was blocked by the environment policy because it would disclose private project context to an external model. The completed artifact set is therefore a deterministic local SVG study using the latest project context fetched from Supabase, not AI-rendered OpenRouter images.

## What Worked Best
- Journey strip is the clearest default layout. It shows four screens in order, supports arrows, keeps labels predictable, and works across desktop web, native desktop, mobile web, and native mobile.
- Decision flow map is a useful second layout when the core product value is making or approving a decision.
- Founder clarity is the best visual style for non-technical users because it pairs plain labels with enough hierarchy without making the UI feel too dense.
- Screen labels and short flow captions are useful. The problem is not labels themselves; the problem is option labels and long explanatory text inside the image.

## What Did Not Work
- Outcome-first canvas is risky with four screens. The center screens read well, but the side screens become cramped and are more likely to overlap or clip. This layout should be limited to three screens or use one large outcome screen plus small thumbnails.
- Pulling headings naively from PRD/MVP content can produce bad screen names such as "MVP Summary" or "Problem." The planner must explicitly avoid document-section headings and produce real product screen names.
- Any instruction that asks for an in-image option label is likely to leak "Option A/B/C" into the generated image. The current production prompt has this issue in `buildMobileStoryboardCompositionSpec`.

## Recommended Production Prompt Changes
1. Remove in-image option labels.
   - In `src/lib/openrouter-image-mockup-pipeline.ts`, remove the mobile composition JSON `optionLabel` instruction that renders `Option ${label} - ${title}`.
   - Add a strict ban: do not render "Option A", "Option B", "Option C", "Direction A/B/C", "variation", or visual-style names anywhere in the image.
2. Keep screen labels, but constrain them.
   - Allow exactly one short numbered label above each screen.
   - Allow short external action/result callouts only when they clarify user flow.
   - Ban long rationale paragraphs, pros/cons lists, pricing-comparison text, and layout/style title cards.
3. Separate information layout from visual style.
   - Current A/B/C directions mix layout strategy and visual tone. For clearer output, generate/select:
     - information layout: journey strip, decision flow, outcome focus
     - visual style: calm operator, founder clarity, premium native
   - The app can still display three options, but the image prompt should not rely on "Option A/B/C" as a visual element.
4. Add platform override support.
   - The hidden planner currently chooses one `primaryPlatform`. For testing or future product support, allow a caller-provided platform override so the same screen plan can render as desktop web, native desktop app, mobile web, or native mobile app.
5. Improve screen planning rules.
   - Require product-specific screen names from the happy path.
   - Explicitly reject meta headings: MVP Summary, Problem, Target User, Requirements, Risks, Timeline, Assumptions, Open Questions.
   - Ask for screen-level data such as visible metrics, item names, statuses, and primary actions.
6. Make platform framing explicit.
   - Desktop web: web app layout, no unnecessary fake browser chrome.
   - Native desktop: neutral app shell, no website address bar.
   - Mobile web: iPhone portrait browser viewport or clearly mobile-web shell.
   - Native mobile app: iPhone portrait app frame with status bar and home indicator.

## Suggested Default
Use journey strip as the production default composition:
- 2-4 selected happy-path screens
- one fixed top label per screen
- simple arrows between screens
- populated UI states
- no option labels inside the image
- screen metadata/captions rendered by the app outside the image

## Follow-Up Implementation Targets
- `src/lib/openrouter-image-mockup-pipeline.ts`
- `src/lib/mockup-design-plan.ts`
- `src/lib/openrouter-image-mockup-pipeline.test.ts`
- `src/lib/mockup-design-plan.test.ts`
- `src/lib/prompt-lab.ts` if Prompt Lab should support platform/layout override experiments directly
