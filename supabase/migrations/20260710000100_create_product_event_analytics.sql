-- Product analytics foundation for semantic, content-free product events.
-- Browser roles have no direct access. The authenticated ingestion route writes
-- with the service role after validating the typed event contract and ownership.

create schema if not exists analytics;

revoke all on schema analytics from public, anon, authenticated;
grant usage on schema analytics to service_role;

create table public.product_events (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  event_name text not null,
  schema_version smallint not null default 1,
  source text not null,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  session_id uuid,
  plan_key text not null,
  environment text not null,
  app_release text,
  properties jsonb not null default '{}'::jsonb,

  constraint product_events_idempotency_key_length
    check (char_length(idempotency_key) between 1 and 255),
  constraint product_events_event_name_format
    check (event_name ~ '^[a-z][a-z0-9_]{1,62}[a-z0-9]$'),
  constraint product_events_schema_version_range
    check (schema_version between 1 and 32767),
  constraint product_events_source
    check (source in ('client', 'server', 'stripe_webhook')),
  constraint product_events_timestamp_window
    check (
      occurred_at >= received_at - interval '24 hours'
      and occurred_at <= received_at + interval '5 minutes'
    ),
  constraint product_events_plan_key_format
    check (plan_key ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  constraint product_events_environment
    check (environment in ('production', 'preview', 'development', 'test')),
  constraint product_events_app_release_length
    check (app_release is null or char_length(app_release) between 1 and 128),
  constraint product_events_properties_object
    check (jsonb_typeof(properties) = 'object'),
  constraint product_events_properties_size
    check (octet_length(properties::text) <= 4096)
);

comment on table public.product_events is
  'Append-only, content-free product events. The typed application registry is the event/property allowlist authority.';
comment on column public.product_events.idempotency_key is
  'Client UUID or deterministic trusted transition key used to deduplicate retries.';
comment on column public.product_events.properties is
  'Validated controlled identifiers/enums only; never idea text, generated content, prompts, URLs, email, IP, user agent, or error text.';

create index product_events_occurred_at_idx
  on public.product_events (occurred_at desc);
create index product_events_received_at_idx
  on public.product_events (received_at desc);
create index product_events_event_occurred_idx
  on public.product_events (event_name, occurred_at desc);
create index product_events_user_occurred_idx
  on public.product_events (user_id, occurred_at desc);
create index product_events_user_received_idx
  on public.product_events (user_id, received_at desc);
create index product_events_project_occurred_idx
  on public.product_events (project_id, occurred_at desc)
  where project_id is not null;
create index product_events_session_occurred_idx
  on public.product_events (session_id, occurred_at)
  where session_id is not null;

alter table public.product_events enable row level security;
alter table public.product_events force row level security;

-- No RLS policy is intentional. Browser roles cannot read or mutate events.
-- The service role can only append and inspect; it cannot update/delete/truncate.
revoke all on table public.product_events from public, anon, authenticated, service_role;
grant select, insert on table public.product_events to service_role;

-- Atomically quota and append authenticated browser batches. The per-user/day
-- advisory lock keeps concurrent serverless requests from racing the quota.
create or replace function public.ingest_product_event_batch(
  p_user_id uuid,
  p_rows jsonb,
  p_daily_limit integer default 2000
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public, analytics
as $$
declare
  existing_count bigint;
  incoming_count integer;
  inserted_count bigint;
  utc_day_start timestamptz := date_trunc('day', clock_timestamp() at time zone 'utc') at time zone 'utc';
begin
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'product_event_rows_must_be_array';
  end if;
  incoming_count := jsonb_array_length(p_rows);
  if incoming_count < 1 or incoming_count > 25 or p_daily_limit < 1 then
    raise exception 'product_event_batch_bounds_invalid';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || utc_day_start::date::text, 0));
  select count(*) into existing_count
  from public.product_events
  where user_id = p_user_id and received_at >= utc_day_start;

  if existing_count + incoming_count > p_daily_limit then
    raise exception 'product_event_daily_quota_exceeded';
  end if;

  insert into public.product_events (
    id, idempotency_key, event_name, schema_version, source, occurred_at,
    received_at, user_id, project_id, session_id, plan_key, environment,
    app_release, properties
  )
  select
    rows.id,
    rows.idempotency_key,
    rows.event_name,
    rows.schema_version,
    rows.source,
    rows.occurred_at,
    rows.received_at,
    p_user_id,
    rows.project_id,
    rows.session_id,
    rows.plan_key,
    rows.environment,
    rows.app_release,
    rows.properties
  from jsonb_to_recordset(p_rows) as rows(
    id uuid,
    idempotency_key text,
    event_name text,
    schema_version smallint,
    source text,
    occurred_at timestamptz,
    received_at timestamptz,
    project_id uuid,
    session_id uuid,
    plan_key text,
    environment text,
    app_release text,
    properties jsonb
  )
  on conflict (idempotency_key) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.ingest_product_event_batch(uuid, jsonb, integer)
  from public, anon, authenticated;
