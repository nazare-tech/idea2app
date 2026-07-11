# PROJECT_CONTEXT.md

**Last Updated**: 2026-07-11 (Exa seven-candidate competitor discovery)
**Project**: Maker Compass - AI-Powered Business Analysis Platform

---

## 1. Project Overview

**Maker Compass** is a comprehensive AI-powered SaaS platform that transforms business ideas into structured planning documents and design mockups.

### Core Functionality

- **Product Analytics**: Privacy-conscious first-party events are stored append-only in Supabase `product_events` through authenticated `/api/product-events` batches or trusted server transitions. Browser roles have no direct access. The typed/versioned allowlist in `src/lib/product-analytics/contracts.ts` prohibits content, PII, raw URLs/referrers, DOM data, and arbitrary error text. Workspace reach uses canonical semantic anchors; mockup/prompt actions record successful value actions; project, generation, and Stripe events use deterministic idempotency keys. Production-only private `analytics` views derive section funnels, artifact engagement, activation, D1/D7/D30 retention, churn risk, and the readiness-denominated mockup entitlement funnel. `docs/operating-system/product-analytics-event-taxonomy.md` is the durable product definition and future-feature checklist. `api_request_metrics` remains separate operational telemetry. Raw events retain for 180 days. Metabase is the preferred future open-source analysis UI through a dedicated read-only role limited to approved views.

