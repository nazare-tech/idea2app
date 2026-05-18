-- Local development Prompt Lab experiment and run history.
-- These tables are user-scoped even though the app routes are dev-only.

CREATE TABLE IF NOT EXISTS prompt_lab_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  artifact_type TEXT NOT NULL CHECK (artifact_type IN ('competitive', 'prd', 'mvp', 'mockups', 'launch')),
  title TEXT NOT NULL DEFAULT 'Untitled prompt draft',
  system_prompt TEXT NOT NULL,
  user_prompt TEXT NOT NULL,
  model_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS prompt_lab_experiments_user_idx ON prompt_lab_experiments(user_id);
CREATE INDEX IF NOT EXISTS prompt_lab_experiments_project_artifact_idx ON prompt_lab_experiments(project_id, artifact_type, updated_at DESC);

ALTER TABLE prompt_lab_experiments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own prompt lab experiments"
  ON prompt_lab_experiments;
CREATE POLICY "Users can view their own prompt lab experiments"
  ON prompt_lab_experiments FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own prompt lab experiments"
  ON prompt_lab_experiments;
CREATE POLICY "Users can insert their own prompt lab experiments"
  ON prompt_lab_experiments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      project_id IS NULL
      OR project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update their own prompt lab experiments"
  ON prompt_lab_experiments;
CREATE POLICY "Users can update their own prompt lab experiments"
  ON prompt_lab_experiments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      project_id IS NULL
      OR project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete their own prompt lab experiments"
  ON prompt_lab_experiments;
CREATE POLICY "Users can delete their own prompt lab experiments"
  ON prompt_lab_experiments FOR DELETE
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS prompt_lab_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID REFERENCES prompt_lab_experiments(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  artifact_type TEXT NOT NULL CHECK (artifact_type IN ('competitive', 'prd', 'mvp', 'mockups', 'launch')),
  title TEXT NOT NULL DEFAULT 'Untitled run',
  model_id TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  user_prompt TEXT NOT NULL,
  input_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_content TEXT,
  output_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed')),
  error_message TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS prompt_lab_runs_user_idx ON prompt_lab_runs(user_id);
CREATE INDEX IF NOT EXISTS prompt_lab_runs_project_artifact_idx ON prompt_lab_runs(project_id, artifact_type, created_at DESC);
CREATE INDEX IF NOT EXISTS prompt_lab_runs_experiment_idx ON prompt_lab_runs(experiment_id);

ALTER TABLE prompt_lab_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own prompt lab runs"
  ON prompt_lab_runs;
CREATE POLICY "Users can view their own prompt lab runs"
  ON prompt_lab_runs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own prompt lab runs"
  ON prompt_lab_runs;
CREATE POLICY "Users can insert their own prompt lab runs"
  ON prompt_lab_runs FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their own prompt lab runs"
  ON prompt_lab_runs;
CREATE POLICY "Users can update their own prompt lab runs"
  ON prompt_lab_runs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete their own prompt lab runs"
  ON prompt_lab_runs;
CREATE POLICY "Users can delete their own prompt lab runs"
  ON prompt_lab_runs FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_prompt_lab_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_prompt_lab_experiments_updated_at ON prompt_lab_experiments;
CREATE TRIGGER update_prompt_lab_experiments_updated_at
  BEFORE UPDATE ON prompt_lab_experiments
  FOR EACH ROW EXECUTE FUNCTION update_prompt_lab_updated_at();

DROP TRIGGER IF EXISTS update_prompt_lab_runs_updated_at ON prompt_lab_runs;
CREATE TRIGGER update_prompt_lab_runs_updated_at
  BEFORE UPDATE ON prompt_lab_runs
  FOR EACH ROW EXECUTE FUNCTION update_prompt_lab_updated_at();
