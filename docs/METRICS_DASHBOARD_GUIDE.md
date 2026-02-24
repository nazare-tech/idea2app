# Metrics Dashboard Usage Guide

## Overview

This guide explains how to view usage metrics for your Idea2App application using Supabase SQL Editor. All metrics are automatically tracked and aggregated daily, weekly, and monthly via pg_cron jobs.

## Quick Access

1. **Open Supabase Dashboard** → Your Project → SQL Editor
2. **Copy and paste** any query below
3. **Run** to view results
4. **Export** to CSV if needed (click "Download CSV" button)

---

## 📊 Daily Metrics Queries

### Yesterday's Overview

Get a complete snapshot of yesterday's activity:

```sql
SELECT * FROM daily_metrics_summary
WHERE date = CURRENT_DATE - INTERVAL '1 day'
LIMIT 1;
```

**Returns:** Active users, new users, request counts by feature, credits consumed, performance metrics, error counts

### Last 7 Days Trend

```sql
SELECT
  date,
  total_active_users,
  total_requests,
  total_credits_consumed,
  avg_response_time_ms,
  ROUND(100.0 * successful_requests / NULLIF(total_requests, 0), 2) as success_rate_pct
FROM daily_metrics_summary
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC;
```

### Last 30 Days Overview

```sql
SELECT * FROM daily_metrics_summary
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;
```

---

## 📈 Weekly & Monthly Trends

### Last 12 Weeks

```sql
SELECT
  week_start_date,
  week_number,
  year,
  total_active_users,
  total_requests,
  total_credits_consumed,
  chat_requests,
  analysis_requests,
  app_generation_requests
FROM weekly_metrics_summary
ORDER BY week_start_date DESC
LIMIT 12;
```

### Last 12 Months

```sql
SELECT
  month,
  year,
  total_active_users,
  new_users,
  total_requests,
  total_credits_consumed,
  projects_created,
  ROUND(100.0 * successful_requests / NULLIF(total_requests, 0), 2) as success_rate_pct
FROM monthly_metrics_summary
ORDER BY month DESC
LIMIT 12;
```

---

## 🎯 Feature Usage Analytics

### Most Popular Features (Last 30 Days)

```sql
SELECT * FROM v_feature_usage
ORDER BY total_requests DESC;
```

**Shows:** Request counts, unique users, credits consumed, response times, and success rates per feature

### Feature Usage Breakdown by Day

```sql
SELECT
  DATE(created_at) as date,
  feature_type,
  COUNT(*) as requests,
  COUNT(DISTINCT user_id) as unique_users,
  SUM(credits_consumed) as credits
FROM api_request_metrics
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), feature_type
ORDER BY date DESC, requests DESC;
```

---

## 💰 Credit Consumption Analysis

### Daily Credit Usage (Last 90 Days)

```sql
SELECT * FROM v_credit_consumption
ORDER BY date DESC
LIMIT 90;
```

### Top Credit-Consuming Features

```sql
SELECT
  feature_type,
  SUM(credits_consumed) as total_credits,
  COUNT(*) as total_requests,
  ROUND(SUM(credits_consumed)::NUMERIC / NULLIF(COUNT(*), 0), 2) as avg_credits_per_request
FROM api_request_metrics
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND credits_consumed > 0
GROUP BY feature_type
ORDER BY total_credits DESC;
```

### Credit Consumption This Month

```sql
SELECT
  feature_type,
  SUM(credits_consumed) as total_credits,
  COUNT(*) as requests
FROM api_request_metrics
WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY feature_type
ORDER BY total_credits DESC;
```

---

## 👥 User Engagement Metrics

### Top 20 Most Active Users (Last 30 Days)

```sql
SELECT * FROM v_user_engagement
ORDER BY total_requests DESC
LIMIT 20;
```

### User Growth Over Time

```sql
SELECT
  date,
  new_users,
  total_active_users,
  SUM(new_users) OVER (ORDER BY date) as cumulative_users
FROM daily_metrics_summary
WHERE date >= CURRENT_DATE - INTERVAL '90 days'
ORDER BY date DESC;
```

### Users by Activity Level (Last 30 Days)

```sql
SELECT
  CASE
    WHEN total_requests >= 100 THEN 'Power User (100+)'
    WHEN total_requests >= 20 THEN 'Active User (20-99)'
    WHEN total_requests >= 5 THEN 'Regular User (5-19)'
    ELSE 'Light User (1-4)'
  END as activity_level,
  COUNT(*) as user_count,
  SUM(total_requests) as total_requests,
  SUM(total_credits_spent) as total_credits
FROM v_user_engagement
GROUP BY activity_level
ORDER BY MIN(total_requests) DESC;
```

---

## ⚡ Performance Monitoring

### API Performance (Last 7 Days)

