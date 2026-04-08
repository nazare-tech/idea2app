-- Migration: Create refund_credits RPC function
-- Description: Refunds credits to a user when generation fails after deduction
-- Created: 2026-04-07

-- refund_credits: adds back credits that were consumed before a generation failure.
-- Logs the refund in credits_history for audit trail.
CREATE OR REPLACE FUNCTION refund_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_action TEXT,
  p_description TEXT DEFAULT 'Generation failed — credits refunded'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance INTEGER;
BEGIN
  -- Add credits back to user profile
  UPDATE profiles
  SET credits = credits + p_amount
  WHERE id = p_user_id
  RETURNING credits INTO v_current_balance;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Log the refund in credits_history
  INSERT INTO credits_history (user_id, amount, balance_after, action, description)
  VALUES (p_user_id, p_amount, v_current_balance, p_action || '_refund', p_description);

  RETURN TRUE;
END;
$$;
