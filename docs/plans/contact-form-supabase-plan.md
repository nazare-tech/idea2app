---
implemented: true
implemented_at: 2026-07-10T18:55:00-07:00
implementation_summary: >
  contact_requests table created and pushed to the linked Supabase project
  (deny-all RLS, DB length/format constraints). Public POST /api/contact with
  IP rate limiting and shared validation in src/lib/contact.ts (10 unit tests).
  /contact page replaced the mailto CTA with a ContactForm client component;
  /privacy and /terms no longer mention the support email. Verified end to end
  through the real local UI (200 response, success panel, row in DB) with
  evidence in ui-evidence/2026-07-10/contact-form/.
---

# Contact Form Stored in Supabase (Replace mailto CTA)

## Goal

Replace the mailto-based contact CTA on `/contact` with a real contact form that stores submissions in a new Supabase `contact_requests` table. Avoids the cost of provisioning a custom `support@makercompass.com` inbox. Submissions are read from the Supabase dashboard. Also remove remaining `SUPPORT_EMAIL` copy on `/privacy` and `/terms` so no page tells users to email an inbox that does not exist.

## Assumptions

- Existing linked Supabase project (`Idea2Business`) is the durable store; migrations are applied with the Supabase CLI.
- No email notification is required now. The dashboard is the read path. Notification (e.g. Resend free tier) is a deferred follow-up.
- The public form must be usable without auth, matching the existing waitlist pattern (`/api/waitlist` + service client + IP rate limit).
- The "Back to home" header link removal in `info-page-shell.tsx` already landed earlier in this thread and is independent of this plan.

## Clarifying questions (answered with Recommendation A per repo rules)

1. Notify by email on new submission?
   - **A: No notification now; dashboard only.** Zero cost, zero new dependencies. Trade-off: must remember to check.
   - B: Add Resend free tier notification to personal Gmail. Trade-off: API key, domain verification, new dependency.
   - **Selected: A.**
2. Where does validation live?
   - **A: `src/lib/contact.ts` helper with unit tests, mirroring `src/lib/waitlist.ts`.** Reusable by route and testable without HTTP.
   - B: Inline in the route. Trade-off: untestable without route harness, diverges from waitlist pattern.
   - **Selected: A.**
3. What happens to `SUPPORT_EMAIL` (`src/lib/support.ts`)?
   - **A: Remove all usages (contact, privacy, terms) and point copy at the contact form; keep `src/lib/support.ts` on disk untouched for now** since repo rules require asking before deleting files. Flag deletion as follow-up.
   - B: Keep email mentions alongside the form. Trade-off: advertises an unprovisioned inbox; mail sent there bounces.
   - **Selected: A.**
4. Auth'd users' requests linked to their account?
   - **A: No user link in v1; plain public form.** Simple, one trust level. Trade-off: support cannot auto-associate an account; mitigated by asking for the account email in copy.
   - B: Attach `user_id` when a session exists. Trade-off: two code paths, more surface.
   - **Selected: A.**

## Design

### Schema: `supabase/migrations/20260710000000_create_contact_requests.sql`

- `contact_requests` (
    `id uuid pk default gen_random_uuid()`,
    `name text` nullable, `char_length(name) <= 200`,
    `email text not null`, same format check as waitlist, `char_length(email) <= 254`,
    `message text not null`, `char_length(message) between 10 and 4000`,
    `created_at timestamptz not null default now()`
  )
- RLS enabled with **no policies**: anon/authenticated get deny-all. All writes go through the API route with the service client (bypasses RLS); reads happen in the Supabase dashboard. This is stricter than the waitlist table's public-insert policy and intentional: inserts must pass through the rate-limited API.

### API: `src/app/api/contact/route.ts` (POST)

- Mirrors `/api/waitlist` POST: `checkRateLimit` keyed `contact:<ip>` (5 requests / 10 min, stricter than waitlist because messages are heavier), JSON body parse guard, `validateContactRequest` from `src/lib/contact.ts`, insert via `createServiceClient()`, `logWarn`/`logError` with `buildRequestLogContext`.
- Responses: 429 with `Retry-After`, 400 with per-field message, 500 generic, 200 `{ success: true }`.

### Validation: `src/lib/contact.ts` + `src/lib/contact.test.ts`

