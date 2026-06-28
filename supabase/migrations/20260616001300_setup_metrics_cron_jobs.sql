-- ============================================================================
-- Migration: 004 - Setup Automated Metrics Aggregation Jobs
-- Description: Configures pg_cron for automated daily/weekly/monthly aggregation
-- Author: Claude Code
-- Date: 2026-02-20
-- ============================================================================

-- ============================================================================
-- IMPORTANT: pg_cron Extension Setup
--
-- pg_cron must be enabled in your Supabase project. To enable:
-- 1. Go to Supabase Dashboard → Database → Extensions
-- 2. Search for "pg_cron" and enable it
-- 3. Or run: CREATE EXTENSION IF NOT EXISTS pg_cron;
--
-- Note: pg_cron requires superuser privileges which are only available
-- in the Supabase SQL Editor (not from application code)
-- ============================================================================

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL - used for automated metrics aggregation';

-- ============================================================================
-- Job 1: Daily Metrics Aggregation
-- Schedule: Every day at 1:00 AM UTC
-- Purpose: Aggregates yesterday's API metrics into daily_metrics_summary
-- ============================================================================

-- Remove existing job if it exists (for re-running this migration)
SELECT cron.unschedule('aggregate-daily-metrics') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'aggregate-daily-metrics'
);

-- Schedule daily aggregation
SELECT cron.schedule(
  'aggregate-daily-metrics',           -- Job name
  '0 1 * * *',                        -- Cron expression: Every day at 1 AM UTC
  $$SELECT aggregate_daily_metrics(CURRENT_DATE - INTERVAL '1 day')$$  -- SQL command
);

COMMENT ON EXTENSION pg_cron IS 'Job scheduler - aggregate-daily-metrics runs daily at 1 AM UTC';

-- ============================================================================
-- Job 2: Weekly Metrics Aggregation
-- Schedule: Every Monday at 2:00 AM UTC
-- Purpose: Aggregates last week's daily summaries into weekly_metrics_summary
-- ============================================================================

-- Remove existing job if it exists
SELECT cron.unschedule('aggregate-weekly-metrics') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'aggregate-weekly-metrics'
);

-- Schedule weekly aggregation
SELECT cron.schedule(
  'aggregate-weekly-metrics',          -- Job name
  '0 2 * * 1',                        -- Cron expression: Every Monday at 2 AM UTC
  $$SELECT aggregate_weekly_metrics(DATE_TRUNC('week', CURRENT_DATE - INTERVAL '1 week')::DATE)$$  -- SQL command
);

-- ============================================================================
-- Job 3: Monthly Metrics Aggregation
-- Schedule: 1st of each month at 3:00 AM UTC
-- Purpose: Aggregates last month's daily summaries into monthly_metrics_summary
-- ============================================================================

-- Remove existing job if it exists
SELECT cron.unschedule('aggregate-monthly-metrics') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'aggregate-monthly-metrics'
);

-- Schedule monthly aggregation
SELECT cron.schedule(
  'aggregate-monthly-metrics',         -- Job name
  '0 3 1 * *',                        -- Cron expression: 1st of month at 3 AM UTC
  $$SELECT aggregate_monthly_metrics(DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE)$$  -- SQL command
);

-- ============================================================================
-- Job 4: Cleanup Old Metrics
-- Schedule: 1st of each month at 4:00 AM UTC
-- Purpose: Removes old raw metrics (>90 days) and old daily summaries (>365 days)
-- ============================================================================

-- Remove existing job if it exists
SELECT cron.unschedule('cleanup-old-metrics') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-old-metrics'
);

-- Schedule cleanup
SELECT cron.schedule(
  'cleanup-old-metrics',               -- Job name
  '0 4 1 * *',                        -- Cron expression: 1st of month at 4 AM UTC
  'SELECT cleanup_old_metrics()'      -- SQL command
);

-- ============================================================================
-- Verification: View All Scheduled Jobs
-- ============================================================================

-- Query to see all scheduled cron jobs
SELECT
  jobid,
  jobname,
  schedule,
  command,
  active,
  database
FROM cron.job
WHERE jobname LIKE '%metrics%'
ORDER BY jobid;

-- ============================================================================
-- Manual Job Management Commands
-- ============================================================================

-- To view all cron jobs:
-- SELECT * FROM cron.job;

-- To view job run history (last 100 runs):
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 100;

-- To manually unschedule a job:
-- SELECT cron.unschedule('job-name-here');

-- To manually run a job:
-- SELECT aggregate_daily_metrics(CURRENT_DATE - INTERVAL '1 day');
-- SELECT aggregate_weekly_metrics(DATE_TRUNC('week', CURRENT_DATE - INTERVAL '1 week')::DATE);
-- SELECT aggregate_monthly_metrics(DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE);

-- To alter a job schedule:
-- SELECT cron.alter_job(jobid, schedule := '0 2 * * *') WHERE jobname = 'aggregate-daily-metrics';

-- To disable a job temporarily:
-- UPDATE cron.job SET active = false WHERE jobname = 'aggregate-daily-metrics';

-- To re-enable a job:
-- UPDATE cron.job SET active = true WHERE jobname = 'aggregate-daily-metrics';

-- ============================================================================
-- Monitoring Cron Job Execution
-- ============================================================================

-- View to check recent cron job runs and their status
CREATE OR REPLACE VIEW v_cron_job_status AS
SELECT
  j.jobname,
  j.schedule,
  j.active,
  j.command,
  r.start_time as last_run_start,
  r.end_time as last_run_end,
  r.status as last_run_status,
  r.return_message as last_run_message,
  EXTRACT(EPOCH FROM (r.end_time - r.start_time)) as last_run_duration_seconds
FROM cron.job j
LEFT JOIN LATERAL (
  SELECT *
  FROM cron.job_run_details
  WHERE jobid = j.jobid
  ORDER BY start_time DESC
  LIMIT 1
) r ON true
WHERE j.jobname LIKE '%metrics%'
ORDER BY j.jobname;

COMMENT ON VIEW v_cron_job_status IS 'Shows the status of metrics-related cron jobs and their last execution';

-- Query to check if jobs are running correctly:
-- SELECT * FROM v_cron_job_status;

-- ============================================================================
-- Troubleshooting Tips
-- ============================================================================

-- If a job fails, check the job_run_details table:
-- SELECT * FROM cron.job_run_details
-- WHERE jobname = 'aggregate-daily-metrics'
-- ORDER BY start_time DESC LIMIT 10;

-- If you need to re-run a failed aggregation manually:
-- SELECT aggregate_daily_metrics('2026-02-19'::DATE);

-- To backfill multiple days at once:
-- SELECT * FROM backfill_metrics('2026-02-01'::DATE, '2026-02-19'::DATE);

-- ============================================================================
-- Important Notes
-- ============================================================================

-- 1. All times are in UTC
-- 2. Jobs run with the privileges of the database owner
-- 3. pg_cron stores job definitions in the cron.job table
-- 4. Job execution history is in cron.job_run_details (limited retention)
-- 5. Failed jobs do not retry automatically - monitor v_cron_job_status
-- 6. Jobs will not run if the database is paused (Supabase free tier)

-- ============================================================================
-- Verification Complete
-- Run: SELECT * FROM v_cron_job_status;
-- To see all scheduled jobs and their last execution status
-- ============================================================================
