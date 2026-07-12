# Database Schema
Database schema overview for core Supabase tables: profiles, projects, messages, prompt_chat_messages, analyses, prds, mvp_plans, mockups, tech_specs, deployments.
product_events is append-only content-free analytics: deny-all browser RLS, service-role insert/select only, private analytics schema views, 180-day retention.
prompt_lab_experiments and prompt_lab_runs store local-dev Prompt Lab drafts and isolated run history; drafts save with project_id NULL plus metadata.savedFromProjectId.
generation_queues keeps one Generate All row per project/user; generation_queue_items is the normalized source of truth with depends_on, attempts, and output refs.
subscriptions enforces UNIQUE(user_id) so Stripe webhook upserts are replay-safe; credits_history logs transactions; waitlist allows public insert, admin-only reads.
Every table entry lists fields and RLS rules: users only access their own rows, and project-scoped tables check ownership through the owning project.
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