```sql
SELECT * FROM v_performance_metrics
ORDER BY total_requests DESC;
```

### Slowest Endpoints

```sql
SELECT
  endpoint,
  feature_type,
  total_requests,
  avg_response_ms,
  p95_response_ms,
  p99_response_ms
FROM v_performance_metrics
WHERE total_requests > 10
ORDER BY p95_response_ms DESC
LIMIT 10;
```

### Endpoints with Low Success Rates

```sql
SELECT
  endpoint,
  feature_type,
  total_requests,
  success_rate_pct,
  errors,
  server_errors
FROM v_performance_metrics
WHERE success_rate_pct < 95
  AND total_requests > 10
ORDER BY success_rate_pct ASC;
```

---

## 🚨 Error Tracking & Analysis

### Most Common Errors (Last 7 Days)

```sql
SELECT * FROM v_error_analysis
ORDER BY error_count DESC
LIMIT 20;
```

### Errors by Type

```sql
SELECT
  error_type,
  COUNT(*) as error_count,
  COUNT(DISTINCT user_id) as affected_users,
  array_agg(DISTINCT endpoint ORDER BY endpoint) as affected_endpoints
FROM api_request_metrics
WHERE error_type IS NOT NULL
  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY error_type
ORDER BY error_count DESC;
```

### Recent Errors with Details

```sql
SELECT
  created_at,
  endpoint,
  method,
  status_code,
  error_type,
  error_message,
  user_id,
  response_time_ms
FROM api_request_metrics
WHERE error_type IS NOT NULL
ORDER BY created_at DESC
LIMIT 50;
```

### Insufficient Credits Errors

```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as credit_errors,
  COUNT(DISTINCT user_id) as affected_users
FROM api_request_metrics
WHERE error_type = 'insufficient_credits'
  AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## 🤖 AI Model Usage

### Models Used (Last 30 Days)

```sql
SELECT * FROM v_model_usage
ORDER BY request_count DESC;
```

### AI Source Breakdown

```sql
SELECT
  ai_source,
  COUNT(*) as requests,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(response_time_ms)::INTEGER as avg_response_ms,
  SUM(credits_consumed) as total_credits,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300) / NULLIF(COUNT(*), 0), 2) as success_rate_pct
FROM api_request_metrics
WHERE ai_source IS NOT NULL
  AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY ai_source
ORDER BY requests DESC;
```

---

## 📅 Today vs Yesterday Comparison

```sql
SELECT * FROM v_daily_overview;
```

**Returns:** Side-by-side comparison of today's metrics vs yesterday

---

## ⏰ Hourly Activity (Last 24 Hours)

```sql
SELECT * FROM v_hourly_activity
ORDER BY hour DESC;
```

**Shows:** Request volume, users, credits, and performance by hour

---

## 🔍 Custom Queries

### Specific User Activity

```sql
SELECT
  created_at,
  endpoint,
  method,
  status_code,
  response_time_ms,
  credits_consumed,
  model_used
FROM api_request_metrics
WHERE user_id = 'USER_ID_HERE'
ORDER BY created_at DESC
LIMIT 100;
```

### Specific Project Activity

```sql
SELECT
  created_at,
  endpoint,
  method,
  feature_type,
  status_code,
  response_time_ms,
  credits_consumed,
  model_used,
  ai_source
FROM api_request_metrics
WHERE project_id = 'PROJECT_ID_HERE'
ORDER BY created_at DESC
LIMIT 100;
```

### Peak Usage Times

```sql
SELECT
  EXTRACT(HOUR FROM created_at) as hour_of_day,
  COUNT(*) as total_requests,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(response_time_ms)::INTEGER as avg_response_ms
FROM api_request_metrics
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY EXTRACT(HOUR FROM created_at)
ORDER BY total_requests DESC;
```

### Response Time Distribution

```sql
SELECT
  CASE
    WHEN response_time_ms < 500 THEN '< 500ms (Fast)'
    WHEN response_time_ms < 1000 THEN '500-1000ms (Good)'
    WHEN response_time_ms < 2000 THEN '1-2s (Acceptable)'
    WHEN response_time_ms < 5000 THEN '2-5s (Slow)'
    ELSE '> 5s (Very Slow)'
  END as response_category,
  COUNT(*) as request_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM api_request_metrics
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY response_category
ORDER BY MIN(response_time_ms);
```

---

## 📊 Exporting Data

### Export to CSV (via Supabase Dashboard)

1. Run any query above
2. Click **"Download CSV"** button in the results panel
3. Save file to your computer

### Export to CSV (via SQL)

For server-side exports on self-hosted Supabase:

```sql
COPY (
  SELECT * FROM daily_metrics_summary
  WHERE date >= CURRENT_DATE - INTERVAL '90 days'
) TO '/tmp/daily_metrics.csv' WITH CSV HEADER;
```

---

## 🔧 Maintenance & Monitoring

### Check Cron Job Status

```sql
SELECT * FROM v_cron_job_status;
```

**Shows:** All scheduled jobs and their last execution status

### View Cron Job History

```sql
SELECT
  jobname,
  start_time,
  end_time,
  status,
  return_message,
  EXTRACT(EPOCH FROM (end_time - start_time)) as duration_seconds
