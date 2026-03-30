-- Generation Queues: stores Generate All queue state for persistence across reloads/devices
CREATE TABLE IF NOT EXISTS generation_queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'cancelled', 'error')),
  queue JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_index INTEGER NOT NULL DEFAULT 0,
  model_selections JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_info JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, user_id)
);

-- RLS
ALTER TABLE generation_queues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own generation queues"
  ON generation_queues FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own generation queues"
  ON generation_queues FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generation queues"
  ON generation_queues FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generation queues"
  ON generation_queues FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_generation_queues_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_generation_queues_updated_at
  BEFORE UPDATE ON generation_queues
  FOR EACH ROW EXECUTE FUNCTION update_generation_queues_updated_at();
