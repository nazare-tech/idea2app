---
implemented: true
implemented_at: 2026-06-18T05:29:33Z
implementation_summary: "Added a localhost-only static Project Animation Lab for prototyping project creation and document block reveal animation without backend calls."
---

# Plan: Local Project Animation Lab

## Goal
Create a sandboxed local-only animation lab for iterating on project-creation and document-streaming UI without backend streaming, Supabase, database writes, credits, queues, or external API calls. The lab should simulate the intended experience with static fixture projects and timed client-side state: Market Research becomes ready first, then Product Plan and First Version Plan reveal block-by-block using loading placeholders until each complete block is ready to render.

## Current Direction
- Keep the backend streaming plan separate and unimplemented.
- Do not create a new branch unless the user asks again. The latest direction favors a separate local-only code area instead of branch separation.
- Build a new sandbox route rather than adding this to Prompt Lab. Prompt Lab currently authenticates and loads Supabase projects, which conflicts with the no-DB sandbox requirement.
- Use real production document renderers where possible, but feed them only complete fixture content or complete block chunks.

## Decisions
- Route name: `/dev/project-animation-lab`.
- Fixture source: static scrubbed fixtures only for now; no export script in this phase.
- First prototype scope: include both the creation loading view and a workspace-style preview.

## Assumptions
- Runtime Supabase/database calls are not allowed in this lab.
- Static fixture data can be based on representative real project outputs, copied into local fixture files manually.
- The lab may live under `/dev/project-animation-lab` or `/dev/animation-lab`.
- The lab should be unavailable in production and unavailable from non-localhost hosts, including deployed preview URLs.
- Visual iteration is the priority; no production generation behavior should change.
- "Streaming" means simulated stage progression and block reveal, not actual token streaming.

## Clarifying Questions
1. Route name: where should the lab live?
   - Recommendation A: `/dev/project-animation-lab`.
   - Trade-off: Clearer purpose and leaves room for more project-specific sandbox experiments.
   - Recommendation B: `/dev/animation-lab`.
   - Trade-off: Shorter and broader, but less clear once more animation experiments exist.

2. Fixture source: how should "real project" data enter the lab?
   - Recommendation A: Static fixture files copied from real project outputs and scrubbed before commit.
   - Trade-off: Fully sandboxed at runtime and safe for fast UI iteration; requires manual refresh when fixtures get stale.
   - Recommendation B: Add a local-only export script later that reads Supabase once and writes fixture files.
   - Trade-off: Easier to refresh representative data, but introduces secret handling and must never run in the browser or production.

3. First animation target: what should the lab prototype first?
   - Recommendation A: Creation loading screen plus workspace-style document sections in one split preview.
   - Trade-off: Best for deciding the end-to-end feel from creation to document reveal; slightly more UI to build.
   - Recommendation B: Only the document block reveal surface.
   - Trade-off: Faster and more focused, but misses the transition from project creation into the workspace.

4. Rendering behavior for in-progress blocks: how should incomplete content appear?
   - Recommendation A: Show a block-shaped skeleton/shimmer, then replace it with the real production block when that block's fixture chunk is complete.
   - Trade-off: Avoids rendering broken markdown and matches the user's desired "whole block only" reveal.
   - Recommendation B: Show partial markdown text in a live preview pane.
   - Trade-off: More visibly "streaming", but undermines the goal of clean block rendering.

5. Market Research timing: should it be preloaded or simulated?
   - Recommendation A: Simulate Market Research as the first completed document after a short delay, then stream Product Plan and First Version Plan.
   - Trade-off: Matches the actual product dependency model while still letting animation start quickly.
   - Recommendation B: Start with Market Research already ready.
   - Trade-off: Speeds iteration on downstream document animation, but misses the first user-visible waiting state.

