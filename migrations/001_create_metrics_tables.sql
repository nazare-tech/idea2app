-- ============================================================================
-- Migration: 001 - Create Usage Metrics Tables
-- Description: Creates tables for tracking API request metrics and aggregated summaries
-- Author: Claude Code
-- Date: 2026-02-20
-- ============================================================================

-- ============================================================================
-- Table 1: api_request_metrics
-- Purpose: Tracks all API requests with performance and outcome metrics
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.api_request_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,

  -- Request info
  endpoint VARCHAR(255) NOT NULL,  -- e.g., '/api/chat', '/api/analysis/prd'
  method VARCHAR(10) NOT NULL,     -- GET, POST, PATCH, DELETE
  feature_type VARCHAR(50) NOT NULL, -- 'chat', 'prompt-chat', 'analysis', 'document-edit', 'app-generation', 'other'

  -- Performance metrics
  response_time_ms INTEGER NOT NULL,  -- API response time in milliseconds
  status_code INTEGER NOT NULL,       -- HTTP status code (200, 402, 500, etc.)

  -- Credits & Model info
  credits_consumed INTEGER DEFAULT 0,
  model_used VARCHAR(100),           -- e.g., 'anthropic/claude-sonnet-4', 'gpt-4'
  ai_source VARCHAR(50),             -- 'openrouter', 'anthropic', 'n8n'

  -- Error tracking
  error_type VARCHAR(100),           -- 'insufficient_credits', 'api_timeout', 'validation_error', etc.
  error_message TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_api_metrics_user_id ON public.api_request_metrics(user_id);