- `validateContactRequest({ name, email, message })` returns `string | null`; reuses waitlist email rules; message required, trimmed length 10..4000; name optional, max 200.
- Export `CONTACT_MESSAGE_MAX = 4000` for UI counter/limits.

### UI: `src/components/landing/contact-form.tsx` + `src/app/contact/page.tsx`

- Client component modeled on `waitlist-form.tsx`: `idle | loading | success | error` states, success panel replaces the form, error line under the form. Fields: name (optional), email, message (`Textarea`). Existing `Input`, `Textarea`, `Button`, `Label` UI components.
- Landing surface styling: sharp/`rounded-sm` corners, `border-border-subtle`, white field backgrounds, Action Red primary button, mono uppercase kicker stays. No em dashes in copy.
- `/contact` page: replace the "Email us" mailto card with the form; copy asks account holders to use their account email address.

### Copy cleanup: `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`

- Remove `SUPPORT_EMAIL` mentions; both pages already link to `/contact`, so the copy becomes "use the contact page". Privacy deletion-request paragraph now directs to the contact form with the account email address.

## Implementation phases

1. Migration file; check `supabase migration list`, then apply to the linked project.
2. `src/lib/contact.ts` + tests.
3. API route.
4. Contact form component + `/contact` page rewrite.
5. Privacy/terms copy cleanup.
6. `npm run typecheck`, targeted `node --import tsx --test`, lint.
7. Real-UI verification: submit through `/contact` on the local dev server, confirm row lands in `contact_requests`, capture screenshots under `ui-evidence/2026-07-10/contact-form/`.
8. Update `docs/plans/backend-change-history.md`; write review artifact; mark plan implemented.

## Test strategy

- Unit: `src/lib/contact.test.ts` covers required/optional fields, trim behavior, length bounds, email format.
- Manual/real UI: successful submit (success panel), validation error (short message), verify inserted row via `supabase` CLI or service query. Rate limit exercised only by code review (not worth 6 real submits against remote DB).

## Rollback / recovery

- Code: revert the commit; `/contact` returns to the mailto card.
- Schema: `drop table public.contact_requests;` loses only contact submissions, no other coupling. Table can stay in place even if code is reverted; it is inert without the route.

## Architecture Improvement Opportunities

- **Shared public-form rate-limit + validation shape** (waitlist and contact now both do parse -> rate-limit -> validate -> service insert). Benefit: one helper, consistent errors. Trade-off: abstraction over two call sites is premature. **Rejected as over-engineering for now**; revisit at a third public form.
- **Deny-all RLS instead of public-insert policy** for the new table so the rate-limited API is the only write path. Benefit: no anon direct-insert bypass of rate limiting. Trade-off: none meaningful. **Selected** (design above).
- **DB-level length constraints matching app validation** so a bypassed client cannot store megabyte messages. Benefit: durable invariant at the trust boundary. Trade-off: constraint changes need migrations. **Selected** (design above).
- **`status` column (`new`/`handled`) for triage** in the dashboard. Benefit: lightweight workflow. Trade-off: schema speculation before any real volume. **Deferred.**
- **Email notification on insert** (Resend/webhook). **Deferred** until dashboard-checking proves painful.
- **Delete `src/lib/support.ts`** once unused. **Deferred**, needs user confirmation to delete a file.

## Critique

- **Architecture:** Follows the established waitlist pattern; no new dependencies; the deny-all RLS choice is the only divergence and it strengthens the trust boundary. Sound.
- **Product:** A form converts better than mailto (mailto breaks with no configured mail client). Risk: users expect a reply address; mitigated by collecting their email and setting expectations in copy ("we reply within one business day" only if true; soften to avoid overpromising).
- **Customer:** Losing a visible email address removes an escape hatch users trust. Acceptable at this stage; the form is lower friction than composing an email.
- **Engineering:** Smallest honest scope; validation duplicated between client (HTML attributes) and server (helper) is standard. Rate limit store must work in the deployed runtime; reuses the existing `checkRateLimit` infra already proven by waitlist.
- **Risk/Security:** Public unauthenticated insert endpoint: mitigated by IP rate limit, DB length caps, deny-all RLS, service-role writes only. Spam remains possible at low volume; no PII beyond what the user chooses to submit; no secrets involved.
