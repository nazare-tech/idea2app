-- Idea Intake Wizard: pending auth handoff and canonical project intake storage

CREATE TABLE IF NOT EXISTS pending_intakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  idea_text TEXT NOT NULL CHECK (char_length(idea_text) BETWEEN 1 AND 10000),
  source TEXT NOT NULL DEFAULT 'landing',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  claimed_at TIMESTAMPTZ,
  claimed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pending_intakes_token_idx ON pending_intakes(token);
CREATE INDEX IF NOT EXISTS pending_intakes_expires_at_idx ON pending_intakes(expires_at);
CREATE INDEX IF NOT EXISTS pending_intakes_claimed_by_idx ON pending_intakes(claimed_by);

ALTER TABLE pending_intakes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read valid pending intakes by token"
  ON pending_intakes;

CREATE POLICY "Authenticated users can read valid pending intakes by token"
  ON pending_intakes FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND claimed_at IS NULL
    AND expires_at > NOW()
  );

DROP POLICY IF EXISTS "Authenticated users can claim valid pending intakes"
  ON pending_intakes;

CREATE POLICY "Authenticated users can claim valid pending intakes"
  ON pending_intakes FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND claimed_at IS NULL
    AND expires_at > NOW()
  )
  WITH CHECK (
    auth.uid() = claimed_by
    AND claimed_at IS NOT NULL
  );

CREATE TABLE IF NOT EXISTS project_intakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schema_version TEXT NOT NULL DEFAULT 'idea-intake-v1',
  original_idea TEXT NOT NULL,
  questions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  answers_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_summary TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'wizard',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id)
);

CREATE INDEX IF NOT EXISTS project_intakes_project_id_idx ON project_intakes(project_id);
CREATE INDEX IF NOT EXISTS project_intakes_user_id_idx ON project_intakes(user_id);
CREATE INDEX IF NOT EXISTS project_intakes_created_at_idx ON project_intakes(created_at);

ALTER TABLE project_intakes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own project intakes"
  ON project_intakes;

CREATE POLICY "Users can view their own project intakes"
  ON project_intakes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own project intakes"
  ON project_intakes;

CREATE POLICY "Users can insert their own project intakes"
  ON project_intakes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own project intakes"
  ON project_intakes;

CREATE POLICY "Users can update their own project intakes"
  ON project_intakes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own project intakes"
  ON project_intakes;

CREATE POLICY "Users can delete their own project intakes"
  ON project_intakes FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_pending_intakes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_pending_intakes_updated_at ON pending_intakes;

CREATE TRIGGER update_pending_intakes_updated_at
  BEFORE UPDATE ON pending_intakes
  FOR EACH ROW EXECUTE FUNCTION update_pending_intakes_updated_at();

CREATE OR REPLACE FUNCTION update_project_intakes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_project_intakes_updated_at ON project_intakes;

CREATE TRIGGER update_project_intakes_updated_at
  BEFORE UPDATE ON project_intakes
  FOR EACH ROW EXECUTE FUNCTION update_project_intakes_updated_at();
