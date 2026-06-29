-- Recovered from supabase_migrations.schema_migrations on 2026-06-29.
-- This migration was present in the linked remote migration history but missing locally.

-- Drop and recreate functions with proper search_path (cascade for trigger)

DROP FUNCTION IF EXISTS public.consume_credits(UUID, INTEGER, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.add_credits(UUID, INTEGER, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.get_credit_balance(UUID);
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Recreate consume_credits
CREATE FUNCTION public.consume_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_action TEXT,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance INTEGER;
BEGIN
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
$$;

-- Recreate add_credits
CREATE FUNCTION public.add_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_action TEXT,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  UPDATE public.credits
  SET balance = balance + p_amount, updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO new_balance;

  INSERT INTO public.credits_history (user_id, amount, action, description, metadata)
  VALUES (p_user_id, p_amount, p_action, p_description, p_metadata);

  RETURN new_balance;
END;
$$;

-- Recreate get_credit_balance
CREATE FUNCTION public.get_credit_balance(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  balance INTEGER;
BEGIN
  SELECT c.balance INTO balance
  FROM public.credits c
  WHERE c.user_id = p_user_id;

  RETURN COALESCE(balance, 0);
END;
$$;

-- Recreate handle_new_user
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );

  INSERT INTO public.credits (user_id, balance)
  VALUES (NEW.id, 10);

  INSERT INTO public.credits_history (user_id, amount, action, description)
  VALUES (NEW.id, 10, 'signup_bonus', 'Welcome bonus credits');

  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
