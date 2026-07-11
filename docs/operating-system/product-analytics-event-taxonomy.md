# Product Analytics Event Taxonomy

This guide is the durable product contract for Maker Compass behavioral analytics. The executable event and property allowlists live in `src/lib/product-analytics/contracts.ts`; this document explains why events exist, how metrics are derived, and what every future feature must review.

## Principles

1. Track semantic product outcomes, not raw surveillance data.
2. Keep browser intent separate from trusted server outcomes.
3. Keep `product_events` separate from operational `api_request_metrics`.
4. Use stable controlled identifiers; never store generated or user-authored content.
5. Treat project, queue, artifact, subscription, and Stripe tables as business authority. Events are analytical evidence.
6. Version event contracts and make retries idempotent.
7. Count successful copy/download actions, not merely attempted clicks.
8. Bound browser storage with batch/body/property caps, bounded retries, a durable per-user daily event quota, and hard streaming request-body limits.

## Sources Of Truth

- **Executable taxonomy:** `src/lib/product-analytics/contracts.ts`
- **Raw behavioral event store:** `public.product_events`
- **Decision-ready analytics:** private `analytics` schema views
- **Generation authority:** `generation_queues`, `generation_queue_items`, and artifact tables
- **Billing authority:** `subscriptions`, `stripe_webhook_events`, and Stripe
- **Operational request metrics:** `api_request_metrics`

## Event Families

### Workspace

| Event | Meaning |
|---|---|
| `workspace_session_started` | An authenticated project workspace mounted in the foreground. |
| `workspace_section_reached` | The canonical scroll target remained active for at least one second. Emitted once per section per workspace visit. |
| `workspace_nav_clicked` | The user intentionally selected a document or subsection in the workspace rail. This is intent, not proof of reach. |
| `workspace_session_ended` | Best-effort summary of active foreground duration, last section, and deepest section. Analysis must tolerate this unload event being absent. |

### Design Mockups

| Event | Meaning |
|---|---|
| `mockup_concept_impression` | A ready Concept 1/2/3 remained the active workspace target for the reach threshold. |
| `mockup_concept_opened` | A ready concept lightbox opened. |
| `mockup_concept_copied` | The mockup image was successfully written to the clipboard. |
| `mockup_concept_downloaded` | A mockup image download was successfully initiated. |

### AI Prompt Files

| Event | Meaning |
|---|---|
| `prompt_file_impression` | A ready prompt-file card was at least 50% visible for one second. Placeholders do not count. |
| `prompt_file_opened` | A ready prompt-file preview opened. |
| `prompt_file_copied` | Prompt-file content was successfully written to the clipboard. |
| `prompt_file_downloaded` | A prompt-file download was successfully initiated. |

### Upgrade And Billing

| Event | Meaning |
|---|---|
| `upgrade_cta_viewed` | A controlled upgrade surface became visible. |
| `upgrade_cta_clicked` | The user intentionally selected that upgrade surface. |
| `checkout_started` | Trusted server event emitted only after Stripe created a Checkout session. |
| `checkout_completed` | Trusted Stripe-webhook event emitted after the local subscription snapshot was saved. |
| `subscription_cancel_requested` | Trusted Stripe-webhook transition from not-canceling to `cancel_at_period_end = true`. |
| `subscription_canceled` | Trusted Stripe deletion event after the local subscription was marked canceled. |

Checkout source attribution is trusted only after the server correlates its attribution UUID to a recent owned `upgrade_cta_clicked` row with matching surface, session, and project. Uncorrelated attribution falls back to `billing` and cannot enter a feature-specific entitlement funnel.

### Project And Generation Lifecycle

| Event | Meaning |
|---|---|
| `project_created` | Trusted server event after the project, intake, and onboarding queue were durably created. |
| `generation_started` | Trusted queue/run or direct-generation start. |
| `generation_step_completed` | Trusted document step reached a successful durable terminal state. |
| `generation_completed` | Trusted generation run reached a complete terminal state. |
| `generation_failed` | Trusted step or run reached a failure/partial terminal state. Store controlled categories, never raw error text. |

## Canonical Definitions

- **Activation:** Executive Summary reached within 24 hours after project creation.
- **Strong activation:** Design Mockups reached, or a mockup/prompt open/copy/download action, within seven days after project creation.
- **Meaningful activity:** A workspace section reach or a mockup/prompt value action. Automated polling and API traffic do not count.
- **D1/D7/D30 retention:** A meaningful return on the corresponding UTC calendar day after first activation. Cohorts that have not matured return `NULL`, not zero.
- **Behavioral churn risk:** Derived 14-day or 30-day absence of meaningful activity. This is not a client event.
- **Paid churn:** Derived from trusted subscription cancellation state.
- **Mockup entitlement denominator:** Only projects whose valid mockups were ready before the evaluated workspace session.

## Privacy Prohibitions

Never store any of the following in product-event properties:

- Original idea, intake answers, or project description
- Generated document or prompt contents
- Mockup image bytes, URLs, storage paths, or AI titles
- Email address, name, billing details, or other direct PII
- Raw page URL, referrer, IP address, or user-agent string
- DOM selectors, HTML, keystrokes, or session recordings
- Arbitrary model/provider error messages

Use controlled identifiers such as `mockups-concept-1`, `first-prompt.md`, `desktop`, and `project_composer`.

## Adding Or Changing A Feature

Every plan and review for a new user-visible feature must answer:

1. What user outcome does the feature support?
2. Does the user need to see an impression/reach event before an action is meaningful?
3. Which intentional action and successful outcome should be measured?
4. Is there a trusted server completion/failure transition?
5. What controlled identifiers and enums are required?
6. Which content or PII fields are explicitly prohibited?
7. Which funnel, cohort, or decision consumes the event?
8. What denominator prevents misleading interpretation?
9. How will the event be verified through the real UI or trusted server path?
10. Does the contract require a schema-version change or a new event name?

If the answer is “no new event,” record why in the feature plan or review. Do not add generic click events without a product question.

## Change Procedure

1. Update the typed registry and runtime validators.
2. Add or update focused contract tests.
3. Update this taxonomy document.
4. Add analytics-view changes only when a named decision or dashboard needs them.
5. Verify production-environment filtering, idempotency, and privacy properties.
6. Record backend/data-shape changes in `docs/plans/backend-change-history.md`.

## Future Tooling

Supabase PostgreSQL and private analytics views are the current source of truth. The preferred open-source additions, when justified, are:

- **Metabase** for product dashboards and ad hoc funnel/cohort exploration, connected through a dedicated read-only database role with access only to approved `analytics` views.
- **dbt Core** when view logic becomes large enough to need tested, versioned transformation models and scheduled rollups.
- **ClickHouse** when measured event volume or PostgreSQL query load requires a dedicated OLAP store.
- **OpenPanel or PostHog** only when the team needs a packaged product-analytics UI, experiments, or replay. Replay must stay disabled until a separate privacy review explicitly approves it.

Do not add any of these merely to duplicate the current event store. Supabase remains canonical until measured scale or workflow pain demonstrates otherwise.
