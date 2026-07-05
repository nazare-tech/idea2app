-- Recovered from supabase_migrations.schema_migrations on 2026-06-29.
-- This migration was present in the linked remote migration history but missing locally.

-- Create indexes for performance
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_analyses_project_id ON public.analyses(project_id);
CREATE INDEX idx_analyses_type ON public.analyses(type);
CREATE INDEX idx_prds_project_id ON public.prds(project_id);
CREATE INDEX idx_tech_specs_project_id ON public.tech_specs(project_id);
CREATE INDEX idx_messages_project_id ON public.messages(project_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);
CREATE INDEX idx_deployments_project_id ON public.deployments(project_id);
CREATE INDEX idx_deployments_status ON public.deployments(status);
CREATE INDEX idx_credits_history_user_id ON public.credits_history(user_id);
CREATE INDEX idx_credits_history_created_at ON public.credits_history(created_at);
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