grant execute on function public.ingest_product_event_batch(uuid, jsonb, integer)
  to service_role;

-- Daily foreground activity. Lifecycle events remain visible as separate counts
-- but do not inflate active-user/session metrics.
create view analytics.product_activity_daily as
select
  (occurred_at at time zone 'utc')::date as activity_date,
  count(*) as event_count,
  count(distinct user_id) filter (where source = 'client') as active_users,
  count(distinct session_id) filter (where source = 'client') as active_sessions,
  count(distinct project_id) filter (where source = 'client') as active_projects,
  count(*) filter (where event_name = 'workspace_session_started') as workspace_sessions_started,
  count(distinct user_id) filter (
    where event_name in (
      'mockup_concept_opened',
      'mockup_concept_copied',
      'mockup_concept_downloaded'
    )
  ) as mockup_engaged_users,
  count(distinct user_id) filter (
    where event_name in (
      'prompt_file_opened',
      'prompt_file_copied',
      'prompt_file_downloaded'
    )
  ) as prompt_engaged_users,
  count(distinct user_id) filter (where event_name = 'upgrade_cta_clicked') as upgrade_intent_users,
  count(*) filter (where event_name = 'project_created') as projects_created,
  count(*) filter (where event_name = 'checkout_completed') as checkouts_completed
from public.product_events
where environment = 'production'
group by (occurred_at at time zone 'utc')::date;

comment on view analytics.product_activity_daily is
  'Production-only daily foreground activity and trusted lifecycle totals.';

create view analytics.workspace_section_reach_daily as
select
  (occurred_at at time zone 'utc')::date as activity_date,
  properties ->> 'sectionId' as section_key,
  count(*) as reach_events,
  count(distinct user_id) as reached_users,
  count(distinct session_id) as reached_sessions,
  count(distinct project_id) as reached_projects
from public.product_events
where environment = 'production'
  and event_name = 'workspace_section_reached'
  and nullif(properties ->> 'sectionId', '') is not null
group by
  (occurred_at at time zone 'utc')::date,
  properties ->> 'sectionId';

comment on view analytics.workspace_section_reach_daily is
  'Production-only semantic section reach; contains no raw scroll coordinates or content.';

