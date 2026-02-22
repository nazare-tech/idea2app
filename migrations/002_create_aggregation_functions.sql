-- ============================================================================
-- Migration: 002 - Create Metrics Aggregation Functions
-- Description: PostgreSQL functions to aggregate raw metrics into daily/weekly/monthly summaries
-- Author: Claude Code
-- Date: 2026-02-20
-- ============================================================================

-- ============================================================================
-- Function: aggregate_daily_metrics
-- Purpose: Aggregates API metrics for a specific date into daily_metrics_summary
-- Parameters: target_date - The date to aggregate (typically yesterday)
-- Returns: void
-- Usage: SELECT aggregate_daily_metrics(CURRENT_DATE - INTERVAL '1 day');
-- ============================================================================

CREATE OR REPLACE FUNCTION aggregate_daily_metrics(target_date DATE)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_start_time TIMESTAMP WITH TIME ZONE;
  v_end_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Set time bounds for the day (UTC)
  v_start_time := target_date::timestamp AT TIME ZONE 'UTC';
  v_end_time := (target_date + INTERVAL '1 day')::timestamp AT TIME ZONE 'UTC';

  -- Insert or update daily summary
  INSERT INTO public.daily_metrics_summary (
    date,
    total_active_users,
    new_users,
    chat_requests,
    prompt_chat_requests,
    document_edit_requests,
    competitive_analysis_requests,
    prd_requests,
    mvp_plan_requests,
    tech_spec_requests,
    app_generation_requests,
    total_requests,
    successful_requests,
    failed_requests,
    total_credits_consumed,
    avg_response_time_ms,
    p95_response_time_ms,
    p99_response_time_ms,
    error_count,
    insufficient_credits_count,
    api_timeout_count,
    projects_created,
    projects_with_activity
  )
  SELECT
    target_date,

    -- Active users (distinct users who made requests)
    COUNT(DISTINCT m.user_id),

    -- New users (created on this day)
    (SELECT COUNT(*) FROM auth.users
     WHERE DATE(created_at AT TIME ZONE 'UTC') = target_date),

    -- Feature usage counts
    COUNT(*) FILTER (WHERE m.feature_type = 'chat'),
    COUNT(*) FILTER (WHERE m.feature_type = 'prompt-chat'),
    COUNT(*) FILTER (WHERE m.feature_type = 'document-edit'),
    COUNT(*) FILTER (WHERE m.endpoint LIKE '%/analysis/competitive-analysis'),
    COUNT(*) FILTER (WHERE m.endpoint LIKE '%/analysis/prd'),
    COUNT(*) FILTER (WHERE m.endpoint LIKE '%/analysis/mvp-plan'),
    COUNT(*) FILTER (WHERE m.endpoint LIKE '%/analysis/tech-spec'),
    COUNT(*) FILTER (WHERE m.feature_type = 'app-generation'),

    -- Total requests
    COUNT(*),
    COUNT(*) FILTER (WHERE m.status_code >= 200 AND m.status_code < 300),
    COUNT(*) FILTER (WHERE m.status_code >= 400),

    -- Credits
    COALESCE(SUM(m.credits_consumed), 0)::INTEGER,

    -- Performance metrics
    COALESCE(AVG(m.response_time_ms), 0)::INTEGER,
    COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY m.response_time_ms), 0)::INTEGER,
    COALESCE(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY m.response_time_ms), 0)::INTEGER,

    -- Error counts
    COUNT(*) FILTER (WHERE m.error_type IS NOT NULL),
    COUNT(*) FILTER (WHERE m.status_code = 402 OR m.error_type = 'insufficient_credits'),
    COUNT(*) FILTER (WHERE m.error_type LIKE '%timeout%'),

    -- Projects
    (SELECT COUNT(*) FROM public.projects
     WHERE DATE(created_at AT TIME ZONE 'UTC') = target_date),
    COUNT(DISTINCT m.project_id) FILTER (WHERE m.project_id IS NOT NULL)

  FROM public.api_request_metrics m
  WHERE m.created_at >= v_start_time AND m.created_at < v_end_time

  ON CONFLICT (date)
  DO UPDATE SET
    total_active_users = EXCLUDED.total_active_users,
    new_users = EXCLUDED.new_users,
    chat_requests = EXCLUDED.chat_requests,
    prompt_chat_requests = EXCLUDED.prompt_chat_requests,
    document_edit_requests = EXCLUDED.document_edit_requests,
    competitive_analysis_requests = EXCLUDED.competitive_analysis_requests,
    prd_requests = EXCLUDED.prd_requests,
    mvp_plan_requests = EXCLUDED.mvp_plan_requests,
    tech_spec_requests = EXCLUDED.tech_spec_requests,
    app_generation_requests = EXCLUDED.app_generation_requests,
    total_requests = EXCLUDED.total_requests,
    successful_requests = EXCLUDED.successful_requests,
    failed_requests = EXCLUDED.failed_requests,
    total_credits_consumed = EXCLUDED.total_credits_consumed,
    avg_response_time_ms = EXCLUDED.avg_response_time_ms,
    p95_response_time_ms = EXCLUDED.p95_response_time_ms,
    p99_response_time_ms = EXCLUDED.p99_response_time_ms,
    error_count = EXCLUDED.error_count,
    insufficient_credits_count = EXCLUDED.insufficient_credits_count,
    api_timeout_count = EXCLUDED.api_timeout_count,
    projects_created = EXCLUDED.projects_created,
    projects_with_activity = EXCLUDED.projects_with_activity,
    updated_at = timezone('utc'::text, now());

  RAISE NOTICE 'Daily metrics aggregated for %', target_date;
