-- Keep the durable Starter entitlement aligned with the public billing copy.
-- ADD COLUMN is repeated defensively because the linked migration history may
-- report the original allowance migration as applied while the column is absent.

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS monthly_project_allowance INTEGER CHECK (
    monthly_project_allowance IS NULL OR monthly_project_allowance >= 0
  );

UPDATE public.plans
SET monthly_project_allowance = 5
WHERE lower(name) = 'starter'
  AND monthly_project_allowance IS DISTINCT FROM 5;