create view analytics.workspace_section_funnel_daily as
with session_starts as (
  select
    session_id,
    min((occurred_at at time zone 'utc')::date) as session_date
  from public.product_events
  where environment = 'production'
    and event_name = 'workspace_session_started'
    and session_id is not null
  group by session_id
),
steps(step_order, section_key, section_label) as (
  values
    (1, 'executive-summary', 'Executive Summary'),
    (2, 'market-research', 'Market Research'),
    (3, 'prd', 'Product Plan'),
    (4, 'mvp', 'First Version Plan'),
    (5, 'mockups', 'Design Mockups'),
    (6, 'ai-prompts', 'AI Prompts')
),
session_reach as (
  select distinct
    session_id,
    case
      when properties ->> 'sectionId' = 'executive-summary' then 'executive-summary'
      when properties ->> 'sectionId' like 'market-research-%' then 'market-research'
      when properties ->> 'sectionId' like 'prd-%' then 'prd'
      when properties ->> 'sectionId' like 'mvp-%' then 'mvp'
      when properties ->> 'sectionId' like 'mockups-%' then 'mockups'
      when properties ->> 'sectionId' like 'ai-prompts-%' then 'ai-prompts'
    end as section_key
  from public.product_events
  where environment = 'production'
    and event_name = 'workspace_section_reached'
    and session_id is not null
)
select
  starts.session_date,
  steps.step_order,
  steps.section_key,
  steps.section_label,
  count(distinct starts.session_id) as eligible_sessions,
  count(distinct starts.session_id) filter (where reach.session_id is not null) as reached_sessions,
  round(
    100.0 * count(distinct starts.session_id) filter (where reach.session_id is not null)
      / nullif(count(distinct starts.session_id), 0),
    2
  ) as reach_rate_pct
from session_starts starts
cross join steps
left join session_reach reach
  on reach.session_id = starts.session_id
 and reach.section_key = steps.section_key
group by starts.session_date, steps.step_order, steps.section_key, steps.section_label;

comment on view analytics.workspace_section_funnel_daily is
  'Production-only workspace-session funnel using semantic top-level section reach.';

create view analytics.artifact_engagement_daily as
select
  (occurred_at at time zone 'utc')::date as activity_date,
  case
    when event_name like 'mockup_concept_%' then 'mockup'
    when event_name like 'prompt_file_%' then 'prompt_file'
  end as artifact_type,
  case
    when event_name like 'mockup_concept_%' then properties ->> 'conceptIndex'
    when event_name like 'prompt_file_%' then properties ->> 'fileName'
  end as artifact_key,
  case
    when event_name like '%_impression' then 'impression'
    when event_name like '%_opened' then 'opened'
    when event_name like '%_copied' then 'copied'
    when event_name like '%_downloaded' then 'downloaded'
  end as action,
  count(*) as event_count,
  count(distinct user_id) as unique_users,
  count(distinct session_id) as unique_sessions,
  count(distinct project_id) as unique_projects
from public.product_events
where environment = 'production'
  and event_name in (
    'mockup_concept_impression',
    'mockup_concept_opened',
    'mockup_concept_copied',
    'mockup_concept_downloaded',
    'prompt_file_impression',
    'prompt_file_opened',
    'prompt_file_copied',
    'prompt_file_downloaded'
  )
group by
  (occurred_at at time zone 'utc')::date,
  case
    when event_name like 'mockup_concept_%' then 'mockup'
    when event_name like 'prompt_file_%' then 'prompt_file'
  end,
  case
    when event_name like 'mockup_concept_%' then properties ->> 'conceptIndex'
    when event_name like 'prompt_file_%' then properties ->> 'fileName'
  end,
  case
    when event_name like '%_impression' then 'impression'
    when event_name like '%_opened' then 'opened'
    when event_name like '%_copied' then 'copied'
    when event_name like '%_downloaded' then 'downloaded'
  end;

comment on view analytics.artifact_engagement_daily is
  'Production-only mockup and prompt-file impressions and successful value actions.';