END;
$$;

COMMENT ON FUNCTION aggregate_daily_metrics IS 'Aggregates API metrics for a specific date into daily_metrics_summary';

-- ============================================================================
-- Function: aggregate_weekly_metrics
-- Purpose: Aggregates daily summaries into weekly_metrics_summary
-- Parameters: target_week_start - Monday of the week to aggregate
-- Returns: void
-- Usage: SELECT aggregate_weekly_metrics(DATE_TRUNC('week', CURRENT_DATE - INTERVAL '1 week')::DATE);
-- ============================================================================

CREATE OR REPLACE FUNCTION aggregate_weekly_metrics(target_week_start DATE)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_week_end DATE;
  v_year INTEGER;
  v_week_number INTEGER;
BEGIN
  -- Calculate week end (Sunday)
  v_week_end := target_week_start + INTERVAL '6 days';

  -- Extract year and ISO week number
  v_year := EXTRACT(ISOYEAR FROM target_week_start);
  v_week_number := EXTRACT(WEEK FROM target_week_start);

  -- Aggregate from daily summaries
  INSERT INTO public.weekly_metrics_summary (
    week_start_date,
    week_number,
    year,
    total_active_users,
    new_users,
    chat_requests,
    prompt_chat_requests,
    document_edit_requests,
    competitive_analysis_requests,
    prd_requests,
    mvp_plan_requests,
    tech_spec_requests,
    app_generation_requests,
    total_requests,
    successful_requests,
    failed_requests,
    total_credits_consumed,
    avg_response_time_ms,
    p95_response_time_ms,
    error_count,
    projects_created,
    projects_with_activity
  )
  SELECT
    target_week_start,
    v_week_number,
    v_year,

    -- Sum metrics from daily summaries
    SUM(total_active_users),
    SUM(new_users),
    SUM(chat_requests),
    SUM(prompt_chat_requests),
    SUM(document_edit_requests),
    SUM(competitive_analysis_requests),
    SUM(prd_requests),
    SUM(mvp_plan_requests),
    SUM(tech_spec_requests),
    SUM(app_generation_requests),
    SUM(total_requests),
    SUM(successful_requests),
    SUM(failed_requests),
    SUM(total_credits_consumed),

    -- Average performance
    AVG(avg_response_time_ms)::INTEGER,
    MAX(p95_response_time_ms),

    SUM(error_count),
    SUM(projects_created),
    SUM(projects_with_activity)

  FROM public.daily_metrics_summary
  WHERE date >= target_week_start AND date <= v_week_end

  ON CONFLICT (year, week_number)
  DO UPDATE SET
    total_active_users = EXCLUDED.total_active_users,
    new_users = EXCLUDED.new_users,
    chat_requests = EXCLUDED.chat_requests,
    prompt_chat_requests = EXCLUDED.prompt_chat_requests,
    document_edit_requests = EXCLUDED.document_edit_requests,
    competitive_analysis_requests = EXCLUDED.competitive_analysis_requests,
    prd_requests = EXCLUDED.prd_requests,
    mvp_plan_requests = EXCLUDED.mvp_plan_requests,
    tech_spec_requests = EXCLUDED.tech_spec_requests,
    app_generation_requests = EXCLUDED.app_generation_requests,
    total_requests = EXCLUDED.total_requests,
    successful_requests = EXCLUDED.successful_requests,
    failed_requests = EXCLUDED.failed_requests,
    total_credits_consumed = EXCLUDED.total_credits_consumed,
    avg_response_time_ms = EXCLUDED.avg_response_time_ms,
    p95_response_time_ms = EXCLUDED.p95_response_time_ms,
    error_count = EXCLUDED.error_count,
    projects_created = EXCLUDED.projects_created,
    projects_with_activity = EXCLUDED.projects_with_activity,
    updated_at = timezone('utc'::text, now());

  RAISE NOTICE 'Weekly metrics aggregated for week % of %', v_week_number, v_year;
