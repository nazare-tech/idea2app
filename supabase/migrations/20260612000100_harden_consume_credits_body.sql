-- Harden the consume_credits body (definition captured from production 2026-06-12).
--
-- The live function was SECURITY DEFINER with a fixed search_path and a
-- FOR UPDATE row lock (all good), but it had two exploitable gaps that the
-- grant lockdown in 20260612000000 did NOT close, because `authenticated`
-- retains EXECUTE (the app's routes call this as the signed-in user):
--
--   1. No amount validation. The body computes `balance = balance - p_amount`,
--      so a NEGATIVE p_amount mints credits (balance - (-n) = balance + n).
--      The existing `current_balance < p_amount` check does not catch it.
--      Any authenticated user could call consume_credits(self, -1000000, ...)
--      and self-grant credits. This is the higher-severity gap.
--
--   2. No caller identity check. The body trusts p_user_id, so an
--      authenticated user could pass another user's id and drain their balance.
--
-- This migration replaces the body with the original logic plus two guards.
-- Trusted server paths (service role / no JWT) are unaffected because
-- auth.uid() is NULL there and the identity guard only applies to JWT callers.
-- The amount bound (1..100000) matches the hardened refund_credits function.

CREATE OR REPLACE FUNCTION public.consume_credits(
  p_user_id uuid,
  p_amount integer,
  p_action text,
  p_description text DEFAULT NULL::text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_balance INTEGER;
BEGIN
  -- Guard 1: bounded, strictly positive amount. Blocks negative-amount minting.
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 100000 THEN
    RAISE EXCEPTION 'consume_credits: p_amount must be between 1 and 100000';
  END IF;

  -- Guard 2: a JWT caller may only consume their own credits. auth.uid() is
  -- NULL for service-role/server paths, which are trusted to act on any user.
  IF auth.uid() IS NOT NULL AND p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'consume_credits: cannot consume credits for another user';
  END IF;

  SELECT balance INTO current_balance
  FROM public.credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF current_balance IS NULL OR current_balance < p_amount THEN
    RETURN FALSE;
  END IF;

  UPDATE public.credits
  SET balance = balance - p_amount, updated_at = NOW()
  WHERE user_id = p_user_id;

  INSERT INTO public.credits_history (user_id, amount, action, description, metadata)
  VALUES (p_user_id, -p_amount, p_action, p_description, p_metadata);

  RETURN TRUE;
END;
$function$;

-- CREATE OR REPLACE preserves the existing ACL, but re-assert the intended
-- grants so this migration is self-contained and idempotent.
REVOKE ALL ON FUNCTION public.consume_credits(uuid, integer, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_credits(uuid, integer, text, text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.consume_credits(uuid, integer, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_credits(uuid, integer, text, text, jsonb) TO service_role;
