-- ============================================================================
-- Migration: 003 - Create Metrics Analytics Views
-- Description: SQL views for common analytics queries on usage metrics
-- Author: Claude Code
-- Date: 2026-02-20
-- ============================================================================

-- ============================================================================
-- View 1: v_feature_usage
-- Purpose: Feature usage breakdown for the last 30 days
-- Shows: Which features are most used, success rates, performance metrics
-- ============================================================================

CREATE OR REPLACE VIEW v_feature_usage AS
SELECT
  feature_type,
  COUNT(*) as total_requests,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT project_id) as unique_projects,
  SUM(credits_consumed) as total_credits,
  AVG(response_time_ms)::INTEGER as avg_response_time_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms)::INTEGER as p95_response_time_ms,
  COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300) as successful_requests,
  COUNT(*) FILTER (WHERE status_code >= 400) as failed_requests,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300) / NULLIF(COUNT(*), 0), 2) as success_rate_pct
FROM api_request_metrics
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY feature_type
ORDER BY total_requests DESC;

COMMENT ON VIEW v_feature_usage IS 'Feature usage metrics for the last 30 days - shows which features are most popular';

-- ============================================================================
-- View 2: v_credit_consumption
-- Purpose: Daily credit consumption by feature for last 90 days
-- Shows: Which features consume the most credits over time
-- ============================================================================

CREATE OR REPLACE VIEW v_credit_consumption AS
SELECT
  DATE(created_at AT TIME ZONE 'UTC') as date,
  feature_type,
  SUM(credits_consumed) as credits_consumed,
  COUNT(*) as request_count,
  COUNT(DISTINCT user_id) as unique_users,
  ROUND(SUM(credits_consumed)::NUMERIC / NULLIF(COUNT(*), 0), 2) as avg_credits_per_request
FROM api_request_metrics
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
  AND credits_consumed > 0
GROUP BY DATE(created_at AT TIME ZONE 'UTC'), feature_type
ORDER BY date DESC, credits_consumed DESC;

COMMENT ON VIEW v_credit_consumption IS 'Daily credit consumption by feature for last 90 days - tracks revenue-generating activity';

-- ============================================================================
-- View 3: v_user_engagement
-- Purpose: User engagement metrics for last 30 days
-- Shows: Most active users, features they use, credits spent
-- ============================================================================

CREATE OR REPLACE VIEW v_user_engagement AS
SELECT
  user_id,
  COUNT(*) as total_requests,
  COUNT(DISTINCT feature_type) as features_used,
  COUNT(DISTINCT project_id) as projects_active,
  SUM(credits_consumed) as total_credits_spent,
  MIN(created_at) as first_activity,
  MAX(created_at) as last_activity,
  ROUND(EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / 86400, 1) as days_active,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300) / NULLIF(COUNT(*), 0), 2) as success_rate_pct
FROM api_request_metrics
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY user_id
ORDER BY total_requests DESC;

COMMENT ON VIEW v_user_engagement IS 'User engagement metrics for last 30 days - identifies most active users and usage patterns';

-- ============================================================================
-- View 4: v_performance_metrics
-- Purpose: API performance and error tracking for last 7 days
-- Shows: Response times, success rates, error counts by endpoint
-- ============================================================================

CREATE OR REPLACE VIEW v_performance_metrics AS
SELECT
  endpoint,
  feature_type,
  COUNT(*) as total_requests,
  AVG(response_time_ms)::INTEGER as avg_response_ms,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY response_time_ms)::INTEGER as p50_response_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms)::INTEGER as p95_response_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms)::INTEGER as p99_response_ms,
  MAX(response_time_ms) as max_response_ms,
  MIN(response_time_ms) as min_response_ms,
  COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300) as successful,
  COUNT(*) FILTER (WHERE status_code >= 400) as errors,
  COUNT(*) FILTER (WHERE status_code = 402) as insufficient_credits,
  COUNT(*) FILTER (WHERE status_code >= 500) as server_errors,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300) / NULLIF(COUNT(*), 0), 2) as success_rate_pct
FROM api_request_metrics
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY endpoint, feature_type
ORDER BY total_requests DESC;

COMMENT ON VIEW v_performance_metrics IS 'API performance and error metrics for last 7 days - monitors system health and identifies issues';

-- ============================================================================
-- View 5: v_error_analysis
-- Purpose: Error breakdown for last 7 days
-- Shows: Most common errors, affected endpoints, impact
-- ============================================================================

CREATE OR REPLACE VIEW v_error_analysis AS
SELECT
  error_type,
  COUNT(*) as error_count,
  COUNT(DISTINCT user_id) as affected_users,
  COUNT(DISTINCT project_id) as affected_projects,
  endpoint,
  feature_type,
  AVG(response_time_ms)::INTEGER as avg_response_time_ms,
  array_agg(DISTINCT status_code ORDER BY status_code) as status_codes,
  MIN(created_at) as first_occurrence,
  MAX(created_at) as last_occurrence,
  -- Sample error message (take one for context)
  (array_agg(error_message ORDER BY created_at DESC))[1] as sample_error_message
