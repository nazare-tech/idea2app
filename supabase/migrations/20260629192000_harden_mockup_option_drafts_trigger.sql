-- Harden the mockup option draft timestamp trigger for databases where
-- 20260628000000_create_mockup_option_drafts.sql was already applied.

CREATE OR REPLACE FUNCTION public.update_mockup_option_drafts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_mockup_option_drafts_updated_at_trigger
  ON public.mockup_option_drafts;
CREATE TRIGGER update_mockup_option_drafts_updated_at_trigger
  BEFORE UPDATE ON public.mockup_option_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_mockup_option_drafts_updated_at();
