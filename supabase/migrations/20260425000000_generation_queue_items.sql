-- Normalized generation queue items for durable retries, partial success,
-- output references, and dependency-aware execution.

ALTER TABLE generation_queues
  DROP CONSTRAINT IF EXISTS generation_queues_status_check;

ALTER TABLE generation_queues
  ADD CONSTRAINT generation_queues_status_check
  CHECK (status IN ('queued', 'running', 'partial', 'completed', 'cancelled', 'error'));

-- Queue rows contain trusted workflow metadata. Browser clients may read their
-- own rows, but all mutations must go through server routes/RPCs.
DROP POLICY IF EXISTS "Users can insert their own generation queues"
  ON generation_queues;
DROP POLICY IF EXISTS "Users can update their own generation queues"
  ON generation_queues;
DROP POLICY IF EXISTS "Users can delete their own generation queues"
  ON generation_queues;

CREATE TABLE IF NOT EXISTS generation_queue_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID NOT NULL REFERENCES generation_queues(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_id TEXT,
  doc_type TEXT NOT NULL,
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'generating', 'done', 'skipped', 'cancelled', 'error', 'blocked')),
  credit_cost INTEGER NOT NULL DEFAULT 0,
  credit_status TEXT NOT NULL DEFAULT 'unprocessed'
    CHECK (credit_status IN ('unprocessed', 'charged', 'refunded', 'not_charged', 'refund_failed')),
  depends_on TEXT[] NOT NULL DEFAULT '{}'::text[],
  attempt INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 1,
  stage_message TEXT,
  error TEXT,
  output_table TEXT,
  output_id UUID,
  model_id TEXT,
  source TEXT,
  idempotency_key TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (queue_id, doc_type),
  UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS generation_queue_items_queue_id_idx
  ON generation_queue_items(queue_id);

CREATE INDEX IF NOT EXISTS generation_queue_items_project_user_idx
  ON generation_queue_items(project_id, user_id);

CREATE INDEX IF NOT EXISTS generation_queue_items_status_idx
  ON generation_queue_items(status);

ALTER TABLE generation_queue_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own generation queue items"
  ON generation_queue_items;
DROP POLICY IF EXISTS "Users can update their own generation queue items"
  ON generation_queue_items;
DROP POLICY IF EXISTS "Users can delete their own generation queue items"
  ON generation_queue_items;
DROP POLICY IF EXISTS "Users can view their own generation queue items"
  ON generation_queue_items;
CREATE POLICY "Users can view their own generation queue items"
  ON generation_queue_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_generation_queue_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_generation_queue_items_updated_at
  ON generation_queue_items;

CREATE TRIGGER update_generation_queue_items_updated_at
  BEFORE UPDATE ON generation_queue_items
  FOR EACH ROW EXECUTE FUNCTION update_generation_queue_items_updated_at();
