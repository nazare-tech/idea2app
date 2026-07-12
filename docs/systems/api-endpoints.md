# API Endpoints
API endpoints overview: auth callback, GET/POST /api/waitlist, deprecated /api/chat and /api/prompt-chat (410 Gone), and /api/projects/[id] GET/PATCH routes.
POST /api/analysis/[type] runs competitive-analysis, prd, mvp-plan, and tech-spec pipelines with getTokenCost() credit pricing and a 540s route maxDuration.
Mockup routes: /api/mockups/generate (openrouter-image-v2 content, 800s), the /api/mockups/image auth proxy, and PATCH /api/mockups/[id]; /api/generate-app is removed.
Dev Prompt Lab: /dev/prompt-lab page plus /api/dev/prompt-lab context/run/drafts/runs/mockup-image endpoints, local development only, 240s/480s text timeouts.
Generate All: /api/generate-all start/execute/status/update/cancel plus /api/projects/[id]/onboarding-status, dependency chain competitive to prd to mvp to mockups.
Stripe: /api/stripe/checkout, /api/stripe/portal, and /api/stripe/webhook handling checkout.session.completed, subscription updates, invoice.paid, charge.refunded.
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

