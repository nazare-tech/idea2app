-- Explicitly separate internal entitlement plans from public pricing and
-- Stripe checkout eligibility.

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS checkout_enabled BOOLEAN NOT NULL DEFAULT false;

UPDATE plans
SET
  is_public = CASE WHEN lower(name) = 'internal dev' THEN false ELSE true END,
  checkout_enabled = CASE
    WHEN lower(name) = 'internal dev' THEN false
    WHEN stripe_price_id IS NULL THEN false
    ELSE true
  END
WHERE is_public = false OR checkout_enabled = false;
