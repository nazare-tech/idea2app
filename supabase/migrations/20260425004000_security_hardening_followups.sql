-- Security hardening follow-ups from the 2026-04-25 review.

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  livemode BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'processed', 'failed')),
  error TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No browser access to stripe webhook events"
  ON stripe_webhook_events;

CREATE POLICY "No browser access to stripe webhook events"
  ON stripe_webhook_events
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE TABLE IF NOT EXISTS project_creation_locks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  locked_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE project_creation_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No browser access to project creation locks"
  ON project_creation_locks;

CREATE POLICY "No browser access to project creation locks"
  ON project_creation_locks
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION refund_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_action TEXT,
  p_description TEXT DEFAULT 'Generation failed - credits refunded',
  p_metadata JSONB DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance INTEGER;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 100000 THEN
    RAISE EXCEPTION 'p_amount must be between 1 and 100000';
  END IF;

  INSERT INTO credits (user_id, balance)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id)
  DO UPDATE SET
    balance = credits.balance + EXCLUDED.balance,
    updated_at = NOW()
  RETURNING balance INTO v_current_balance;

  INSERT INTO credits_history (user_id, amount, action, description, metadata)
  VALUES (
    p_user_id,
    p_amount,
    p_action || '_refund',
    p_description,
    COALESCE(p_metadata, '{}'::jsonb)
  );

  RETURN v_current_balance;
END;
$$;

REVOKE ALL ON FUNCTION refund_credits(UUID, INTEGER, TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION refund_credits(UUID, INTEGER, TEXT, TEXT, JSONB) FROM anon;
REVOKE ALL ON FUNCTION refund_credits(UUID, INTEGER, TEXT, TEXT, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION refund_credits(UUID, INTEGER, TEXT, TEXT, JSONB) TO service_role;