6. Should the fixture use complete production renderers for PRD/MVP or custom prototype cards?
   - Recommendation A: Use `PrdDocumentBlocks` and `MvpPlanDocumentBlocks` for completed chunks or whole completed documents, with local skeletons for unrevealed chunks.
   - Trade-off: Closest to real production output, but chunk boundaries must align with renderer expectations.
   - Recommendation B: Build custom prototype-only block cards.
   - Trade-off: Faster to choreograph exactly, but less useful for validating the real workspace renderer.

## Recommended First Step
Build `/dev/project-animation-lab` as a server-guarded dev route with static fixture data and a single client component. The first prototype should simulate:
1. Project shell appears immediately with fixture project metadata.
2. Market Research row runs briefly, then becomes ready.
3. Product Plan enters `queued -> writing -> block placeholders -> rendered complete blocks`.
4. First Version Plan waits for Product Plan, then follows the same block reveal pattern.
5. Mockups remain a progress row only for now.

## Architecture
### Files
- `src/app/dev/project-animation-lab/page.tsx`
  - Server component.
  - Calls `notFound()` unless both conditions pass:
    - `isDevOnlyFeatureEnabled()` is true.
    - request host is `localhost`, `127.0.0.1`, or `::1`.
  - Imports no Supabase clients and performs no fetches.
  - Renders the client lab component with static fixtures.

- `src/app/dev/project-animation-lab/project-animation-lab-client.tsx`
  - Client component.
  - Owns timeline state with `useEffect`, timers, controls, and reduced-motion handling.
  - Provides controls for restart, pause/play, speed, selected fixture project, and stage selection.

- `src/app/dev/project-animation-lab/fixtures.ts`
  - Static representative fixture projects.
  - Each fixture includes project name, description, Market Research markdown, Product Plan block chunks, First Version Plan block chunks, and optional mockup labels.
  - No secrets, user IDs, emails, URLs to private storage, or customer-specific sensitive data.

- Optional later:
  - `src/app/dev/project-animation-lab/components.tsx` if the client component gets too large.
  - `scripts/export-animation-lab-fixture.mjs` only if we decide a one-time local fixture export is worth it.

### Sandbox Rules
- No imports from `@/lib/supabase/*`.
- No calls to app APIs.
- No environment secrets.
- No route handlers.
- No writes to localStorage required for v1.
- `notFound()` in production and non-localhost hosts.
- Static fixtures only.

## UI Design
Scene sentence: a founder is watching a local development sandbox on a bright desktop monitor while tuning the wait-state experience before backend work exists. The UI should feel like a workshop test rig: clear controls, calm document surface, restrained motion.

Design choices:
- Product register, restrained palette.
- Use the existing Cloud/Card/Warm Paper surfaces and Action Red only for active progress and primary controls.
- No hero, no marketing framing.
- Top toolbar: fixture selector, speed control, restart, pause/play.
- Left rail: document queue rows for Market Research, Product Plan, First Version Plan, and Design Mockups.
- Main area: workspace-like document surface.
- Completed Market Research can render via `CompetitiveOverviewSection` and `CompetitiveDetailSection` once ready.
- Product Plan and First Version Plan render block placeholders first. A block only swaps to real content when the simulated block is complete.
- Motion:
  - 150-250ms opacity/transform transitions.
  - Shimmer via background-position only.
  - No layout-property animation.
  - `prefers-reduced-motion` skips timed choreography and renders a controllable static stage.

## Plan
1. Guard and route skeleton
   - Add `/dev/project-animation-lab` with strict dev plus localhost guard.
   - Add a minimal page header and sandbox shell.
   - Validation: route renders locally and would 404 under production-like environment.

2. Fixture model
   - Add 2 representative fixture projects with scrubbed content.
   - Shape PRD/MVP chunks around complete sections or block groups, not token fragments.
   - Validation: fixture data is pure TypeScript and imports no runtime services.

3. Simulation engine
   - Add client timeline state: `marketResearch`, `prd`, `mvp`, `mockups`.
   - Add speed/restart/pause controls.
   - Add reduced-motion behavior.
   - Validation: focused component tests for stage progression helpers if extracted.

