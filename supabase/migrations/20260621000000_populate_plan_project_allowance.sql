-- Make project allowances explicit so runtime entitlement checks do not infer
-- limits from display names or feature copy.

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS monthly_project_allowance INTEGER CHECK (
    monthly_project_allowance IS NULL OR monthly_project_allowance >= 0
  );

UPDATE plans
SET monthly_project_allowance = CASE lower(name)
  WHEN 'free' THEN 1
  WHEN 'starter' THEN 3
  WHEN 'basic' THEN 3
  WHEN 'pro' THEN 10
  WHEN 'growth' THEN 25
  WHEN 'team' THEN 25
  WHEN 'business' THEN 50
  WHEN 'enterprise' THEN NULL
  WHEN 'internal dev' THEN NULL
  ELSE monthly_project_allowance
END
WHERE lower(name) IN (
  'free',
  'starter',
  'basic',
  'pro',
  'growth',
  'team',
  'business',
  'enterprise',
  'internal dev'
);
