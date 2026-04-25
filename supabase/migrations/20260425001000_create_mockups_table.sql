-- Ensure the Supabase migration chain includes the mockups table used by
-- individual mockup generation and normalized queue output references.

CREATE TABLE IF NOT EXISTS mockups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  model_used TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mockups_project_id ON mockups(project_id);
CREATE INDEX IF NOT EXISTS idx_mockups_created_at ON mockups(created_at);
CREATE INDEX IF NOT EXISTS idx_mockups_project_created ON mockups(project_id, created_at DESC);

ALTER TABLE mockups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own mockups" ON mockups;
CREATE POLICY "Users can view their own mockups"
  ON mockups FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert mockups to their projects" ON mockups;
CREATE POLICY "Users can insert mockups to their projects"
  ON mockups FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own mockups" ON mockups;
CREATE POLICY "Users can update their own mockups"
  ON mockups FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their own mockups" ON mockups;
CREATE POLICY "Users can delete their own mockups"
  ON mockups FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION update_mockups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_mockups_updated_at_trigger ON mockups;
CREATE TRIGGER update_mockups_updated_at_trigger
  BEFORE UPDATE ON mockups
  FOR EACH ROW
  EXECUTE FUNCTION update_mockups_updated_at();
