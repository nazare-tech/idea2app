# Directories and Key Files
Key directory tree for src/: app/ App Router pages and API routes, components/ (ui, layout, workspace, auth, analysis), lib/, types/, stores/, hooks/, proxy.ts.
Directory purpose map plus prompt architecture: all AI system prompts live in src/lib/prompts/ (sanitize.ts, competitive-analysis.ts, prd.ts, mvp-plan.ts, mockups.ts).
Market Research V2 contract: document_version competitive-analysis-v2 and prompt_version metadata; legacy or malformed rows fall back to raw markdown view.
Prompt security rules: never interpolate user values into prompt strings; always use buildSecurePrompt() with sanitizeInput() and <user_input> XML delimiters.
Key Files Reference maps load-bearing paths: project-workspace.tsx, anchor-nav.tsx, scrollable-content.tsx, analysis-pipelines.ts, generate-all-store.ts, queue-service.ts.
Also lists Stripe checkout/portal/webhook routes, mockup and prompt-lab API routes, product-analytics files, landing components, and supabase/migrations/*.sql.
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
│   │   ├── anchor-nav.tsx        # Scroll workspace nav with durable generation status labels (lg+)
│   │   ├── nav-status.tsx        # Shared document status marker/text primitives (rail + mobile chrome)
│   │   ├── scrollable-content.tsx # Scroll workspace document renderer
│   ├── workspace/                # Workspace orchestration
│   │   ├── project-workspace.tsx      # Lazy-loading scroll workspace orchestrator
│   │   ├── mobile-document-bar.tsx    # Mobile peek bar + documents bottom sheet (below lg)
│   │   ├── use-hide-on-scroll-chrome.ts # Mobile chrome hide-on-scroll hook
│   │   ├── use-workspace-documents.ts # Lazy document loading hook
│   │   ├── use-workspace-scroll-sync.ts # Workspace hash/scroll sync hook
│   │   ├── use-workspace-product-analytics.ts # Workspace behavioral analytics hook
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
│   ├── stripe/                   # Stripe singleton (index.ts) + webhook-lease, checkout-plan, subscription-sync helpers
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
| [src/lib/stripe/webhook-lease.ts](src/lib/stripe/webhook-lease.ts) | Testable Stripe webhook idempotency lease helper (claim/finalize with fence tokens) |
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