create view analytics.activation_projects as
with projects_created as (
  select
    user_id,
    project_id,
    min(occurred_at) as project_created_at
  from public.product_events
  where environment = 'production'
    and event_name = 'project_created'
    and project_id is not null
  group by user_id, project_id
),
signals as (
  select
    created.user_id,
    created.project_id,
    created.project_created_at,
    min(events.occurred_at) filter (
      where events.event_name = 'workspace_section_reached'
        and events.properties ->> 'sectionId' = 'executive-summary'
        and events.occurred_at <= created.project_created_at + interval '24 hours'
    ) as activated_at,
    min(events.occurred_at) filter (
      where (
        (events.event_name = 'workspace_section_reached'
          and events.properties ->> 'sectionId' like 'mockups-%')
        or events.event_name in (
          'mockup_concept_opened',
          'mockup_concept_copied',
          'mockup_concept_downloaded',
          'prompt_file_opened',
          'prompt_file_copied',
          'prompt_file_downloaded'
        )
      )
      and events.occurred_at <= created.project_created_at + interval '7 days'
    ) as strong_activated_at
  from projects_created created
  left join public.product_events events
    on events.environment = 'production'
   and events.user_id = created.user_id
   and events.project_id = created.project_id
   and events.occurred_at >= created.project_created_at
  group by created.user_id, created.project_id, created.project_created_at
)
select
  user_id,
  project_id,
  project_created_at,
  activated_at,
  activated_at is not null as activated_within_24h,
  strong_activated_at,
  strong_activated_at is not null as strong_activated_within_7d
from signals;

comment on view analytics.activation_projects is
  'Production-only project activation: Executive Summary within 24h and strong value within 7d.';

create view analytics.activation_cohorts as
select
  (project_created_at at time zone 'utc')::date as cohort_date,
  count(*) as projects_created,
  count(distinct user_id) as users_created,
  count(*) filter (where activated_within_24h) as activated_projects,
  count(*) filter (where strong_activated_within_7d) as strong_activated_projects,
  count(*) filter (where project_created_at <= now() - interval '24 hours') as activation_eligible_projects,
  count(*) filter (where project_created_at <= now() - interval '7 days') as strong_activation_eligible_projects,
  round(
    100.0 * count(*) filter (
      where activated_within_24h and project_created_at <= now() - interval '24 hours'
    ) / nullif(count(*) filter (where project_created_at <= now() - interval '24 hours'), 0),
    2
  )
    as activation_rate_pct,
  round(
    100.0 * count(*) filter (
      where strong_activated_within_7d and project_created_at <= now() - interval '7 days'
    ) / nullif(count(*) filter (where project_created_at <= now() - interval '7 days'), 0),
    2
  )
    as strong_activation_rate_pct
from analytics.activation_projects
group by (project_created_at at time zone 'utc')::date;

comment on view analytics.activation_cohorts is
  'Production-only daily activation cohorts derived from project-level activation.';

create view analytics.retention_cohorts as
with activity_days as (
  select distinct
    user_id,
    (occurred_at at time zone 'utc')::date as activity_date
  from public.product_events
  where environment = 'production'
    and source = 'client'
    and event_name in (
      'workspace_section_reached',
      'mockup_concept_opened',
      'mockup_concept_copied',
      'mockup_concept_downloaded',
      'prompt_file_opened',
      'prompt_file_copied',
      'prompt_file_downloaded',
      'upgrade_cta_clicked'
    )
),
cohorts as (
  select user_id, min((activated_at at time zone 'utc')::date) as cohort_date
  from analytics.activation_projects
  where activated_at is not null
  group by user_id
)
select
  cohorts.cohort_date,
  count(*) as cohort_users,
  count(*) filter (where d1.user_id is not null) as retained_d1_users,
  count(*) filter (where d7.user_id is not null) as retained_d7_users,
  count(*) filter (where d30.user_id is not null) as retained_d30_users,
  case when current_date >= cohorts.cohort_date + 1
    then round(100.0 * count(*) filter (where d1.user_id is not null) / nullif(count(*), 0), 2)
  end as retention_d1_pct,
  case when current_date >= cohorts.cohort_date + 7
    then round(100.0 * count(*) filter (where d7.user_id is not null) / nullif(count(*), 0), 2)
  end as retention_d7_pct,
  case when current_date >= cohorts.cohort_date + 30
    then round(100.0 * count(*) filter (where d30.user_id is not null) / nullif(count(*), 0), 2)
  end as retention_d30_pct
