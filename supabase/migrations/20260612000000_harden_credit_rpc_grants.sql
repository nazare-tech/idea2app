-- Harden credit RPC execute grants (verified against production on 2026-06-12).
--
-- Finding: add_credits, consume_credits, and get_credit_balance were
-- executable by PUBLIC, anon, and authenticated. add_credits performs
-- "UPDATE public.credits SET balance = balance + p_amount" for any supplied
-- p_user_id, so any caller holding the public anon key could mint credits
-- for any account. consume_credits could likewise be invoked directly with
-- another user's id.
--
-- Decisions:
-- - add_credits: service-role-only. No application code calls it (webhook
--   grants go through grant_subscription_credits_once; refunds go through
--   refund_credits, hardened 2026-04-25).
-- - consume_credits: keep authenticated EXECUTE because four routes call it
--   through the user-scoped client (chat, launch plan, generate-app while it
--   exists, generate-all execute). This migration removes anon/PUBLIC only.
--   An in-body auth.uid() guard ships separately once the live function
--   definition is captured into the repo (Milestone 1, step 2).
-- - get_credit_balance: no app callers; remove anon/PUBLIC, keep
--   authenticated until the credit cleanup decides its fate.
--
-- The DO block resolves functions by name via regprocedure so it works
-- without hardcoding argument signatures and tolerates overloads. All
-- statements are idempotent; re-running is safe.

do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as sig, p.proname as name
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('add_credits', 'consume_credits', 'get_credit_balance')
  loop
    execute format('revoke all on function %s from public', fn.sig);
    execute format('revoke all on function %s from anon', fn.sig);

    if fn.name = 'add_credits' then
      execute format('revoke all on function %s from authenticated', fn.sig);
    end if;

    execute format('grant execute on function %s to service_role', fn.sig);
  end loop;
end $$;
