-- Durable per-option mockup progress for generated images that are uploaded
-- before the canonical three-option mockup document is finalized.

CREATE TABLE IF NOT EXISTS mockup_option_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  run_id TEXT NOT NULL,
  option_label TEXT NOT NULL CHECK (option_label IN ('A', 'B', 'C')),
  option_json JSONB NOT NULL,
  model_used TEXT,
  source TEXT NOT NULL DEFAULT 'openrouter-image-v2',
  design_plan JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, run_id, option_label)
);

CREATE INDEX IF NOT EXISTS mockup_option_drafts_project_run_idx
  ON mockup_option_drafts(project_id, run_id);

CREATE INDEX IF NOT EXISTS mockup_option_drafts_user_project_idx
  ON mockup_option_drafts(user_id, project_id);

ALTER TABLE mockup_option_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own mockup option drafts"
  ON mockup_option_drafts;
CREATE POLICY "Users can view their own mockup option drafts"
  ON mockup_option_drafts FOR SELECT
  USING (
    auth.uid() = user_id
    AND project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert their own mockup option drafts"
  ON mockup_option_drafts;
CREATE POLICY "Users can insert their own mockup option drafts"
  ON mockup_option_drafts FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their own mockup option drafts"
  ON mockup_option_drafts;
CREATE POLICY "Users can update their own mockup option drafts"
  ON mockup_option_drafts FOR UPDATE
  USING (
    auth.uid() = user_id
    AND project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    AND project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete their own mockup option drafts"
  ON mockup_option_drafts;
CREATE POLICY "Users can delete their own mockup option drafts"
  ON mockup_option_drafts FOR DELETE
  USING (
    auth.uid() = user_id
    AND project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.update_mockup_option_drafts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_mockup_option_drafts_updated_at_trigger
  ON mockup_option_drafts;
CREATE TRIGGER update_mockup_option_drafts_updated_at_trigger
  BEFORE UPDATE ON mockup_option_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_mockup_option_drafts_updated_at();