FROM api_request_metrics
WHERE error_type IS NOT NULL
  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY error_type, endpoint, feature_type
ORDER BY error_count DESC;

COMMENT ON VIEW v_error_analysis IS 'Error breakdown for last 7 days - helps identify and troubleshoot recurring issues';

-- ============================================================================
-- View 6: v_model_usage
-- Purpose: AI model usage tracking for last 30 days
-- Shows: Which models are used, success rates, performance by model
-- ============================================================================

CREATE OR REPLACE VIEW v_model_usage AS
SELECT
  ai_source,
  model_used,
  feature_type,
  COUNT(*) as request_count,
  COUNT(DISTINCT user_id) as unique_users,
  SUM(credits_consumed) as total_credits,
  AVG(response_time_ms)::INTEGER as avg_response_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms)::INTEGER as p95_response_ms,
  COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300) as successful_requests,
  COUNT(*) FILTER (WHERE status_code >= 400) as failed_requests,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300) / NULLIF(COUNT(*), 0), 2) as success_rate_pct
FROM api_request_metrics
WHERE model_used IS NOT NULL
  AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY ai_source, model_used, feature_type
ORDER BY request_count DESC;

COMMENT ON VIEW v_model_usage IS 'AI model usage breakdown for last 30 days - tracks which models are used and their performance';

-- ============================================================================
-- View 7: v_daily_overview
-- Purpose: Quick daily snapshot of key metrics
-- Shows: Today's activity compared to yesterday
-- ============================================================================

CREATE OR REPLACE VIEW v_daily_overview AS
WITH today AS (
  SELECT
    COUNT(*) as requests,
    COUNT(DISTINCT user_id) as active_users,
    SUM(credits_consumed) as credits,
    AVG(response_time_ms)::INTEGER as avg_response_ms,
    COUNT(*) FILTER (WHERE status_code >= 400) as errors
  FROM api_request_metrics
  WHERE created_at >= CURRENT_DATE
),
yesterday AS (
  SELECT
    COUNT(*) as requests,
    COUNT(DISTINCT user_id) as active_users,
    SUM(credits_consumed) as credits,
    AVG(response_time_ms)::INTEGER as avg_response_ms,
    COUNT(*) FILTER (WHERE status_code >= 400) as errors
  FROM api_request_metrics
  WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
    AND created_at < CURRENT_DATE
)
SELECT
  CURRENT_DATE as date,
  today.requests as today_requests,
  yesterday.requests as yesterday_requests,
  today.requests - yesterday.requests as requests_change,
  today.active_users as today_active_users,
  yesterday.active_users as yesterday_active_users,
  today.active_users - yesterday.active_users as users_change,
  today.credits as today_credits,
  yesterday.credits as yesterday_credits,
  today.credits - yesterday.credits as credits_change,
  today.avg_response_ms as today_avg_response_ms,
  yesterday.avg_response_ms as yesterday_avg_response_ms,
  today.errors as today_errors,
  yesterday.errors as yesterday_errors
FROM today, yesterday;

COMMENT ON VIEW v_daily_overview IS 'Quick daily snapshot comparing today vs yesterday - useful for monitoring daily trends';

-- ============================================================================
-- View 8: v_hourly_activity (for recent real-time monitoring)
-- Purpose: Hourly request volume for last 24 hours
-- Shows: Traffic patterns and peak usage times
-- ============================================================================

CREATE OR REPLACE VIEW v_hourly_activity AS
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total_requests,
  COUNT(DISTINCT user_id) as unique_users,
  SUM(credits_consumed) as credits_consumed,
  AVG(response_time_ms)::INTEGER as avg_response_ms,
  COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300) as successful_requests,
  COUNT(*) FILTER (WHERE status_code >= 400) as failed_requests
FROM api_request_metrics
WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

COMMENT ON VIEW v_hourly_activity IS 'Hourly request volume for last 24 hours - shows traffic patterns and peak times';

-- ============================================================================
-- Verification Queries
-- Run these to test the views:
-- ============================================================================

-- Test feature usage view
-- SELECT * FROM v_feature_usage;

-- Test credit consumption view
-- SELECT * FROM v_credit_consumption LIMIT 10;

-- Test user engagement view
-- SELECT * FROM v_user_engagement LIMIT 10;

-- Test performance metrics view
-- SELECT * FROM v_performance_metrics;

-- Test error analysis view
-- SELECT * FROM v_error_analysis;

-- Test model usage view
-- SELECT * FROM v_model_usage;

-- Test daily overview
-- SELECT * FROM v_daily_overview;

-- Test hourly activity
-- SELECT * FROM v_hourly_activity;