from cohorts
left join activity_days d1
  on d1.user_id = cohorts.user_id and d1.activity_date = cohorts.cohort_date + 1
left join activity_days d7
  on d7.user_id = cohorts.user_id and d7.activity_date = cohorts.cohort_date + 7
left join activity_days d30
  on d30.user_id = cohorts.user_id and d30.activity_date = cohorts.cohort_date + 30
group by cohorts.cohort_date;

comment on view analytics.retention_cohorts is
  'Production-only exact-day D1/D7/D30 meaningful return cohorts after first activation.';

create view analytics.behavioral_churn_risk as
with user_signals as (
  select
    user_id,
    max(plan_key) filter (where occurred_at = latest_at) as latest_plan_key,
    min(occurred_at) as first_event_at,
    max(occurred_at) as last_event_at,
    max(occurred_at) filter (
      where source = 'client'
        and event_name in (
          'workspace_session_started',
          'workspace_section_reached',
          'mockup_concept_opened',
          'mockup_concept_copied',
          'mockup_concept_downloaded',
          'prompt_file_opened',
          'prompt_file_copied',
          'prompt_file_downloaded'
        )
    ) as last_meaningful_at,
    bool_or(event_name = 'generation_completed') as has_completed_generation,
    bool_or(event_name in (
      'workspace_section_reached',
      'mockup_concept_opened',
      'mockup_concept_copied',
      'mockup_concept_downloaded',
      'prompt_file_opened',
      'prompt_file_copied',
      'prompt_file_downloaded'
    )) as has_viewed_artifact
  from (
    select events.*, max(occurred_at) over (partition by user_id) as latest_at
    from public.product_events events
    where environment = 'production'
  ) production_events
  group by user_id
)
select
  user_id,
  latest_plan_key,
  first_event_at,
  last_event_at,
  last_meaningful_at,
  floor(extract(epoch from (now() - coalesce(last_meaningful_at, first_event_at))) / 86400)::integer
    as days_since_meaningful_activity,
  has_completed_generation,
  has_viewed_artifact,
  case
    when has_completed_generation and not has_viewed_artifact then 'generated_no_artifact_view'
    when last_meaningful_at is null then 'never_engaged'
    when last_meaningful_at < now() - interval '30 days' then 'churned_30d'
    when last_meaningful_at < now() - interval '14 days' then 'at_risk_14d'
    else 'engaged'
  end as risk_bucket
from user_signals;

comment on view analytics.behavioral_churn_risk is
  'Production-only behavioral risk signals; this is not authoritative paid-subscription churn.';

