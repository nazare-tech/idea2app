-- Recovered from supabase_migrations.schema_migrations on 2026-06-29.
-- This migration was present in the linked remote migration history but missing locally.

-- Seed default pricing plans
INSERT INTO public.plans (name, description, price_monthly, credits_monthly, features, is_active) VALUES
('Free', 'Get started with basic features', 0, 10, '["10 credits/month", "Basic chat support", "Export to Markdown"]', true),
('Starter', 'Perfect for side projects', 1900, 100, '["100 credits/month", "Priority chat support", "Export to PDF/DOCX", "1 deployment/month"]', true),
('Pro', 'For serious builders', 4900, 500, '["500 credits/month", "Priority support", "All export formats", "Unlimited deployments", "Custom domains"]', true),
('Enterprise', 'For teams and agencies', 19900, 2500, '["2500 credits/month", "Dedicated support", "All features", "Team collaboration", "API access", "Custom integrations"]', true);
