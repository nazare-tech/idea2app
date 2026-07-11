-- Contact form submissions from the public /contact page.
-- Written only by the API route using the service role; read from the
-- Supabase dashboard. Replaces the old mailto CTA so no support inbox
-- needs to be provisioned.

create table if not exists public.contact_requests (
  id         uuid primary key default gen_random_uuid(),
  name       text,
  email      text not null,
  message    text not null,
  created_at timestamptz not null default now(),

  constraint contact_requests_name_length check (name is null or char_length(name) <= 200),
  constraint contact_requests_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint contact_requests_email_length check (char_length(email) <= 254),
  constraint contact_requests_message_length check (char_length(message) between 10 and 4000)
);

-- Deny-all RLS: unlike the waitlist table there is intentionally no public
-- insert policy. All inserts must pass through the rate-limited
-- /api/contact route, which uses the service role and bypasses RLS.
alter table public.contact_requests enable row level security;