END;
$$;

COMMENT ON FUNCTION aggregate_weekly_metrics IS 'Aggregates daily summaries into weekly_metrics_summary for a specific week';

-- ============================================================================
-- Function: aggregate_monthly_metrics
-- Purpose: Aggregates daily summaries into monthly_metrics_summary
-- Parameters: target_month - Any date in the month to aggregate
-- Returns: void
-- Usage: SELECT aggregate_monthly_metrics(DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE);
-- ============================================================================

CREATE OR REPLACE FUNCTION aggregate_monthly_metrics(target_month DATE)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_month_start DATE;
  v_month_end DATE;
  v_year INTEGER;
  v_month_number INTEGER;
BEGIN
  -- First day of month
  v_month_start := DATE_TRUNC('month', target_month)::DATE;
  -- Last day of month
  v_month_end := (DATE_TRUNC('month', target_month) + INTERVAL '1 month - 1 day')::DATE;

  v_year := EXTRACT(YEAR FROM v_month_start);
  v_month_number := EXTRACT(MONTH FROM v_month_start);

  -- Aggregate from daily summaries
  INSERT INTO public.monthly_metrics_summary (
    month,
    year,
    month_number,
    total_active_users,
    new_users,
    chat_requests,
    prompt_chat_requests,
    document_edit_requests,
    competitive_analysis_requests,
    prd_requests,
    mvp_plan_requests,
    tech_spec_requests,
    app_generation_requests,
    total_requests,
    successful_requests,
    failed_requests,
    total_credits_consumed,
    avg_response_time_ms,
    p95_response_time_ms,
    error_count,
    projects_created,
    projects_with_activity
  )
  SELECT
    v_month_start,
    v_year,
    v_month_number,

    SUM(total_active_users),
    SUM(new_users),
    SUM(chat_requests),
    SUM(prompt_chat_requests),
    SUM(document_edit_requests),
    SUM(competitive_analysis_requests),
    SUM(prd_requests),
    SUM(mvp_plan_requests),
    SUM(tech_spec_requests),
    SUM(app_generation_requests),
    SUM(total_requests),
    SUM(successful_requests),
    SUM(failed_requests),
    SUM(total_credits_consumed),
    AVG(avg_response_time_ms)::INTEGER,
    MAX(p95_response_time_ms),
    SUM(error_count),
    SUM(projects_created),
    SUM(projects_with_activity)

  FROM public.daily_metrics_summary
  WHERE date >= v_month_start AND date <= v_month_end

  ON CONFLICT (year, month_number)
  DO UPDATE SET
    total_active_users = EXCLUDED.total_active_users,
    new_users = EXCLUDED.new_users,
    chat_requests = EXCLUDED.chat_requests,
    prompt_chat_requests = EXCLUDED.prompt_chat_requests,
    document_edit_requests = EXCLUDED.document_edit_requests,
    competitive_analysis_requests = EXCLUDED.competitive_analysis_requests,
    prd_requests = EXCLUDED.prd_requests,
    mvp_plan_requests = EXCLUDED.mvp_plan_requests,
    tech_spec_requests = EXCLUDED.tech_spec_requests,
    app_generation_requests = EXCLUDED.app_generation_requests,
    total_requests = EXCLUDED.total_requests,
    successful_requests = EXCLUDED.successful_requests,
    failed_requests = EXCLUDED.failed_requests,
    total_credits_consumed = EXCLUDED.total_credits_consumed,
    avg_response_time_ms = EXCLUDED.avg_response_time_ms,
    p95_response_time_ms = EXCLUDED.p95_response_time_ms,
    error_count = EXCLUDED.error_count,
    projects_created = EXCLUDED.projects_created,
    projects_with_activity = EXCLUDED.projects_with_activity,
    updated_at = timezone('utc'::text, now());

  RAISE NOTICE 'Monthly metrics aggregated for %-% (% %)', v_year, LPAD(v_month_number::text, 2, '0'), TO_CHAR(v_month_start, 'Month'), v_year;
