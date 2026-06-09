# PROJECT_CONTEXT.md

**Last Updated**: 2026-06-09 (Platform-specific mockup screen limits)
**Project**: Maker Compass - AI-Powered Business Analysis Platform

---

## 1. Project Overview

**Maker Compass** is a comprehensive AI-powered SaaS platform that transforms business ideas into reality. It provides an end-to-end solution for entrepreneurs, guiding them from initial concept through to deployment.

### Core Functionality

- **Idea Intake Wizard**: Canonical new-project flow at `/projects/new`. Users enter an idea, answer 4-5 AI-generated structured questions, then the app creates the project and starts the bundled onboarding document-generation queue. The question parser always ensures a required single-select `primary-platform` question with the canonical choices Desktop web, Mobile web, Native mobile app, and Native desktop app; project creation validates that this question has exactly one supported answer so stale/bypassed clients cannot omit it. The wizard stores readable summaries in `projects.description`, structured intake JSON in `project_intakes`, and shows the Maker Compass loading state until Overview + Market Research are ready.
- **Prompt Tab AI Chat Deprecated**: The Prompt tab is no longer reachable for any project, including legacy Prompt Chat projects. Direct project URLs with `?tab=prompt` are silently redirected to the workspace Overview, the Idea Brief nav entry is removed, and `/api/prompt-chat` returns `410 Gone`. Historical prompt chat rows are preserved unless explicitly deleted in a separate data cleanup.
- **AI-Powered Chat**: General interactive conversation interface for ongoing project discussions
- **Competitive Analysis / Market Research**: AI-generated competitive landscape analysis with a strict v2 module contract. New documents render as a full-width Pencil-faithful designed page, not generic markdown. The UI is built from typed parsing of the stored markdown source and uses founder-friendly display labels including Executive Summary, Feature Comparison, Pricing Comparison, Best Customer Segments, How You'll Reach Customers, Ways to Stand Out, What Makes It Hard to Copy, Risks & Competitor Responses, First Version Focus, and Recommended Next Moves. Executive Summary is a single generated section and single workspace/nav item that includes the market snapshot, verdict headline, why-now signal, and biggest risk; there is no separate Overview or Opportunity Verdict subsection. Direct competitor entries still expect linked H3 headings plus concise fields for overview, core product, positioning, strengths, key edge, limitations, pricing model, and target audience so the app can render dense competitor cards and a fast-comparison table. Legacy or malformed documents fall back to markdown with upgrade guidance.
- **Gap Analysis**: Identifies market opportunities and unmet customer needs
- **Product Plan Generation**: Complete Product Plans with exactly three user personas, user stories, grouped requirements, and release planning. Production Product Plan generation and Prompt Lab defaults share the same Product Plan request builder for system prompt, user prompt shape, default model, max tokens, and temperature. Product Plan generation passes the full latest Market Research document into the shared secure prompt builder rather than applying the older production-only 6,000-character downstream trim; the secure prompt builder still applies its normal per-field safety limits. Completed Product Plans render in the workspace as structured Pencil-style blocks through a parser/view-model layer, with markdown fallback for legacy or malformed content. The parser accepts both the older Product Plan H2/H3 contract and the current numbered PRD-style prompt sections for introduction/overview, goals, personas, user stories and acceptance criteria, functional requirements, technical considerations, out-of-scope items, success metrics, timeline, risks, dependencies, assumptions, and open questions. Current numbered PRD-style documents render with a design-faithful Product Plan document layout inspired by the Claude Design Product Plan right panel: a fixed `Product Plan` masthead (AI-generated names are not used as the H1), a dynamic summary metric strip, numbered editorial sections, stat-style goals, persona cards, expandable user-story cards with normalized display IDs, grouped requirements, icon-led technical cards with designed bullet rows, metric columns, compact phase-card timeline milestones with computed week ranges and deliverable-only checklists, and compact follow-through sections for risks, dependencies, and open questions. Legacy Product Plan documents continue to use the specialized legacy block layout with persona/profile grouping, compact labeled rows, vertical requirement categories, cleaned horizontal rules, and user-story acceptance criteria cards.
- **First Version Plan Generation**: Strategic first-release development plan based on the Product Plan. Production First Version Plan generation and Prompt Lab defaults share the same First Version Plan request builder for system prompt, user prompt shape, default model, max tokens, and temperature. First Version Plan generation passes the full latest Product Plan document into the shared secure prompt builder rather than applying the older production-only 6,000-character downstream trim; the secure prompt builder still applies its normal per-field safety limits. Completed First Version Plans render in the workspace as structured Pencil-style blocks through a parser/view-model layer, with markdown fallback for legacy or malformed content. The parser accepts both the older First Version/MVP H2/H3 contract and the current 12-section MVP Plan contract for summary, assumptions, target user/problem with riskiest assumptions, core flow, scope, must-have features, suggested build approach, AI-friendly build sequence, validation plan, cut list, AI build guardrails, and next prompt. Current numbered MVP Plan documents use a purpose-built visual block layout that preserves current prompt labels while turning summary, target/problem content, scope, must-have feature tables, build steps, and validation sections into vertically stacked light Pencil blocks/cards. Direct H2/H3 content is preserved as fallback section cards when a generated First Version Plan lacks deeper nested headings.
- **Mockup Generation**: Three UI mockup alternatives generated from First Version Plans. The default path uses OpenRouter image-output model `openai/gpt-5.4-image-2`, configurable with `OPENROUTER_MOCKUP_IMAGE_MODEL`; images are stored in private Supabase Storage and rendered through an authenticated image proxy. Before image generation, the pipeline creates a compact deterministic mockup brief from the project name, selected primary platform, extracted target user, MVP workflow, core capabilities, candidate screens/features, and UI constraints. The hidden planner receives that compact brief instead of whole Product Plan / First Version Plan documents, then creates a hidden `mockup-design-plan-v1` JSON plan using `OPENROUTER_MOCKUP_PLANNER_MODEL`, falling back to `OPENROUTER_ANALYSIS_MODEL` and then `openai/gpt-5.4-mini`. That plan chooses the primary platform, copies/condenses the input-derived `targetUser` instead of inventing a new persona, defines a populated happy-path scenario, selects platform-specific core MVP screens, captions, and exactly three complete visual directions labeled A/B/C: desktop web and native desktop app plans use 1-2 screens per storyboard image, while mobile web and native mobile app plans use 1-3 screens. Over-limit planner output is normalized after the final effective platform is known so desktop storyboards cannot silently retain three compressed frames. Invalid planner output gets one stricter JSON-only retry and then fails clearly rather than falling back to generic directions. The final image prompt is built from the validated hidden plan and static rendering/composition rules only; raw MVP/Product Plan/persona context is not re-sent to the image model. The hidden plan is stored in `mockups.metadata.design_plan`, not in the user-rendered mockup content; prompt version and prompt character counts are stored in mockup metadata for regression diagnosis. Each option image is now a v2 storyboard (`openrouter-image-v2`): one wide horizontal image containing the selected screens, with display-safe screen names/captions stored in content metadata. OpenRouter image calls omit provider-specific `image_config` by default; explicit `OPENROUTER_MOCKUP_IMAGE_ASPECT_RATIO` and `OPENROUTER_MOCKUP_IMAGE_SIZE` env values are still forwarded for providers that support them. Image-call text output is capped by `OPENROUTER_MOCKUP_IMAGE_MAX_TOKENS` (default `4096`) while the hidden planner call is capped by `OPENROUTER_MOCKUP_PLANNER_MAX_TOKENS` (default `2048`) to keep retries within normal key limits. Actual decoded image dimensions are recorded when available. Manual workspace mockup generation still runs separate option-level invocations for Options A/B/C one after another, then finalizes one normal mockup document after all three storyboard images are saved. Manual retries persist the option run id and design plan in localStorage and call `/api/mockups/recover-options` before spending more OpenRouter credits, so images that reached Supabase Storage can be finalized even if the browser or route timed out. Local/no-credit fixture testing is available through `/api/mockups/fixture` when running outside production, or in production only with `ENABLE_MOCKUP_FIXTURE_GENERATION=true`. The renderer displays each option as a wide storyboard image plus generated screen captions; desktop storyboards are prompted with a structured composition JSON that permits one large desktop frame or two equal-width desktop frames and explicitly forbids third desktop screens or compressed thumbnails, while mobile storyboards are prompted with a structured Figma-style composition JSON that asks for same-width iPhone 17 Pro portrait frames, fixed top captions, neutral arrows between screens, optional side rationale cards, and same-width vertical continuation or scroll cues instead of wider phones.
- **Launch Plan Generation**: Launch Plans are now generated through an AI-backed Launch Plan prompt module instead of a deterministic template. The route keeps the existing marketing-brief input contract and still saves markdown `launch-plan` rows in `analyses`.
- **Dev Prompt Lab**: Local-development-only workbench at `/dev/prompt-lab` for iterating artifact prompts against existing projects without creating workflow artifacts, consuming credits, or starting queues. It supports Market Research, Product Plan, First Version Plan, Design Mockups, and Launch Plan; stores artifact-scoped reusable system/model drafts in Supabase `prompt_lab_experiments`, stores project-scoped isolated runs in `prompt_lab_runs`, uses existing workspace renderers for artifact-accurate preview, and includes a lab-only renderer playground for experiments that do not affect production workspace rendering. Product Plan and First Version Plan defaults are generated through the same shared request builders production uses, and the Prompt Lab UI shows a `Default / Production` badge while the untouched shared Product Plan or First Version Plan default prompt/model is displayed. The user prompt/context is regenerated from the selected project and should not be overwritten by shared system drafts. For Design Mockups, Prompt Lab centers the production-like planner flow: it shows editable hidden planner prompts, supports a dedicated planner + selected-option run that parses the planner JSON through the shared mockup design-plan validator, and displays the compact mockup brief, generated hidden design-plan JSON, and final image prompt in separate read-only inspectors when available. Design Mockup runs default to prompt-only mode: image generation is disabled unless explicitly re-enabled, and the lab returns a ChatGPT-ready prompt bundle containing the system instructions plus final image prompt instead of calling the OpenRouter image model. A Design Mockups-only platform dropdown can force the parsed design plan's `primaryPlatform` to desktop web, mobile web, native mobile app, or native desktop app, or leave it on auto from project context; selected overrides are treated as trusted Prompt Lab controls and are applied after planner JSON parsing so conflicting intake context cannot win, then screen counts are normalized to the final effective platform before building the ChatGPT-ready prompt. The generic isolated system/user prompt editors are not shown for Design Mockups because the selected-option image prompt is rebuilt internally from the planner JSON. Prompt Lab text runs use the shared OpenRouter long-text timeout (`240s`) for most text artifacts and the longer planning-document timeout (`480s`) for Product Plan and First Version Plan; mockup image runs keep their separate image timeout path when image generation is explicitly enabled.
- **Technical Specifications**: Architecture design, technology stack recommendations, and API designs
- **Landing Page + Waitlist Gate**: The marketing landing page now switches between standard signup CTAs and a public waitlist flow once the early-access user cap is reached. Features:
  - Dynamic CTA mode based on current `profiles` count
  - Public `waitlist` table for email capture
  - Shared `WaitlistForm` component on the landing page
  - Figma-matched desktop hero artwork from layered raster assets in `public/landing/hero/*`, rendered by `HeroArtwork`
  - Authenticated visitors to `/` are redirected to `/projects`
  - Fail-open API behavior so CTA rendering does not block on Supabase errors
