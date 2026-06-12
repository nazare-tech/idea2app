-- Stripe interval price catalog for live production billing.
--
-- `plans` remains the entitlement tier table. `plan_prices` stores the
-- checkout-enabled Stripe recurring Prices for each billing interval.

CREATE TABLE IF NOT EXISTS plan_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  stripe_price_id TEXT,
  currency TEXT NOT NULL DEFAULT 'usd',
  unit_amount_cents INTEGER NOT NULL CHECK (unit_amount_cents >= 0),
  interval_unit TEXT NOT NULL CHECK (interval_unit IN ('month', 'year')),
  interval_count INTEGER NOT NULL CHECK (interval_count > 0),
  label TEXT NOT NULL,
  savings_label TEXT,
  credits_multiplier INTEGER NOT NULL DEFAULT 1 CHECK (credits_multiplier > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  checkout_enabled BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (plan_id, interval_unit, interval_count)
);

CREATE UNIQUE INDEX IF NOT EXISTS plan_prices_stripe_price_id_key
  ON plan_prices (stripe_price_id)
  WHERE stripe_price_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS plan_prices_plan_id_idx
  ON plan_prices (plan_id);

ALTER TABLE plan_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active public plan prices"
  ON plan_prices;

CREATE POLICY "Anyone can view active public plan prices"
  ON plan_prices
  FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1
      FROM plans
      WHERE plans.id = plan_prices.plan_id
        AND plans.is_active = true
        AND plans.is_public = true
    )
  );

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS plan_price_id UUID REFERENCES plan_prices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

CREATE INDEX IF NOT EXISTS subscriptions_plan_price_id_idx
  ON subscriptions (plan_price_id);

-- Align public self-serve plan display prices before building the interval
-- catalog. Live Stripe Price IDs are inserted after the live catalog exists.
UPDATE plans
SET price_monthly = CASE lower(name)
  WHEN 'starter' THEN 1900
  WHEN 'pro' THEN 4900
  ELSE price_monthly
END
WHERE lower(name) IN ('starter', 'pro');

-- Backfill the existing one-price-per-plan model as the monthly/default
-- interval. Starter/Pro are intentionally created disabled and without
-- Stripe Price IDs so old test Prices cannot be used for live checkout after
-- the public amounts change.
INSERT INTO plan_prices (
  plan_id,
  stripe_price_id,
  currency,
  unit_amount_cents,
  interval_unit,
  interval_count,
  label,
  savings_label,
  credits_multiplier,
  is_active,
  checkout_enabled,
  sort_order
)
SELECT
  plans.id,
  CASE
    WHEN lower(plans.name) IN ('starter', 'pro') THEN NULL
    ELSE plans.stripe_price_id
  END,
  'usd',
  CASE lower(plans.name)
    WHEN 'starter' THEN 1900
    WHEN 'pro' THEN 4900
    ELSE plans.price_monthly
  END,
  'month',
  1,
  'Monthly',
  NULL,
  1,
  plans.is_active IS DISTINCT FROM false,
  CASE
    WHEN lower(plans.name) IN ('starter', 'pro') THEN false
    ELSE COALESCE(plans.checkout_enabled, false) AND plans.stripe_price_id IS NOT NULL
  END,
  10
FROM plans
WHERE plans.price_monthly > 0
ON CONFLICT (plan_id, interval_unit, interval_count)
DO UPDATE SET
  stripe_price_id = EXCLUDED.stripe_price_id,
  unit_amount_cents = EXCLUDED.unit_amount_cents,
  label = EXCLUDED.label,
  credits_multiplier = EXCLUDED.credits_multiplier,
  is_active = EXCLUDED.is_active,
  checkout_enabled = EXCLUDED.checkout_enabled,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- Create disabled future live intervals for Starter and Pro. These rows are
-- intentionally missing Stripe price IDs until the live Stripe catalog exists.
INSERT INTO plan_prices (
  plan_id,
  stripe_price_id,
  currency,
  unit_amount_cents,
  interval_unit,
  interval_count,
  label,
  savings_label,
  credits_multiplier,
  is_active,
  checkout_enabled,
  sort_order
)
SELECT
  plans.id,
  NULL,
  'usd',
  CASE lower(plans.name)
    WHEN 'starter' THEN 10500
    WHEN 'pro' THEN 27000
  END,
  'month',
  6,
  '6 months',
  'Save about 8%',
  6,
  true,
  false,
  20
FROM plans
WHERE lower(plans.name) IN ('starter', 'pro')
ON CONFLICT (plan_id, interval_unit, interval_count)
DO UPDATE SET
  unit_amount_cents = EXCLUDED.unit_amount_cents,
  label = EXCLUDED.label,
  savings_label = EXCLUDED.savings_label,
  credits_multiplier = EXCLUDED.credits_multiplier,
  is_active = EXCLUDED.is_active,
  checkout_enabled = EXCLUDED.checkout_enabled,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

INSERT INTO plan_prices (
  plan_id,
  stripe_price_id,
  currency,
  unit_amount_cents,
  interval_unit,
  interval_count,
  label,
  savings_label,
  credits_multiplier,
  is_active,
  checkout_enabled,
  sort_order
)
SELECT
  plans.id,
  NULL,
  'usd',
  CASE lower(plans.name)
    WHEN 'starter' THEN 19400
    WHEN 'pro' THEN 49900
  END,
  'year',
  1,
  'Annual',
  'Save about 15%',
  12,
  true,
  false,
  30
