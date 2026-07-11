-- Reverse a subscription period's legacy credit grant exactly once when its
-- invoice payment is fully refunded. Project entitlement is handled separately
-- by subscription status; this keeps the accounting ledger consistent.

ALTER TABLE public.stripe_credit_grants
  ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reversal_event_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS stripe_credit_grants_reversal_event_id_key
  ON public.stripe_credit_grants (reversal_event_id)
  WHERE reversal_event_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS stripe_credit_grants_invoice_id_key
  ON public.stripe_credit_grants (stripe_invoice_id)
  WHERE stripe_invoice_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.reverse_subscription_credits_once(
  p_stripe_invoice_id TEXT,
  p_stripe_event_id TEXT,
  p_description TEXT DEFAULT 'Subscription payment fully refunded'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grant public.stripe_credit_grants%ROWTYPE;
BEGIN
  IF p_stripe_invoice_id IS NULL OR length(trim(p_stripe_invoice_id)) = 0 THEN
    RAISE EXCEPTION 'p_stripe_invoice_id is required';
  END IF;

  IF p_stripe_event_id IS NULL OR length(trim(p_stripe_event_id)) = 0 THEN
    RAISE EXCEPTION 'p_stripe_event_id is required';
  END IF;

  SELECT *
  INTO v_grant
  FROM public.stripe_credit_grants
  WHERE stripe_invoice_id = p_stripe_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No subscription credit grant exists for invoice %', p_stripe_invoice_id;
  END IF;

  IF v_grant.reversed_at IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.credits
  SET
    balance = balance - v_grant.amount,
    updated_at = NOW()
  WHERE user_id = v_grant.user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No credit balance exists for user %', v_grant.user_id;
  END IF;

  INSERT INTO public.credits_history (
    user_id,
    amount,
    action,
    description,
    metadata
  )
  VALUES (
    v_grant.user_id,
    -v_grant.amount,
    'subscription_refund_reversal',
    p_description,
    jsonb_build_object(
      'idempotency_key', v_grant.idempotency_key,
      'stripe_event_id', p_stripe_event_id,
      'stripe_subscription_id', v_grant.stripe_subscription_id,
      'stripe_invoice_id', v_grant.stripe_invoice_id,
      'plan_id', v_grant.plan_id,
      'plan_price_id', v_grant.plan_price_id
    )
  );

  UPDATE public.stripe_credit_grants
  SET
    reversed_at = NOW(),
    reversal_event_id = p_stripe_event_id
  WHERE idempotency_key = v_grant.idempotency_key;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.reverse_subscription_credits_once(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reverse_subscription_credits_once(TEXT, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.reverse_subscription_credits_once(TEXT, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_subscription_credits_once(TEXT, TEXT, TEXT) TO service_role;