- **OpenRouter Image Mockups + Legacy Stitch Compatibility**: Mockup generation now defaults to OpenRouter image storyboards and keeps Stitch rendering/proxy support for older saved mockups until those records are cleaned up separately. Features:
  - `src/lib/mockup-design-plan.ts` generates and validates hidden mockup design plans with primary platform, happy-path scenario, platform-specific screen limits (1-2 desktop, 1-3 mobile), screen captions, and option-level design directions
  - `src/lib/openrouter-image-mockup-pipeline.ts` generates OpenRouter storyboard alternatives and uploads image bytes to Supabase Storage, with a reusable single-option helper for manual generation
  - `src/app/api/mockups/generate-option/route.ts` generates and stores one mockup option image for manual workspace generation
  - `src/app/api/mockups/recover-options/route.ts` reconstructs saved storyboard option metadata from Supabase Storage for the current run before retrying failed/missing options
  - `src/app/api/mockups/finalize/route.ts` finalizes three generated options into the canonical `mockups` row
  - `src/app/api/mockups/fixture/route.ts` creates three no-credit storyboard fixture mockups for local UI/finalization testing; append `?mockupFixture=1` or set `localStorage.makercompass_mockup_fixture_mode = "true"` in local development
  - `src/app/api/mockups/image/route.ts` proxies stored mockup images after project ownership checks
  - `@google/stitch-sdk` client wrapper in `src/lib/stitch/client.ts`
  - Server-side HTML proxy route for safe rendering of legacy Stitch-hosted HTML
  - Support for extracting project IDs and generated screen IDs from legacy Stitch responses
- **App Generation**: Automated code generation for multiple app types:
  - Static websites (HTML/CSS/JS)
  - Dynamic websites (Next.js)
  - Single Page Applications (React SPAs)
  - Progressive Web Apps (PWA)
- **Deployment**: Direct deployment capabilities for generated applications
- **Project-based Pricing Migration**: Project creation is guarded by project allowance. Free users get a one-project lifetime allowance; paid plans use monthly/subscription-period windows, explicit plan allowance fields/features where available, and plan-name fallbacks. Legacy/manual document generation may still use credit accounting while bundled onboarding generation is included in project creation. Internal developer entitlements are private plan records and are not public checkout plans.
- **Paid-only Project Deletion**: The Projects dashboard renders `DashboardProjectCard` cards with hover/focus workspace warming and delete controls. `DELETE /api/projects/[id]` is ownership-scoped, metrics-tracked, and blocked for Free plan users; the UI shows an upgrade prompt before paid-plan-only deletion.
- **Generate-Missing-Only Documents**: Planning documents are active singletons by default. Direct generation routes and Generate All/onboarding execution check for an existing active document before credits or external AI calls; duplicate attempts return/record a skipped existing output instead of inserting another row. Future document versioning must be a separate explicit product action.
- **Dashboard Generation Status**: The project dashboard derives document loading states from the durable Generate All/onboarding queue, not only local browser flags. The left document rail shows compact queued/waiting/generating/ready indicators plus dark `Generate` buttons for missing idle modules and dark `Retry` buttons only for modules that actually failed. Queue items blocked by a failed/missing prerequisite show `Waiting`, not `Retry`, until the prerequisite content exists. The right document modules show queued/waiting/loading states, centered retry placeholders with a user-friendly error message and wider dark `Retry` action, or canonical saved content. Product Plan and First Version Plan no longer show partial streaming previews in the workspace; they show loading/generating states until the saved document is ready. Overview and Market Research share the same competitive-analysis generation state, so a retry from either section moves both rail items together.
- **Lazy Workspace Loading**: Project workspaces use slugged project refs at `/projects/[projectRef]` and lazy-load owned document collections through `/api/projects/[id]/workspace`. The workspace requests only the document types it needs, keeps section hash navigation in sync, and defers below-the-fold rendering to avoid freezing large generated documents.
- **Prompt/Inline Edit Cleanup**: The Prompt tab remains deprecated and `/api/prompt-chat` returns `410 Gone`. The old inline "Edit with AI" client surface and `/api/document-edit` route are not present in the current app; document PATCH routes still exist for direct content updates.

### User Workflow

1. User starts from the landing idea box or a dashboard New Project action
2. `/projects/new` opens the Idea Intake Wizard instead of inserting a blank project
3. Step 1 captures the raw idea or an example idea
4. Step 2 calls `/api/intake/questions` to generate structured answer-chip questions
5. Final submit calls `/api/projects/create-from-intake`, enforces monthly project allowance, generates a short project name, creates `projects`, writes the canonical `project_intakes` row, and creates an onboarding `generation_queues` run
6. The wizard shows the full-page Maker Compass loading state, starts `/api/generate-all/execute` server-side, and polls `/api/projects/[id]/onboarding-status`
7. User lands at the workspace `#executive-summary` section once the v2 `competitive-analysis` document exists, which powers Executive Summary and Market Research
8. Product Plan, First Version Plan, Launch Plan, design mockups, tech specs, app code, and launch materials continue through the document pipeline
9. The project workspace is served from `/projects/[projectRef]`, canonicalizes stale slugs through `src/lib/project-routing.ts`, and fetches document collections lazily from `/api/projects/[id]/workspace`

---

## 2. Tech Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 16.1.6 | Full-stack React framework with App Router |
| **React** | 19.2.3 | UI library with React Server Components |
| **TypeScript** | 5 | Type-safe JavaScript |
| **Tailwind CSS** | 4.x | Utility-first CSS framework |
| **Radix UI** | Various | Unstyled, accessible component primitives |
| **lucide-react** | 0.563.0 | Icon library |
| **class-variance-authority** | 0.7.1 | Type-safe component variants |
| **tailwind-merge** | 3.4.0 | Tailwind class merging utility |
| **react-markdown** | 10.1.0 | Markdown rendering |
| **remark-gfm** | 4.0.1 | GitHub Flavored Markdown support |
| **beautiful-mermaid** | Latest | Beautiful, themeable Mermaid diagram rendering with expansion |
| **react-syntax-highlighter** | 16.1.0 | Code syntax highlighting |
| **@json-render/core**, **@json-render/react**, **@json-render/shadcn** | 0.11.0 | Structured mockup rendering from json-render specs and patches |
| **img-fx** | 0.3.1 | Animated WebGL mockup image-generation loading surface |
| **three** | 0.184.0 | WebGL renderer peer dependency for `img-fx` |
| **date-fns** | 4.1.0 | Relative project timestamp formatting on dashboard cards |
| **marked** | 17.0.1 | Markdown-to-HTML (used for PDF export) |
| **jspdf** | 4.0.0 | Client-side PDF generation |
| **html2canvas** | 1.4.1 | Legacy client-side HTML-to-canvas rendering utility |
| **Hanken Grotesk** | (Google Font) | Primary sans-serif and display typeface |
| **Fira Mono** | (Google Font) | Monospace typeface for labels/code |

### Backend & Services

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Supabase** | - | PostgreSQL database with auth and RLS |
| **@supabase/supabase-js** | 2.91.1 | Supabase client library |
| **@supabase/ssr** | 0.8.0 | Server-side rendering utilities |
| **Anthropic Claude** | 0.71.2 | AI SDK for app generation |
| **@google/stitch-sdk** | 0.0.3 | Stitch client SDK used for mockup/design generation helpers |
| **OpenRouter** | 6.16.0 | API wrapper for AI analysis and OpenRouter-hosted image mockup generation |
| **Stripe** | 20.2.0 | Payment processing and subscriptions |
| **Puppeteer** | 24.37.1 | Server-side PDF rendering in `/api/generate-pdf` |
| **Perplexity** | - | AI-powered competitor search (sonar-pro model, OpenAI-compatible API) |
| **Tavily** | - | Web content extraction from competitor URLs |