CREATE INDEX idx_api_metrics_project_id ON public.api_request_metrics(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_api_metrics_endpoint ON public.api_request_metrics(endpoint);
CREATE INDEX idx_api_metrics_feature_type ON public.api_request_metrics(feature_type);
CREATE INDEX idx_api_metrics_created_at ON public.api_request_metrics(created_at DESC);
CREATE INDEX idx_api_metrics_status_code ON public.api_request_metrics(status_code);
CREATE INDEX idx_api_metrics_user_created ON public.api_request_metrics(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.api_request_metrics ENABLE ROW LEVEL SECURITY;

-- Admin only access (no user access)
CREATE POLICY "Service role full access to api_request_metrics"
  ON public.api_request_metrics
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

COMMENT ON TABLE public.api_request_metrics IS 'Tracks all API requests with performance metrics, errors, and credit consumption';
COMMENT ON COLUMN public.api_request_metrics.endpoint IS 'Full API endpoint path (e.g., /api/chat, /api/analysis/prd)';
COMMENT ON COLUMN public.api_request_metrics.feature_type IS 'High-level feature category for grouping (chat, analysis, app-generation, etc.)';
COMMENT ON COLUMN public.api_request_metrics.response_time_ms IS 'Total API response time in milliseconds';
COMMENT ON COLUMN public.api_request_metrics.status_code IS 'HTTP status code (200=success, 402=insufficient credits, 500=error, etc.)';

-- ============================================================================
-- Table 2: daily_metrics_summary
-- Purpose: Pre-aggregated daily metrics for fast dashboard queries
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.daily_metrics_summary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,

  -- User metrics
  total_active_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,

  -- Feature usage counts
  chat_requests INTEGER DEFAULT 0,
  prompt_chat_requests INTEGER DEFAULT 0,
  document_edit_requests INTEGER DEFAULT 0,
  competitive_analysis_requests INTEGER DEFAULT 0,
  prd_requests INTEGER DEFAULT 0,
  mvp_plan_requests INTEGER DEFAULT 0,
  tech_spec_requests INTEGER DEFAULT 0,
  app_generation_requests INTEGER DEFAULT 0,

  -- Total requests
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,

  -- Credits
  total_credits_consumed INTEGER DEFAULT 0,

  -- Performance
  avg_response_time_ms INTEGER DEFAULT 0,
  p95_response_time_ms INTEGER DEFAULT 0,
  p99_response_time_ms INTEGER DEFAULT 0,

  -- Errors
  error_count INTEGER DEFAULT 0,
  insufficient_credits_count INTEGER DEFAULT 0,
  api_timeout_count INTEGER DEFAULT 0,

  -- Project activity
  projects_created INTEGER DEFAULT 0,
  projects_with_activity INTEGER DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Unique constraint on date
CREATE UNIQUE INDEX idx_daily_metrics_date ON public.daily_metrics_summary(date);

-- Index for range queries
CREATE INDEX idx_daily_metrics_created_at ON public.daily_metrics_summary(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.daily_metrics_summary ENABLE ROW LEVEL SECURITY;

-- Admin only access
CREATE POLICY "Service role full access to daily_metrics_summary"
  ON public.daily_metrics_summary
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

COMMENT ON TABLE public.daily_metrics_summary IS 'Pre-aggregated daily metrics for admin dashboard queries';
COMMENT ON COLUMN public.daily_metrics_summary.date IS 'The calendar date (UTC) for this daily summary';
COMMENT ON COLUMN public.daily_metrics_summary.total_active_users IS 'Count of distinct users who made requests on this date';
COMMENT ON COLUMN public.daily_metrics_summary.new_users IS 'Count of users created on this date';

-- ============================================================================
-- Table 3: weekly_metrics_summary
-- Purpose: Weekly aggregations for trend analysis
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.weekly_metrics_summary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start_date DATE NOT NULL,  -- Monday of the week
  week_number INTEGER NOT NULL,   -- ISO week number
  year INTEGER NOT NULL,

  -- Same structure as daily metrics but aggregated
  total_active_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,

  chat_requests INTEGER DEFAULT 0,
  prompt_chat_requests INTEGER DEFAULT 0,
  document_edit_requests INTEGER DEFAULT 0,
  competitive_analysis_requests INTEGER DEFAULT 0,
  prd_requests INTEGER DEFAULT 0,
  mvp_plan_requests INTEGER DEFAULT 0,
  tech_spec_requests INTEGER DEFAULT 0,
  app_generation_requests INTEGER DEFAULT 0,

  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,

  total_credits_consumed INTEGER DEFAULT 0,

  avg_response_time_ms INTEGER DEFAULT 0,
  p95_response_time_ms INTEGER DEFAULT 0,

  error_count INTEGER DEFAULT 0,
  projects_created INTEGER DEFAULT 0,
  projects_with_activity INTEGER DEFAULT 0,

  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Unique constraint on week
CREATE UNIQUE INDEX idx_weekly_metrics_week ON public.weekly_metrics_summary(year, week_number);
CREATE INDEX idx_weekly_metrics_date ON public.weekly_metrics_summary(week_start_date DESC);

ALTER TABLE public.weekly_metrics_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to weekly_metrics_summary"
  ON public.weekly_metrics_summary
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

COMMENT ON TABLE public.weekly_metrics_summary IS 'Pre-aggregated weekly metrics for trend analysis';
COMMENT ON COLUMN public.weekly_metrics_summary.week_start_date IS 'First day (Monday) of the week';
COMMENT ON COLUMN public.weekly_metrics_summary.week_number IS 'ISO week number (1-53)';

-- ============================================================================
-- Table 4: monthly_metrics_summary
-- Purpose: Monthly aggregations for long-term trends
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.monthly_metrics_summary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  month DATE NOT NULL,  -- First day of the month (YYYY-MM-01)
  year INTEGER NOT NULL,
  month_number INTEGER NOT NULL,

  -- Same aggregated metrics
  total_active_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,

  chat_requests INTEGER DEFAULT 0,
  prompt_chat_requests INTEGER DEFAULT 0,
  document_edit_requests INTEGER DEFAULT 0,
  competitive_analysis_requests INTEGER DEFAULT 0,
  prd_requests INTEGER DEFAULT 0,
  mvp_plan_requests INTEGER DEFAULT 0,
  tech_spec_requests INTEGER DEFAULT 0,
  app_generation_requests INTEGER DEFAULT 0,

  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,

  total_credits_consumed INTEGER DEFAULT 0,

  avg_response_time_ms INTEGER DEFAULT 0,
  p95_response_time_ms INTEGER DEFAULT 0,

  error_count INTEGER DEFAULT 0,
  projects_created INTEGER DEFAULT 0,
  projects_with_activity INTEGER DEFAULT 0,

  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX idx_monthly_metrics_month ON public.monthly_metrics_summary(year, month_number);
CREATE INDEX idx_monthly_metrics_date ON public.monthly_metrics_summary(month DESC);

ALTER TABLE public.monthly_metrics_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to monthly_metrics_summary"
  ON public.monthly_metrics_summary
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

COMMENT ON TABLE public.monthly_metrics_summary IS 'Pre-aggregated monthly metrics for long-term trend analysis';
COMMENT ON COLUMN public.monthly_metrics_summary.month IS 'First day of the month (YYYY-MM-01)';
COMMENT ON COLUMN public.monthly_metrics_summary.month_number IS 'Month number (1-12)';

-- ============================================================================
-- Verification Query
-- Run this to verify tables were created successfully:
-- SELECT table_name, table_type FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name LIKE '%metrics%';
-- ============================================================================
