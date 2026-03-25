-- Create the waitlist table for early-access sign-ups.
-- Visitors who arrive after the 200-user cap is reached are directed
-- here instead of the standard sign-up flow.

create table if not exists public.waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  created_at timestamptz not null default now(),

  constraint waitlist_email_unique unique (email),
  constraint waitlist_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

-- Allow anyone to insert (no auth required — this is a public form).
-- Reads are admin-only (service role), so no SELECT policy is needed.
alter table public.waitlist enable row level security;

create policy "Anyone can join the waitlist"
  on public.waitlist
  for insert
  with check (true);