### Development Tools

| Tool | Version | Purpose |
|------|---------|---------|
| **ESLint** | ^9 | Code linting |
| **eslint-config-next** | 16.1.4 | Next.js ESLint configuration |
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
│  - OpenRouter API                   │
│  - Stripe API                       │
│  - Perplexity API (competitor search)│
│  - Tavily API (URL extraction)      │
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

3. **Chat Flow**:
   - Client component sends message to `/api/chat`
   - Server validates auth, checks credits
   - Server calls OpenRouter/Anthropic AI
   - Server saves message to database
   - Response streamed back to client

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
   - Client requests analysis (market research, Product Plan, First Version Plan, Design Mockups, Launch Plan, or tech spec) from the workspace generation handlers
   - Server verifies project ownership and checks `src/lib/active-document-policy.ts` for an existing active document before credit deduction or external generation. Duplicate requests return `200 OK` with `{ skipped: true, reason: "document_already_exists", existingDocument }` and do not charge credits.
   - If no active document exists, the server checks credits, deducts if available, and refunds through the service-role `refund_credits` RPC on generation failure
   - Routes to the appropriate in-house pipeline (`src/lib/analysis-pipelines.ts`). When a `project_intakes` row exists, generation context is formatted through `formatProjectIntakeForAi()` and combined with the human-readable project summary; otherwise `projects.description` is used as the fallback:
    - **Market Research**: 3-step pipeline — Perplexity (sonar-pro) finds competitors → Tavily extracts URL content → OpenRouter synthesizes final report. Graceful degradation if Perplexity/Tavily fail. External API calls use `withRetry` (3 retries, exponential backoff on 429/5xx). OpenRouter synthesis calls use the shared long-text timeout (`240s`) with clearer timeout messages; Product Plan and First Version Plan use a longer planning-document timeout (`480s`); direct generation returns safe timeout failures as `504`.
    - **Product Plan**: OpenRouter LLM call built through the shared Product Plan request helper, receives the full latest Market Research document through the secure prompt builder, and uses the same default request shape as Prompt Lab
     - **First Version Plan**: OpenRouter LLM call built through the shared First Version Plan request helper, receives the full latest Product Plan document through the secure prompt builder, and uses the same default request shape as Prompt Lab
     - **Tech Spec**: OpenRouter LLM call with detailed system prompt, receives the Product Plan as context
   - Result saved to the appropriate table (`analyses`, `prds`, `mvp_plans`, or `tech_specs`). Future row-based versioning should use an explicit versioning route/action rather than the default generate path.
   - Page reloads to surface the new version

7. **Generate All / Onboarding Generation Flow** (server-side, durable):
   - Client calls `startGenerateAll()` in `generate-all-store.ts`
   - Store persists queue to DB via `POST /api/generate-all/start`
   - Store fires `POST /api/generate-all/execute` as fire-and-forget (server runs up to 540s even if user closes tab)
   - Store polls `GET /api/generate-all/status` every 3s to reflect server-side progress
   - When server marks a step "done", store calls `onStepComplete()` → `router.refresh()` to reload the document
   - The workspace consumes hydrated queue items to keep left-panel and right-panel document states stable across refresh, browser back/forward, and returning to a project. Content existence wins over stale queue state; Product Plan and First Version Plan current-session stream previews can render in the right panel when available, while background queues fall back to durable generating status until saved content exists.
   - The old idle public "Generate All" button is deprecated. The workspace only shows the Generate All status/retry panel while a queue is active, partial, cancelled, or errored.
   - `generation_queue_items` is the source of truth for per-document status, dependencies, attempts, credit state, and generated output references. The legacy `generation_queues.queue` JSON is synchronized for existing UI.
   - Queue rows and queue item rows are user-readable but server-mutable only. Browser clients cannot directly write billing/workflow authority fields such as `source`, `credit_status`, dependencies, attempts, or output refs.
   - Manual Generate All starts rebuild the queue server-side from allowed document types. The server derives source, credit status, credit cost, dependencies, attempts, model ids, run ids, and idempotency keys; client-supplied authority fields are ignored.
   - Bundled onboarding generation is trusted only when the parent queue has server-created onboarding metadata (`mode`, `source`, `version`, and `runId`) and item run metadata matches that queue.
   - Server-side execute route runs dependency-aware batches through the shared `generateProjectDocument()` service with max concurrency 2. Market Research and Launch Plan can run independently; Product Plan waits on Market Research; First Version Plan waits on Product Plan; Design Mockups wait on First Version Plan.
   - Queue start and execution verify current DB state through `active-document-policy.ts`. Already-existing documents are marked `skipped`, linked to their existing `output_table`/`output_id`, and not charged; stale or retried queue items cannot casually create a second active planning document.
   - Per-step: checks cancellation, optionally deducts credits for legacy/manual runs, runs the pipeline, requires a saved output id before marking the item done, updates the normalized item row, and records `output_table`/`output_id`. Mockup generation is project-bundled and has `creditCost: 0`.
   - On step failure: legacy/manual runs refund credits; onboarding runs skip refunds because bundled project creation does not charge per-document credits. Onboarding items retry up to their configured `maxAttempts`.
   - Stale `generating` rows older than the 150s executor lease are reset to `pending` with one retry attempt available from execute/status polling, so interrupted server runs do not strand a queue.
   - Queue status remains `running` while any item is pending or generating. Terminal `partial`/`error` states are only exposed once no active work remains.
   - Cancellation immediately cancels pending work. Already-generating work is acknowledged by the executor so refunds and saved outputs have a single owner.
   - Queue-level status can be `running`, `completed`, `partial`, `cancelled`, or `error`; `partial` means at least one document completed and at least one dependent/remaining document failed or became blocked.
   - Onboarding status is exposed by `/api/projects/[id]/onboarding-status`, which maps the backend queue to loading rows: Overview, Market research, Product Plan, First Version Plan, Design Mockups, and Launch Plan. Overview and Market research are ready when a v2 `competitive-analysis` row exists.
   - Generation is durable — survives browser tab close, page refresh, and network interruptions

8. **App Generation Flow**:
   - Client requests app generation
   - Server validates credits (5 credits required)
   - Server calls Anthropic Claude with project context
   - Claude generates complete app code
   - Server saves deployment record
   - Returns generated code to client

5. **Landing + Waitlist Flow**:
   - Landing page fetches the current registered-user count via Supabase service role access
   - `isWaitlistMode(userCount)` compares the count against `WAITLIST_LIMIT`
   - If the cap is reached, `/` renders waitlist CTAs and posts email captures to `/api/waitlist`
   - Waitlist inserts go into the public `waitlist` table with uniqueness and email-format constraints

6. **Stitch Proxy Flow**:
   - Server receives a Stitch HTML download URL via `/api/stitch/html`
   - Route requires auth, validates the URL host against the allowed Google Stitch CDN domains, and verifies the URL belongs to a saved mockup for a project owned by the current user
   - Server fetches the HTML with timeout/content-size checks and returns it without frame-blocking headers so the MVP live preview can keep rendering through `srcDoc`

7. **Security Hardening Flow**:
   - `next.config.ts` sets baseline security headers: CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, and Permissions-Policy.
   - `src/lib/rate-limit.ts` provides simple in-memory per-user/IP rate limiting for public and expensive endpoints. Distributed rate limiting remains a post-MVP item.
   - `src/lib/credits.ts` centralizes server-only refunds through the Supabase service role. The hardened `refund_credits` RPC is service-role-only.
   - `/api/generate-pdf` requires auth and fetches owned server-side document content by `projectId`, `documentType`, and optional `documentId`; it no longer accepts arbitrary raw markdown from clients.
   - Stripe webhooks are claimed in `stripe_webhook_events` before processing so duplicate Stripe retries do not double-grant credits.
   - Intake project creation uses a short-lived service-role `project_creation_locks` row plus a second allowance check immediately before insert. A single transactional RPC remains tracked for post-MVP hardening.

### Workspace Layout

The project workspace (`/projects/[projectRef]`) uses a dashboard document layout inspired by Pencil. The route parses the UUID from the slugged ref, redirects stale slugs to the canonical `id-name` URL, and silently redirects deprecated `?tab=prompt` links to `#executive-summary`.

```
┌──────────────┬───────────────────┬──────────────────────────────┐
│ ProjectHeader / DashboardShell    │
│ - Editable project name           │
│ - User/account affordances        │
│ - Credit balance                  │
├────────────────────┬──────────────┤
│ AnchorNav          │ ScrollableContent
│ Overview           │ Overview module
│ Market Research    │ Market Research module
│ Product Plan       │ Product Plan markdown/streaming state
│ First Version Plan │ First Version Plan markdown/streaming state
│ Design Mockups     │ Mockup renderer / progress state
│ Launch Plan        │ Launch-plan markdown/progress state
└──────────────┴───────────────────┴──────────────────────────────┘
  300px rail on desktop; horizontal rail on small screens
```

- **`DashboardShell`** — authenticated app shell rendered by `src/app/(dashboard)/layout.tsx`; receives the current user profile and credit balance server-side.
- **`ProjectHeader`** — per-project header with editable project name and account/credit affordances.
- **`AnchorNav`** — scroll-aware document rail. It renders `Queued`, `Generating`, `Needs retry`, or ready check marks from `DocumentGenerationDisplayState`.
- **`ScrollableContent`** — renders Overview, Market Research, Product Plan, First Version Plan, Design Mockups, and Launch Plan as stacked sections. It defers below-the-fold sections by one animation frame and uses generation placeholders when content is not saved yet.
- **`ProjectWorkspace`** — orchestrator component that manages active document/hash state, lazy document loading through `/api/projects/[id]/workspace`, version selection, local/manual generation flags, durable Generate All queue hydration, and dispatches API calls.

