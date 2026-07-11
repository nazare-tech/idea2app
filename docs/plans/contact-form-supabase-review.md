# Review: Contact Form Stored in Supabase

Plan: [contact-form-supabase-plan.md](contact-form-supabase-plan.md)

## Verification run

- Unit tests: `node --import tsx --test src/lib/contact.test.ts` -> 10 pass, 0 fail.
- Lint: `npx eslint` over all changed files -> clean.
- Typecheck: `npm run typecheck` -> one pre-existing error in `src/lib/analysis-pipelines.ts:271` (`CompetitorSource[]` vs `Json`) that exists in the dirty working tree independent of this change; zero errors in files touched by this task.
- Migration: `supabase migration list` showed seven migrations (metrics set `20260616001000..20260616001400`, `20260621000000`, `20260709000000`) present locally but missing from remote history despite their objects existing remotely (verified with live service-role probes of `api_request_metrics`, `daily_metrics_summary`, `weekly_metrics_summary`, `monthly_metrics_summary`, and `generation_queue_items.partial_content`). Repaired history with `supabase migration repair --status applied`, then `supabase db push` applied only `20260710000000_create_contact_requests.sql`.
- Real UI (local dev server, http://localhost:3000/contact): filled name/email/message, clicked Send message. `POST /api/contact` -> 200, success panel rendered, and the row landed in `contact_requests` (service-role select returned the inserted row with matching name/email/message). One QA row remains in the table: `qa-contact-test@example.com`.
- API validation via curl: short message -> 400 with detail message; invalid email -> 400; malformed JSON body -> 400.
- Copy cleanup: rendered `/privacy` and `/terms` contain zero occurrences of `support@makercompass.com` and link to the contact page.
- Evidence: `ui-evidence/2026-07-10/contact-form/` (`contact-form-full.png` full-page /contact at 1280x900, `privacy-copy.png`, `terms-copy.png`). Success-state screenshot captured in-thread via the browser pane; success state also proven by the 200 response and DB row.
- Verification quirk: the in-app browser pane's compositor glitched twice after scroll actions (stale screenshots, 0x0 viewport); recovered via viewport reset + reload. App itself showed no errors in console or server logs.

## Code review findings

1. **(info) Rate limit shares infra with waitlist.** `checkRateLimit` is per-instance without Redis env (same known limitation recorded in the NAZ-124 entry). Acceptable for a contact form; global enforcement arrives with the planned Redis provisioning. No change.
2. **(info) Client HTML validation duplicates server rules** (`required`, `minLength`, `maxLength`). Intentional: fast local feedback plus authoritative server checks. No change.
3. **(low, fixed by design) Direct PostgREST insert bypass**: prevented by deny-all RLS on `contact_requests`; only the service-role route can write.
4. **(low, accepted) No CAPTCHA/honeypot.** Spam risk at current traffic is low; IP rate limit (5/10 min) bounds abuse. Revisit with volume.

## Security review

- Public unauthenticated endpoint: validated input, length-capped at both app and DB layers, rate limited, service-role key never leaves the server, no secrets logged (`logWarn`/`logError` use request log context only).
- RLS: deny-all on the new table; anon and authenticated roles have no read or write path. Dashboard reads use the dashboard's own privileged access.
- No XSS surface added: submissions are stored, never rendered back into any page.

## Architecture improvement review

- Selected opportunities landed: deny-all RLS (stronger than waitlist's public-insert policy) and DB-level length constraints mirroring app validation.
- Deferred remain deferred with reasons: shared public-form helper (only two call sites), `status` triage column (no volume yet), email notification (dashboard suffices), `src/lib/support.ts` deletion (needs file-deletion approval).
- No new duplication beyond the intentional waitlist-pattern parallel; no non-idempotent paths (plain insert); no authorization gaps found.

## Remediation status

No remediation required. All findings are informational or accepted with rationale.