4. Animated document preview
   - Render Market Research after ready.
   - Render Product Plan and First Version Plan placeholders for unrevealed blocks.
   - Swap placeholders to complete rendered chunks or complete document renderers at chunk boundaries.
   - Validation: browser inspection confirms no text overlap, stable layout, and no broken partial markdown.

5. Visual polish
   - Tune spacing, labels, status copy, shimmer intensity, and responsive layout.
   - Add accessible button labels and `aria-live` only where useful.
   - Validation: in-app browser desktop and mobile screenshots.

6. Documentation
   - Update `PROJECT_CONTEXT.md` because this adds a new local dev lab route.
   - Keep the backend streaming plan untouched.

7. Review and verification
   - Run focused tests where added, `npm run typecheck`, and a relevant lint/test subset.
   - Do browser verification at `http://localhost:3000/dev/project-animation-lab`.
   - Record review/security notes in `plans/implemented/project-animation-lab-review.md` if implementation proceeds.

## Milestones
- Local-only shell: the route is accessible on localhost and inaccessible outside dev/local conditions.
- Sandbox data: fixtures are static and scrubbed.
- First animation: Market Research ready state and Product Plan block reveal are working.
- Full animation: Product Plan and First Version Plan block reveal are both working with controls.
- Verified lab: typecheck, focused tests, and browser screenshots pass.

## Validation
- Static checks:
  - Ensure no `createClient`, `createServiceClient`, or Supabase imports appear in the lab folder.
  - Ensure fixture files contain no obvious emails, API keys, private storage paths, or real user IDs.
- Tests:
  - Unit-test pure timeline helpers if extracted.
  - Component render tests if the existing test setup supports them cleanly.
- Commands:
  - `npm run typecheck`
  - `npm run lint`
  - Focused tests for any new helper/component tests.
- Browser:
  - Open `http://localhost:3000/dev/project-animation-lab`.
  - Verify restart/pause/speed controls.
  - Verify block placeholders do not cause layout jumps.
  - Verify mobile layout stacks cleanly.
  - Verify reduced motion behavior manually if practical.

## Risks And Mitigations
- Fixture data accidentally includes sensitive project details: manually scrub fixtures and avoid user IDs, emails, private URLs, or customer names.
- Lab becomes production reachable: use both `isDevOnlyFeatureEnabled()` and localhost host checks.
- Prototype diverges from real renderers: use existing production block renderers for completed content where feasible.
- In-progress blocks imply false content structure: label this as a local animation sandbox and use placeholders, not fake final text.
- Large client component grows unwieldy: split timeline helpers and presentational components after the first working version.
- Shimmer/motion is distracting: keep motion short, restrained, and state-driven; honor reduced motion.

## Rollback Or Recovery
- Remove the `src/app/dev/project-animation-lab` folder and any plan/review files.
- No database migrations, route handlers, environment variables, or production paths are involved.
- Since this lab is isolated under `/dev`, it should not affect production app behavior.

## Open Decisions
- Whether Market Research should be simulated before ready or start already ready.
- Whether completed chunks should render by mounting multiple smaller renderers or by progressively replacing placeholders while a single full renderer appears at the end.

## Critique

### Software Architect
- A separate dev route is cleaner than adding this to Prompt Lab because Prompt Lab is intentionally tied to Supabase project context. Keeping this lab static avoids accidental backend coupling.

### Product Manager
- This is the right way to test the feeling of progress before committing to backend architecture. The lab should help answer which wait states feel credible, not pretend to be the final implementation.

### Customer Or End User
- The eventual user needs confidence that work is happening. Block-level reveal is likely more trustworthy than raw tokens because it avoids showing malformed half-thoughts.

### Engineering Implementer
- The hard part is aligning chunk reveal with existing renderers. Start with complete-section chunks and local placeholders; do not prematurely build a partial parser.

### Risk, Security, Or Operations
- The lab must be rigorously isolated. No Supabase import, no browser fetch to app APIs, no production host access, and scrubbed fixtures only.