FROM plans
WHERE lower(plans.name) IN ('starter', 'pro')
ON CONFLICT (plan_id, interval_unit, interval_count)
DO UPDATE SET
  unit_amount_cents = EXCLUDED.unit_amount_cents,
  label = EXCLUDED.label,
  savings_label = EXCLUDED.savings_label,
  credits_multiplier = EXCLUDED.credits_multiplier,
  is_active = EXCLUDED.is_active,
  checkout_enabled = EXCLUDED.checkout_enabled,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- Enterprise is not self-serve for this go-live.
UPDATE plans
SET
  is_public = false,
  checkout_enabled = false
WHERE lower(name) = 'enterprise';

UPDATE plan_prices
SET
  checkout_enabled = false,
  updated_at = NOW()
WHERE plan_id IN (
  SELECT id
  FROM plans
  WHERE lower(name) = 'enterprise'
);

UPDATE subscriptions
SET
  plan_price_id = plan_prices.id,
  stripe_price_id = plan_prices.stripe_price_id
FROM plan_prices
WHERE subscriptions.plan_id = plan_prices.plan_id
  AND subscriptions.plan_price_id IS NULL
  AND plan_prices.interval_unit = 'month'
  AND plan_prices.interval_count = 1;

CREATE TABLE IF NOT EXISTS stripe_credit_grants (
  idempotency_key TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
  plan_price_id UUID REFERENCES plan_prices(id) ON DELETE SET NULL,
  stripe_event_id TEXT,
  stripe_subscription_id TEXT NOT NULL,
  stripe_invoice_id TEXT,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  grant_type TEXT NOT NULL CHECK (grant_type IN ('subscription_initial', 'subscription_renewal')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE stripe_credit_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No browser access to stripe credit grants"
  ON stripe_credit_grants;

CREATE POLICY "No browser access to stripe credit grants"
  ON stripe_credit_grants
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION grant_subscription_credits_once(
  p_idempotency_key TEXT,
  p_user_id UUID,
  p_plan_id UUID,
  p_plan_price_id UUID,
  p_stripe_event_id TEXT,
  p_stripe_subscription_id TEXT,
  p_stripe_invoice_id TEXT,
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ,
  p_amount INTEGER,
  p_grant_type TEXT,
  p_description TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted BOOLEAN := false;
BEGIN
  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0 THEN
    RAISE EXCEPTION 'p_idempotency_key is required';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 100000 THEN
    RAISE EXCEPTION 'p_amount must be between 1 and 100000';
  END IF;

  INSERT INTO stripe_credit_grants (
    idempotency_key,
    user_id,
    plan_id,
    plan_price_id,
    stripe_event_id,
    stripe_subscription_id,
    stripe_invoice_id,
    period_start,
    period_end,
    amount,
    grant_type
  )
  VALUES (
    p_idempotency_key,
    p_user_id,
    p_plan_id,
    p_plan_price_id,
    p_stripe_event_id,
    p_stripe_subscription_id,
    p_stripe_invoice_id,
    p_period_start,
    p_period_end,
    p_amount,
    p_grant_type
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING true INTO v_inserted;

  IF NOT COALESCE(v_inserted, false) THEN
    RETURN false;
  END IF;

  INSERT INTO credits (user_id, balance)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id)
  DO UPDATE SET
    balance = credits.balance + EXCLUDED.balance,
    updated_at = NOW();

  INSERT INTO credits_history (user_id, amount, action, description, metadata)
  VALUES (
    p_user_id,
    p_amount,
    p_grant_type,
    p_description,
    jsonb_build_object(
      'idempotency_key', p_idempotency_key,
      'stripe_event_id', p_stripe_event_id,
      'stripe_subscription_id', p_stripe_subscription_id,
      'stripe_invoice_id', p_stripe_invoice_id,
      'plan_id', p_plan_id,
      'plan_price_id', p_plan_price_id,
      'period_start', p_period_start,
      'period_end', p_period_end
    )
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION grant_subscription_credits_once(
  TEXT,
  UUID,
  UUID,
  UUID,
  TEXT,
  TEXT,
  TEXT,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  INTEGER,
  TEXT,
  TEXT
) FROM PUBLIC;
REVOKE ALL ON FUNCTION grant_subscription_credits_once(
  TEXT,
  UUID,
  UUID,
  UUID,
  TEXT,
  TEXT,
  TEXT,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  INTEGER,
  TEXT,
  TEXT
) FROM anon;
REVOKE ALL ON FUNCTION grant_subscription_credits_once(
  TEXT,
  UUID,
  UUID,
  UUID,
  TEXT,
  TEXT,
  TEXT,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  INTEGER,
  TEXT,
  TEXT
) FROM authenticated;
GRANT EXECUTE ON FUNCTION grant_subscription_credits_once(
  TEXT,
  UUID,
  UUID,
  UUID,
  TEXT,
  TEXT,
  TEXT,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  INTEGER,
  TEXT,
  TEXT
) TO service_role;