create view analytics.mockup_entitlement_funnel as
with ready_projects as (
  select project_id, min(created_at) as mockup_ready_at
  from public.mockups
  where metadata ->> 'source' in ('openrouter-image', 'openrouter-image-v2')
  group by project_id
),
production_events as (
  select *
  from public.product_events
  where environment = 'production'
),
attributed_checkouts as (
  select
    started.project_id,
    min(started.occurred_at) as checkout_started_at,
    min(completed.occurred_at) as checkout_completed_at
  from production_events started
  left join production_events completed
    on completed.event_name = 'checkout_completed'
   and completed.user_id = started.user_id
   and completed.properties ->> 'checkoutSessionId' = started.properties ->> 'checkoutSessionId'
   and completed.occurred_at >= started.occurred_at
  where started.event_name = 'checkout_started'
    and started.properties ->> 'sourceSurface' = 'mockup_entitlement'
    and started.project_id is not null
  group by started.project_id
),
signals as (
  select
    ready.project_id,
    projects.user_id,
    ready.mockup_ready_at,
    min(events.occurred_at) filter (
      where events.event_name = 'workspace_section_reached'
        and events.properties ->> 'sectionId' like 'mockups-%'
    ) as mockup_reached_at,
    min(events.occurred_at) filter (where events.event_name = 'mockup_concept_opened') as opened_at,
    min(events.occurred_at) filter (where events.event_name = 'mockup_concept_copied') as copied_at,
    min(events.occurred_at) filter (where events.event_name = 'mockup_concept_downloaded') as downloaded_at,
    min(events.occurred_at) filter (
      where events.event_name = 'upgrade_cta_viewed'
        and events.properties ->> 'surface' = 'mockup_entitlement'
    ) as upgrade_viewed_at,
    min(events.occurred_at) filter (
      where events.event_name = 'upgrade_cta_clicked'
        and events.properties ->> 'surface' = 'mockup_entitlement'
    ) as upgrade_clicked_at,
    min(checkouts.checkout_started_at) as checkout_started_at,
    min(checkouts.checkout_completed_at) as checkout_completed_at
  from ready_projects ready
  join public.projects projects on projects.id = ready.project_id
  left join production_events events
    on events.project_id = ready.project_id
   and events.user_id = projects.user_id
   and events.occurred_at >= ready.mockup_ready_at
  left join attributed_checkouts checkouts
    on checkouts.project_id = ready.project_id
  where exists (
    select 1
    from production_events observed
    where observed.project_id = ready.project_id
      and observed.user_id = projects.user_id
  )
  group by ready.project_id, projects.user_id, ready.mockup_ready_at
)
select
  project_id,
  user_id,
  mockup_ready_at,
  mockup_reached_at,
  mockup_reached_at is not null as reached_mockups,
  opened_at,
  copied_at,
  downloaded_at,
  coalesce(opened_at, copied_at, downloaded_at) is not null as engaged_with_mockups,
  upgrade_viewed_at,
  upgrade_clicked_at,
  checkout_started_at,
  checkout_completed_at
from signals;

comment on view analytics.mockup_entitlement_funnel is
  'Production-only eligible-project mockup reach, value actions, upgrade intent, and attributed checkout.';

create view analytics.mockup_entitlement_funnel_daily as
select
  (mockup_ready_at at time zone 'utc')::date as eligibility_date,
  count(*) as eligible_projects,
  count(distinct user_id) as eligible_users,
  count(*) filter (where reached_mockups) as reached_projects,
  count(*) filter (where engaged_with_mockups) as engaged_projects,
  count(*) filter (where upgrade_clicked_at is not null) as upgrade_clicked_projects,
  count(*) filter (where checkout_started_at is not null) as checkout_started_projects,
  count(*) filter (where checkout_completed_at is not null) as checkout_completed_projects,
  round(100.0 * count(*) filter (where reached_mockups) / nullif(count(*), 0), 2) as reach_rate_pct,
  round(100.0 * count(*) filter (where engaged_with_mockups) / nullif(count(*), 0), 2) as engagement_rate_pct,
  round(100.0 * count(*) filter (where checkout_completed_at is not null) / nullif(count(*), 0), 2)
    as attributed_conversion_rate_pct
from analytics.mockup_entitlement_funnel
group by (mockup_ready_at at time zone 'utc')::date;

comment on view analytics.mockup_entitlement_funnel_daily is
  'Production-only daily mockup entitlement decision funnel with readiness-based denominators.';

-- Only trusted server/database roles may query approved views.
revoke all on all tables in schema analytics from public, anon, authenticated;
grant select on all tables in schema analytics to service_role;

create or replace function analytics.cleanup_product_events()
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public, analytics
as $$
declare
  deleted_count bigint;
begin
  delete from public.product_events
  where received_at < clock_timestamp() - interval '180 days';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

comment on function analytics.cleanup_product_events() is
  'Deletes raw product events older than the fixed 180-day retention window.';

revoke all on function analytics.cleanup_product_events() from public, anon, authenticated, service_role;

-- The migration chain already enables pg_cron for metrics aggregation.
select cron.unschedule('cleanup-product-events')
where exists (
  select 1 from cron.job where jobname = 'cleanup-product-events'
);

select cron.schedule(
  'cleanup-product-events',
  '30 4 * * *',
  'select analytics.cleanup_product_events()'
);