END;
$$;

COMMENT ON FUNCTION aggregate_monthly_metrics IS 'Aggregates daily summaries into monthly_metrics_summary for a specific month';

-- ============================================================================
-- Function: backfill_metrics
-- Purpose: Backfill historical data for a date range
-- Parameters: start_date, end_date (defaults to today)
-- Returns: Table of dates with success/error status
-- Usage: SELECT * FROM backfill_metrics(CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE);
-- ============================================================================

CREATE OR REPLACE FUNCTION backfill_metrics(
  start_date DATE,
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  aggregated_date DATE,
  status TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  working_date DATE;
BEGIN
  working_date := start_date;

  RAISE NOTICE 'Starting backfill from % to %', start_date, end_date;

  WHILE working_date <= end_date LOOP
    BEGIN
      -- Aggregate daily
      PERFORM aggregate_daily_metrics(working_date);

      RETURN QUERY SELECT working_date, 'SUCCESS'::TEXT;
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT working_date, ('ERROR: ' || SQLERRM)::TEXT;
    END;

    working_date := working_date + INTERVAL '1 day';
  END LOOP;

  -- Also aggregate weeks and months for the date range
  RAISE NOTICE 'Aggregating weekly and monthly summaries...';

  BEGIN
    PERFORM aggregate_weekly_metrics(DATE_TRUNC('week', start_date)::DATE);
    PERFORM aggregate_monthly_metrics(DATE_TRUNC('month', start_date)::DATE);

    IF end_date > start_date + INTERVAL '7 days' THEN
      PERFORM aggregate_weekly_metrics(DATE_TRUNC('week', end_date)::DATE);
    END IF;

    IF DATE_TRUNC('month', end_date) > DATE_TRUNC('month', start_date) THEN
      PERFORM aggregate_monthly_metrics(DATE_TRUNC('month', end_date)::DATE);
    END IF;

    RAISE NOTICE 'Backfill completed successfully';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error aggregating weekly/monthly: %', SQLERRM;
  END;

  RETURN;
END;
$$;

COMMENT ON FUNCTION backfill_metrics IS 'Backfills historical metrics data for a date range - useful for initial setup or re-processing';

-- ============================================================================
-- Function: cleanup_old_metrics
-- Purpose: Remove old raw metrics and daily summaries based on retention policy
-- Parameters: None
-- Returns: void
-- Retention: 90 days for raw metrics, 365 days for daily summaries
-- Usage: SELECT cleanup_old_metrics();
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_metrics()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_raw_deleted INTEGER;
  v_daily_deleted INTEGER;
BEGIN
  -- Delete raw metrics older than 90 days
  DELETE FROM public.api_request_metrics
  WHERE created_at < CURRENT_DATE - INTERVAL '90 days';

  GET DIAGNOSTICS v_raw_deleted = ROW_COUNT;

  -- Delete daily summaries older than 365 days
  DELETE FROM public.daily_metrics_summary
  WHERE date < CURRENT_DATE - INTERVAL '365 days';

  GET DIAGNOSTICS v_daily_deleted = ROW_COUNT;

  RAISE NOTICE 'Cleanup completed: % raw metrics deleted, % daily summaries deleted', v_raw_deleted, v_daily_deleted;
END;
$$;

COMMENT ON FUNCTION cleanup_old_metrics IS 'Removes old metrics data per retention policy (90 days for raw, 365 days for daily summaries)';

-- ============================================================================
-- Verification
-- Run these queries to test the functions:
-- ============================================================================

-- Test daily aggregation for yesterday
-- SELECT aggregate_daily_metrics(CURRENT_DATE - INTERVAL '1 day');

-- Test backfill for last 7 days
-- SELECT * FROM backfill_metrics(CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE);

-- Verify aggregated data
-- SELECT * FROM daily_metrics_summary ORDER BY date DESC LIMIT 7;

-- Test cleanup (will show 0 deleted if no old data)
-- SELECT cleanup_old_metrics();
