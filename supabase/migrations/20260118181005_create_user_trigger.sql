-- Recovered from supabase_migrations.schema_migrations on 2026-06-29.
-- This migration was present in the linked remote migration history but missing locally.

-- Trigger to create profile and initial credits on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- Initialize credits for new user (10 free starter credits)
  INSERT INTO public.credits (user_id, balance)
  VALUES (NEW.id, 10);

  -- Log the initial credit grant
  INSERT INTO public.credits_history (user_id, amount, action, description)
  VALUES (NEW.id, 10, 'signup_bonus', 'Welcome bonus credits');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