### Shared UI Architecture

- **Document registry** — document labels, titles, icons, credit cost, nav visibility, Generate All order, and default models come from `src/lib/document-definitions.ts`; scroll-section anchors live in `src/lib/document-sections.ts`.
- **Idea intake contracts** — typed question, answer, summary, context, and project-name helpers live in `src/lib/intake-*.ts`, `src/lib/project-name-generation.ts`, and `src/lib/prompts/intake-wizard.ts`. `src/lib/intake-examples.ts` owns the configurable example ideas shown in Step 1.
- **Shared auth building blocks** — `AuthFormContent` is the single source of form logic (email/password/Google, validation, success state). It is used by both the `/auth` page and the `AuthModal` overlay. `AuthField` and `AuthPasswordField` are reusable field primitives. `AuthMode` type is exported from `auth-form-content.tsx`.
- **Auth Modal** — `src/components/auth/auth-modal.tsx` is a `"use client"` Radix UI Dialog. It reads `?modal=auth&mode=signin|signup` from the URL, opens over the landing page with a dark blurred overlay (`bg-black/65 backdrop-blur-[4px]`), and closes by clearing URL params. Sign In / Sign Up links on the landing page use `?modal=auth&mode=...` instead of navigating to `/auth`.
- **Project allowance guard** — `src/lib/project-allowance.ts` resolves project allowance from active `subscriptions` joined to `plans`, explicit plan fields/features when present, plan-name fallbacks, and the active subscription or calendar-month window. Free users are treated as a one-project lifetime window, while paid users use the active subscription period or UTC calendar month. The guard runs during final intake project creation before any project row is inserted, then runs again under a short-lived `project_creation_locks` row immediately before insert to reduce concurrent project creation races. The private Supabase-only `Internal Dev` plan name resolves to unmetered project allowance for internal developer accounts; it is not a Stripe/customer-facing plan. Public pricing and checkout use explicit `plans.is_public` and `plans.checkout_enabled` flags instead of display-name filtering.
- **Projects dashboard cards** — `/projects` loads owned projects and allowance status server-side, then renders `DashboardProjectCard` for last-edited labels, hover/focus prefetching of the workspace and competitive document payload, and paid-plan-only delete affordances. Free users see an upgrade prompt; paid users get a confirmation modal before calling `DELETE /api/projects/[id]`.
- **Shared chat primitives** — the general chat and prompt chat surfaces now share composer, avatar, copy button, markdown body, load-more button, and thinking-state primitives plus reusable hooks for copy feedback, textarea autosize, and NDJSON stream consumption.
- **Shared stacked tab navigation** — project document navigation and preferences navigation now use the same stacked tab-nav component so visual changes to the left-side tab pattern can be made in one place.
- **Shared authenticated page shell** — dashboard-level pages such as Projects, Billing, and Preferences use `src/components/layout/app-page-shell.tsx` for consistent page width, responsive padding, heading hierarchy, and action placement.
- **Shared account utilities** — credit formatting, billing portal navigation, brand wordmark rendering, and auth sign-out are centralized in shared utilities/hooks/components and reused across dashboard header/sidebar, billing, settings, and auth views.

### Key Design Patterns