- **Idea Intake Wizard**: Canonical new-project flow at `/projects/new`. Users enter an idea, answer 4-7 AI-generated structured questions, then the app creates the project and starts the bundled onboarding document-generation queue. **UI (Intake Flow Option 1)**: Step 1 (Idea Brief) shows the idea card plus three drifting example-idea rows fed by the 12-entry `INTAKE_EXAMPLE_IDEAS` (`src/lib/intake/examples.ts`); Step 2 (Tell us a bit more) advances immediately on Next and renders warm shimmer skeleton question cards while `/api/intake/questions` runs, then staggers the real cards in with `Pick one`/`Pick a few` mono mode labels (generation failures render in-step with a Retry). Multi-select (`Pick a few`) options render a leading checkbox that fills when selected while the chip stays white; single-select options invert to a solid fill with no checkbox. Example-idea rows and the loader carousel loop seamlessly through the shared `IntakeMarquee` (`src/components/projects/intake-marquee.tsx`): children render twice (the clone half is inert/aria-hidden), the `-50%` keyframe scrolls exactly one copy, and the container max-width clamps to the measured width of one loop, centered. **Project allowance gate**: `/projects/new` and the dashboard New Project button both read `getProjectAllowanceStatus`; a user out of allowance (`reason: "limit_reached"`) gets the `ProjectLimitDialog` upgrade modal (`src/components/projects/project-limit-dialog.tsx`) instead of the wizard, with an Upgrade CTA to `/billing`, rather than filling out the wizard and being rejected at create. After Create project the wizard shows a single full-page loader (`intake-submission-loading-panel.tsx`): a rotating headline message, a thin Action Red progress line, and a "What you're about to get" artifact marquee. The loader is decorative and time-based only (no live queue rows); it holds on its final message until `waitForFirstStreamedToken` redirects to `#executive-summary` on the first streamed Market Research token. Marquee/skeleton animations use `.intake-marquee`/`.intake-skeleton` in `globals.css` and collapse to a static state under `prefers-reduced-motion`. The landing idea capture and `/projects/new` idea textarea share `src/lib/intake/keyboard-submit.ts`: Enter follows the primary CTA path, Shift+Enter preserves multiline entry, and repeat/IME/disabled states do not submit. Both entrypoints use synchronous request locks so two key/click events before React rerenders cannot duplicate the pending-intake or question-generation request. The intake prompt may add one or two concise tool-fit questions when those answers materially improve the final AI build-tool recommendation. The parser always ensures a required single-select `primary-platform` question with stable canonical option IDs (`desktop-web`, `mobile-web`, `native-mobile-app`, `native-desktop-app`) and user-facing labels Desktop website, Mobile website, iOS / Android app, and Mac / Windows app; project creation validates that this question has exactly one supported answer so stale/bypassed clients cannot omit it. **Idea input guardrails**: the basic floor (30+ characters, 4+ words, `src/lib/intake/idea-validation.ts`) is shared by the landing capture, the wizard Step 1 Next button (disabled with an inline hint below the floor), and the servers behind them (`/api/intake/pending`, `/api/intake/questions`, `/api/projects/create-from-intake` all return 400 with the same copy). The question-generation LLM call doubles as the semantic gate: its system prompt rejects gibberish, non-ideas, instruction-override attempts, and harmful content with a `{"rejected": true, "reason": ...}` verdict, which `question-generation.ts` raises as the non-retryable `IntakeIdeaRejectedError` and `/api/intake/questions` maps to a 422 with app-authored copy (model text is never echoed to the user).
- **Prompt Tab AI Chat Deprecated**: The Prompt tab is no longer reachable for any project, including legacy Prompt Chat projects. Direct project URLs with `?tab=prompt` are silently redirected to the workspace Overview, the Idea Brief nav entry is removed, and `/api/prompt-chat` returns `410 Gone`. Historical prompt chat rows are preserved unless explicitly deleted in a separate data cleanup.
- **General Chat Disabled**: `/api/chat` intentionally returns `410 Gone` and cannot consume credits or call AI. Historical message rows are preserved; a future chat return should re-enable the route deliberately.
- **Project Composer ("Ask this project")**: A floating command-bar chat over the project workspace, implemented from the Project Composer v3 design. Users ask questions about their generated documents; `POST /api/projects/[id]/composer` streams answers from OpenRouter with the OpenRouter `web` plugin enabled for live web search. Scope toggles between the document currently in view (tracked from workspace scroll position) and the whole project; the server re-reads the latest saved Market Research / Product Plan / First Version Plan rows per request. Sessions are ephemeral by design: no database writes, no saved history, no credits, read-only (never edits documents). **Paid-plan feature**: the workspace page resolves the plan server-side (`getProjectAllowanceStatus`, same "free" check as project deletion) and free users see a compact upgrade bar linking to `/billing` instead of the chat input; the API route independently returns `403 { upgradeRequired: true }` for free plans. Rate limited per user (30/hr) and IP (90/hr); user text passes `sanitizeInput` and document context flows through `buildSecurePrompt`. There is deliberately no minimum message length (greetings like "hi" get a friendly, project-scoped reply); the client textarea caps input at the same 4,000 characters the server enforces, and the system prompt carries scope-and-safety guardrails (redirect off-topic/general-assistant requests back to the project, never reveal or override its instructions even when the message or document content asks). Model comes from `OPENROUTER_COMPOSER_MODEL` (falls back to `OPENROUTER_CHAT_MODEL`, then `anthropic/claude-sonnet-4-6`); answers are capped at 1,024 output tokens (`OPENROUTER_COMPOSER_MAX_TOKENS`) and upstream 402/401/429 failures surface actionable error messages. UI lives in `src/components/workspace/project-composer.tsx`; prompt in `src/lib/prompts/project-composer.ts`.
- **Competitive Analysis / Market Research**: AI-generated competitive landscape analysis with a strict v2 module contract. New documents render as a full-width Pencil-faithful designed page, not generic markdown. The UI is built from typed parsing of the stored markdown source and uses founder-friendly display labels including Executive Summary, Direct Competitors, Feature Comparison, Pricing Comparison, Best Customer Segments, How You'll Reach Customers, Ways to Stand Out, What Makes It Hard to Copy, First Version Focus, and Recommended Next Moves. Executive Summary is a single generated section and workspace/nav item with a selectable Overview child anchor; it includes the market snapshot, entry assessment, why-now signal, and biggest risk, while legacy Opportunity Verdict content is still folded into the summary when present. Direct competitor entries expect H3 headings plus concise fields for overview, core product, positioning, strengths, key edge, limitations, pricing model, and target audience so the app can render dense competitor cards and a fast-comparison table. Live discovery uses OpenRouter-managed Exa first through the `openrouter:web_search` server tool with Gemini 3.5 Flash. Exa may return up to seven ranked direct-competitor candidates and may return fewer rather than pad with adjacent results. Final synthesis aims to select the strongest three to five direct competitors, but outputs fewer when fewer than three evidence-supported direct matches exist rather than inventing or padding entries. Perplexity/Tavily run only when Exa errors, returns unusable JSON/URLs, or supplies no citations. Exa-success rows persist syntactically safe public HTTP(S) candidate name/URL pairs in `analyses.metadata.live_research.competitor_sources` without reachability or company-identity validation; that validation is explicitly deferred to P1 Linear issue NAZ-129. Legacy fallback rows still require a matching Tavily extraction result before persisting a source pair. The typed renderer uses the source map to turn exact competitor mentions across Executive Summary and every structured Market Research paragraph, list, table header/cell, competitor field, and positioning label/rationale into underlined external links. Single-token names require matching case to avoid linking common prose (for example, `linear` versus the company `Linear`); multi-word names match case-insensitively with letter/number boundaries and longest-name priority. New rows with an explicit empty source map fail closed, and streaming never promotes model-authored H3 URLs into repeated inline links. Existing v2 rows created before source metadata fall back to safe public H3 URLs for compatibility; legacy/malformed markdown behavior is unchanged. The Direct Competitors table retains its explicit Google-search fallback for profiles without source URLs. When live research is unavailable or empty, the prompt still generates conservative competitor candidates without fake URLs or exact unsupported pricing, starts Direct Competitors directly with H3 profiles, and the renderer filters old saved unavailable-research disclaimer paragraphs from Direct Competitors display. Product Plan owns risk, dependency, and open-question handling; Market Research no longer generates or displays a separate Risks & Competitor Responses subsection. Legacy or malformed documents fall back to markdown with upgrade guidance.
- **Explainable Artifact Terms**: Structured Market Research, Product Plan, First Version Plan, and AI Prompts renderers include a static glossary-backed explanation system for high-confusion strategy terms. Section headers use icon-only tooltip controls, while controlled labels such as Agents, Impact, Mitigation, and Highest Risk use a dotted defined-term treatment. The first pass intentionally avoids rewriting arbitrary markdown fallback content.
- **Gap Analysis**: Identifies market opportunities and unmet customer needs
- **Product Plan Generation**: Complete Product Plans use the shared production/Prompt Lab request builder and render through the split Product Plan block renderer. The current numbered PRD-style contract is orientation-first: introduction/overview, goals, team and milestones, and success metrics appear before personas and implementation detail. Functional Requirements, User Stories & Acceptance Criteria, and Technical Considerations remain generated in Product Plan markdown but render only as AI Prompts file cards, not as Product Plan sections; legacy/malformed plans fall back to markdown (the intermediate legacy block layout was removed 2026-07-05). The Product Plan masthead is title-only (the fallback Project Size / Est. Duration stat strip was removed), business and user goals share one numbered goal-card UI with the business list labeled "Proposed Business Goals", and the system prompt frames business goals as proposed starting targets and no longer includes the file-output instruction block. Multi-column planning grids (assumptions, non-goals, role access, FVP stack/metric/scope grids) use a white-container hairline pattern (cells own offset top/left borders) so partial last rows stay white.
- **First Version Plan Generation**: First Version Plans use the shared production/Prompt Lab request builder and render through the split First Version Plan block renderer. The current risk-first contract covers summary, key risks/assumptions/scope decisions, target user/problem, MVP goal/definition of done, consolidated core user flows, suggested build approach with tactical shortcuts, recommended AI build tool, AI-friendly build sequence, validation plan, and next prompt. Recommended AI Build Tool, AI-Friendly Build Sequence, and Next Prompt are visually moved into the derived AI Prompts workspace section.
- **Mockup Generation**: Three OpenRouter image storyboard alternatives are generated from First Version Plans, stored in private Supabase Storage, and rendered through the authenticated image proxy. Manual and Generate All/onboarding runs persist option-level draft progress with a run id, durable `mockup_option_drafts` rows, and `/api/mockups/recover-options` before retrying failed/missing options, so already-uploaded images can be recovered after browser refreshes or route timeouts. Legacy Stitch HTML execution/proxy rendering is removed; old Stitch-format rows show a regeneration notice.
- **AI Prompts Workspace Section**: A derived workspace section rendered after Design Mockups. It does not create a database table, generation queue item, PDF export type, or its own system prompt; all content is parsed from the saved Product Plan and First Version Plan markdown. `src/lib/ai-prompts-readiness.ts` is the shared readiness source for onboarding, the workspace rail, and the section body. It checks the complete current handoff bundle and reports waiting, partial, ready, or terminal incomplete; partial files remain usable, while settled missing files never render as green or keep an endless progress animation. Because AI Prompts is derived and has no queue item, the nav rail shows a plain "Incomplete" status label for the terminal incomplete state instead of a Retry action (`derived: true` on the nav item suppresses Generate/Retry buttons). It renders two numbered subsections: a Recommended AI Build Tool section (card populated from the First Version Plan tool recommendation, with detail fields rendered as inline markdown) and a Prompt Files section. Prompt Files renders markdown file cards instead of full document UIs: `first-prompt.md` (from the plan's Next Prompt section), `ai-build-guardrails.md` (legacy docs only), `build-steps.md` (from the AI-Friendly Build Sequence section), `functional-requirements.md`, `user-stories-and-acceptance-criteria.md`, and `technical-considerations.md` come straight from plan sections, while `sub-agents.md` (one ready-to-paste prompt per agent role from the Product Plan Team and Milestones → Agents list, parsed at H3 or nested H4 since models emit both) and `project-context.md` (portable CLAUDE.md / AGENTS.md / browser-builder instructions assembled from First Version Plan orientation plus Product Plan Success Metrics) are assembled client-side in `src/components/analysis/ai-prompt-files.tsx`. The project context embeds platform-neutral planning, red-green-refactor with acceptance-check fallback, real-flow verification, review/security/recovery, server-derived ownership checks, and privacy-conscious product instrumentation rules. Small products use the database already selected in their Build Approach for append-only events—D1 only when the Database row selects D1, while Cloudflare deployments with Neon/Supabase keep that selected database—until a dedicated analytics system is justified. Lovable and v0 use their supported native database paths. The First Version Plan prompt chooses the build tool and stack as one compatible decision rather than forcing browser builders onto the repo-aware Cloudflare default. A static "How to use these files" numbered guide renders above the file grid explaining the download-into-a-folder, first-prompt, build-steps workflow and tells browser-builder users to paste the project context into project instructions or knowledge. Each card has copy and download icon actions and opens a lightbox preview with the same actions; cards keep their `ai-prompts-*` anchors for nav. Markdown file previews and design mockup concepts share the `ArtifactLightbox` shell (`src/components/ui/artifact-lightbox.tsx`), which renders a filename header bar with copy/download/close actions; mockups opt into a media presentation that uses the available viewport while document previews retain their prior sizing. The mockup lightbox copies the image itself to the clipboard as PNG. The Recommended Tool card parses labeled bullet fields with the colon inside or outside the bold marker. Market Research's Positioning Map section renders per-competitor labeled 0-10 score bars with rationale and evidence instead of a scatter plot; axis endpoint definitions ("0 = ..., 10 = ...") are parsed by `parsePositioningAxis` and shown once in a "How to read the scores" legend above the competitor rows, with bars showing only the short axis name. Comparison-table competitor names without a verified document URL link to a web search fallback instead of rendering unlinked. The Executive Summary section shows the AI-generated project name in a "Proposed Name" card (threaded as `projectName` through `ScrollableContent` → `CompetitiveOverviewSection`). First Version Plan masthead and section headings use the same type scale as Product Plan and AI Prompts (36/44px masthead, 22px section headings), and the AI Prompts masthead has no tooltip. Mockup option parsing treats `storagePath` as optional for display; workspace retry/recovery flows still validate it themselves. Workspace document mastheads are title-only (no eyebrow kickers), and Design Mockups now has its own section heading. Post-submit onboarding and manual Generate All progress UIs may show AI Prompts as a display-only derived row once the Product Plan and First Version Plan handoff content is ready, but it is never executed as its own queue item.
- **Launch Plan Archived**: Launch Plan is no longer part of project creation, Generate All/onboarding, workspace navigation/rendering, project status/workspace payloads, PDF export, or production credit paths. `/api/launch/plan` returns `410 Gone` before rate limiting, AI calls, inserts, or credit consumption. Existing `analyses.type = 'launch-plan'` rows are preserved but hidden from project surfaces. The AI-backed Launch Plan prompt/pipeline remains available only through local Dev Prompt Lab for future reactivation.
- **Dev Prompt Lab**: Local-development-only workbench at `/dev/prompt-lab` for iterating artifact prompts against existing projects without creating workflow artifacts, consuming credits, or starting queues. It supports Market Research, Product Plan, First Version Plan, Design Mockups, and Launch Plan; stores artifact-scoped reusable system/model drafts in Supabase `prompt_lab_experiments`, stores project-scoped isolated runs in `prompt_lab_runs`, uses existing workspace renderers for artifact-accurate preview, and includes a lab-only renderer playground for experiments that do not affect production workspace rendering. Product Plan and First Version Plan defaults are generated through the same shared request builders production uses, and the Prompt Lab UI shows a `Default / Production` badge while the untouched shared Product Plan or First Version Plan default prompt/model is displayed. The user prompt/context is regenerated from the selected project and should not be overwritten by shared system drafts. For Design Mockups, Prompt Lab centers the production-like planner flow: it shows editable hidden planner prompts, supports a dedicated planner + selected-option run that parses the planner JSON through the shared mockup design-plan validator, and displays the compact mockup brief, generated hidden design-plan JSON, required skeleton attachment metadata, and final image prompt in separate read-only inspectors when available. Design Mockup runs default to prompt-only mode: image generation is disabled unless explicitly re-enabled, and the lab returns a ChatGPT-ready prompt bundle containing system instructions and the final image prompt instead of calling the OpenRouter image model; the skeleton path is shown separately as UI metadata so it is not copied into the model-facing prompt. A Design Mockups-only platform dropdown can force the parsed design plan's `primaryPlatform` to desktop web, mobile web, native mobile app, or native desktop app, or leave it on auto from project context; selected overrides are treated as trusted Prompt Lab controls and are applied after planner JSON parsing so conflicting intake context cannot win, then screen counts are normalized to the final effective platform before building the ChatGPT-ready prompt. The generic isolated system/user prompt editors are not shown for Design Mockups because the selected-option image prompt is rebuilt internally from the planner JSON. Prompt Lab text runs use the shared OpenRouter long-text timeout (`240s`) for most text artifacts and the longer planning-document timeout (`480s`) for Product Plan and First Version Plan; mockup image runs keep their separate image timeout path when image generation is explicitly enabled.
- **Dev Motion Lab**: Local-development-only workbench at `/dev/motion-lab` (gated by `isMotionLabEnabled()` → `isDevOnlyFeatureEnabled()`, `notFound()` in production) for prototyping generation/animation states against the real workspace renderers. It simulates a Market Research stream from `LANDING_SAMPLE_CONTENT` and renders it through `CompetitiveStreamingDocument` plus the real `AnchorNav` rail, with three variants (block-commit, skeleton contract, ticker + snap), delivery modes (token stream vs 2s poll chunks), speed control, and replay. Because it imports production components, animation experiments cannot drift from real UI.
- **Workspace Onboarding Streaming**: Final intake submit redirects to the workspace immediately after `/api/projects/create-from-intake` returns and `/api/generate-all/execute` is fired (the full-page loading panel only covers the create request itself; it no longer polls onboarding status). While the onboarding queue generates a text planning document (Market Research, Product Plan, or First Version Plan — the dependency chain means at most one streams at a time), the executor threads `onToken` through `generateProjectDocument()` → `runCompetitiveAnalysis()` / `runPRD()` / `runMVPPlan()` and throttle-writes accumulated partial markdown to `generation_queue_items.partial_content` (~1.5s cadence, failure-isolated writer in `queue-service.ts` that disables itself on any write error, e.g. before the `20260709000000` migration is applied). `/api/generate-all/status` exposes it as a top-level `streamingPreview { docType, content }` (kept out of the legacy queue JSON); while the competitive item streams, the payload also carries `competitorSources` pairs read from `generation_queue_items.partial_metadata` (migration `20260711120000`), written once by the executor when live research resolves (before synthesis) via `StreamCallbacks.onCompetitorSources` and the failure-isolated `writeMetadata`, so `CompetitiveStreamingDocument` links competitor mentions during streaming exactly like the saved document (validated through `getCompetitorSourcesFromMetadata`; the parsed-URL fallback stays off); the generate-all store keeps per-docType previews in `streamingPreviews` with longest-content-wins per docType (retained after completion to bridge the gap until the saved document loads via `router.refresh`), and the workspace smooths the 3s poll chunks with one `useSmoothedStream` per docType. Market Research renders live through `CompetitiveStreamingDocument` in the Executive Summary (`parts="overview"`) and Market Research (`parts="detail"`) sections; Product Plan and First Version Plan render live through `PlanningStreamingDocument` (`src/components/analysis/planning-streaming-document.tsx`), which feeds committed markdown from the lenient splitter in `src/lib/planning-document-streaming.ts` into the exported `CurrentPrdDocumentBlocks` / `CurrentMvpPlanDocumentBlocks` renderers (bypassing the legacy-format gate that a short early stream cannot pass) and appends titled skeleton sections from the exported `PRD_STREAMING_EXPECTED_SECTIONS` / `MVP_STREAMING_EXPECTED_SECTIONS` contracts for sections that have not arrived yet. Error states fall back to the retry module. `/api/projects/[id]/onboarding-status` still returns a competitive-only `streamingPreview` (it only serves the pre-redirect intake loading panel). Partial content is cleared in the DB when the item reaches a terminal state. The lenient stream parsers (`competitive-analysis-streaming.ts`, `planning-document-streaming.ts`) mark a section complete only when the next H2 arrives and withhold structural fragments (partial headings, partial table rows, unclosed bold) from the visible tail; production validation in `competitive-analysis-v2.ts` stays strict. `CompetitiveDetailSection` renders from the exported `COMPETITIVE_DETAIL_SECTION_CONFIGS` array shared with the streaming renderer, so both always use identical designed blocks. Streaming section headers carry no "Writing" status chip; the growing text itself is the progress signal. The workspace `AnchorNav` rail follows the active subsection as the document pane scrolls, beginning to scroll two rows before the active row would reach the rail's top or bottom edge (follow is suppressed for ~1s after a rail click so it never fights the click-position restore). While Design Mockups generate, the workspace always shows the three Concept 1/2/3 cells (mirroring the nav rail's concept entries): arrived draft images render as real concept cards, and each still-pending concept cell hosts the `MockupGenerationLoader` WebGL surface (img-fx) through the `MockupRenderer` `pendingMedia` prop; per-option status rows above the concepts appear only when an option needs retry. While the Product Plan / First Version Plan are queued or generating, the AI Prompts section renders its masthead and every expected prompt-file card as a non-interactive queued placeholder (`AI_PROMPT_FILE_PLACEHOLDERS` in `ai-prompt-files.tsx`), swapping each card to the real interactive card as its source section becomes available.
- **Technical Specifications**: Architecture design, technology stack recommendations, and API designs
- **Landing Page + Waitlist Gate**: The marketing landing page now switches between standard signup CTAs and a public waitlist flow once the early-access user cap is reached. Features:
  - Dynamic CTA mode based on current `profiles` count
  - Public `waitlist` table for email capture
  - Shared `WaitlistForm` component on the landing page
  - Figma-matched desktop hero artwork (Figma node 362:12585, assets `public/landing/hero/362-*_note.png` in a centered 1920x720 box), rendered by `HeroArtwork` with a client-side desktop media gate, `next/image` optimization, pointer parallax, and scroll scatter/fade motion (reduced-motion guarded); mobile visitors do not render or request the hidden hero layers. Legacy `215-*.png` hero assets are superseded and pending cleanup approval
  - Hero entrance motion via shared `hero-enter-*` utilities in `globals.css` (ease-out-expo, reduced-motion guarded): heading and subheading fade in place, the idea input rises from below, and sticky notes slide in from their own side (entrance classes live on wrapper divs so the parallax loop's img transforms never conflict)
  - Hero copy per the 2026-07-06 Figma refresh: 68px heading with red italic "someday." (Hanken Grotesk now loads weight 300 + italics), 20px Light subheading above the input, and the hero fills `100svh` minus header and a ~150px peek so the "High quality prompts..." caption + ~3/4 of the tool logo marquee show above the fold (the old handoff heading/kicker copy was removed)
  - `LandingIdeaCapture` renders as a compact one-line input with the Get Started button beside it; focusing animates the textarea multi-line and stacks the button below (CSS height/width transitions, collapses on outside blur only while empty, always stacked below the `sm` breakpoint). An empty input still allows a plain sign-up, but a partial idea below the shared floor (`src/lib/intake/idea-validation.ts`) disables Get Started and shows an inline hint
  - The landing header content box is wider than the hero container (`max-w-[1368px]` with 16-24px padding, aligning content with the 1320px box edges); dashboard/project headers are separate components and unchanged
  - Landing pricing grid is the client `PricingSection` component with a Monthly/Yearly toggle (15% yearly discount math) and detailed per-plan feature rows; card CTAs open the signup modal (waitlist anchor in waitlist mode). It renders through the shared pricing components (see Shared UI Architecture): plan copy from `src/lib/pricing-plans.ts` and cards from `src/components/pricing/plan-card.tsx`, the same components the billing page uses, so plan copy edits update both surfaces at once
  - Five feature sections render through the client `FeatureCard` component (scroll-triggered reveal: staggered bottom-up text fade-in, visual fades in scaling 80%→100%, reduced-motion guarded) with optimized static `next/image` preview captures from `public/landing/samples/previews/`. The capture source remains `/landing-preview/[navKey]` with `WorkspaceScreenshot`, `SamplePreviewDocument`, and exported sample content in `src/lib/landing-sample-content.ts`. The capture list (navKey/section/file) lives once in `src/lib/landing-preview-captures.mjs`, shared by the export script and the landing component; a missing capture fails loud instead of showing a wrong screenshot. Live iframe previews are only enabled when `NEXT_PUBLIC_LANDING_LIVE_PREVIEWS=1`, and both preview variants share the `PreviewFrame` chrome (`src/components/landing/preview-frame.tsx`).
  - Testimonial band dot animation elongates and directionally blurs the traveling dot by speed (SVG ellipse + quantized `feGaussianBlur` updates), settling round at rest
  - Public `/contact`, `/privacy`, and `/terms` pages share `InfoPageShell` (`src/components/landing/info-page-shell.tsx`); the support address lives in `src/lib/support.ts` (`SUPPORT_EMAIL`, placeholder until the real inbox exists)
  - One shared public-site footer (`src/components/landing/site-footer.tsx`) is used by the landing page and all info pages: brand, Product (Features/Pricing/FAQ), Help (Contact), and a bottom bar with Privacy/Terms. It intentionally has no Sign In / Get Started column; those CTAs live in the header and hero only
  - Landing FAQ section (`src/components/landing/faq-section.tsx`): six native details/summary rows at `#faq`, linked from the header nav and footer
  - Landing buttons standardize on `rounded-md`; the design file's sharp bottom CTA was aligned to the rest of the page
  - `scripts/export-landing-sample.mjs` exports sample document/mockup content from a real project, copies storyboard images to `public/landing/samples/`, and can capture static feature preview PNGs from the local `/landing-preview/[navKey]` routes with `--capture-previews` or `--capture-previews-only` (capture list imported from `src/lib/landing-preview-captures.mjs`)
  - Authenticated visitors to `/` are redirected to `/projects`
  - Fail-open API behavior so CTA rendering does not block on Supabase errors
- **OpenRouter Image Mockups**: Mockup generation uses OpenRouter image storyboards end to end. Legacy Stitch HTML previews have been removed; if an old Stitch-format row is encountered before production data cleanup, the renderer shows a safe "Legacy mockup format" regeneration notice instead of fetching or rendering HTML. Features:
  - `src/lib/mockups/design-plan.ts` generates and validates hidden mockup design plans with primary platform, happy-path scenario, an exact two-screen skeleton-frame limit, screen captions, and option-level design directions
  - `src/lib/mockups/openrouter-image-pipeline.ts` generates OpenRouter storyboard alternatives and uploads image bytes to Supabase Storage, with a reusable single-option helper for manual generation
  - `src/app/api/mockups/generate-option/route.ts` generates and stores one mockup option image for manual workspace generation
  - `src/app/api/mockups/recover-options/route.ts` reconstructs saved storyboard option metadata from Supabase Storage for the current run before retrying failed/missing options
  - `src/app/api/mockups/finalize/route.ts` finalizes three generated options into the canonical `mockups` row
  - `src/app/api/mockups/fixture/route.ts` creates three no-credit storyboard fixture mockups for local UI/finalization testing; append `?mockupFixture=1` or set `localStorage.makercompass_mockup_fixture_mode = "true"` in local development
  - `src/app/api/mockups/image/route.ts` proxies stored mockup images after project ownership checks
- **App Generation Archived**: `/api/generate-app` and app-generation prompts have been removed because generated app/deployment output is off the roadmap. Existing `deployments` rows remain historical data only.
- **Project-based Pricing Migration**: Project creation is guarded by project allowance. Free users get a one-project lifetime allowance; Starter gets five projects/month and Pro gets ten. Paid plans use monthly project allowance windows from explicit `plans.monthly_project_allowance` fields, with plan-name/features parsing only as fallback. Billing intervals can be monthly, 6-month, or annual, but multi-month Stripe billing periods do not expand the monthly project allowance window. Credits remain an internal ledger for legacy accounting and refunds, but public landing, dashboard, workspace, and billing surfaces use project/plan language rather than credit balances or credit-denominated failures.
- **Stripe Interval Billing**: Public checkout uses `plans` for entitlement tiers and `plan_prices` for Stripe recurring Prices by billing interval. Starter and Pro are the self-serve production tiers; Enterprise is kept non-public/checkout-disabled until support and sales workflows are ready. Checkout validates selected interval prices server-side, reuses or repairs stale test-mode customer IDs, and uses stable idempotency keys for both per-user/selected-price Checkout Sessions and per-user/observed-customer customer replacement. Billing clients accept only hosted HTTPS Checkout/Portal URLs on Stripe's exact hostnames, allow one request in flight, and show API failures inline. Only subscriptions with a Stripe subscription ID expose Portal management; private/Internal Dev subscriptions display their resolved plan name without offering Stripe actions. Portal validates that the stored customer exists in the active Stripe mode and fails closed on stale/deleted IDs rather than creating an empty replacement that could mask entitlement drift. Webhooks map actual Stripe subscription item Price IDs back to `plan_prices`; Stripe Portal period-end cancellations are normalized from either `cancel_at_period_end` or a `cancel_at` matching the item period end. The live catalog contains Starter at $19/month, $105/6 months, and $194/year, and Pro at $49/month, $270/6 months, and $499/year. Monthly and annual live mappings are enabled in shared Supabase; 6-month rows exist but remain inactive/checkout-disabled. A real live $19 Starter checkout, entitlement, portal cancellation, immediate cancellation, and full refund passed locally on 2026-07-11. Production is deployed at `https://makercompass.com`; live endpoint `we_1Ts8dNRZYXj2bJrBStpepAxz` targets `/api/stripe/webhook` with the five handled billing events. A no-charge live probe returned HTTP 200 and stored a processed live durable claim. Stripe email notifications cover API integration errors, webhook delivery failures, and webhook event-generation failures. `STRIPE_WEBHOOK_SECRET` is Vercel Production-only; rotating the formerly Preview-exposed value remains required after phone verification. A dedicated confirmed Free production QA identity can repeat no-charge hosted Checkout redirect tests without altering Internal Dev. `https://www.makercompass.com` has a matching Vercel certificate and permanently redirects to apex.
- **Paid-only Project Deletion**: The Projects dashboard renders `DashboardProjectCard` cards with hover/focus workspace warming and delete controls. `DELETE /api/projects/[id]` is ownership-scoped, metrics-tracked, and blocked for Free plan users; the UI shows an upgrade prompt before paid-plan-only deletion.
- **Generate-Missing-Only Documents**: Planning documents are active singletons by default. Direct generation routes and Generate All/onboarding execution check for an existing active document before credits or external AI calls; duplicate attempts return/record a skipped existing output instead of inserting another row. Future document versioning must be a separate explicit product action.
- **Dashboard Generation Status**: The project dashboard derives document loading states from the durable Generate All/onboarding queue, not only local browser flags. The left document rail shows compact queued/waiting/generating/ready indicators plus dark `Generate` buttons for missing idle modules and dark `Retry` buttons only for modules that actually failed. Queue items blocked by a failed/missing prerequisite show `Waiting`, not `Retry`, until the prerequisite content exists. The right document modules show queued/waiting/loading states, centered retry placeholders with a user-friendly error message and wider dark `Retry` action, or canonical saved content. Product Plan and First Version Plan no longer show partial streaming previews in the workspace; they show loading/generating states until the saved document is ready. Overview and Market Research share the same competitive-analysis generation state, so a retry from either section moves both rail items together.
- **Lazy Workspace Loading**: Project workspaces use slugged project refs at `/projects/[projectRef]` and lazy-load owned document collections through `/api/projects/[id]/workspace`. The workspace requests only the document types it needs, keeps section hash navigation in sync, defers below-the-fold rendering to avoid freezing large generated documents, and applies `content-visibility: auto` plus `contain-intrinsic-size` to inactive below-the-fold document frames while keeping the currently active source document fully visible for anchor navigation. `WorkspaceDocumentFrame` tracks each frame's real rendered height with a ResizeObserver and re-applies containment one commit after the active document changes, so the containment placeholder matches reality and scrolling back up through previously viewed documents cannot jump the viewport across sections.
- **Prompt/Inline Edit Cleanup**: The Prompt tab remains deprecated and `/api/prompt-chat` returns `410 Gone`. The old inline "Edit with AI" client surface and `/api/document-edit` route are not present in the current app. The per-document PATCH routes (`/api/analyses/[id]`, `/api/prds/[id]`, `/api/mvp-plans/[id]`, `/api/tech-specs/[id]`) had no remaining callers and were removed on 2026-07-05.

### User Workflow

1. User starts from the landing idea box or a dashboard New Project action
2. `/projects/new` opens the Idea Intake Wizard instead of inserting a blank project
3. Step 1 captures the raw idea or an example idea
4. Step 2 calls `/api/intake/questions` to generate structured answer-chip questions
5. Final submit calls `/api/projects/create-from-intake`, enforces monthly project allowance, generates a short project name, creates `projects`, writes the canonical `project_intakes` row, and creates an onboarding `generation_queues` run
6. The wizard shows the full-page Maker Compass loading state, starts `/api/generate-all/execute` server-side, and polls `/api/projects/[id]/onboarding-status`
7. User lands at the workspace `#executive-summary` section once the v2 `competitive-analysis` document exists, which powers Executive Summary and Market Research
8. Product Plan, First Version Plan, design mockups, and tech specs continue through the document pipeline; app generation is archived
9. The project workspace is served from `/projects/[projectRef]`, canonicalizes stale slugs through `src/lib/project-routing.ts`, and fetches document collections lazily from `/api/projects/[id]/workspace`

---

## 2. Tech Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 16.2.9 | Full-stack React framework with App Router |
| **React** | 19.2.3 | UI library with React Server Components |
| **TypeScript** | 5 | Type-safe JavaScript |
| **Tailwind CSS** | 4.x | Utility-first CSS framework |
| **Radix UI** | Various | Unstyled, accessible component primitives |
| **lucide-react** | 0.563.0 | Icon library |
| **class-variance-authority** | 0.7.1 | Type-safe component variants |
| **tailwind-merge** | 3.4.0 | Tailwind class merging utility |
| **react-markdown** | 10.1.0 | Markdown rendering |
| **remark-gfm** | 4.0.1 | GitHub Flavored Markdown support |
| **beautiful-mermaid** | 1.1.3 | Beautiful, themeable Mermaid diagram rendering with expansion |
| **react-syntax-highlighter** | 16.1.0 | Code syntax highlighting |
| **@json-render/core**, **@json-render/react**, **@json-render/shadcn** | 0.11.0 | Structured mockup rendering from json-render specs and patches |
| **img-fx** | 0.3.1 | Animated WebGL mockup image-generation loading surface |
| **three** | 0.184.0 | WebGL renderer peer dependency for `img-fx` |
| **date-fns** | 4.1.0 | Relative project timestamp formatting on dashboard cards |
| **Hanken Grotesk** | (Google Font) | Primary sans-serif and display typeface |
| **Fira Mono** | (Google Font) | Monospace typeface for labels/code |

### Backend & Services

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Supabase** | - | PostgreSQL database with auth and RLS |
| **@supabase/supabase-js** | 2.91.1 | Supabase client library |
| **@supabase/ssr** | 0.8.0 | Server-side rendering utilities |
| **Anthropic Claude** | 0.71.2 | Optional local Prompt Lab mockup planner provider |
| **OpenRouter** | 6.16.0 | API wrapper for AI analysis, managed Exa web search, and OpenRouter-hosted image mockup generation |
| **Exa (via OpenRouter)** | managed | Primary Market Research competitor discovery through OpenRouter server tools; no separate Exa key |
| **Stripe** | 20.2.0 | Payment processing and subscriptions |
| **@sentry/nextjs** | 10.58.0 | App Router error monitoring and source-map upload support |
| **Perplexity** | - | AI-powered competitor search (sonar-pro model, OpenAI-compatible API) |
| **Tavily** | - | Web content extraction from competitor URLs |

### Development Tools

| Tool | Version | Purpose |
|------|---------|---------|
| **ESLint** | ^9 | Code linting |
| **eslint-config-next** | 16.2.9 | Next.js ESLint configuration |
| **tsx** | 4.20.6 | TypeScript test/runtime loader for Node's built-in test runner |
| **shadcn** | 3.8.5 | Component scaffolding/tooling |
| **Clawpatch** | config only | Local review metadata and reports stored in `.clawpatch/` |
| **@types/node** | ^24 | Node.js type definitions |
| **@types/react** | ^19 | React type definitions |
| **@types/react-dom** | ^19 | React DOM type definitions |

### Build & Runtime

- **Build Tool**: Next.js built-in (Turbopack in dev, Next.js production build for release)
- **Dev Server**: Next.js dev server with HMR
- **Package Manager**: npm
- **Runtime**: Node.js LTS. Local development is pinned to Node.js 22.21.1 through `.nvmrc`; package engines allow supported even-numbered LTS lines 22 and 24.

---

## 3. Architecture

### High-Level Design Pattern

**Server Components + Client Components (React Server Components Pattern)**

```
┌─────────────────────────────────────┐
│    Client Layer (Browser)           │
│  - React Client Components          │
│  - Supabase Client SDK              │
│  - State management (React hooks)   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Next.js Server Layer              │
│  - API Routes (/api/*)              │
│  - Server Components (RSC)          │
│  - Proxy auth session refresh       │
│  - Server Actions                   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│    Backend Services                 │
│  - Supabase Auth & Database         │
│  - Anthropic Claude API             │
│  - OpenRouter API + managed Exa     │
│  - Stripe API                       │
│  - Perplexity API (search fallback) │
│  - Tavily API (extract fallback)    │
└─────────────────────────────────────┘
```

### Data Flow

1. **Authentication Flow**:
   - User logs in via Supabase Auth (email/password or Google OAuth)
   - Sign In / Sign Up on the landing page open an `AuthModal` overlay (Radix Dialog) via URL params `?modal=auth&mode=signin|signup`. The `/auth` page is preserved for email confirmation redirects and direct URL access.
   - Both the modal and the `/auth` page share the `AuthFormContent` component
   - JWT stored in HTTP-only cookie
   - `src/proxy.ts` refreshes Supabase auth session cookies for matched requests
   - Protected routes redirect unauthorized users
   - Auth redirect targets are sanitized through `src/lib/safe-redirect.ts`. Supported internal next paths include `/projects/new?intake=<token>`, `/projects/*`, `/dashboard`, `/billing`, `/preferences`, and `/reset-password`.

2. **Idea Intake Wizard Flow**:
   - Landing page idea capture stores same-tab draft text in `sessionStorage`
   - For auth handoff, `POST /api/intake/pending` stores the idea in `pending_intakes` for 24 hours and returns an opaque token; raw idea text never goes in the URL
   - Auth modal and `/callback` preserve safe `next=/projects/new?intake=<token>&autostart=1` redirects for landing-page validation
   - `/projects/new` renders `IdeaIntakeWizard`; it loads pending intake by token via `GET /api/intake/pending` or falls back to `sessionStorage`, and `autostart=1` generates Step 2 questions once after a valid idea is restored
   - `POST /api/intake/questions` generates 4-5 AI-authored answer-chip questions with `single` and `multiple` answer modes. Standalone text questions are rejected; optional free text is only revealed through `Other` on single-select questions where useful. If AI question generation is unavailable or invalid, the route returns a retryable error instead of falling back to curated questions
   - `POST /api/projects/create-from-intake` validates answers, checks `canCreateProject()`, builds `idea-intake-v1` JSON, stores the readable summary in `projects.description`, stores the structured payload in `project_intakes`, generates `projects.name`, creates a service-owned onboarding `generation_queues` run with `creditCost: 0`, claims the pending token, and returns `generationRunId`, `statusUrl`, and a canonical `#executive-summary` redirect URL
   - `IdeaIntakeWizard` shows `IntakeSubmissionLoadingPanel`, fires `/api/generate-all/execute` for the new project, polls `/api/projects/[id]/onboarding-status`, and redirects only after the v2 competitive analysis row is saved

3. **General Chat Flow**:
   - `/api/chat` returns `410 Gone`
   - The route does not authenticate, consume credits, call AI, or write messages while disabled

4. **Project Name Generation**:
   - Wizard-created projects generate a short name during `/api/projects/create-from-intake` using `generateProjectName()`
   - The project is inserted with that generated name, or with a fallback title derived from the idea if the AI call is unavailable
   - The workspace header is editable immediately for wizard-created projects because `project.description` is already populated

5. **Deprecated Prompt Chat Flow**:
   - Prompt Chat is no longer a supported intake, refinement, or naming path.
   - Project names are generated during `/api/projects/create-from-intake` for wizard-created projects.
   - `/api/prompt-chat` is retained only as a deprecated endpoint and returns `410 Gone`.
   - Project workspace navigation starts at Overview; `?tab=prompt` is blocked and redirected to Overview.

6. **Analysis Flow** (individual tab generation):
   - Client requests analysis (market research, Product Plan, First Version Plan, Design Mockups, or tech spec) from the workspace generation handlers
   - Server verifies project ownership and checks `src/lib/active-document-policy.ts` for an existing active document before credit deduction or external generation. Duplicate requests return `200 OK` with `{ skipped: true, reason: "document_already_exists", existingDocument }` and do not charge credits.
   - If no active document exists, the server checks credits, deducts if available, and refunds through the service-role `refund_credits` RPC on generation failure
   - Routes to the appropriate in-house pipeline (`src/lib/analysis-pipelines.ts`). When a `project_intakes` row exists, generation context is formatted through `formatProjectIntakeForAi()` and combined with the human-readable project summary; otherwise `projects.description` is used as the fallback:
    - **Market Research**: OpenRouter-managed Exa first finds up to seven ranked direct-competitor candidates and returns citation excerpts → OpenRouter aims to select the strongest three to five direct competitors and synthesizes the final report, while allowing fewer than three when evidence does not support padding. If the Exa request errors, cannot be parsed, has no usable public URLs, or has no citations, the pipeline falls back to Perplexity (sonar-pro) → Tavily extraction before synthesis. External API calls use `withRetry` (3 retries, exponential backoff on 429/5xx); the Exa adapter has a 120s timeout and bounded seven-result/seven-total search budget. OpenRouter synthesis calls use the shared long-text timeout (`240s`) with clearer timeout messages; Product Plan and First Version Plan use a longer planning-document timeout (`480s`); direct generation returns safe timeout failures as `504`. All pipeline completions check `finish_reason`: a `length` finish means the document was truncated at the model output cap, so the step fails (and the queue can retry) instead of saving a truncated document; the First Version Plan cap is 24,576 tokens because 16,384 truncated real plans mid-table.
    - **Product Plan**: OpenRouter LLM call built through the shared Product Plan request helper, receives the full latest Market Research document through the secure prompt builder, and uses the same default request shape as Prompt Lab
     - **First Version Plan**: OpenRouter LLM call built through the shared First Version Plan request helper, receives the full latest Product Plan document through the secure prompt builder, and uses the same default request shape as Prompt Lab
     - **Tech Spec**: OpenRouter LLM call with detailed system prompt, receives the Product Plan as context
   - Result saved to the appropriate table (`analyses`, `prds`, `mvp_plans`, or `tech_specs`). Future row-based versioning should use an explicit versioning route/action rather than the default generate path.
   - Page reloads to surface the new version

7. **Generate All / Onboarding Generation Flow** (server-side, durable):
   - Client calls `startGenerateAll()` in `generate-all-store.ts`
   - Store persists queue to DB via `POST /api/generate-all/start`
   - Store fires `POST /api/generate-all/execute` as fire-and-forget (server runs up to 540s even if user closes tab)
   - Store polls `GET /api/generate-all/status` with a visibility-aware cadence: every 3s initially, backing off to 6s after 2 minutes and 10s after 8 minutes, pausing while the tab is hidden and polling immediately when the tab becomes visible again
   - When server marks a step "done", store calls `onStepComplete()` → `router.refresh()` to reload the document
   - The workspace consumes hydrated queue items to keep left-panel and right-panel document states stable across refresh, browser back/forward, and returning to a project. Content existence wins over stale queue state; Product Plan and First Version Plan current-session stream previews can render in the right panel when available, while background queues fall back to durable generating status until saved content exists.
   - The old idle public "Generate All" button is deprecated. The workspace only shows the Generate All status/retry panel while a queue is active, partial, cancelled, or errored.
   - `generation_queue_items` is the source of truth for per-document status, dependencies, attempts, credit state, and generated output references. The legacy `generation_queues.queue` JSON is synchronized for existing UI.
   - Queue rows and queue item rows are user-readable but server-mutable only. Browser clients cannot directly write billing/workflow authority fields such as `source`, `credit_status`, dependencies, attempts, or output refs.
   - Manual Generate All starts rebuild the queue server-side from allowed document types. The server derives source, credit status, credit cost, dependencies, attempts, model ids, run ids, and idempotency keys; client-supplied authority fields are ignored.
   - Bundled onboarding generation is trusted only when the parent queue has server-created onboarding metadata (`mode`, `source`, `version`, and `runId`) and item run metadata matches that queue.
   - Server-side execute route runs dependency-aware batches through the shared `generateProjectDocument()` service with max concurrency 2. Market Research starts first; Product Plan waits on Market Research; First Version Plan waits on Product Plan; Design Mockups wait on First Version Plan. Stale archived Launch Plan queue items are skipped without charging credits.
   - Queue start and execution verify current DB state through `active-document-policy.ts`. Already-existing documents are marked `skipped`, linked to their existing `output_table`/`output_id`, and not charged; stale or retried queue items cannot casually create a second active planning document.
   - Per-step: checks cancellation, optionally deducts credits for legacy/manual runs, runs the pipeline, requires a saved output id before marking the item done, updates the normalized item row, and records `output_table`/`output_id`. Mockup generation is project-bundled and has `creditCost: 0`.
   - On step failure: legacy/manual runs refund credits; onboarding runs skip refunds because bundled project creation does not charge per-document credits. Onboarding items retry up to their configured `maxAttempts`.
   - Stale `generating` rows older than the 150s executor lease are reset to `pending` with one retry attempt available from execute/status polling, so interrupted server runs do not strand a queue.
   - Queue status remains `running` while any item is pending or generating. Terminal `partial`/`error` states are only exposed once no active work remains.
   - Cancellation immediately cancels pending work. Already-generating work is acknowledged by the executor so refunds and saved outputs have a single owner.
   - Queue-level status can be `running`, `completed`, `partial`, `cancelled`, or `error`; `partial` means at least one document completed and at least one dependent/remaining document failed or became blocked.
   - Onboarding status is exposed by `/api/projects/[id]/onboarding-status`, which maps the backend queue to loading rows: Overview, Market research, Product Plan, First Version Plan, and Design Mockups. Overview and Market research are ready when a v2 `competitive-analysis` row exists.
   - Generation is durable — survives browser tab close, page refresh, and network interruptions

8. **Archived App Generation**:
   - The app-generation API and prompts are removed
   - Existing `deployments` rows are retained only as historical records

5. **Landing + Waitlist Flow**:
   - Landing page fetches the current registered-user count via Supabase service role access
   - `isWaitlistMode(userCount)` compares the count against `WAITLIST_LIMIT`
   - If the cap is reached, `/` renders waitlist CTAs and posts email captures to `/api/waitlist`
   - Waitlist inserts go into the public `waitlist` table with uniqueness and email-format constraints

6. **Retired HTML Preview Flow**:
   - The legacy Stitch HTML proxy and `srcDoc` iframe renderers are removed
   - Legacy Stitch-format mockup rows render as a regeneration notice until production rows are exported and deleted

7. **Security Hardening Flow**:
   - `next.config.ts` sets baseline security headers: CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, and Permissions-Policy.
   - `src/lib/rate-limit.ts` provides async per-user/IP rate limiting for public and expensive endpoints. Production can use Redis REST via `RATE_LIMIT_REDIS_REST_URL`/`RATE_LIMIT_REDIS_REST_TOKEN`, `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`, or Vercel KV-compatible REST env vars; local development falls back to cadence-pruned in-memory buckets.
   - `src/lib/credits.ts` centralizes server-only refunds through the Supabase service role. The hardened `refund_credits` RPC is service-role-only.
   - PDF export is retired and the `/api/generate-pdf` route plus `pdf-utils.ts` client helper have been removed.
   - Stripe webhooks are claimed in `stripe_webhook_events` before processing so duplicate Stripe retries do not double-grant credits. Finalization is compare-and-set against the claim's `received_at` lease token and `processing` status, so a stale worker cannot overwrite a reclaimed event and HTTP 200 is not returned until one durable row is marked processed.
   - Sentry is configured through `@sentry/nextjs`, `src/instrumentation.ts`, `src/instrumentation-client.ts`, `src/sentry.server.config.ts`, `src/sentry.edge.config.ts`, and `src/app/global-error.tsx`. Events use the `/monitoring` tunnel route, which is excluded from `src/proxy.ts`.
   - `src/lib/logger.ts` provides structured production JSON logging and forwards warnings/errors to Sentry. High-value Stripe webhook and Generate All refund failures use this logger.
   - Intake project creation uses a short-lived service-role `project_creation_locks` row plus a second allowance check immediately before insert. A single transactional RPC remains tracked for post-MVP hardening.

### Workspace Layout

The project workspace (`/projects/[projectRef]`) uses a dashboard document layout inspired by Pencil. The route parses the UUID from the slugged ref, redirects stale slugs to the canonical `id-name` URL, and silently redirects deprecated `?tab=prompt` links to `#executive-summary`.

```
┌──────────────┬───────────────────┬──────────────────────────────┐
│ ProjectHeader / DashboardShell    │
│ - Editable project name           │
│ - User/account affordances        │
│ - User profile menu               │
├────────────────────┬──────────────┤
│ AnchorNav          │ ScrollableContent
│ Overview           │ Overview module
│ Market Research    │ Market Research module
│ Product Plan       │ Product Plan markdown/streaming state
│ First Version Plan │ First Version Plan markdown/streaming state
│ Design Mockups     │ Mockup renderer / progress state
└──────────────┴───────────────────┴──────────────────────────────┘
  300px rail on desktop; horizontal rail on small screens
```

- **`DashboardShell`** — authenticated app shell rendered by `src/app/(dashboard)/layout.tsx`; receives the current user profile server-side and keeps credit balances out of the visible shell.
- **`ProjectHeader`** — per-project header with editable project name and account affordances.
- **`AnchorNav`** — scroll-aware document rail. It renders `Queued`, `Generating`, `Needs retry`, or ready check marks from `DocumentGenerationDisplayState`.
- **`ScrollableContent`** — renders Overview, Market Research, Product Plan, First Version Plan, and Design Mockups as stacked sections. Below-the-fold sections are driven by a section registry (label, intrinsic size, content/status renderers) with containment derived from each nav item's `sourceType` in `document-sections.ts`; it defers those sections by one animation frame, applies browser `content-visibility` containment to inactive heavy documents, and uses generation placeholders when content is not saved yet.
- **`ProjectWorkspace`** — slim orchestrator component for the workspace shell and render mapping. Hooks own the heavy behavior: `useWorkspaceDocuments` for lazy `/workspace` loading, `usePersistedGenerationState` for local generation flags, `useWorkspaceScrollSync` for hash/scroll state, `useGenerateAllHydration` for store selectors, and `useDocumentGeneration` for manual document/mockup generation.

### Shared UI Architecture

- **Document registry** — document labels, titles, icons, credit cost, nav visibility, Generate All order, and default models come from `src/lib/document-definitions.ts`; scroll-section anchors live in `src/lib/document-sections.ts`.
- **Idea intake contracts** — typed question, answer, summary, context, and project-name helpers live in `src/lib/intake/`, `src/lib/project-name-generation.ts`, and `src/lib/prompts/intake-wizard.ts`. `src/lib/intake/examples.ts` owns the configurable example ideas shown in Step 1.
- **Shared auth building blocks** — `AuthFormContent` is the single source of form logic (email/password/Google, validation, success state). It is used by both the `/auth` page and the `AuthModal` overlay. `AuthField` and `AuthPasswordField` are reusable field primitives. `AuthMode` type is exported from `auth-form-content.tsx`.
- **Auth Modal** — `src/components/auth/auth-modal.tsx` is a `"use client"` Radix UI Dialog. It reads `?modal=auth&mode=signin|signup` from the URL, opens over the landing page with a dark blurred overlay (`bg-black/65 backdrop-blur-[4px]`), and closes by clearing URL params. Sign In / Sign Up links on the landing page use `?modal=auth&mode=...` instead of navigating to `/auth`.
- **Project allowance guard** — `src/lib/project-allowance.ts` resolves project allowance from active `subscriptions` joined to `plans`, explicit plan fields/features when present, plan-name fallbacks, and the active subscription or calendar-month window. Free users are treated as a one-project lifetime window, while paid users use the active subscription period or UTC calendar month. The guard runs during final intake project creation before any project row is inserted, then runs again under a short-lived `project_creation_locks` row immediately before insert to reduce concurrent project creation races. The private Supabase-only `Internal Dev` plan name resolves to unmetered project allowance for internal developer accounts; it is not a Stripe/customer-facing plan. Public pricing and checkout use explicit `plans.is_public` and `plans.checkout_enabled` flags instead of display-name filtering.
- **Projects dashboard cards** — `/projects` loads owned projects and allowance status server-side, then renders `DashboardProjectCard` for last-edited labels, hover/focus prefetching of the workspace and competitive document payload, and paid-plan-only delete affordances. Free users see an upgrade prompt; paid users get a confirmation modal before calling `DELETE /api/projects/[id]`.
- **Deprecated chat cleanup** — the old Prompt Chat UI and general chat component are removed from the app tree; `/api/prompt-chat` remains as a minimal `410 Gone` endpoint so external callers receive the documented deprecation response.
- **Stacked tab navigation** — `src/components/layout/stacked-tab-nav.tsx` renders the left-side stacked tab pattern; it is currently used by the Preferences page (project document navigation uses the scroll-aware `AnchorNav` instead).
- **Shared authenticated page shell** — dashboard-level pages such as Projects, Billing, and Preferences use `src/components/layout/app-page-shell.tsx` for consistent page width, responsive padding, heading hierarchy, and action placement.
- **Shared server current-user lookup** — dashboard layouts/pages use `getCurrentUser()` from `src/lib/supabase/current-user.ts`, which wraps the Supabase server `auth.getUser()` call in React `cache()` so layout and page code share one auth lookup per request; it also returns the Supabase client it created so callers do not construct a second client.
- **Shared account utilities** — credit formatting, billing portal navigation, brand wordmark rendering, and auth sign-out are centralized in shared utilities/hooks/components and reused across dashboard header/sidebar, billing, settings, and auth views.
- **Shared pricing surface** — plan display copy (names, feature lists, included labels, highlight/CTA treatment, 15% yearly discount) lives once in `src/lib/pricing-plans.ts`; the landing `PricingSection` and the billing page "Available Plans" grid both render through `src/components/pricing/plan-card.tsx` (sharp corners on landing, rounded inside the dashboard) and `src/components/pricing/billing-interval-toggle.tsx`. The database (`plans` + `plan_prices`) stays authoritative for checkout: plan ids, Stripe price ids, and charged amounts. The billing page is a server component for initial plans/subscription/allowance data and uses client islands for the interval toggle, checkout button state, and Stripe portal button. It filters `plan_prices` to `is_active` rows, maps a page-level Monthly/Yearly toggle to interval rows, opens on the interval the user is billed on, and treats the Free card as the current plan when no subscription exists.

### Key Design Patterns

1. **App Router with Route Groups**: Organized routes with shared layouts using `(group-name)` syntax
2. **Server Components by Default**: Pages default to server components; interactive components explicitly marked `"use client"`
3. **Proxy-based Auth Session Refresh**: `src/proxy.ts` delegates to `src/lib/supabase/middleware.ts` to refresh Supabase auth cookies; dashboard route protection also happens in `src/app/(dashboard)/layout.tsx`
4. **Credit System with Database Functions**: PostgreSQL stored procedures for atomic credit operations
5. **In-House Analysis Pipelines**: Competitive analysis uses OpenRouter-managed Exa discovery first, with Perplexity → Tavily as a fallback, then OpenRouter synthesis. Provider-neutral competitor JSON parsing, bounded Exa citation parsing, provider/fallback metadata, and a rollback flag are shared across manual and Generate All paths. Product Plan, First Version Plan, and Tech Spec use direct OpenRouter calls with detailed prompts. Product Plan uses a shared request helper that matches Prompt Lab defaults and passes the full latest Market Research document through the secure prompt builder; First Version Plan uses a shared request helper that matches Prompt Lab defaults and passes the full latest Product Plan document through the secure prompt builder. OpenRouter long-form text synthesis uses a shared `240s` abort timeout for most text artifacts and a `480s` planning-document timeout for Product Plan and First Version Plan, leaving buffer under the 540s route envelope. Credits are refunded through the service-role `refund_credits` RPC on generation failure.
6. **Server-Side Generate All**: "Generate All" orchestration runs on the server (`/api/generate-all/execute`, `maxDuration=540`) instead of in the browser. Normalized `generation_queue_items` rows track per-document status, dependencies, retries, credit state, and output IDs; `generation_queues.queue` remains a synchronized compatibility snapshot. Queue mutations use trusted server routes/service role after user/project authorization. The Zustand store fires the execute request fire-and-forget and polls DB with a tab-visibility-aware 3s/6s/10s backoff cadence. This makes generation durable across tab close, refresh, and network interruptions without burning hidden-tab polling cycles.
7. **TypeScript-First**: Strict typing throughout, auto-generated database types
8. **Component Composition**: Radix UI primitives + CVA for variants
9. **Optimistic UI Updates**: Immediate feedback with graceful error handling
10. **Shared UI Registries + Hooks**: Repeated view metadata and repeated client behaviors (documents, billing portal, auth sign-out, chat interactions) are centralized into typed registries and reusable hooks/components before page-level assembly
11. **Path Aliases**: Clean imports using `@/*` aliases
12. **Pencil Design System**: Light-mode UI with dark sidebar; CSS custom properties for theming; Hanken Grotesk + Fira Mono typography
13. **Plan-Tier Model Routing**: AI model selection was removed from the UI. Text-generation models are resolved server-side from the user's plan tier via `src/lib/generation-model-policy.ts` (Free/Starter -> `google/gemini-3.5-flash`, Pro and higher -> `openai/gpt-5.6-sol`, both at `reasoning.effort: "high"` with max_tokens headroom), wired into `/api/analysis/[type]`, `/api/generate-all/execute` (text doc types only; mockups keep their image model), and the project composer through `getUserPlanName()` in `src/lib/project-allowance.ts`. `TIER_MODEL_ROUTING_DISABLED=1` reverts every path to the legacy fixed defaults (route files + `GENERATE_ALL_DEFAULT_MODELS` in `src/lib/document-definitions.ts`); `OPENROUTER_STANDARD_TIER_MODEL` / `OPENROUTER_PRO_TIER_MODEL` hot-swap tier models; `OPENROUTER_COMPOSER_MODEL` remains a composer-specific override.
14. **Generate-Missing-Only Documents**: The Generate button is hidden after a document is successfully generated, and server routes also enforce one active planning document per project/document type by default. Direct duplicate API requests return `200 skipped` with existing output metadata and no credit charge. Failed generations (no content saved) naturally re-expose the button for retry. Future versioning must be introduced as a separate explicit action.
15. **PDF Export Retired**: Document PDF export is no longer a supported product feature. The `/api/generate-pdf` route, client helper, Puppeteer dependency path, and PDF header action have been removed.
16. **AI-Generated Project Name**: Wizard-created projects generate a short name during final intake submission before the workspace opens. Legacy Prompt-tab project starts are deprecated and no longer generate project names. `isNameSet` state (in `ProjectWorkspace`) gates editing — initialized as `project.name !== "Untitled" || !!project.description` so existing and wizard-created projects are never locked.
17. **URL-Driven Auth Modal**: Landing page auth uses `?modal=auth&mode=signin|signup` URL params to drive a Radix Dialog modal, keeping users in context. The `/auth` page is unchanged and still used for email confirmation redirects. Both surfaces share `AuthFormContent`. No new dependencies — `@radix-ui/react-dialog` was already installed.
18. **Sentry Monitoring + Structured Logging**: App Router errors are captured by Sentry when `NEXT_PUBLIC_SENTRY_DSN` is configured. Server/client instrumentation is env-gated, source-map upload is controlled by Sentry env vars, and `logger.ts` keeps production logs structured.
19. **WCAG AA Contrast Compliance**: `--muted-foreground` and `--text-muted` are `#6B7280` (4.61:1 on white). Form labels use `text-text-secondary` (#666666, 5.74:1). The `✦ AI naming` badge uses `bg-violet-100 text-violet-800` (8.4:1). Never use `#999999` for text on white backgrounds — it fails at 2.85:1.

### Intake Data Model

- **`pending_intakes`** — short-lived auth handoff table with opaque `token`, `idea_text`, `source`, `expires_at`, `claimed_at`, `claimed_by`, and timestamps. Pending records expire after 24 hours and are claimed after successful project creation.
- **`project_intakes`** — one canonical structured intake per project, keyed by `project_id`, with `schema_version`, `original_idea`, `questions_json`, `answers_json`, `raw_payload_json`, `generated_summary`, `source`, and timestamps. RLS restricts rows to the owning user. Legacy projects with a readable `projects.description` and no existing intake are backfilled non-destructively with `source = 'prompt-chat'`; existing `prompt_chat_messages` rows are preserved.

### Mermaid Diagram Expansion Feature

The `MarkdownRenderer` component includes an interactive Mermaid diagram viewer with expansion capabilities. Rendered Mermaid SVG is sanitized through DOMPurify's SVG profile before `dangerouslySetInnerHTML`; if sanitization is unavailable or the output is not SVG, the component falls back to the source code block.

**Compact View**:
- Diagrams fit within the document width using `w-full overflow-hidden` (no horizontal scrolling)
- Expand button appears in the bottom-right corner on hover (`opacity-0 group-hover:opacity-100`)
- Uses lucide-react `Maximize2` icon

**Expanded Modal View**:
- Triggered by clicking the expand button
- Rendered through the shared `ArtifactLightbox` shell (`src/components/ui/artifact-lightbox.tsx`), the single overlay implementation also used by mockup previews and AI prompt file previews
- Near-full-width panel (`max-w-[calc(100vw-4rem)]`) with the standard lightbox header bar and close action
- Click outside or press `Escape` to close; body scroll lock is handled by the lightbox shell
- Zoom/pan controls and the pan hint render inside the lightbox body
- Larger font size (20px vs 14px) for better readability

**Styling Implementation**:
- Both compact and expanded views use the same `mermaid-diagram` CSS class
- Theme-appropriate colors defined in `globals.css` (lines 248-351)
- Light mode: dark text (`#111827`), white entity boxes
- Dark mode: light text (`#e5e5e5`), dark entity boxes
- Uses `@media (prefers-color-scheme: dark)` for automatic theme detection
- Important: CSS rules target `.mermaid-diagram` class specifically, so both views must use this class name

**Technical Details**:
- SVG rendered once by `beautiful-mermaid` and reused for both views
- Theme detection uses `window.matchMedia('(prefers-color-scheme: dark)')`
- React state (`isExpanded`) controls modal visibility
- Event listeners for keyboard (`Escape`) and click-outside handled with proper cleanup

---

## 4. Key Directories

```
src/
├── app/                          # Next.js App Router
│   ├── auth/page.tsx             # Shared auth entry page
│   ├── login/page.tsx            # Login page
│   ├── signup/page.tsx           # Signup page
│   ├── forgot-password/page.tsx  # Password reset request page
│   ├── reset-password/page.tsx   # Password reset completion page
│   ├── callback/route.ts         # OAuth callback handler
│   ├── (dashboard)/              # Dashboard route group (shared layout)
│   │   ├── layout.tsx            # Authenticated DashboardShell wrapper
│   │   ├── dashboard/page.tsx    # Main dashboard
│   │   ├── projects/
│   │   │   ├── page.tsx          # Projects list
│   │   │   ├── new/page.tsx      # Create project
│   │   │   └── [projectRef]/page.tsx # Project workspace (main app)
│   │   ├── billing/page.tsx      # Billing & subscription plans
│   │   └── preferences/page.tsx  # User preferences
│   ├── api/                      # API routes
│   │   ├── chat/route.ts         # POST chat messages (general chat)
│   │   ├── prompt-chat/route.ts  # Deprecated Prompt Chat endpoint; returns 410 Gone
│   │   ├── intake/pending/route.ts     # Pending intake token create/read
│   │   ├── intake/questions/route.ts   # AI-generated structured intake questions
│   │   ├── analysis/[type]/route.ts   # POST run analysis (in-house pipelines, fixed model per type)
│   │   ├── waitlist/route.ts          # GET/POST waitlist status + signup
│   │   ├── mockups/generate/route.ts  # OpenRouter image mockup generation
│   │   ├── mockups/image/route.ts     # Authenticated proxy for stored OpenRouter mockup images
│   │   ├── launch/plan/route.ts       # Archived Launch Plan route; returns 410
│   │   ├── generate-all/
│   │   │   ├── start/route.ts         # POST create/reset generation_queues row
│   │   │   ├── execute/route.ts       # POST server-side pipeline orchestrator (maxDuration=540)
│   │   │   ├── status/route.ts        # GET read queue row for polling
│   │   │   ├── update/route.ts        # PATCH update queue fields
│   │   │   └── cancel/route.ts        # POST mark queue as cancelled
│   │   ├── projects/[id]/onboarding-status/route.ts # GET onboarding loading rows + redirect readiness
│   │   ├── projects/[id]/status/route.ts # GET lightweight document count snapshot
│   │   ├── projects/[id]/workspace/route.ts # GET lazy workspace document payload
│   │   ├── projects/[id]/composer/route.ts # POST ephemeral "Ask this project" chat (OpenRouter + web search, streamed)
│   │   ├── projects/create-from-intake/route.ts # POST create project + onboarding queue
│   │   ├── projects/[id]/route.ts     # PATCH/GET project details; paid-plan DELETE
│   │   └── stripe/
│   │       ├── checkout/route.ts      # Create checkout session
│   │       ├── portal/route.ts        # Customer portal
│   │       └── webhook/route.ts       # Stripe webhooks
│   ├── globals.css               # Global styles + Tailwind
│   ├── page.tsx                  # Landing page with dynamic signup/waitlist CTA mode and hero artwork
│   └── layout.tsx                # Root layout (fonts, metadata)
│
├── components/                   # React components
│   ├── ui/                       # Reusable UI primitives
│   │   ├── button.tsx            # Button with variants
│   │   ├── card.tsx              # Card layouts
│   │   ├── input.tsx, textarea.tsx, label.tsx
│   │   ├── badge.tsx, avatar.tsx, spinner.tsx
│   │   ├── dropdown-menu.tsx      # Radix UI
│   │   ├── markdown-renderer.tsx # Markdown with Mermaid + syntax highlighting
│   │   └── ...
│   ├── layout/                   # Layout components
│   │   ├── header.tsx            # Legacy dashboard header (retained)
│   │   ├── anchor-nav.tsx        # Scroll workspace nav with durable generation status labels
│   │   ├── scrollable-content.tsx # Scroll workspace document renderer
│   ├── workspace/                # Workspace orchestration
│   │   ├── project-workspace.tsx      # Lazy-loading scroll workspace orchestrator
│   │   ├── use-workspace-documents.ts # Lazy document loading hook
│   │   ├── use-workspace-scroll-sync.ts # Workspace hash/scroll sync hook
│   │   ├── use-persisted-generation-state.ts # Local generation persistence hook
│   │   ├── use-document-generation.ts # Manual document/mockup generation hook
│   │   └── generate-all-hydrator.tsx  # Keeps store callbacks fresh; triggers hydrate() once per project
│   ├── auth/                     # Auth components
│   │   ├── auth-form-content.tsx # Shared form logic (email, password, Google OAuth, mode-switching)
│   │   ├── auth-modal.tsx        # Radix Dialog modal for landing page Sign In / Sign Up
│   │   ├── auth-field.tsx        # Reusable email/text input field
│   │   └── auth-password-field.tsx  # Password field with show/hide toggle
│   └── analysis/                 # Analysis feature
│       ├── competitive-analysis-document.tsx
│       └── planning-document-blocks.tsx
│
├── lib/                          # Utilities & services
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server-side client
│   │   └── middleware.ts         # Auth middleware logic
│   ├── stripe.ts                 # Stripe singleton
│   ├── analysis-pipelines.ts     # In-house analysis orchestration (market research, Product Plan, First Version Plan, tech spec)
│   ├── intake/                   # Idea intake types, context, questions, summaries
│   ├── mockups/                  # Mockup design plans, drafts, recovery, OpenRouter image pipeline/format
│   ├── generation/               # Generate All / generation queue services, billing, onboarding rows
│   ├── stripe/                   # Stripe singleton (index.ts) + checkout/webhook/subscription helpers
│   ├── prompt-lab/               # Dev Prompt Lab composition (index.ts), shared labels, default state
│   ├── waitlist.ts               # Waitlist business rules and validation
│   ├── openrouter.ts             # Shared OpenRouter client singleton (all server-side OpenRouter calls)
│   ├── perplexity.ts             # Perplexity API client (competitor search, with retry)
│   ├── tavily.ts                 # Tavily API client (URL content extraction, with retry)
│   ├── with-retry.ts             # Shared retry utility for external API calls (3 retries, exponential backoff on 429/5xx)
│   ├── logger.ts                 # Structured logger with Sentry warning/error forwarding
│   └── utils.ts                  # cn() class merging and shared formatting utilities
│
├── types/                        # TypeScript types
│   └── database.ts               # Supabase DB types (auto-generated)
│
├── stores/                       # Zustand client state
│   └── generate-all-store.ts     # Generate All pipeline state + polling loop
│
├── hooks/                        # React hooks
│
└── proxy.ts                      # Next proxy entry point for Supabase session refresh
```

### Directory Purpose Map

| Directory | Purpose | When to Add/Modify |
|-----------|---------|-------------------|
| `app/` auth routes | Authentication pages and entry points | Adding new auth methods or flows |
| `app/(dashboard)/` | Protected app pages | Adding new dashboard features |
| `app/api/` | Backend API endpoints | Creating new API functionality |
| `components/ui/` | Reusable UI components | Adding new UI primitives |
| `components/layout/` | Layout & navigation components | Modifying dashboard shell, app shell, anchor nav, or scrollable content |
| `components/workspace/` | Workspace orchestration hooks and shell | Changing project workspace loading, scroll sync, or generation behavior |
| `components/analysis/` | Analysis feature components | Adding analysis features |
| `lib/` | Business logic & external APIs | Integrating new services like waitlist logic or AI pipelines |
| `lib/prompts/` | **All AI system prompts** — one file per document type | Editing any AI prompt or adding new document generation features |
| `lib/supabase/` | Database & auth logic | Database operations |
| `types/` | TypeScript definitions | Adding new type definitions |

---

## 4a. Prompt Architecture (`src/lib/prompts/`)

All AI system prompts live in `src/lib/prompts/`. Import everything through the barrel: `import { ... } from "@/lib/prompts"`.

### File Map

| File | Contents | Used By |
|------|----------|---------|
| `sanitize.ts` | `sanitizeInput()`, `buildSecurePrompt()` | All prompt builders |
| `competitive-analysis.ts` | `COMPETITIVE_ANALYSIS_SYSTEM_PROMPT`, `buildCompetitiveAnalysisUserPrompt()` | `analysis-pipelines.ts` |
| `prd.ts` | `PRD_SYSTEM_PROMPT` | `analysis-pipelines.ts` |
| `mvp-plan.ts` | `MVP_PLAN_SYSTEM_PROMPT` | `analysis-pipelines.ts` |
| `launch-plan.ts` | `LAUNCH_PLAN_SYSTEM_PROMPT`, `buildLaunchPlanUserPrompt()` | `analysis-pipelines.ts`, Prompt Lab |
| `tech-spec.ts` | `TECH_SPEC_SYSTEM_PROMPT` | `analysis-pipelines.ts` |
| ~~`document-edit.ts`~~ | *(deleted — Edit with AI feature removed)* | — |
| `mockups.ts` | `buildMockupPrompt()` | `api/mockups/generate/` |
| `competitor-search.ts` | `COMPETITOR_SEARCH_SYSTEM_PROMPT`, `buildCompetitorSearchUserPrompt()` | `perplexity.ts` |
| `index.ts` | Barrel re-export of all above | Everything |

### Market Research V2 Contract

- Market Research v2 lives in markdown only; `analyses.content` remains the source of truth.
- New competitive-analysis rows include metadata:
  - `document_version: "competitive-analysis-v2"`
  - `prompt_version: "competitive-analysis-v2-2026-07-11-seven-candidate-direct-selection"`
- Existing competitive-analysis rows without `document_version` are treated as legacy.
- The Market Research tab defaults to a modules dashboard only for valid v2 docs. Legacy docs and malformed edited v2 docs fall back to raw markdown view.
- Legacy migration policy is manual: preserve old versions exactly as-is and regenerate project-by-project to create a new v2 version.

### Security Rules

- **Never** interpolate user values directly into prompt strings (`${variable}`).
- **Always** use `buildSecurePrompt(template, { key: userValue })` — it strips injection patterns and wraps values in `<user_input name="key">` XML delimiters.
- `sanitizeInput()` is called automatically by `buildSecurePrompt`, but can also be called directly for non-template cases (e.g., `mockups.ts`).

---

## 5. Coding Conventions

### File Naming

- **Pages**: `page.tsx` (Next.js convention)
- **Dynamic Routes**: `[id]/page.tsx`, `[type]/route.ts`
- **API Routes**: `route.ts` in endpoint folder
- **Components**: `kebab-case.tsx` (e.g., `dashboard-project-card.tsx`)
- **Utilities**: `kebab-case.ts` (e.g., `openrouter.ts`)
- **Types**: `database.ts`, lowercase

### Code Naming

```typescript
// Components: PascalCase
export function ChatInterface() {}
export default function LoginPage() {}

// Variables & functions: camelCase
const projectId = "..."
const [loading, setLoading] = useState(false)
async function handleSubmit() {}

// Constants: UPPER_SNAKE_CASE
const BASE_ACTION_TOKENS = { ... }
const ANALYSIS_PROMPTS = { ... }

// Props interfaces: {ComponentName}Props
interface ChatInterfaceProps { ... }
interface AnalysisPanelProps { ... }

// Type aliases: PascalCase or lowercase
type AnalysisType = 'competitive-analysis' | 'prd' | 'mvp-plan' | 'tech-spec'
type DocumentType = 'prompt' | 'competitive' | 'prd' | 'mvp' | 'mockups' | 'techspec' | 'deploy'
```

### Component Structure

#### UI Components (with CVA variants)
```typescript
// Pattern: components/ui/button.tsx
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "base-classes",
  {
    variants: {
      variant: { default: "...", outline: "..." },
      size: { default: "...", sm: "...", lg: "..." },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  }
)
```

#### Client Components (Interactive)
```typescript
"use client"

import { useState } from "react"

interface Props {
  projectId: string
}

export function ChatInterface({ projectId }: Props) {
  const [state, setState] = useState()

  const handleAction = async () => {
    // Logic here
  }

  return <div>{/* JSX */}</div>
}
```

#### Server Components (Data Fetching)
```typescript
// No "use client" directive

import { createClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: user } = await supabase.auth.getUser()

  // Fetch data at server level
  const { data } = await supabase.from("table").select()

  return <ClientComponent data={data} />
}
```

#### API Routes
```typescript
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request
    const body = await request.json()

    // Validation
    if (!body.field) {
      return NextResponse.json({ error: "Missing field" }, { status: 400 })
    }

    // Business logic
    const result = await doSomething()

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
```

### Styling Conventions

#### Tailwind Utility Classes
```typescript
// Use cn() utility for class merging
import { cn } from "@/lib/utils"

<div className={cn(
  "base-classes",
  condition && "conditional-classes",
  className  // Allow className override
)} />
```

#### Color Palette (Pencil Design System)

The app uses CSS custom properties (defined in `globals.css`) rather than hard-coded Tailwind colours. Use the semantic tokens below:

```typescript
// Primary action colour
"bg-primary"                    // #DC2626 (red)
"text-primary-foreground"       // #FFFFFF

// Backgrounds & surfaces
"bg-background"                 // #FAFAFA (main page)
"bg-card"                       // #FFFFFF (content cards)
"bg-secondary"                  // #F5F5F5 (inputs, sub-surfaces)

// Text hierarchy (all pass WCAG AA on white)
"text-foreground"               // #000000 (primary body text)
"text-text-secondary"           // #666666 (5.74:1 on white) — labels, captions
"text-muted-foreground"         // #6B7280 (4.61:1 on white) — subtitles, placeholders, hints
"text-text-muted"               // #6B7280 — same token via CSS var

// Sidebar (dark theme — always use sidebar-* tokens)
"bg-sidebar-bg"                 // #000000
"text-sidebar-foreground"       // #FAFAFA
"text-sidebar-muted"            // #999999 (sidebar is dark, so this passes on #000)
"border-sidebar-border"         // #222222

// Status badges
"text-success / bg-success-bg"  // Green (#22C55E / #ECFDF5) — Done
"text-info / bg-info-bg"        // Blue  (#3B82F6 / #EFF6FF) — In Progress

// Markdown renderer (dark-themed prose, used inside content cards)
// Still uses hard-coded colours for code/Mermaid blocks:
"#00d4ff"  // Cyan — code highlights, links, Mermaid primary
"#7c3aed"  // Purple — Mermaid secondary
```

### Error Handling

#### API Error Responses
```typescript
// Status codes
401 - Unauthorized (not logged in)
402 - Payment Required (plan limit reached or legacy internal credit failure)
404 - Not Found
400 - Bad Request (validation error)
500 - Internal Server Error

// Response format
{ error: "User-friendly error message" }
```

#### Frontend Error Handling
```typescript
try {
  const response = await fetch("/api/endpoint", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || "Request failed")
  }

  // Handle success
} catch (err) {
  setError(err instanceof Error ? err.message : "An error occurred")
}
```

### TypeScript Patterns

```typescript
// Explicit prop types
interface ComponentProps {
  projectId: string
  onComplete?: () => void
}

// Type unions for specific values
type AnalysisType = 'competitive-analysis' | 'prd' | 'mvp-plan' | 'tech-spec'
type DocumentType = 'prompt' | 'competitive' | 'prd' | 'mvp' | 'mockups' | 'techspec' | 'deploy'

// Const assertions for immutable objects
const COSTS = {
  chat: 1,
  analysis: 5,
} as const

// Generic utility types
type Nullable<T> = T | null
```

### Path Aliases

```typescript
// tsconfig.json paths
"@/*": ["./src/*"]

// Usage
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import type { Database } from "@/types/database"
```

---

## 6. Setup & Build

### Prerequisites

- **Node.js**: Latest LTS version
- **npm**: Latest version
- **Supabase Account**: For database and auth
- **Stripe Account**: For payments (optional for dev)
- **API Keys**: Anthropic, OpenRouter

### Environment Variables

Create `.env.local` in the root directory:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# AI Models
OPENROUTER_API_KEY=sk-or-xxx...
OPENROUTER_CHAT_MODEL=anthropic/claude-sonnet-4-6
OPENROUTER_ANALYSIS_MODEL=anthropic/claude-sonnet-4-6
# Optional: dedicated low-cost model for Exa-backed competitor discovery.
OPENROUTER_COMPETITOR_RESEARCH_MODEL=google/gemini-3.5-flash
# Emergency rollback: set to 1 to restore Perplexity/Tavily as the primary path.
OPENROUTER_EXA_MARKET_RESEARCH_DISABLED=0
ANTHROPIC_API_KEY=sk-ant-xxx...

# Stripe
STRIPE_SECRET_KEY=sk_secret_xxx...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx...

# Perplexity (fallback competitor research in competitive analysis)
PERPLEXITY_API_KEY=pplx-xxx...

# Tavily (fallback URL content extraction in competitive analysis)
TAVILY_API_KEY=tvly-xxx...

# OpenRouter image mockups
OPENROUTER_MOCKUP_PLANNER_MODEL=anthropic/claude-sonnet-4-6 # optional; falls back to OPENROUTER_ANALYSIS_MODEL
OPENROUTER_MOCKUP_IMAGE_MODEL=openai/gpt-5.4-image-2
# Optional provider-specific image_config overrides; leave unset unless the selected provider supports them.
# OPENROUTER_MOCKUP_IMAGE_ASPECT_RATIO=21:9
# OPENROUTER_MOCKUP_IMAGE_SIZE=1K
OPENROUTER_MOCKUP_IMAGE_MAX_TOKENS=16384
OPENROUTER_MOCKUP_PLANNER_MAX_TOKENS=16384
SUPABASE_MOCKUP_STORAGE_BUCKET=mockups

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# UI/browser testing login credentials (local only; never commit real values)
UI_TEST_EMAIL=test-user@example.com
UI_TEST_PASSWORD=replace-with-local-secret
```

### Installation

```bash
# Clone repository
git clone <repository-url>
cd idea2app-root-v2

# Install dependencies
npm install
```

### Database Setup (Supabase)

1. Create a new Supabase project
2. Run SQL migrations to create tables:
   - `profiles` - User profile and plan metadata; credit balances are not shown in the product UI
   - `projects` - Business idea projects
   - `messages` - Chat message history
   - `analyses` - Competitive and gap analyses
   - `prds` - Product requirement documents
   - `mvp_plans` - MVP development plans
   - `mockups` - OpenRouter image mockup documents
   - `tech_specs` - Technical specifications
   - `deployments` - Historical generated app deployment rows retained for legacy data only
   - `waitlist` - Public early-access waitlist email captures
   - `credits` - Credit balance tracking
   - `credits_history` - Credit transaction log
   - `plans` - Subscription plans
   - `subscriptions` - User subscriptions
   - `generation_queues` - Generate All pipeline state (status, queue JSON, model_selections, current_index, started_at, completed_at, error_info)
   - `generation_queue_items` - Normalized per-document queue items with status, dependencies, retries, credit state, and output references

3. Enable Row Level Security (RLS) on all tables
4. Create PostgreSQL stored functions:
   - `consume_credits(user_id, amount, action, description)` — atomically deduct credits
   - `add_credits(user_id, amount, action, description)` — add credits (subscription refill, purchases)
   - `get_credit_balance(user_id)` — read current balance
   - `refund_credits(user_id, amount, action, description, metadata)` — service-role-only refund helper hardened in `supabase/migrations/20260425004000_security_hardening_followups.sql`

5. Configure authentication:
   - Enable email/password auth
   - Add redirect URLs (e.g., `http://localhost:3000/callback`)
   - Configure OAuth providers (optional)

### Development

```bash
# Start development server
npm run dev

# Server runs at http://localhost:3000
# Hot module reload enabled
```

### Git and PR Workflow

- When asked to create a PR, keep using the current branch. Do not create a new branch unless explicitly requested.
- Before creating or updating a PR, compare the current branch with its remote tracking branch.
- If the current branch is behind its remote tracking branch, stop and ask what to do before rebasing, merging, force-pushing, or creating the PR.
- If the current branch has no remote tracking branch, push the current branch and create the PR from that branch.

### Build & Production

```bash
# Build for production
npm run build

# Output in .next/ directory

# Start production server
npm start

# Runs at http://localhost:3000
```

### Linting

```bash
# Run ESLint
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

### Testing

```bash
# Run the current test suite
npm test
```

- Uses Node's built-in test runner via `tsx`
- Test discovery is recursive across `src/**/*.test.ts` and `src/**/*.test.tsx`
- CI (`.github/workflows/ci.yml`) enforces `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` on every push and PR to `main`. A red pipeline blocks merging; keep `main` green.
- `Design System/` design tooling lives in its own repo, not the app tree. It is git-ignored here and excluded from lint (`eslint.config.mjs`). Do not re-add it to the app repo.
- For browser/UI verification of authenticated routes, use the local test login from `UI_TEST_EMAIL` and `UI_TEST_PASSWORD` when those environment variables are present. Treat the values as secrets: keep them in `.env.local`, shell environment, or the local credential store; never commit real emails/passwords, screenshots containing secrets, cookies, or session storage dumps.
- For UI verification in this repo, use the Codex in-app browser/browser workflow by default when available, especially for authenticated flows, real profile state, and user-facing visual inspection. Avoid Playwright, Arc, Chrome, Puppeteer, and headless browsers for routine UI checks unless the Codex browser is unavailable or the user explicitly requests a different browser.

### Deployment

**Recommended: Vercel**
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy automatically on push

**Alternative: Docker**
```bash
# Build Docker image
docker build -t idea2app .

# Run container
docker run -p 3000:3000 idea2app
```

### Scripts Reference

```json
{
  "dev": "next dev",                                       // Development server
  "build": "next build && node ./scripts/guard-webpack-chunky.mjs", // Production build + chunky bundle guard
  "start": "next start",                                  // Production server
  "lint": "eslint",                                       // Run linting
  "test": "node --import tsx --test src/**/*.test.ts src/**/*.test.tsx",
  "guard:chunky": "node ./scripts/guard-webpack-chunky.mjs",
  "guard:chunky:dev": "CHECK_DEV_VENDOR=1 node ./scripts/guard-webpack-chunky.mjs"
}
```

---

## 7. Database Schema Overview

### Core Tables

- **profiles**: User profiles, linked to Supabase Auth
  - Fields: `id`, `email`, `full_name`, `credits`, `plan_id`, `created_at`
  - RLS: Users can only read/update their own profile

- **projects**: Business idea projects
  - Fields: `id`, `user_id`, `name`, `description`, `status`, `created_at`
  - RLS: Users can only access their own projects

- **messages**: Chat message history (general chat)
  - Fields: `id`, `project_id`, `role` (user/assistant), `content`, `created_at`
  - RLS: Users can only access messages from their projects

- **prompt_chat_messages**: Deprecated Prompt Chat history rows retained for migration/cleanup
  - Fields: `id`, `project_id`, `role` (user/assistant/system), `content`, `metadata` (model, stage), `created_at`, `updated_at`
  - RLS: Users can only access messages from their projects
  - Purpose: Stores conversation for idea refinement with follow-up questions

- **analyses**: Competitive and gap analyses
  - Fields: `id`, `project_id`, `type`, `content`, `created_at`
  - RLS: Users can only access analyses from their projects

- **prds**: Product requirement documents
  - Fields: `id`, `project_id`, `content`, `created_at`
  - RLS: Users can only access PRDs from their projects

- **mvp_plans**: MVP (Minimum Viable Product) development plans
  - Fields: `id`, `project_id`, `content`, `version`, `created_at`, `updated_at`
  - RLS: Users can only access First Version Plan rows from their projects

- **mockups**: OpenRouter image mockup documents
  - Fields: `id`, `project_id`, `content`, `model_used`, `metadata`, `created_at`, `updated_at`
  - RLS: Users can only access mockups from their projects

- **product_events**: Append-only, content-free behavioral and trusted lifecycle analytics
  - Fields: idempotency key, event/schema/source, user/project/session IDs, plan/environment/release snapshots, timestamps, and allowlisted JSON properties
  - RLS/grants: deny-all for browser roles; service role can insert/select only; no update/delete grant
  - Analysis: production-only views in the private `analytics` schema; raw retention is 180 days

- **prompt_lab_experiments**: Local-dev Prompt Lab saved system/model drafts
  - Fields: `id`, `user_id`, `project_id`, `artifact_type`, `title`, `system_prompt`, `user_prompt`, `model_id`, `metadata`, timestamps
  - New Prompt Lab draft saves use `project_id = NULL` so the reusable system prompt and selected model are available across all owned projects for the same artifact. `metadata.savedFromProjectId` records the project used when the draft was saved; older project-scoped rows are still listed for the user/artifact.
  - RLS: Users can only access their own Prompt Lab drafts; project-scoped writes must target their own projects

- **prompt_lab_runs**: Local-dev Prompt Lab isolated generation history
  - Fields: `id`, `experiment_id`, `user_id`, `project_id`, `artifact_type`, `title`, `model_id`, prompt snapshots, `input_snapshot`, `output_content`, `output_metadata`, `status`, `error_message`, `notes`, timestamps
  - RLS: Users can only access their own Prompt Lab runs; rows are separate from canonical `analyses`, `prds`, `mvp_plans`, `mockups`, and queue tables

- **tech_specs**: Technical specifications
  - Fields: `id`, `project_id`, `content`, `created_at`
  - RLS: Users can only access tech specs from their projects

- **deployments**: Historical generated-application records retained after app generation removal
  - Fields: `id`, `project_id`, `app_type`, `code`, `url`, `created_at`
  - RLS: Users can only access deployments from their projects

- **credits_history**: Credit transaction log
  - Fields: `id`, `user_id`, `amount`, `balance_after`, `action`, `description`, `created_at`
  - RLS: Users can only view their own credit history

- **generation_queues**: Generate All pipeline state (one row per project per user)
  - Fields: `id`, `project_id`, `user_id`, `status` (queued/running/partial/completed/cancelled/error), `queue` (legacy JSON snapshot of QueueItem), `model_selections` (JSON), `current_index`, `started_at`, `completed_at`, `error_info` (JSON)
  - RLS: Users can only access their own queue rows
  - Upserted on conflict `(project_id, user_id)` — only one queue per project; active queued/running queues cannot be replaced by another start request

- **generation_queue_items**: Normalized Generate All/onboarding queue items
  - Fields: `id`, `queue_id`, `project_id`, `user_id`, `run_id`, `doc_type`, `label`, `status` (pending/generating/done/skipped/cancelled/error/blocked), `credit_cost`, `credit_status`, `depends_on`, `attempt`, `max_attempts`, `stage_message`, `error`, `output_table`, `output_id`, `model_id`, `source`, `idempotency_key`, timestamps
  - RLS: Users can only access their own queue item rows
  - Source of truth for execution, polling, cancellation, retries, partial success, and generated document references

- **subscriptions**: User subscriptions
  - Fields: `id`, `user_id`, `plan_id`, `stripe_subscription_id`, `status`, `current_period_end`
  - Constraints: one local subscription snapshot per user via `UNIQUE(user_id)`; Stripe webhook retries upsert on this key
  - RLS: Users can only view their own subscription

- **waitlist**: Public early-access waitlist submissions
  - Fields: `id`, `email`, `created_at`
  - Constraints: unique email, server-validated format
  - RLS: Public insert allowed, reads remain admin/service-role only

---

## 8. API Endpoints Overview

### Authentication
- **Auth flow**: Handled by Supabase (email/password, OAuth)
- **Callback**: `GET /callback` - OAuth callback handler

### Landing + Waitlist
- **GET /api/waitlist**: Get current waitlist mode state
  - Returns: `{ userCount, isWaitlistMode, limit }`
  - Used by landing page CTA logic and waitlist UI

- **POST /api/waitlist**: Add an email to the public waitlist
  - Body: `{ email }`
  - Returns: `{ success: true }` or `{ error }`
  - Duplicate emails return `409`
  - No auth required

### Chat
- **GET/POST /api/chat**: Disabled general chat endpoint
  - Returns: `410 Gone`
  - Cost: none

- **GET /api/prompt-chat**: Deprecated; returns `410 Gone`
  - Query: `?projectId=xxx`
  - Historical Prompt Chat data is preserved in the database but this route no longer serves it

- **POST /api/prompt-chat**: Deprecated; returns `410 Gone`
  - Body: `{ projectId, message, model, isInitial }`
  - Historical request shape retained only for compatibility notes; no generation or credit charge occurs

### Projects
- **GET /api/projects/[id]**: Get project details
  - Returns: project row (owner-scoped via RLS)

- **PATCH /api/projects/[id]**: Update project fields
  - Body: `{ description?, name?, status? }` (any subset)
  - Returns: updated project row
  - Used by the workspace header/description flows

- **GET /api/projects/[id]/workspace**: Lazy-load owned workspace payloads
  - Query: `docs=competitive,prd,mvp,mockups` and optional `tab`
  - Returns project summary, structured-intake presence, and only the requested document collections
  - Used by `ProjectWorkspace` so large documents and non-visible tabs do not have to load up front

- **GET /api/projects/[id]/status**: Get lightweight generated-document counts
  - Returns count snapshots used by local/manual generation polling to detect new saved documents

### Analysis
- **POST /api/analysis/[type]**: Generate analysis
  - Types: `competitive-analysis`, `prd`, `mvp-plan`, `tech-spec`
  - Body: `{ projectId, idea, name, competitiveAnalysis?, prd?, model? }`
    - `competitiveAnalysis` passed to PRD pipeline as context
    - `prd` passed to First Version Plan and tech spec pipelines as context
  - Returns: `{ content, source, model, type }`
  - Cost: calculated by `getTokenCost()` in `src/lib/token-economics.ts`; current fixed defaults are Competitive 20, PRD 15, MVP 15, and Tech Spec 15 credits
  - Route `maxDuration`: 540s
  - Uses in-house pipelines (`src/lib/analysis-pipelines.ts`):
    - Competitive: OpenRouter-managed Exa → OpenRouter synthesis, with Perplexity → Tavily fallback (graceful degradation)
    - PRD/MVP/Tech Spec: Direct OpenRouter calls with detailed system prompts
  - Competitive-analysis inserts metadata with `document_version` and `prompt_version` for renderer compatibility

- **POST /api/mockups/generate**: Generate OpenRouter storyboard mockups
  - Body: `{ projectId, mvpPlan, projectName, stream? }`
  - Returns: `{ content, model, source }` — content is JSON with `{ type: "openrouter-image-v2", options: [{label, title, imageUrl, storagePath, description, screens, width?, height?}] }`; duplicate requests return `200 OK` with `{ skipped: true, existingDocument }`
  - Cost: project-bundled, no credits consumed
  - Uses a hidden design plan plus OpenRouter image generation for 3 static storyboard alternatives
  - Route `maxDuration`: 800s
  - Generation logic lives in `src/lib/mockups/openrouter-image-pipeline.ts` and is shared with server-side document generation

- **GET /api/mockups/image**: Proxy stored OpenRouter mockup images through the server
  - Query: `projectId`, `path`, optional `mockupId`
  - Requires auth, verifies the storage path belongs to a saved mockup for a project owned by the current user, then streams the private Supabase Storage image

### Dev Prompt Lab
- **GET /dev/prompt-lab**: Local-development-only authenticated prompt iteration workbench. It is unavailable when `NODE_ENV=production` or `VERCEL_ENV=production`.

- **GET /api/dev/prompt-lab/context**: Load owned project context, latest upstream artifacts, and default editable system/user prompts for one artifact.
  - Query: `projectId`, `artifact`, optional `mockupOption`
  - Does not create artifacts, consume credits, or start queues

- **POST /api/dev/prompt-lab/run**: Run one artifact with editable prompts and model override, then save the isolated result to `prompt_lab_runs`.
  - Body: `{ projectId, artifact, title?, notes?, systemPrompt, userPrompt, model, mockupOption? }`
  - Text artifact runs use the shared OpenRouter long-text timeout (`240s`), while Product Plan and First Version Plan use the longer planning-document timeout (`480s`), and return clearer timeout errors instead of the raw "operation was aborted" message.
  - Supports single-option mockup image generation for Option A/B/C
  - Never writes to canonical artifact tables or generation queues

- **GET/POST /api/dev/prompt-lab/drafts**: List and save Prompt Lab system/model drafts in `prompt_lab_experiments`.
  - `GET` validates the selected owned project, then returns the user's recent drafts for the selected artifact across projects.
  - `POST` saves a reusable artifact draft with `project_id = NULL`, keeps a snapshot of the current user prompt for history, and records the selected source project in `metadata`.

- **GET /api/dev/prompt-lab/runs**: List recent isolated Prompt Lab runs for an owned project/artifact pair.

- **GET /api/dev/prompt-lab/mockup-image**: Local-dev-only proxy for private Supabase Storage images created by Prompt Lab mockup runs. It verifies the storage path appears in an owned `prompt_lab_runs.output_content` row.

### Generate All

- **POST /api/generate-all/start**: Initialize a generation queue in DB
  - Body: `{ projectId, queue }`
  - Validates the queue, rejects a second start while an existing queue is `queued`/`running`, marks already-existing active documents as `skipped`, upserts a `generation_queues` row with `status: "running"`, and replaces the normalized `generation_queue_items` rows

- **POST /api/generate-all/execute**: Server-side pipeline orchestrator
  - Body: `{ projectId }`
  - Reads `generation_queue_items`, claims pending runnable items atomically, and executes dependency-aware batches with max concurrency 2. Concurrency only applies to independent runnable documents; Product Plan, First Version Plan, and Design Mockups remain dependency-gated in sequence.
  - Dependencies: competitive → prd → mvp → mockups
  - Per-step: checks for an existing active document, deducts credits for legacy/manual runs only when generation is needed, skips credit charging for bundled onboarding runs, runs pipeline, saves to the correct table, and records `output_table`/`output_id`
  - Checks for cancellation before each batch
  - Refunds credits on legacy/manual step failure and marks dependent pending items `blocked`
  - Route `maxDuration`: 540s — durable even if browser tab closes

- **GET /api/generate-all/status**: Poll for queue progress
  - Query: `?projectId=xxx`
  - Returns `{ queue: generation_queues_row }` with the queue/current index/status derived from normalized item rows so polling sees in-progress item changes
  - Called by the Zustand store while generation is running with a 3s/6s/10s backoff cadence; polling pauses while the document is hidden and resumes immediately on visibility return. Idle manual Generate All controls are no longer rendered, but the status/retry panel appears for active or terminal queue states

- **GET /api/projects/[id]/onboarding-status**: Poll new-project loading progress
  - Query: `?runId=xxx`
  - Returns onboarding loading rows, errors, `readyToRedirect`, and the canonical `#executive-summary` redirect URL
  - Redirect readiness is based on an actual saved v2 `competitive-analysis` row, not only queue item state

- **PATCH /api/generate-all/update**: Legacy compatibility sync endpoint
  - Body: `{ projectId, queue?, status?, completed_at? }`
  - Does not trust client-provided `done`/`skipped` blindly; it verifies the generated document exists before syncing normalized item rows

- **POST /api/generate-all/cancel**: Cancel a running queue
  - Body: `{ projectId }`
  - Marks pending/generating normalized items as cancelled in DB and syncs the compatibility queue JSON

- **PATCH /api/mockups/[id]**: Update mockup content
  - Body: `{ content }`
  - Returns: `{ data: updated_mockup }`

- The former per-document PATCH routes (`/api/analyses/[id]`, `/api/prds/[id]`, `/api/mvp-plans/[id]`, `/api/tech-specs/[id]`) were removed on 2026-07-05; no client code called them after the Edit-with-AI removal.

### App Generation
- App generation is archived and `/api/generate-app` has been removed.

### Stripe
- **POST /api/stripe/checkout**: Create checkout session
  - Body: `{ priceId, planId }`
  - Returns: `{ url }` (Stripe-hosted checkout page URL)
  - Blocks users with an existing active/trialing/past-due local subscription; plan changes should go through the Stripe Customer Portal
  - Creates or reuses Stripe customer (linked via `profiles.stripe_customer_id`), and recreates the customer when a stored test/deleted customer ID is not usable in the active Stripe mode
  - Validates the requested plan server-side against an active, checkout-enabled `plan_prices` row whose `stripe_price_id` exactly matches `priceId`, joined to an active/public/checkout-enabled `plans` row
  - Sets `mode: "subscription"` for recurring billing
  - Passes `supabase_user_id`, `plan_id`, and `plan_price_id` in session metadata

- **POST /api/stripe/portal**: Access customer portal
  - Returns: `{ url }` (Stripe billing portal URL)
  - Requires existing `stripe_customer_id` on the user's profile

- **POST /api/stripe/webhook**: Handle Stripe events
  - Verifies webhook signature using `STRIPE_WEBHOOK_SECRET`
  - Uses Supabase service role client (no user context) for database operations
  - Handled events:
    - `checkout.session.completed` — retrieves the Stripe subscription, maps the actual item Price ID to `plan_prices`, and syncs real period dates
    - `customer.subscription.updated` — syncs status, scheduled period-end cancellation (including Portal's equivalent `cancel_at` shape), period dates, `plan_id`, `plan_price_id`, and `stripe_price_id` from the actual subscription item Price ID
    - `customer.subscription.deleted` — marks subscription as canceled
    - `invoice.paid` (billing_reason = `subscription_create` or `subscription_cycle`) — interval-scaled initial/renewal credits via `grant_subscription_credits_once()`; subscription identity supports legacy top-level and Clover parent shapes, while grants require one matching non-proration subscription invoice line and service period before local subscription mutation
    - `charge.refunded` — on a full refund, resolves the paid invoice through Stripe Invoice Payments and reverses the matching legacy period credit grant once via `reverse_subscription_credits_once()`; partial refunds do not revoke the whole grant

---

## 9. Credit System

### Credit Costs

| Action | Cost |
|--------|------|
| Chat message (general) | Not available |
| Prompt chat message (deprecated) | Not available |
| Inline document edit | Not available |
| Competitive Analysis | Included in project generation; hidden legacy ledger may still record non-bundled paths |
| Product Plan Generation | Included in project generation; hidden legacy ledger may still record non-bundled paths |
| First Version Plan Generation | Included in project generation; hidden legacy ledger may still record non-bundled paths |
| Mockup Generation | Included in project generation |
| Tech Spec Generation | Hidden legacy/internal accounting only |

### Credit Management

- **Consumption**: Atomic operation via `consume_credits()` stored procedure. Non-bundled generation costs come from `src/lib/token-economics.ts` (`BASE_ACTION_TOKENS`, model multipliers, and `getTokenCost()`).
- **Refund**: Via service-role-only `refund_credits()` through `src/lib/credits.ts` — called on generation failure in credit-billed analysis, prompt chat, and billable Generate All queue paths. Mockup generation is project-bundled and does not consume/refund credits.
- **Addition**: Via `add_credits()` (subscription refill, purchases)
- **Balance Check**: Real-time via `get_credit_balance()`
- **History**: All transactions logged in `credits_history`

### Subscription Plans

| Plan | Credits/Month | Public Checkout | Monthly | 6 Months | Annual |
|------|--------------|-----------------|---------|----------|--------|
| **Free** | 10 | No checkout | $0 | — | — |
| **Starter** | 100 | Yes | $19/mo | $105 every 6 months | $194/year |
| **Pro** | 500 | Yes | $49/mo | $270 every 6 months | $499/year |
| **Enterprise** | 2,500 | Disabled for now | Not public | Not public | Not public |

`plans.stripe_price_id` remains as a legacy/default monthly field. New checkout integrations should use `plan_prices.stripe_price_id` for the selected interval. Live production Product and Price IDs are environment data stored in Supabase/Stripe, not hardcoded in source.

### Stripe Integration Details

- **Account**: Makercompass (`acct_1TfXV9RZYXj2bJrB`); local development may use test mode, production must use live-mode keys and live `plan_prices`
- **API Version**: `2026-01-28.clover`
- **Singleton Client**: `src/lib/stripe.ts` — lazy-initialized Stripe instance via `getStripeClient()` with a `Proxy` export for ergonomic access
- **Customer Linking**: Stripe customer ID stored in `profiles.stripe_customer_id`; created on first checkout, reused only when Stripe metadata ownership matches the authenticated user, and replaced when stale test-mode/deleted IDs cannot be retrieved with the active Stripe key. Browser roles cannot write this protected column; Checkout persists it through the service-role client.
- **Checkout Flow**: Server-side redirect to Stripe-hosted checkout (no Stripe.js Elements needed); selected interval comes from `plan_prices`
- **Customer Portal Configuration**: The default live portal configuration supports invoice history, customer/payment-method updates, cancellation, and production return URL `https://makercompass.com/billing`.
- **Webhook Processing**: Uses `SUPABASE_SERVICE_ROLE_KEY` (service role) to bypass RLS for subscription and credit updates; `stripe_webhook_events` deduplicates processed events while allowing failed/stale processing rows to be retried, `stripe_credit_grants`/`grant_subscription_credits_once()` deduplicates credit grants per subscription period, and `reverse_subscription_credits_once()` records one full-refund reversal per paid invoice
- **Billing UI**: `src/app/(dashboard)/billing/page.tsx` — server-renders current subscription, project allowance usage, and initial plan data, then delegates interval selectors, checkout state, and upgrade/manage-subscription actions to client islands

---

## 10. Common Development Tasks

### Adding a New Page

```bash
# 1. Create page file
src/app/(dashboard)/new-page/page.tsx

# 2. Add to navigation (if needed)
src/components/layout/anchor-nav.tsx
```

### Adding a New API Endpoint

```bash
# 1. Create route file
src/app/api/new-endpoint/route.ts

# 2. Implement POST/GET/PUT/DELETE handlers
export async function POST(request: Request) { ... }
```

### Adding a New UI Component

```bash
# 1. Create component file
src/components/ui/new-component.tsx

# 2. Use CVA pattern for variants
const variants = cva("base", { variants: { ... } })

# 3. Export forwardRef component
```

### Adding a New Database Table

```bash
# 1. Create migration in Supabase
# 2. Add RLS policies
# 3. Update database types
npx supabase gen types typescript --project-id <id> > src/types/database.ts

# 4. Access in code
const { data } = await supabase.from("new_table").select()
```

### Modifying Credit Costs

```typescript
// Edit: src/lib/token-economics.ts
export const BASE_ACTION_TOKENS = {
  chat: 1,
  "competitive-analysis": 15,
  prd: 10,
  // Update base action costs here
}

// Model multipliers in the same file determine final getTokenCost() values.
```

---

## 11. Troubleshooting

### Common Issues

**Build Errors**
- Run `npm install` to ensure all dependencies are installed
- Check TypeScript errors: `npm run build`
- Clear `.next/` folder and rebuild

**Auth Issues**
- Verify environment variables are set correctly
- Check Supabase redirect URLs in project settings
- Ensure RLS policies allow access

**API Errors**
- Check API key validity (OpenRouter, Anthropic, Stripe)
- Verify database connection (Supabase URL/key)
- Check server logs for detailed error messages

**Internal Credit Ledger Issues**
- Verify `consume_credits()` function exists in database
- Check the internal credit balance source used by the failing route
- Review `credits_history` for transaction log

**Analysis Pipeline Issues**
- Competitive analysis uses OpenRouter-managed Exa first; if Exa errors, produces unusable output, or returns no citations, the pipeline falls back to Perplexity/Tavily and then degrades gracefully if those providers are also unavailable
- Check server logs for `[CompetitiveAnalysis]` prefixed messages to trace pipeline step failures
- Ensure `OPENROUTER_API_KEY` is set for primary Exa research; keep `PERPLEXITY_API_KEY` and `TAVILY_API_KEY` configured for fallback coverage
- Set `OPENROUTER_EXA_MARKET_RESEARCH_DISABLED=1` to restore the legacy primary path during an OpenRouter server-tool incident
- External research calls retry up to 3 times on 429/5xx/network errors with 1s/2s/4s backoff

**Generate All Issues**
- If generation appears stuck: check `generation_queues` row in Supabase — `status`, `current_index`, and `queue` show the live server state
- If credits were lost without a document being generated: the hardened `refund_credits` RPC must exist in Supabase (run `supabase/migrations/20260425004000_security_hardening_followups.sql`)
- After running the migration, regenerate database types: `npx supabase gen types typescript --project-id <id> > src/types/database.ts` to remove the `(supabase.rpc as any)` casts
- Cancellation: the execute route checks DB `status === "cancelled"` before each step — cancel takes effect at the next step boundary, which can be several minutes for a slow OpenRouter image mockup step

**Mockup Generation Timing**
- Manual mockup generation can take several minutes per option because OpenRouter image models can be slow and each option has a `790s` OpenRouter timeout inside the Vercel Pro function window.
- The workspace intentionally runs Options A/B/C one after another. This increases total wall-clock time, but it reduces wasted OpenRouter spend because successful uploaded options can be recovered and finalized instead of losing all three requests to one shared timeout.
- Lowering the timeout only fails faster; it does not make image generation faster. To reduce actual delay, use a faster model via `OPENROUTER_MOCKUP_IMAGE_MODEL`, generate fewer default options, shorten the MVP context/prompt, ask for lower-detail wireframes, or move mockups to a durable background worker so the browser is not waiting on a long API request.

**database.ts Corruption**
- If `src/types/database.ts` contains a BOM or npm install prompt at the top (UTF-16 encoding artifact from `supabase gen types` with npx), restore it from git: `git checkout <clean-commit> -- src/types/database.ts`

**Retired PDF Export**
- PDF export is intentionally removed. Do not re-add `/api/generate-pdf`, `pdf-utils.ts`, Puppeteer, or PDF buttons unless PDF returns as a deliberate product feature.

---

## 12. Key Files Reference

| File | Purpose |
|------|---------|
| [src/app/layout.tsx](src/app/layout.tsx) | Root layout — loads Hanken Grotesk + Fira Mono fonts |
| [src/app/globals.css](src/app/globals.css) | Pencil design tokens (CSS custom properties), status badge styles, scrollbar styles, Mermaid diagram styles (light/dark mode with media query) |
| [src/app/(dashboard)/layout.tsx](src/app/(dashboard)/layout.tsx) | Dashboard layout — verifies auth and renders `DashboardShell` with user profile |
| [src/components/layout/dashboard-shell.tsx](src/components/layout/dashboard-shell.tsx) | Authenticated dashboard shell for top-level dashboard, projects, billing, and preferences pages |
| [src/app/(dashboard)/projects/page.tsx](src/app/(dashboard)/projects/page.tsx) | Projects dashboard — loads owned projects plus allowance status and renders project cards with paid-plan delete gating |
| [src/components/projects/dashboard-project-card.tsx](src/components/projects/dashboard-project-card.tsx) | Interactive project card with relative updated time, workspace prefetch/warmup, delete confirmation, and free-plan upgrade prompt |
| [src/app/(dashboard)/projects/[projectRef]/page.tsx](src/app/(dashboard)/projects/[projectRef]/page.tsx) | Project page — parses slugged project refs, canonicalizes stale URLs, blocks deprecated prompt tabs, and passes the project shell to `ProjectWorkspace` |
| [src/app/api/projects/[id]/route.ts](src/app/api/projects/[id]/route.ts) | PATCH/GET project details and ownership-scoped paid-plan DELETE |
| [src/app/api/projects/[id]/workspace/route.ts](src/app/api/projects/[id]/workspace/route.ts) | Lazy workspace payload endpoint for requested document collections, project metadata, and structured-intake presence |
| [src/app/api/projects/[id]/status/route.ts](src/app/api/projects/[id]/status/route.ts) | Lightweight document-count snapshot used by generation polling |
| [src/app/dev/prompt-lab/page.tsx](src/app/dev/prompt-lab/page.tsx) | Local-development-only Prompt Lab page for isolated prompt iteration against existing projects |
| [src/app/dev/mockup-renderer-preview/page.tsx](src/app/dev/mockup-renderer-preview/page.tsx) | Local-development-only visual fixture page for the OpenRouter storyboard mockup renderer |
| [src/components/dev/prompt-lab-client.tsx](src/components/dev/prompt-lab-client.tsx) | Prompt Lab workbench UI with project/artifact selectors, prompt editors, saved drafts/runs, workspace-style preview, and lab-only renderer playground |
| [src/app/api/dev/prompt-lab/context/route.ts](src/app/api/dev/prompt-lab/context/route.ts) | Dev-only endpoint that loads owned project context, upstream artifacts, and default prompts for one artifact |
| [src/app/api/dev/prompt-lab/run/route.ts](src/app/api/dev/prompt-lab/run/route.ts) | Dev-only isolated generation endpoint that saves Prompt Lab run history without writing canonical artifacts |
| [src/app/api/dev/prompt-lab/drafts/route.ts](src/app/api/dev/prompt-lab/drafts/route.ts) | Dev-only endpoint for listing and saving Prompt Lab prompt drafts |
| [src/app/api/dev/prompt-lab/runs/route.ts](src/app/api/dev/prompt-lab/runs/route.ts) | Dev-only endpoint for listing recent Prompt Lab runs |
| [src/app/api/dev/prompt-lab/mockup-image/route.ts](src/app/api/dev/prompt-lab/mockup-image/route.ts) | Dev-only proxy for private mockup images associated with Prompt Lab runs |
| [src/app/page.tsx](src/app/page.tsx) | Landing page with dynamic signup vs waitlist CTA rendering, authenticated-user redirect, desktop-gated hero artwork, and static feature preview captures |
| [src/components/landing/hero-artwork.tsx](src/components/landing/hero-artwork.tsx) | Desktop-gated layered raster hero artwork using optimized `next/image` assets from `public/landing/hero/` |
| [src/components/landing/feature-product-preview.tsx](src/components/landing/feature-product-preview.tsx) | Landing feature visual renderer using static optimized captures from `public/landing/samples/previews/`, with a live-preview dev flag |
| [src/components/landing/feature-product-preview-live.tsx](src/components/landing/feature-product-preview-live.tsx) | Dev-only live iframe preview renderer used when `NEXT_PUBLIC_LANDING_LIVE_PREVIEWS=1` |
| [src/app/landing-preview/[navKey]/page.tsx](src/app/landing-preview/[navKey]/page.tsx) | Capture source route for landing feature previews |
| [scripts/export-landing-sample.mjs](scripts/export-landing-sample.mjs) | Exports landing sample content and captures static feature preview images from local preview routes |
| [src/components/landing/waitlist-form.tsx](src/components/landing/waitlist-form.tsx) | Public waitlist email capture form for the landing page |
| [src/app/api/prompt-chat/route.ts](src/app/api/prompt-chat/route.ts) | Deprecated Prompt Chat endpoint; returns `410 Gone` |
| [src/app/api/analysis/[type]/route.ts](src/app/api/analysis/[type]/route.ts) | Analysis generation using in-house pipelines |
| [src/app/api/waitlist/route.ts](src/app/api/waitlist/route.ts) | Waitlist status endpoint and public waitlist signup handler |
| [src/app/api/mockups/image/route.ts](src/app/api/mockups/image/route.ts) | Authenticated proxy for private Supabase Storage mockup images |
| [src/components/workspace/project-workspace.tsx](src/components/workspace/project-workspace.tsx) | Lazy-loading scroll workspace shell and render mapper |
| [src/components/workspace/use-workspace-documents.ts](src/components/workspace/use-workspace-documents.ts) | Lazy workspace document loading state |
| [src/components/workspace/use-workspace-scroll-sync.ts](src/components/workspace/use-workspace-scroll-sync.ts) | Workspace hash/scroll synchronization |
| [src/components/workspace/use-persisted-generation-state.ts](src/components/workspace/use-persisted-generation-state.ts) | LocalStorage-backed generation flags and completion detection |
| [src/components/workspace/use-document-generation.ts](src/components/workspace/use-document-generation.ts) | Manual document and mockup generation workflow |
| [src/components/layout/anchor-nav.tsx](src/components/layout/anchor-nav.tsx) | Sticky/horizontal document rail for Overview, Market Research, Product Plan, First Version Plan, and Design Mockups with queued/generating/ready/needs-retry indicators |
| [src/components/layout/scrollable-content.tsx](src/components/layout/scrollable-content.tsx) | Scrollable document body renderer with deferred sections, inactive-document `content-visibility` containment, queue-aware placeholders, PRD/MVP completed-document block rendering, and mockup/status modules |
| [src/components/layout/workspace-document-frame.tsx](src/components/layout/workspace-document-frame.tsx) | Shared workspace document frame with optional browser performance containment controls |
| [src/components/layout/app-page-shell.tsx](src/components/layout/app-page-shell.tsx) | Shared authenticated page shell and header for consistent dashboard page spacing and hierarchy |
| [src/lib/document-definitions.ts](src/lib/document-definitions.ts) | Shared typed document registry for workspace tabs, editor titles, icons, credit cost, and nav visibility |
| [src/lib/document-sections.ts](src/lib/document-sections.ts) | Scroll workspace section registry and anchor IDs for Overview, Market Research, Product Plan, First Version Plan, and Design Mockups |
| [src/lib/document-generation-display-status.ts](src/lib/document-generation-display-status.ts) | Pure helper that merges content existence, durable queue state, local generation flags, PRD/MVP stream previews, and optional mockup option statuses into nav/body display states |
| [src/lib/active-document-policy.ts](src/lib/active-document-policy.ts) | Shared active-document identity and lookup helper used to prevent duplicate default document generation across direct APIs and Generate All/onboarding |
| [src/components/analysis/competitive-analysis-document.tsx](src/components/analysis/competitive-analysis-document.tsx) | Market Research v2 hybrid modules/markdown renderer with legacy notice and upgrade CTA |
| [src/components/analysis/planning-document-blocks.tsx](src/components/analysis/planning-document-blocks.tsx) | Temporary barrel that re-exports Product Plan and First Version Plan block renderers |
| [src/components/analysis/product-plan-blocks.tsx](src/components/analysis/product-plan-blocks.tsx) | Product Plan block renderer using the PRD parser/view-model layer, designed PRD sections, personas, user stories, requirements, timeline, and follow-through cards |
| [src/components/analysis/first-version-plan-blocks.tsx](src/components/analysis/first-version-plan-blocks.tsx) | First Version Plan block renderer using the MVP parser/view-model layer, scope, feature, build-sequence, validation, and guardrail sections |
| [src/components/analysis/planning-blocks-shared.tsx](src/components/analysis/planning-blocks-shared.tsx) | Shared layout primitives and markdown fallback helpers for Product Plan and First Version Plan renderers |
| [src/components/ui/markdown-renderer.tsx](src/components/ui/markdown-renderer.tsx) | Markdown renderer with lazy syntax highlighting, responsive table column sizing, and sanitized beautiful-mermaid diagrams with expand/pan/zoom controls |
| [src/components/ui/mockup-renderer.tsx](src/components/ui/mockup-renderer.tsx) | Mockup renderer for OpenRouter storyboard images with screen captions, json-render specs/patches, safe legacy-format notices, and legacy ASCII mockups |
| [src/components/auth/auth-header.tsx](src/components/auth/auth-header.tsx) | Shared auth header variants for auth, forgot-password, and reset-password views |
| [src/components/auth/auth-field.tsx](src/components/auth/auth-field.tsx) | Shared labeled auth input field |
| [src/components/auth/auth-password-field.tsx](src/components/auth/auth-password-field.tsx) | Shared auth password field with show/hide toggle |
| [src/hooks/use-billing-portal.ts](src/hooks/use-billing-portal.ts) | Shared client hook to open Stripe billing portal |
| [src/components/pricing/billing-plans-client.tsx](src/components/pricing/billing-plans-client.tsx) | Billing page client island for Monthly/Yearly toggle, plan-card checkout state, and checkout submission |
| [src/components/pricing/manage-subscription-button.tsx](src/components/pricing/manage-subscription-button.tsx) | Billing page client island for Stripe portal access |
| [src/lib/billing-page-data.ts](src/lib/billing-page-data.ts) | Billing plan/price display helpers typed directly against the generated Database row types (no runtime normalization layer) |
| [src/lib/visibility-aware-poller.ts](src/lib/visibility-aware-poller.ts) | Reusable visibility-aware polling scheduler (hidden-tab suppression, immediate poll on refocus) used by the Generate All store |
| [src/lib/landing-preview-captures.mjs](src/lib/landing-preview-captures.mjs) | Single manifest for landing feature preview captures, shared by the export script and the landing page |
| [src/components/landing/preview-frame.tsx](src/components/landing/preview-frame.tsx) | Shared landing preview frame chrome used by static capture and dev live-iframe variants |
| [src/hooks/use-auth-signout.ts](src/hooks/use-auth-signout.ts) | Shared client hook for Supabase sign-out + redirect |
| [src/hooks/use-copy-feedback.ts](src/hooks/use-copy-feedback.ts) | Shared hook for clipboard copy feedback state |
| [src/lib/credits.ts](src/lib/credits.ts) | Shared credit formatting and unlimited-credit helpers |
| [src/lib/project-allowance.ts](src/lib/project-allowance.ts) | Project allowance resolver for free lifetime limits, paid monthly/subscription windows, plan-field/features fallback, and unmetered internal plans |
| [src/lib/project-allowance.test.ts](src/lib/project-allowance.test.ts) | Node test coverage for allowance windows, free lifetime limits, plan parsing, unlimited plans, and failure cases |
| [src/lib/project-routing.ts](src/lib/project-routing.ts) | Slugged project URL helpers: `buildProjectRef`, `parseProjectRef`, and `getProjectUrl` |
| [src/lib/workspace-tab-policy.ts](src/lib/workspace-tab-policy.ts) | Workspace tab resolution and deprecated prompt-tab redirect policy |
| [src/lib/json-render/catalog.ts](src/lib/json-render/catalog.ts) | Allowed json-render component catalog and mockup system prompt context |
| [src/lib/json-render/registry.tsx](src/lib/json-render/registry.tsx) | json-render registry backed by `@json-render/shadcn` components |
| [src/lib/prompt-lab/index.ts](src/lib/prompt-lab/index.ts) | Server-side Prompt Lab prompt composition, local-dev guard, isolated text generation with shared long-text timeout, and single-option mockup run helper |
| [src/lib/prompt-lab/shared.ts](src/lib/prompt-lab/shared.ts) | Client-safe Prompt Lab artifact labels and default launch brief constants |
| [src/lib/openrouter.ts](src/lib/openrouter.ts) | Shared OpenRouter client singleton; all server-side OpenRouter calls use `getOpenRouterClient()` instead of constructing their own `OpenAI` client |
| [src/lib/openrouter-timeout.ts](src/lib/openrouter-timeout.ts) | Shared OpenRouter long-text timeout constants, abort detection, and user-facing timeout message helpers |
| [src/lib/openrouter-competitor-research.ts](src/lib/openrouter-competitor-research.ts) | OpenRouter-managed Exa competitor discovery adapter with bounded server-tool request, citations, retry, timeout, and no company-identity validation. |
| [src/lib/competitor-research.ts](src/lib/competitor-research.ts) | Provider-neutral bounded competitor JSON parser, candidate/evidence types, syntactic public-URL filtering, and search status helpers. |
| [src/lib/prompts/launch-plan.ts](src/lib/prompts/launch-plan.ts) | AI Launch Plan system prompt and secure user prompt builder |
| [src/app/api/mockups/generate/route.ts](src/app/api/mockups/generate/route.ts) | POST endpoint to generate OpenRouter storyboard mockup alternatives without credit consumption. |
| [src/app/api/mockups/generate-option/route.ts](src/app/api/mockups/generate-option/route.ts) | POST endpoint to generate one OpenRouter storyboard option for manual workspace generation. |
| [src/app/api/mockups/finalize/route.ts](src/app/api/mockups/finalize/route.ts) | POST endpoint to validate and finalize three saved OpenRouter storyboard options into the canonical mockups document row. |
| [src/app/api/mockups/recover-options/route.ts](src/app/api/mockups/recover-options/route.ts) | POST endpoint to recover already-uploaded storyboard option images for a mockup run before retrying OpenRouter generation. |
| [src/app/api/mockups/fixture/route.ts](src/app/api/mockups/fixture/route.ts) | POST endpoint to save no-credit storyboard fixture mockups for local display and retry testing. |
| [src/app/api/mockups/[id]/route.ts](src/app/api/mockups/[id]/route.ts) | PATCH endpoint to update mockup content |
| [src/lib/competitive-analysis-v2.ts](src/lib/competitive-analysis-v2.ts) | Market Research v2 section contract, legacy/v2 view model helpers, parser utilities, and legacy heading aliases |
| [src/lib/planning-document-parser.ts](src/lib/planning-document-parser.ts) | Shared markdown section, list, paragraph, source cleanup, and table parser utilities for PRD/MVP block rendering |
| [src/lib/planning-document-requests.ts](src/lib/planning-document-requests.ts) | Shared Product Plan / First Version Plan OpenRouter request builders, default models, token limits, and temperatures (used by production pipelines and Prompt Lab) |
| [src/lib/analysis-pipelines.ts](src/lib/analysis-pipelines.ts) | In-house analysis orchestration (market research, Product Plan, First Version Plan, tech spec). Most OpenRouter long-form text calls use the shared 240s AbortSignal timeout; Product Plan and First Version Plan use the 480s planning-document timeout. |
| [src/lib/mockups/design-plan.ts](src/lib/mockups/design-plan.ts) | Hidden mockup design-plan prompt, schema parser, and validation for platform, happy path, platform-specific screen limits, and three visual directions. |
| [src/lib/mockups/openrouter-image-pipeline.ts](src/lib/mockups/openrouter-image-pipeline.ts) | OpenRouter-only storyboard mockup generation, image config handling, decoded dimension capture, and Supabase Storage upload. |
| [src/lib/mockups/openrouter-image-format.ts](src/lib/mockups/openrouter-image-format.ts) | Client-safe parser/helpers for OpenRouter image/storyboard mockup JSON. |
| [src/lib/mockups/option-drafts.ts](src/lib/mockups/option-drafts.ts) | Server helper for durable partial mockup option draft persistence, recovery normalization, authorization checks, and cleanup. |
| [src/lib/with-retry.ts](src/lib/with-retry.ts) | Shared retry utility — 3 retries, exponential backoff [1s/2s/4s], retries on 429/5xx/network errors |
| [src/lib/perplexity.ts](src/lib/perplexity.ts) | Perplexity API client for competitor search (wrapped with withRetry) |
| [src/lib/tavily.ts](src/lib/tavily.ts) | Tavily API client for URL content extraction (wrapped with withRetry) |
| [src/stores/generate-all-store.ts](src/stores/generate-all-store.ts) | Zustand store for Generate All UI state. Fires execute route fire-and-forget; polls status with visibility pause/resume and 3s/6s/10s backoff. |
| [src/components/workspace/generate-all-hydrator.tsx](src/components/workspace/generate-all-hydrator.tsx) | Thin bridge: keeps store callbacks fresh each render; runs one-time DB hydration per project |
| [src/lib/generation/queue-service.ts](src/lib/generation/queue-service.ts) | Normalized queue item helpers for dependency checks, status computation, item claims, and legacy queue JSON sync. |
| [src/lib/generation/onboarding.ts](src/lib/generation/onboarding.ts) | Onboarding queue metadata, loading row mapping, run-id helpers, and canonical `#executive-summary` redirect construction. |
| [src/lib/document-generation-service.ts](src/lib/document-generation-service.ts) | Shared server-side document generation service used by Generate All/onboarding; skips and returns existing output table/id references when an active document already exists. |
| [src/app/api/generate-all/execute/route.ts](src/app/api/generate-all/execute/route.ts) | Server-side Generate All pipeline (maxDuration=540). Dependency-aware item execution with credit deduction/refund, retries, partial status, and DB state tracking. |
| [src/lib/generation/queue-credit-flow.ts](src/lib/generation/queue-credit-flow.ts) | Testable Generate All credit consume/refund helpers |
| [src/lib/logger.ts](src/lib/logger.ts) | Structured logger with Sentry warning/error forwarding |
| [src/lib/product-analytics/contracts.ts](src/lib/product-analytics/contracts.ts) | Typed/versioned client and trusted-server product event registry, property allowlists, and runtime validation |
| [src/lib/product-analytics/client.ts](src/lib/product-analytics/client.ts) | Browser session identity, bounded batching/retry, unload flushing, and upgrade attribution |
| [src/lib/product-analytics/server.ts](src/lib/product-analytics/server.ts) | Best-effort idempotent trusted lifecycle event recorder with server-side plan/environment enrichment |
| [src/app/api/product-events/route.ts](src/app/api/product-events/route.ts) | Authenticated, same-origin, rate-limited behavioral-event ingestion with project ownership enforcement |
| [src/lib/stripe/webhook-claim.ts](src/lib/stripe/webhook-claim.ts) | Testable Stripe webhook idempotency claim/reclaim helper |
| [src/lib/stripe/checkout-plan.ts](src/lib/stripe/checkout-plan.ts) | Checkout plan-price eligibility helper |
| [src/lib/supabase/current-user.ts](src/lib/supabase/current-user.ts) | Cached server-side current-user helper shared by dashboard layout and pages |
| [src/lib/supabase/server.ts](src/lib/supabase/server.ts) | Server-side Supabase client |
| [src/lib/waitlist.ts](src/lib/waitlist.ts) | Waitlist thresholds and email validation helpers |
| [src/lib/supabase/client.ts](src/lib/supabase/client.ts) | Browser Supabase client |
| [src/lib/stripe/index.ts](src/lib/stripe/index.ts) | Stripe singleton client — lazy-initialized with Proxy export |
| [src/lib/stripe/subscription-sync.ts](src/lib/stripe/subscription-sync.ts) | Pure helpers that map Stripe subscription item Price IDs to `plan_prices`, derive real billing periods, and build period-level credit idempotency keys |
| [src/app/api/stripe/checkout/route.ts](src/app/api/stripe/checkout/route.ts) | POST — creates Stripe checkout session for subscription upgrade |
| [src/app/api/stripe/portal/route.ts](src/app/api/stripe/portal/route.ts) | POST — creates Stripe billing portal session for subscription management |
| [src/app/api/stripe/webhook/route.ts](src/app/api/stripe/webhook/route.ts) | POST — handles Stripe webhook events with event idempotency, subscription item price mapping, real period dates, and period-level credit grants |
| [src/app/(dashboard)/billing/page.tsx](src/app/(dashboard)/billing/page.tsx) | Billing page server component — fetches plans, active subscription, and allowance before rendering billing client islands |
| [src/lib/utils.ts](src/lib/utils.ts) | cn() class merging and shared formatting utilities |
| [src/proxy.ts](src/proxy.ts) | Next proxy entry point for Supabase session refresh |
| [src/lib/supabase/middleware.ts](src/lib/supabase/middleware.ts) | Supabase cookie/session refresh helper used by `src/proxy.ts` |
| [src/types/database.ts](src/types/database.ts) | Database type definitions |
| [supabase/migrations/20260616001400_create_prompt_chat_messages.sql](supabase/migrations/20260616001400_create_prompt_chat_messages.sql) | Database migration for prompt_chat_messages table |
| [supabase/migrations/20260425001000_create_mockups_table.sql](supabase/migrations/20260425001000_create_mockups_table.sql) | Supabase migration for mockups table |
| [supabase/migrations/20260425004000_security_hardening_followups.sql](supabase/migrations/20260425004000_security_hardening_followups.sql) | Security follow-up migration: service-role-only `refund_credits`, Stripe event idempotency table, and project creation locks. |
| [supabase/migrations/20260621000000_populate_plan_project_allowance.sql](supabase/migrations/20260621000000_populate_plan_project_allowance.sql) | Adds and backfills `plans.monthly_project_allowance` so project allowance resolves from explicit plan fields. |
| [supabase/migrations/20260518000000_create_prompt_lab_tables.sql](supabase/migrations/20260518000000_create_prompt_lab_tables.sql) | Supabase migration for Prompt Lab drafts/runs with user-scoped RLS. |
| [supabase/migrations/20260609000000_stripe_interval_prices.sql](supabase/migrations/20260609000000_stripe_interval_prices.sql) | Supabase migration for interval-aware Stripe `plan_prices`, subscription price tracking, disabled Enterprise checkout, and idempotent subscription credit grants. |
| [supabase/migrations/20260711010000_align_starter_project_allowance.sql](supabase/migrations/20260711010000_align_starter_project_allowance.sql) | Defensively restores explicit plan allowance storage and aligns Starter to five projects per month. |
| [supabase/migrations/20260711020000_reverse_credits_on_subscription_refund.sql](supabase/migrations/20260711020000_reverse_credits_on_subscription_refund.sql) | Adds idempotent, service-role-only reversal of legacy subscription credit grants after full invoice-payment refunds. |
| [supabase/migrations/20260711000000_add_subscriptions_user_unique.sql](supabase/migrations/20260711000000_add_subscriptions_user_unique.sql) | Guarded schema repair enforcing one `subscriptions` row per user so webhook `ON CONFLICT (user_id)` upserts are atomic and replay-safe. |
| [supabase/migrations/20260710000100_create_product_event_analytics.sql](supabase/migrations/20260710000100_create_product_event_analytics.sql) | Service-only product event store, production analysis views, indexes, and fixed 180-day cleanup schedule. |
| [PROMPT_CHAT_SETUP.md](PROMPT_CHAT_SETUP.md) | Deprecated setup guide for the removed Prompt tab AI chat feature |

---

**End of PROJECT_CONTEXT.md**

*This document serves as the comprehensive reference for understanding and working with the Maker Compass codebase. Keep it updated as the project evolves.*