FROM cron.job_run_details
WHERE jobname LIKE '%metrics%'
ORDER BY start_time DESC
LIMIT 20;
```

### Manually Trigger Aggregations

If automated jobs fail or you need to backfill data:

```sql
-- Aggregate yesterday
SELECT aggregate_daily_metrics(CURRENT_DATE - INTERVAL '1 day');

-- Aggregate last week
SELECT aggregate_weekly_metrics(DATE_TRUNC('week', CURRENT_DATE - INTERVAL '1 week')::DATE);

-- Aggregate last month
SELECT aggregate_monthly_metrics(DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE);
```

### Backfill Historical Data

```sql
-- Backfill last 30 days
SELECT * FROM backfill_metrics(
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE
);
```

---

## 📋 Dashboard Setup Checklist

After running the migrations, verify your setup:

- [ ] All 4 tables created (`api_request_metrics`, `daily_metrics_summary`, `weekly_metrics_summary`, `monthly_metrics_summary`)
- [ ] All 6 views created (`v_feature_usage`, `v_credit_consumption`, `v_user_engagement`, `v_performance_metrics`, `v_error_analysis`, `v_model_usage`)
- [ ] pg_cron extension enabled
- [ ] 4 cron jobs scheduled (daily, weekly, monthly aggregation + cleanup)
- [ ] Metrics tracking active in all API routes
- [ ] First daily aggregation completed successfully

**Verification Query:**

```sql
-- Check if metrics are being collected
SELECT COUNT(*) as total_metrics, MIN(created_at) as first_metric, MAX(created_at) as latest_metric
FROM api_request_metrics;

-- Check if daily summaries exist
SELECT COUNT(*) as summary_days FROM daily_metrics_summary;

-- Check cron jobs
SELECT jobname, active FROM cron.job WHERE jobname LIKE '%metrics%';
```

---

## 🎯 Key Metrics to Monitor

### Daily Monitoring

1. **Active Users** - Track daily active user count
2. **Success Rate** - Should be > 95%
3. **P95 Response Time** - Should be < 5000ms
4. **Error Count** - Monitor spikes
5. **Insufficient Credits** - Indicates users need upgrades

### Weekly Review

1. **User Growth** - New users vs active users trend
2. **Feature Adoption** - Which features are growing
3. **Credit Consumption** - Revenue-generating activity
4. **Performance Trends** - Response time changes

### Monthly Analysis

1. **MoM Growth** - Month-over-month user and request growth
2. **Feature Mix** - Changing usage patterns
3. **Revenue Metrics** - Credit consumption trends
4. **System Health** - Error rates and performance

---

## 💡 Pro Tips

1. **Bookmark Common Queries** - Save frequently used queries in Supabase
2. **Set Up Alerts** - Use Supabase webhooks to alert on error spikes
3. **Regular Reviews** - Check v_cron_job_status weekly to ensure jobs run successfully
4. **Data Retention** - Raw metrics kept 90 days, daily summaries 365 days, weekly/monthly indefinitely
5. **Performance** - All views and summary tables are indexed for fast queries

---

## 🆘 Troubleshooting

### No Data in Summary Tables

```sql
-- Check if raw metrics exist
SELECT COUNT(*) FROM api_request_metrics;

-- Manually trigger aggregation
SELECT aggregate_daily_metrics(CURRENT_DATE - INTERVAL '1 day');

-- Check for errors in cron job
SELECT * FROM cron.job_run_details
WHERE jobname = 'aggregate-daily-metrics'
ORDER BY start_time DESC LIMIT 5;
```

### Cron Jobs Not Running

```sql
-- Check if jobs are active
SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE '%metrics%';

-- Enable a disabled job
UPDATE cron.job SET active = true WHERE jobname = 'aggregate-daily-metrics';
```

### Slow Queries

All queries should complete in < 1 second. If not:

```sql
-- Check indexes
SELECT tablename, indexname FROM pg_indexes
WHERE schemaname = 'public' AND tablename LIKE '%metrics%';
```

---

## 📚 Additional Resources

- **Migration Files**: `/migrations/001-004_*.sql`
- **Tracking Utility**: `/src/lib/metrics-tracker.ts`
- **Implementation Plan**: See plan file for complete architecture

---

**Last Updated:** 2026-02-20
**Questions?** Refer to the migration files for schema details and function implementations.