1. **App Router with Route Groups**: Organized routes with shared layouts using `(group-name)` syntax
2. **Server Components by Default**: Pages default to server components; interactive components explicitly marked `"use client"`
3. **Proxy-based Auth Session Refresh**: `src/proxy.ts` delegates to `src/lib/supabase/middleware.ts` to refresh Supabase auth cookies; dashboard route protection also happens in `src/app/(dashboard)/layout.tsx`
4. **Credit System with Database Functions**: PostgreSQL stored procedures for atomic credit operations
5. **In-House Analysis Pipelines**: Competitive analysis uses a 3-step pipeline (Perplexity → Tavily → OpenRouter) with retry logic on external calls; Product Plan, First Version Plan, and Tech Spec use direct OpenRouter calls with detailed prompts. Product Plan uses a shared request helper that matches Prompt Lab defaults and passes the full latest Market Research document through the secure prompt builder; First Version Plan uses a shared request helper that matches Prompt Lab defaults and passes the full latest Product Plan document through the secure prompt builder. OpenRouter long-form text synthesis uses a shared `240s` abort timeout for most text artifacts and a `480s` planning-document timeout for Product Plan and First Version Plan, leaving buffer under the 540s route envelope. Credits are refunded through the service-role `refund_credits` RPC on generation failure.
6. **Server-Side Generate All**: "Generate All" orchestration runs on the server (`/api/generate-all/execute`, `maxDuration=540`) instead of in the browser. Normalized `generation_queue_items` rows track per-document status, dependencies, retries, credit state, and output IDs; `generation_queues.queue` remains a synchronized compatibility snapshot. Queue mutations use trusted server routes/service role after user/project authorization. The Zustand store fires the execute request fire-and-forget and polls DB every 3s. This makes generation durable across tab close, refresh, and network interruptions.
7. **TypeScript-First**: Strict typing throughout, auto-generated database types
8. **Component Composition**: Radix UI primitives + CVA for variants
9. **Optimistic UI Updates**: Immediate feedback with graceful error handling
10. **Shared UI Registries + Hooks**: Repeated view metadata and repeated client behaviors (documents, credits, billing portal, auth sign-out, chat interactions) are centralized into typed registries and reusable hooks/components before page-level assembly
11. **Path Aliases**: Clean imports using `@/*` aliases
12. **Pencil Design System**: Light-mode UI with dark sidebar; CSS custom properties for theming; Hanken Grotesk + Fira Mono typography
13. **Fixed Default Models Per Tab**: AI model selection was removed from the UI. Direct document routes use fixed defaults in their route files, while Generate All defaults live in `src/lib/document-definitions.ts` (`GENERATE_ALL_DEFAULT_MODELS`). `src/lib/prompt-chat-config.ts` still exports `DEFAULT_MODELS` for compatibility with older imports.
14. **Generate-Missing-Only Documents**: The Generate button is hidden after a document is successfully generated, and server routes also enforce one active planning document per project/document type by default. Direct duplicate API requests return `200 skipped` with existing output metadata and no credit charge. Failed generations (no content saved) naturally re-expose the button for retry. Future versioning must be introduced as a separate explicit action.
15. **PDF-Only Export**: Documents export as PDF only (markdown download removed). The header shows a single "Download PDF" button.
16. **AI-Generated Project Name**: Wizard-created projects generate a short name during final intake submission before the workspace opens. Legacy Prompt-tab project starts are deprecated and no longer generate project names. `isNameSet` state (in `ProjectWorkspace`) gates editing — initialized as `project.name !== "Untitled" || !!project.description` so existing and wizard-created projects are never locked.
17. **URL-Driven Auth Modal**: Landing page auth uses `?modal=auth&mode=signin|signup` URL params to drive a Radix Dialog modal, keeping users in context. The `/auth` page is unchanged and still used for email confirmation redirects. Both surfaces share `AuthFormContent`. No new dependencies — `@radix-ui/react-dialog` was already installed.
18. **WCAG AA Contrast Compliance**: `--muted-foreground` and `--text-muted` are `#6B7280` (4.61:1 on white). Form labels use `text-text-secondary` (#666666, 5.74:1). The `✦ AI naming` badge uses `bg-violet-100 text-violet-800` (8.4:1). Never use `#999999` for text on white backgrounds — it fails at 2.85:1.

### Intake Data Model

- **`pending_intakes`** — short-lived auth handoff table with opaque `token`, `idea_text`, `source`, `expires_at`, `claimed_at`, `claimed_by`, and timestamps. Pending records expire after 24 hours and are claimed after successful project creation.
- **`project_intakes`** — one canonical structured intake per project, keyed by `project_id`, with `schema_version`, `original_idea`, `questions_json`, `answers_json`, `raw_payload_json`, `generated_summary`, `source`, and timestamps. RLS restricts rows to the owning user. Legacy projects with a readable `projects.description` and no existing intake are backfilled non-destructively with `source = 'prompt-chat'`; existing `prompt_chat_messages` rows are preserved.

### Mermaid Diagram Expansion Feature

The `MarkdownRenderer` component includes an interactive Mermaid diagram viewer with expansion capabilities:

**Compact View**:
- Diagrams fit within the document width using `w-full overflow-hidden` (no horizontal scrolling)
- Expand button appears in the bottom-right corner on hover (`opacity-0 group-hover:opacity-100`)
- Uses lucide-react `Maximize2` icon

**Expanded Modal View**:
- Triggered by clicking the expand button
- Full-screen modal with `calc(100vw-4rem)` × `calc(100vh-4rem)` sizing (2rem margins on all sides)
- Dark backdrop with blur (`bg-black/50 backdrop-blur-sm`)
- Close button (top-right) with `Minimize2` icon
- Click outside or press `Escape` to close
- Body scroll prevention when modal is open
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
│   │   ├── analyses/[id]/route.ts     # PATCH update analysis content
│   │   ├── prds/[id]/route.ts         # PATCH update PRD content
│   │   ├── mvp-plans/[id]/route.ts    # PATCH update First Version Plan content
│   │   ├── tech-specs/[id]/route.ts   # PATCH update tech spec content
│   │   ├── waitlist/route.ts          # GET/POST waitlist status + signup
│   │   ├── mockups/generate/route.ts  # OpenRouter image mockup generation
│   │   ├── mockups/image/route.ts     # Authenticated proxy for stored OpenRouter mockup images
│   │   ├── stitch/html/route.ts       # Proxy legacy Stitch-hosted HTML for safe rendering
│   │   ├── generate-pdf/route.ts      # PDF generation support route
│   │   ├── launch/plan/route.ts       # Launch-plan generation route
│   │   ├── generate-app/route.ts      # POST generate app code
│   │   ├── generate-all/
│   │   │   ├── start/route.ts         # POST create/reset generation_queues row
│   │   │   ├── execute/route.ts       # POST server-side pipeline orchestrator (maxDuration=540)
│   │   │   ├── status/route.ts        # GET read queue row for polling
│   │   │   ├── update/route.ts        # PATCH update queue fields
│   │   │   └── cancel/route.ts        # POST mark queue as cancelled
│   │   ├── projects/[id]/onboarding-status/route.ts # GET onboarding loading rows + redirect readiness
│   │   ├── projects/[id]/status/route.ts # GET lightweight document count snapshot
│   │   ├── projects/[id]/workspace/route.ts # GET lazy workspace document payload
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
│   │   ├── dropdown-menu.tsx, tabs.tsx  # Radix UI
│   │   ├── markdown-renderer.tsx # Markdown with Mermaid + syntax highlighting
│   │   └── ...
│   ├── layout/                   # Layout components
│   │   ├── sidebar.tsx           # Legacy dashboard sidebar (retained)
│   │   ├── header.tsx            # Legacy dashboard header (retained)
│   │   ├── anchor-nav.tsx        # Scroll workspace nav with durable generation status labels
│   │   ├── scrollable-content.tsx # Scroll workspace document renderer
│   │   ├── document-nav.tsx      # Legacy pipeline-step navigation
│   │   └── content-editor.tsx    # Legacy active document view
│   ├── workspace/                # Workspace orchestration
│   │   ├── project-workspace.tsx      # Lazy-loading scroll workspace orchestrator
│   │   └── generate-all-hydrator.tsx  # Keeps store callbacks fresh; triggers hydrate() once per project
│   ├── auth/                     # Auth components
│   │   ├── auth-form-content.tsx # Shared form logic (email, password, Google OAuth, mode-switching)
│   │   ├── auth-modal.tsx        # Radix Dialog modal for landing page Sign In / Sign Up
│   │   ├── auth-field.tsx        # Reusable email/text input field
│   │   └── auth-password-field.tsx  # Password field with show/hide toggle
│   ├── chat/                     # Chat feature
│   │   ├── chat-interface.tsx    # General chat UI
│   │   └── prompt-chat-interface.tsx  # Deprecated Prompt Chat UI component retained for history/cleanup only
│   └── analysis/                 # Analysis feature
│       └── analysis-panel.tsx    # Analysis/PRD/TechSpec UI
│
├── lib/                          # Utilities & services
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server-side client
│   │   └── middleware.ts         # Auth middleware logic
│   ├── stripe.ts                 # Stripe singleton
│   ├── openrouter.ts             # OpenRouter AI API (chat, gap-analysis fallback)
│   ├── analysis-pipelines.ts     # In-house analysis orchestration (market research, Product Plan, First Version Plan, tech spec)
│   ├── openrouter-image-mockup-format.ts # Client-safe OpenRouter image mockup JSON parser
│   ├── openrouter-image-mockup-pipeline.ts # OpenRouter image mockup generation + Supabase Storage upload
│   ├── stitch/client.ts          # Legacy Stitch SDK wrapper + response parsers
│   ├── stitch-pipeline.ts        # Legacy Stitch mockup generation logic retained for compatibility
│   ├── waitlist.ts               # Waitlist business rules and validation
│   ├── perplexity.ts             # Perplexity API client (competitor search, with retry)
│   ├── tavily.ts                 # Tavily API client (URL content extraction, with retry)
│   ├── with-retry.ts             # Shared retry utility for external API calls (3 retries, exponential backoff on 429/5xx)
│   ├── pdf-utils.ts              # PDF export client helper for owned server-rendered documents
│   ├── prompt-chat-config.ts     # DEFAULT_MODELS (per-tab fixed models) + DEFAULT_MODEL fallback
│   └── utils.ts                  # Utility functions & CREDIT_COSTS
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
| `components/layout/` | Layout & navigation components | Modifying sidebar, document nav, or content editor |
| `components/workspace/` | Workspace orchestration | Changing the project workspace flow or column layout |
| `components/chat/` | Chat feature components | Enhancing chat functionality |
| `components/analysis/` | Analysis feature components | Adding analysis features |
| `lib/` | Business logic & external APIs | Integrating new services like waitlist logic, Stitch, or AI pipelines |
| `lib/prompts/` | **All AI system prompts** — one file per document type | Editing any AI prompt or adding new document generation features |
| `lib/supabase/` | Database & auth logic | Database operations |
| `lib/pdf-utils.ts` | PDF export client helper | Changing PDF request shape or download handling |
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
| `prompt-chat.ts` | `PROMPT_CHAT_SYSTEM`, `IDEA_SUMMARY_PROMPT`, `POST_SUMMARY_SYSTEM` | `prompt-chat-config.ts`, `api/prompt-chat/` |
| `general-chat.ts` | `buildGeneralChatSystemPrompt()` | `openrouter.ts` |
| ~~`document-edit.ts`~~ | *(deleted — Edit with AI feature removed)* | — |
| `mockups.ts` | `buildMockupPrompt()` | `api/mockups/generate/` |
| `competitor-search.ts` | `COMPETITOR_SEARCH_SYSTEM_PROMPT`, `buildCompetitorSearchUserPrompt()` | `perplexity.ts` |
| `app-generation.ts` | `APP_TYPE_PROMPTS`, `buildAppGenerationPrompt()` | `api/generate-app/` |
| `legacy-fallback.ts` | `LEGACY_ANALYSIS_PROMPTS` | `openrouter.ts` (gap-analysis fallback) |
| `index.ts` | Barrel re-export of all above | Everything |

### Market Research V2 Contract

- Market Research v2 lives in markdown only; `analyses.content` remains the source of truth.
- New competitive-analysis rows include metadata:
  - `document_version: "competitive-analysis-v2"`
  - `prompt_version: "competitive-analysis-v2-2026-05-17-founder-friendly-headings"`
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
- **Components**: `kebab-case.tsx` (e.g., `chat-interface.tsx`)
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
const CREDIT_COSTS = { ... }
const ANALYSIS_PROMPTS = { ... }

// Props interfaces: {ComponentName}Props
interface ChatInterfaceProps { ... }
interface AnalysisPanelProps { ... }

// Type aliases: PascalCase or lowercase
type AnalysisType = 'competitive-analysis' | 'prd' | 'mvp-plan' | 'tech-spec'
type DocumentType = 'prompt' | 'competitive' | 'prd' | 'mvp' | 'mockups' | 'techspec' | 'deploy' | 'launch'
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
402 - Payment Required (insufficient credits)
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
type DocumentType = 'prompt' | 'competitive' | 'prd' | 'mvp' | 'mockups' | 'techspec' | 'deploy' | 'launch'

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
ANTHROPIC_API_KEY=sk-ant-xxx...

# Stripe
STRIPE_SECRET_KEY=sk_secret_xxx...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx...

# Perplexity (competitor research in competitive analysis)
PERPLEXITY_API_KEY=pplx-xxx...

# Tavily (URL content extraction in competitive analysis)
TAVILY_API_KEY=tvly-xxx...

# OpenRouter image mockups and legacy Stitch design tooling
OPENROUTER_MOCKUP_PLANNER_MODEL=anthropic/claude-sonnet-4-6 # optional; falls back to OPENROUTER_ANALYSIS_MODEL
OPENROUTER_MOCKUP_IMAGE_MODEL=openai/gpt-5.4-image-2
# Optional provider-specific image_config overrides; leave unset unless the selected provider supports them.
# OPENROUTER_MOCKUP_IMAGE_ASPECT_RATIO=21:9
# OPENROUTER_MOCKUP_IMAGE_SIZE=1K
OPENROUTER_MOCKUP_IMAGE_MAX_TOKENS=16384
OPENROUTER_MOCKUP_PLANNER_MAX_TOKENS=16384
SUPABASE_MOCKUP_STORAGE_BUCKET=mockups
STITCH_API_KEY=stitch_xxx... # legacy saved Stitch mockup compatibility / tooling

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
   - `profiles` - User profiles with credit balance
   - `projects` - Business idea projects
   - `messages` - Chat message history
   - `analyses` - Competitive and gap analyses
   - `prds` - Product requirement documents
   - `mvp_plans` - MVP development plans
   - `mockups` - OpenRouter image mockup documents and legacy Stitch mockup documents
   - `tech_specs` - Technical specifications
   - `deployments` - Generated app deployments
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
  "guard:chunky:dev": "CHECK_DEV_VENDOR=1 node ./scripts/guard-webpack-chunky.mjs",
  "stitch:fixture": "node scripts/stitch-fetch-fixture.mjs"
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

- **mockups**: OpenRouter image mockup documents and legacy Stitch mockup documents
  - Fields: `id`, `project_id`, `content`, `model_used`, `metadata`, `created_at`, `updated_at`
  - RLS: Users can only access mockups from their projects

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

- **deployments**: Generated applications
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
- **POST /api/chat**: Send chat message, get AI response (general chat)
  - Body: `{ projectId, message }`
  - Returns: `{ id, content, role, created_at }`
  - Cost: 1 credit

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
  - Query: `docs=competitive,prd,mvp,mockups,launch` and optional `tab`
  - Returns project summary, credit balance, structured-intake presence, and only the requested document collections
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
    - Competitive: Perplexity → Tavily → OpenRouter synthesis (graceful degradation)
    - PRD/MVP/Tech Spec: Direct OpenRouter calls with detailed system prompts
  - Competitive-analysis inserts metadata with `document_version` and `prompt_version` for renderer compatibility

- **POST /api/mockups/generate**: Generate OpenRouter storyboard mockups
  - Body: `{ projectId, mvpPlan, projectName, stream? }`
  - Returns: `{ content, model, source }` — content is JSON with `{ type: "openrouter-image-v2", options: [{label, title, imageUrl, storagePath, description, screens, width?, height?}] }`; duplicate requests return `200 OK` with `{ skipped: true, existingDocument }`
  - Cost: project-bundled, no credits consumed
  - Uses a hidden design plan plus OpenRouter image generation for 3 static storyboard alternatives
  - Route `maxDuration`: 800s
  - Generation logic lives in `src/lib/openrouter-image-mockup-pipeline.ts` and is shared with server-side document generation

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
  - Dependencies: competitive → prd → mvp → mockups; launch has no dependency and may run independently
  - Per-step: checks for an existing active document, deducts credits for legacy/manual runs only when generation is needed, skips credit charging for bundled onboarding runs, runs pipeline, saves to the correct table, and records `output_table`/`output_id`
  - Checks for cancellation before each batch
  - Refunds credits on legacy/manual step failure and marks dependent pending items `blocked`
  - Route `maxDuration`: 540s — durable even if browser tab closes

- **GET /api/generate-all/status**: Poll for queue progress
  - Query: `?projectId=xxx`
  - Returns `{ queue: generation_queues_row }` with the queue/current index/status derived from normalized item rows so polling sees in-progress item changes
  - Called every 3s by the Zustand store while generation is running; idle manual Generate All controls are no longer rendered, but the status/retry panel appears for active or terminal queue states

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

- **GET /api/stitch/html**: Proxy Stitch-hosted HTML through the server
  - Query: `?url=<encoded-url>&projectId=<id>` or `?url=<encoded-url>&mockupId=<id>`
  - Validates the hostname against allowed Google Stitch CDN hosts and verifies the URL belongs to a saved mockup owned by the current user
  - Returns raw HTML suitable for safe iframe/srcdoc rendering

- **PATCH /api/analyses/[id]**: Update analysis content
  - Body: `{ content }`
  - Returns: `{ data: updated_analysis }`

- **PATCH /api/prds/[id]**: Update PRD content
  - Body: `{ content }`
  - Returns: `{ data: updated_prd }`

- **PATCH /api/mvp-plans/[id]**: Update First Version Plan content
  - Body: `{ content }`
  - Returns: `{ data: updated_mvp_plan }`

- **PATCH /api/mockups/[id]**: Update mockup content
  - Body: `{ content }`
  - Returns: `{ data: updated_mockup }`

- **PATCH /api/tech-specs/[id]**: Update tech spec content
  - Body: `{ content }`
  - Returns: `{ data: updated_tech_spec }`

### App Generation
- **POST /api/generate-app**: Generate application code
  - Body: `{ projectId, appType }`
  - Types: `static`, `dynamic`, `spa`, `pwa`
  - Returns: `{ id, code, url, created_at }`
  - Cost: 50 credits (`static`), 100 (`dynamic`), 150 (`spa`), or 200 (`pwa`)

### Stripe
- **POST /api/stripe/checkout**: Create checkout session
  - Body: `{ priceId, planId }`
  - Returns: `{ url }` (Stripe-hosted checkout page URL)
  - Creates or reuses Stripe customer (linked via `profiles.stripe_customer_id`)
  - Validates the requested plan server-side against an active `plans` row whose `stripe_price_id` exactly matches `priceId`
  - Sets `mode: "subscription"` for recurring billing
  - Passes `supabase_user_id` and `plan_id` in session metadata

- **POST /api/stripe/portal**: Access customer portal
  - Returns: `{ url }` (Stripe billing portal URL)
  - Requires existing `stripe_customer_id` on the user's profile

- **POST /api/stripe/webhook**: Handle Stripe events
  - Verifies webhook signature using `STRIPE_WEBHOOK_SECRET`
  - Uses Supabase service role client (no user context) for database operations
  - Handled events:
    - `checkout.session.completed` — creates subscription record and adds credits via `add_credits()` RPC only for active Stripe-backed plans
    - `customer.subscription.updated` — syncs status, cancel_at_period_end, period_end
    - `customer.subscription.deleted` — marks subscription as canceled
    - `invoice.paid` (billing_reason = `subscription_cycle`) — monthly credit renewal via `add_credits()` RPC

---

## 9. Credit System

### Credit Costs

| Action | Cost |
|--------|------|
| Chat message (general) | 1 credit |
| Prompt chat message (deprecated) | Not available |
| Inline document edit | Not available |
| Competitive Analysis | 20 credits with current default model |
| Product Plan Generation | 15 credits with current default model |
| First Version Plan Generation | 15 credits with current default model |
| Mockup Generation | Included in project generation |
| Launch Plan | 5 credits |
| Tech Spec Generation | 15 credits with current default model |
| App Generation (Deploy) | 50-200 credits by app type |

### Credit Management

- **Consumption**: Atomic operation via `consume_credits()` stored procedure. Non-bundled generation costs come from `src/lib/token-economics.ts` (`BASE_ACTION_TOKENS`, model multipliers, and `getTokenCost()`).
- **Refund**: Via service-role-only `refund_credits()` through `src/lib/credits.ts` — called on generation failure in credit-billed analysis, chat, prompt chat, app generation, launch plan generation, and billable Generate All queue paths. Mockup generation is project-bundled and does not consume/refund credits.
- **Addition**: Via `add_credits()` (subscription refill, purchases)
- **Balance Check**: Real-time via `get_credit_balance()`
- **History**: All transactions logged in `credits_history`

### Subscription Plans

| Plan | Credits/Month | Price | Stripe Product ID | Stripe Price ID |
|------|--------------|-------|-------------------|-----------------|
| **Free** | 10 | $0 | — | — |
| **Starter** | 100 | $19/mo | `prod_Uere21C5j6LIO1` | `price_1TfXvFRZYXj2bJrBuC6JaIfj` |
| **Pro** | 500 | $49/mo | `prod_UerevEhLASQiac` | `price_1TfXvFRZYXj2bJrB8vg41zH0` |
| **Enterprise** | 2,500 | $199/mo | `prod_UeregY7eokD8gA` | `price_1TfXvERZYXj2bJrB2Seb3YKh` |

### Stripe Integration Details

- **Account**: Makercompass (`acct_1TfXV9RZYXj2bJrB`) — Test Mode
- **API Version**: `2026-01-28.clover`
- **Singleton Client**: `src/lib/stripe.ts` — lazy-initialized Stripe instance via `getStripeClient()` with a `Proxy` export for ergonomic access
- **Customer Linking**: Stripe customer ID stored in `profiles.stripe_customer_id`; created on first checkout and reused thereafter
- **Checkout Flow**: Server-side redirect to Stripe-hosted checkout (no Stripe.js Elements needed)
- **Customer Portal Configuration**: `bpc_1TfY2eRZYXj2bJrBcPHQWM7q` — test-mode portal for plan switching, payment method updates, invoice history, and cancel-at-period-end
- **Webhook Processing**: Uses `SUPABASE_SERVICE_ROLE_KEY` (service role) to bypass RLS for subscription and credit updates
- **Billing UI**: `src/app/(dashboard)/billing/page.tsx` — displays plan cards, current subscription, credit balance, and credit cost reference

---

## 10. Common Development Tasks

### Adding a New Page

```bash
# 1. Create page file
src/app/(dashboard)/new-page/page.tsx

# 2. Add to navigation (if needed)
src/components/layout/sidebar.tsx or src/components/layout/anchor-nav.tsx
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

**Credit System Issues**
- Verify `consume_credits()` function exists in database
- Check credit balance in `profiles` table
- Review `credits_history` for transaction log

**Analysis Pipeline Issues**
- Competitive analysis uses a 3-step pipeline: if Perplexity or Tavily fail, the pipeline degrades gracefully (logs warnings, continues with available data)
- Check server logs for `[CompetitiveAnalysis]` prefixed messages to trace pipeline step failures
- Ensure `PERPLEXITY_API_KEY` and `TAVILY_API_KEY` are set in environment for full competitive analysis quality
- External API calls (Perplexity, Tavily) retry up to 3 times on 429/5xx errors with 1s/2s/4s backoff

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

**PDF Export Issues**
- PDF export posts `projectId`, `documentType`, and optional `documentId` to `/api/generate-pdf`; the server fetches owned content and renders through Puppeteer with JavaScript disabled.
- `marked` parses Markdown to HTML client-side; ensure the content is valid Markdown

---

## 12. Key Files Reference

| File | Purpose |
|------|---------|
| [src/app/layout.tsx](src/app/layout.tsx) | Root layout — loads Hanken Grotesk + Fira Mono fonts |
| [src/app/globals.css](src/app/globals.css) | Pencil design tokens (CSS custom properties), status badge styles, scrollbar styles, Mermaid diagram styles (light/dark mode with media query) |
| [src/app/(dashboard)/layout.tsx](src/app/(dashboard)/layout.tsx) | Dashboard layout — verifies auth and renders `DashboardShell` with user profile and credits |
| [src/components/layout/dashboard-shell.tsx](src/components/layout/dashboard-shell.tsx) | Authenticated dashboard shell for top-level dashboard, projects, billing, and preferences pages |
| [src/app/(dashboard)/projects/page.tsx](src/app/(dashboard)/projects/page.tsx) | Projects dashboard — loads owned projects plus allowance status and renders project cards with paid-plan delete gating |
| [src/components/projects/dashboard-project-card.tsx](src/components/projects/dashboard-project-card.tsx) | Interactive project card with relative updated time, workspace prefetch/warmup, delete confirmation, and free-plan upgrade prompt |
| [src/app/(dashboard)/projects/[projectRef]/page.tsx](src/app/(dashboard)/projects/[projectRef]/page.tsx) | Project page — parses slugged project refs, canonicalizes stale URLs, blocks deprecated prompt tabs, and passes the project shell to `ProjectWorkspace` |
| [src/app/api/projects/[id]/route.ts](src/app/api/projects/[id]/route.ts) | PATCH/GET project details and ownership-scoped paid-plan DELETE |
| [src/app/api/projects/[id]/workspace/route.ts](src/app/api/projects/[id]/workspace/route.ts) | Lazy workspace payload endpoint for requested document collections, project metadata, credits, and structured-intake presence |
| [src/app/api/projects/[id]/status/route.ts](src/app/api/projects/[id]/status/route.ts) | Lightweight document-count snapshot used by generation polling |
| [src/app/dev/prompt-lab/page.tsx](src/app/dev/prompt-lab/page.tsx) | Local-development-only Prompt Lab page for isolated prompt iteration against existing projects |
| [src/app/dev/mockup-renderer-preview/page.tsx](src/app/dev/mockup-renderer-preview/page.tsx) | Local-development-only visual fixture page for the OpenRouter storyboard mockup renderer |
| [src/components/dev/prompt-lab-client.tsx](src/components/dev/prompt-lab-client.tsx) | Prompt Lab workbench UI with project/artifact selectors, prompt editors, saved drafts/runs, workspace-style preview, and lab-only renderer playground |
| [src/app/api/dev/prompt-lab/context/route.ts](src/app/api/dev/prompt-lab/context/route.ts) | Dev-only endpoint that loads owned project context, upstream artifacts, and default prompts for one artifact |
| [src/app/api/dev/prompt-lab/run/route.ts](src/app/api/dev/prompt-lab/run/route.ts) | Dev-only isolated generation endpoint that saves Prompt Lab run history without writing canonical artifacts |
| [src/app/api/dev/prompt-lab/drafts/route.ts](src/app/api/dev/prompt-lab/drafts/route.ts) | Dev-only endpoint for listing and saving Prompt Lab prompt drafts |
| [src/app/api/dev/prompt-lab/runs/route.ts](src/app/api/dev/prompt-lab/runs/route.ts) | Dev-only endpoint for listing recent Prompt Lab runs |
| [src/app/api/dev/prompt-lab/mockup-image/route.ts](src/app/api/dev/prompt-lab/mockup-image/route.ts) | Dev-only proxy for private mockup images associated with Prompt Lab runs |
| [src/app/page.tsx](src/app/page.tsx) | Landing page with dynamic signup vs waitlist CTA rendering, authenticated-user redirect, and Figma-matched hero artwork |
| [src/components/landing/hero-artwork.tsx](src/components/landing/hero-artwork.tsx) | Desktop-only layered raster hero artwork using assets from `public/landing/hero/` |
| [src/components/landing/waitlist-form.tsx](src/components/landing/waitlist-form.tsx) | Public waitlist email capture form for the landing page |
| [src/app/api/prompt-chat/route.ts](src/app/api/prompt-chat/route.ts) | Deprecated Prompt Chat endpoint; returns `410 Gone` |
| [src/app/api/analysis/[type]/route.ts](src/app/api/analysis/[type]/route.ts) | Analysis generation using in-house pipelines |
| [src/app/api/waitlist/route.ts](src/app/api/waitlist/route.ts) | Waitlist status endpoint and public waitlist signup handler |
| [src/app/api/mockups/image/route.ts](src/app/api/mockups/image/route.ts) | Authenticated proxy for private Supabase Storage mockup images |
| [src/app/api/stitch/html/route.ts](src/app/api/stitch/html/route.ts) | Server-side proxy for legacy Stitch HTML downloads |
| [src/components/workspace/project-workspace.tsx](src/components/workspace/project-workspace.tsx) | Lazy-loading scroll workspace orchestrator |
| [src/components/layout/anchor-nav.tsx](src/components/layout/anchor-nav.tsx) | Sticky/horizontal document rail for Overview, Market Research, Product Plan, First Version Plan, Design Mockups, and Launch Plan with queued/generating/ready/needs-retry indicators |
| [src/components/layout/scrollable-content.tsx](src/components/layout/scrollable-content.tsx) | Scrollable document body renderer with deferred sections, queue-aware placeholders, PRD/MVP completed-document block rendering, and mockup/status modules |
| [src/components/layout/sidebar.tsx](src/components/layout/sidebar.tsx) | Legacy dashboard sidebar retained for existing layouts |
| [src/components/layout/app-page-shell.tsx](src/components/layout/app-page-shell.tsx) | Shared authenticated page shell and header for consistent dashboard page spacing and hierarchy |
| [src/components/layout/document-nav.tsx](src/components/layout/document-nav.tsx) | Legacy pipeline-step nav retained for older document surfaces |
| [src/components/layout/content-editor.tsx](src/components/layout/content-editor.tsx) | Legacy active-document view retained while the main workspace uses `ScrollableContent` |
| [src/lib/document-definitions.ts](src/lib/document-definitions.ts) | Shared typed document registry for workspace tabs, editor titles, icons, credit cost, and nav visibility |
| [src/lib/document-sections.ts](src/lib/document-sections.ts) | Scroll workspace section registry and anchor IDs for Overview, Market Research, Product Plan, First Version Plan, Design Mockups, and Launch Plan |
| [src/lib/document-generation-display-status.ts](src/lib/document-generation-display-status.ts) | Pure helper that merges content existence, durable queue state, local generation flags, PRD/MVP stream previews, and optional mockup option statuses into nav/body display states |
| [src/lib/active-document-policy.ts](src/lib/active-document-policy.ts) | Shared active-document identity and lookup helper used to prevent duplicate default document generation across direct APIs and Generate All/onboarding |
| [src/components/analysis/competitive-analysis-document.tsx](src/components/analysis/competitive-analysis-document.tsx) | Market Research v2 hybrid modules/markdown renderer with legacy notice and upgrade CTA |
| [src/components/analysis/planning-document-blocks.tsx](src/components/analysis/planning-document-blocks.tsx) | PRD and MVP block renderers that use the Pencil-style planning document parser/view-model layer with markdown fallback, PRD context/vision cards, compact labeled PRD prose rows, vertically stacked PRD requirement categories, user-story acceptance criteria cards, single-profile persona fallback labeling, and MVP overview placement |
| [src/components/ui/markdown-renderer.tsx](src/components/ui/markdown-renderer.tsx) | Markdown renderer with lazy syntax highlighting, responsive table column sizing, and beautiful-mermaid diagrams with expand/pan/zoom controls |
| [src/components/ui/mockup-renderer.tsx](src/components/ui/mockup-renderer.tsx) | Mockup renderer for OpenRouter storyboard images with screen captions, json-render specs/patches, legacy Stitch HTML records, and legacy ASCII mockups |
| [src/components/chat/chat-interface.tsx](src/components/chat/chat-interface.tsx) | General chat UI component |
| [src/components/chat/prompt-chat-interface.tsx](src/components/chat/prompt-chat-interface.tsx) | Deprecated Prompt Chat UI retained for cleanup/history reference |
| [src/components/chat/chat-primitives.tsx](src/components/chat/chat-primitives.tsx) | Shared chat presentation primitives used by both chat surfaces |
| [src/components/auth/auth-header.tsx](src/components/auth/auth-header.tsx) | Shared auth header variants for auth, forgot-password, and reset-password views |
| [src/components/auth/auth-field.tsx](src/components/auth/auth-field.tsx) | Shared labeled auth input field |
| [src/components/auth/auth-password-field.tsx](src/components/auth/auth-password-field.tsx) | Shared auth password field with show/hide toggle |
| [src/hooks/use-billing-portal.ts](src/hooks/use-billing-portal.ts) | Shared client hook to open Stripe billing portal |
| [src/hooks/use-auth-signout.ts](src/hooks/use-auth-signout.ts) | Shared client hook for Supabase sign-out + redirect |
| [src/hooks/use-auto-resizing-textarea.ts](src/hooks/use-auto-resizing-textarea.ts) | Shared hook for composer textarea autosizing |
| [src/hooks/use-copy-feedback.ts](src/hooks/use-copy-feedback.ts) | Shared hook for clipboard copy feedback state |
| [src/lib/credits.ts](src/lib/credits.ts) | Shared credit formatting and unlimited-credit helpers |
| [src/lib/ndjson-stream.ts](src/lib/ndjson-stream.ts) | Shared NDJSON stream reader used by chat UIs |
| [src/lib/project-allowance.ts](src/lib/project-allowance.ts) | Project allowance resolver for free lifetime limits, paid monthly/subscription windows, plan-field/features fallback, and unmetered internal plans |
| [src/lib/project-allowance.test.ts](src/lib/project-allowance.test.ts) | Node test coverage for allowance windows, free lifetime limits, plan parsing, unlimited plans, and failure cases |
| [src/lib/project-routing.ts](src/lib/project-routing.ts) | Slugged project URL helpers: `buildProjectRef`, `parseProjectRef`, and `getProjectUrl` |
| [src/lib/workspace-tab-policy.ts](src/lib/workspace-tab-policy.ts) | Workspace tab resolution and deprecated prompt-tab redirect policy |
| [src/lib/json-render/catalog.ts](src/lib/json-render/catalog.ts) | Allowed json-render component catalog and mockup system prompt context |
| [src/lib/json-render/registry.tsx](src/lib/json-render/registry.tsx) | json-render registry backed by `@json-render/shadcn` components |
| [src/lib/prompt-lab.ts](src/lib/prompt-lab.ts) | Server-side Prompt Lab prompt composition, local-dev guard, isolated text generation with shared long-text timeout, and single-option mockup run helper |
| [src/lib/prompt-lab-shared.ts](src/lib/prompt-lab-shared.ts) | Client-safe Prompt Lab artifact labels and default launch brief constants |
| [src/lib/openrouter-timeout.ts](src/lib/openrouter-timeout.ts) | Shared OpenRouter long-text timeout constants, abort detection, and user-facing timeout message helpers |
| [src/lib/prompts/launch-plan.ts](src/lib/prompts/launch-plan.ts) | AI Launch Plan system prompt and secure user prompt builder |
| [src/app/api/analyses/[id]/route.ts](src/app/api/analyses/[id]/route.ts) | PATCH endpoint to update analysis content |
| [src/app/api/prds/[id]/route.ts](src/app/api/prds/[id]/route.ts) | PATCH endpoint to update PRD content |
| [src/app/api/mvp-plans/[id]/route.ts](src/app/api/mvp-plans/[id]/route.ts) | PATCH endpoint to update First Version Plan content |
| [src/app/api/mockups/generate/route.ts](src/app/api/mockups/generate/route.ts) | POST endpoint to generate OpenRouter storyboard mockup alternatives without credit consumption. |
| [src/app/api/mockups/generate-option/route.ts](src/app/api/mockups/generate-option/route.ts) | POST endpoint to generate one OpenRouter storyboard option for manual workspace generation. |
| [src/app/api/mockups/finalize/route.ts](src/app/api/mockups/finalize/route.ts) | POST endpoint to validate and finalize three saved OpenRouter storyboard options into the canonical mockups document row. |
| [src/app/api/mockups/recover-options/route.ts](src/app/api/mockups/recover-options/route.ts) | POST endpoint to recover already-uploaded storyboard option images for a mockup run before retrying OpenRouter generation. |
| [src/app/api/mockups/fixture/route.ts](src/app/api/mockups/fixture/route.ts) | POST endpoint to save no-credit storyboard fixture mockups for local display and retry testing. |
| [src/app/api/mockups/[id]/route.ts](src/app/api/mockups/[id]/route.ts) | PATCH endpoint to update mockup content |
| [src/app/api/tech-specs/[id]/route.ts](src/app/api/tech-specs/[id]/route.ts) | PATCH endpoint to update tech spec content |
| [src/components/analysis/analysis-panel.tsx](src/components/analysis/analysis-panel.tsx) | Analysis UI component |
| [src/lib/competitive-analysis-v2.ts](src/lib/competitive-analysis-v2.ts) | Market Research v2 section contract, legacy/v2 view model helpers, parser utilities, and legacy heading aliases |
| [src/lib/planning-document-parser.ts](src/lib/planning-document-parser.ts) | Shared markdown section, list, paragraph, source cleanup, and table parser utilities for PRD/MVP block rendering |
| [src/lib/prd-document.ts](src/lib/prd-document.ts) | PRD parser/view-model helpers used by the PRD block renderer, including persona/profile grouping fallback |
| [src/lib/mvp-plan-document.ts](src/lib/mvp-plan-document.ts) | First Version Plan parser/view-model helpers used by the First Version Plan block renderer, including direct-content fallback sections |
| [src/lib/analysis-pipelines.ts](src/lib/analysis-pipelines.ts) | In-house analysis orchestration (market research, Product Plan, First Version Plan, tech spec). Most OpenRouter long-form text calls use the shared 240s AbortSignal timeout; Product Plan and First Version Plan use the 480s planning-document timeout. |
| [src/lib/mockup-design-plan.ts](src/lib/mockup-design-plan.ts) | Hidden mockup design-plan prompt, schema parser, and validation for platform, happy path, platform-specific screen limits, and three visual directions. |
| [src/lib/openrouter-image-mockup-pipeline.ts](src/lib/openrouter-image-mockup-pipeline.ts) | OpenRouter-only storyboard mockup generation, image config handling, decoded dimension capture, and Supabase Storage upload. |
| [src/lib/openrouter-image-mockup-format.ts](src/lib/openrouter-image-mockup-format.ts) | Client-safe parser/helpers for OpenRouter image/storyboard mockup JSON. |
| [src/lib/stitch-pipeline.ts](src/lib/stitch-pipeline.ts) | Legacy Stitch mockup generation retained for compatibility. |
| [src/lib/with-retry.ts](src/lib/with-retry.ts) | Shared retry utility — 3 retries, exponential backoff [1s/2s/4s], retries on 429/5xx/network errors |
| [src/lib/perplexity.ts](src/lib/perplexity.ts) | Perplexity API client for competitor search (wrapped with withRetry) |
| [src/lib/tavily.ts](src/lib/tavily.ts) | Tavily API client for URL content extraction (wrapped with withRetry) |
| [src/stores/generate-all-store.ts](src/stores/generate-all-store.ts) | Zustand store for Generate All UI state. Fires execute route fire-and-forget; polls status every 3s. |
| [src/components/workspace/generate-all-hydrator.tsx](src/components/workspace/generate-all-hydrator.tsx) | Thin bridge: keeps store callbacks fresh each render; runs one-time DB hydration per project |
| [src/lib/generation-queue-service.ts](src/lib/generation-queue-service.ts) | Normalized queue item helpers for dependency checks, status computation, item claims, and legacy queue JSON sync. |
| [src/lib/onboarding-generation.ts](src/lib/onboarding-generation.ts) | Onboarding queue metadata, loading row mapping, run-id helpers, and canonical `#executive-summary` redirect construction. |
| [src/lib/document-generation-service.ts](src/lib/document-generation-service.ts) | Shared server-side document generation service used by Generate All/onboarding; skips and returns existing output table/id references when an active document already exists. |
| [src/app/api/generate-all/execute/route.ts](src/app/api/generate-all/execute/route.ts) | Server-side Generate All pipeline (maxDuration=540). Dependency-aware item execution with credit deduction/refund, retries, partial status, and DB state tracking. |
| [src/lib/pdf-utils.ts](src/lib/pdf-utils.ts) | PDF export client helper for `/api/generate-pdf` owned-document export |
| [src/lib/prompt-chat-config.ts](src/lib/prompt-chat-config.ts) | Compatibility re-export for deprecated Prompt Chat prompts plus legacy `DEFAULT_MODELS` imports |
| [src/lib/stitch/client.ts](src/lib/stitch/client.ts) | Stitch SDK wrapper and raw response parsing helpers |
| [src/lib/supabase/server.ts](src/lib/supabase/server.ts) | Server-side Supabase client |
| [src/lib/waitlist.ts](src/lib/waitlist.ts) | Waitlist thresholds and email validation helpers |
| [src/lib/supabase/client.ts](src/lib/supabase/client.ts) | Browser Supabase client |
| [src/lib/stripe.ts](src/lib/stripe.ts) | Stripe singleton client — lazy-initialized with Proxy export |
| [src/app/api/stripe/checkout/route.ts](src/app/api/stripe/checkout/route.ts) | POST — creates Stripe checkout session for subscription upgrade |
| [src/app/api/stripe/portal/route.ts](src/app/api/stripe/portal/route.ts) | POST — creates Stripe billing portal session for subscription management |
| [src/app/api/stripe/webhook/route.ts](src/app/api/stripe/webhook/route.ts) | POST — handles Stripe webhook events with `stripe_webhook_events` idempotency |
| [src/app/(dashboard)/billing/page.tsx](src/app/(dashboard)/billing/page.tsx) | Billing page — plan cards, subscription status, credit balance, upgrade flow |
| [src/lib/openrouter.ts](src/lib/openrouter.ts) | OpenRouter AI integration (fallback) |
| [src/lib/utils.ts](src/lib/utils.ts) | Utility functions & CREDIT_COSTS |
| [src/proxy.ts](src/proxy.ts) | Next proxy entry point for Supabase session refresh |
| [src/lib/supabase/middleware.ts](src/lib/supabase/middleware.ts) | Supabase cookie/session refresh helper used by `src/proxy.ts` |
| [src/types/database.ts](src/types/database.ts) | Database type definitions |
| [migrations/create_prompt_chat_messages.sql](migrations/create_prompt_chat_messages.sql) | Database migration for prompt_chat_messages table |
| [supabase/migrations/20260425001000_create_mockups_table.sql](supabase/migrations/20260425001000_create_mockups_table.sql) | Supabase migration for mockups table |
| [supabase/migrations/20260425004000_security_hardening_followups.sql](supabase/migrations/20260425004000_security_hardening_followups.sql) | Security follow-up migration: service-role-only `refund_credits`, Stripe event idempotency table, and project creation locks. |
| [supabase/migrations/20260518000000_create_prompt_lab_tables.sql](supabase/migrations/20260518000000_create_prompt_lab_tables.sql) | Supabase migration for Prompt Lab drafts/runs with user-scoped RLS. |
| [PROMPT_CHAT_SETUP.md](PROMPT_CHAT_SETUP.md) | Deprecated setup guide for the removed Prompt tab AI chat feature |

---

**End of PROJECT_CONTEXT.md**

*This document serves as the comprehensive reference for understanding and working with the Maker Compass codebase. Keep it updated as the project evolves.*
