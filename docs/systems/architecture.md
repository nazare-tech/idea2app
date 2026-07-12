# Architecture
High-level architecture: React Server Components pattern, client/Next.js server/API layers over Supabase auth and DB, OpenRouter plus managed Exa, and Stripe.
Data flows: auth modal (?modal=auth), src/proxy.ts session refresh, safe-redirect.ts, intake wizard pending_intakes token handoff, analysis pipelines, naming.
Generate All and onboarding: generate-all-store.ts, /api/generate-all start/execute/status routes, generation_queue_items as source of truth, 540s maxDuration.
Workspace layout at /projects/[projectRef]: DashboardShell, ProjectHeader, AnchorNav, ScrollableContent, ProjectWorkspace hooks like useWorkspaceDocuments.
Shared UI: document-definitions.ts registry, project-allowance.ts guard, pricing-plans.ts with plan-card.tsx, AuthFormContent, rate-limit.ts, credits.ts.
Key patterns: plan-tier model routing (generation-model-policy.ts), generate-missing-only documents, Sentry with logger.ts, intake data model, Mermaid expansion.
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

