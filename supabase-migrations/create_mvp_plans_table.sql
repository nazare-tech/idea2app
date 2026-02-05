-- Create MVP Plans Table
-- This table stores MVP (Minimum Viable Product) plans generated for each project
-- Similar structure to PRDs and Tech Specs tables

CREATE TABLE IF NOT EXISTS public.mvp_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create index for faster project_id lookups
CREATE INDEX IF NOT EXISTS idx_mvp_plans_project_id ON public.mvp_plans(project_id);

-- Create index for ordering by created_at
CREATE INDEX IF NOT EXISTS idx_mvp_plans_created_at ON public.mvp_plans(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.mvp_plans ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Users can only see MVP plans for their own projects
CREATE POLICY "Users can view their own MVP plans"
  ON public.mvp_plans
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  );

-- Create RLS policy: Users can insert MVP plans for their own projects
CREATE POLICY "Users can insert MVP plans for their own projects"
  ON public.mvp_plans
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  );

-- Create RLS policy: Users can update their own MVP plans
CREATE POLICY "Users can update their own MVP plans"
  ON public.mvp_plans
  FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  );

-- Create RLS policy: Users can delete their own MVP plans
CREATE POLICY "Users can delete their own MVP plans"
  ON public.mvp_plans
  FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  );

-- Add comment to table
COMMENT ON TABLE public.mvp_plans IS 'Stores MVP (Minimum Viable Product) plans generated for projects. Each plan contains strategic development guidance based on the project PRD.';

-- Add comments to columns
COMMENT ON COLUMN public.mvp_plans.id IS 'Unique identifier for the MVP plan';
COMMENT ON COLUMN public.mvp_plans.project_id IS 'Foreign key reference to the project this MVP plan belongs to';
COMMENT ON COLUMN public.mvp_plans.content IS 'Markdown content of the MVP plan';
COMMENT ON COLUMN public.mvp_plans.version IS 'Version number for tracking multiple iterations';
COMMENT ON COLUMN public.mvp_plans.created_at IS 'Timestamp when the MVP plan was created';
COMMENT ON COLUMN public.mvp_plans.updated_at IS 'Timestamp when the MVP plan was last updated';
