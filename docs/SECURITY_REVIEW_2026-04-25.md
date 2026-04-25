# Security Review - 2026-04-25

Repo: Maker Compass / Idea2App
Review type: local code review with focused static scans and `npm audit --omit=dev`
Result: review findings documented first; MVP security fixes implemented on 2026-04-25

## Implementation Status - 2026-04-25

Implemented:
- Hardened `refund_credits` in `supabase/migrations/20260425004000_security_hardening_followups.sql` with service-role-only execution, fixed `search_path`, positive bounded amounts, and the same `credits` ledger used by credit consumption.
- Moved server refund calls to `refundCreditsServerSide()` so refunds use the Supabase service role instead of browser-callable user clients.
- Changed `/api/generate-pdf` to require auth and `projectId` + `documentType` + optional `documentId`; the server fetches owned content, caps document size, disables JavaScript in Puppeteer, blocks network requests, sanitizes rendered HTML, and closes Chromium in `finally`.
- Added simple in-memory server-side rate limiting for PDF export, Stitch HTML proxy, public intake/waitlist writes, chat, prompt chat, analysis generation, mockup generation, launch plan generation, and app generation.
- Added baseline app security headers in `next.config.ts`.
- Added Stripe webhook event idempotency with `stripe_webhook_events`.
- Added a short-lived `project_creation_locks` guard and a second server-side allowance check before intake project insertion to reduce project allowance races.
- Kept live HTML previews enabled, but `/api/stitch/html` now requires auth and verifies the requested URL belongs to a saved mockup for a project owned by the current user.
- Wrapped Stitch prompt-engineering input in explicit untrusted `<user_input>` blocks.
- Removed prompt-chat client model submission and made the server use its configured model.
- Added refund-on-failure handling for app generation, mockup generation, launch plan generation, chat, prompt chat, and stale cancelled Generate All items.

Still deferred:
- Replacing or fully isolating live HTML previews.
- Distributed/serverless-safe rate limiting.
- Dependency upgrade pass for audited package advisories.
- Atomic single-RPC project creation/intake/queue insertion beyond the current short-lived lock guard.

## Executive Summary

The highest-risk issue is the mockup preview flow: generated/third-party HTML is fetched through a same-origin proxy and embedded with `allow-scripts allow-same-origin`, which can turn generated HTML into first-party script execution.

Implementation decision: keep live HTML previews for the MVP, despite the risk, and track replacement/isolation work in the post-MVP security running list. The intended long-term direction is to deprecate live HTML previews and move toward generated static image previews from a current image model.

The second highest-risk issue is credit integrity. The checked-in `refund_credits` migration defines a `SECURITY DEFINER` RPC without caller restrictions, and Stripe webhook credit grants are not idempotent. Both can affect billing/entitlement integrity if active in production.

The repo also has a public PDF renderer that launches Puppeteer for arbitrary request bodies, no app-wide security headers, no central rate limiting, and multiple routes where expensive generation failures keep deducted credits.

## Implementation Decisions

- Live HTML previews: leave enabled for the MVP. Do not implement preview isolation in the immediate security pass unless the risk posture changes.
- Refunds: make `refund_credits` server-only via Supabase service role. Do not allow browser clients to execute refund RPCs.
- PDF export: it is acceptable to change the API shape from raw markdown submission to document id/type submission, with the server fetching owned content after authorization.
- Rate limiting: start with a simple server-side limiter. A production-grade distributed limiter can move to the V2 running list.
- Dependency upgrades: defer to a later pass after the behavioral security fixes.
- V2 tracking: maintain a running post-MVP security list and review it every 15 days.

## Scope And Method

- Read `PROJECT_CONTEXT.md` first, per repo instructions.
- Reviewed auth, authorization, billing, generation queues, prompt/rendering paths, Stripe, Supabase service-role usage, and key migrations.
- Ran focused scans for hardcoded secrets, dangerous rendering APIs, service-role usage, missing rate limiting/CSRF/security headers, and API auth checks.
- Ran `npm audit --omit=dev`.
- Did not run the app, exploit endpoints, inspect production Supabase grants, inspect deployed headers, or perform a full secret-history audit with a dedicated scanner such as Gitleaks.

## Findings

### 1. Critical - Generated mockup HTML can run as same-origin script

Evidence:
- `src/app/api/stitch/html/route.ts:31-44` fetches an allowed Googleusercontent URL and returns the body as first-party `text/html`.
- `src/components/ui/mockup-renderer.tsx:818-824` embeds the returned HTML with `srcDoc` and `sandbox="allow-scripts allow-same-origin"`.
- `src/components/layout/scrollable-content.tsx:180-185` repeats the same iframe sandbox pattern.

Impact:
- Any malicious script in generated or attacker-controlled upstream HTML can run with the app origin and issue credentialed same-origin API calls as the current user.
- This can become account/data compromise if the generated HTML is influenced by user input, prompt injection, upstream compromise, or a crafted allowed-host URL.

Recommended fix:
- Serve generated previews from a separate isolated origin, not the main app origin.
- Remove `allow-same-origin`; preferably remove `allow-scripts` unless scripts are required.
- Add a restrictive CSP/sandbox for preview responses.
- Do not proxy arbitrary URLs. Require auth and verify the requested URL belongs to a saved mockup for a project owned by the current user.

MVP decision:
- Do not change live HTML preview behavior in the immediate implementation pass.
- Track isolated previews, screenshot-only previews, and image-model replacement in `docs/POST_LAUNCH_V2_RUNNING_LIST.md`.

### 2. Critical - `refund_credits` RPC can mint arbitrary credits if exposed

Evidence:
- `migrations/005_create_refund_credits.sql:7-36` creates `refund_credits(p_user_id, p_amount, ...)` as `SECURITY DEFINER`.
- The function updates `profiles.credits` for the supplied `p_user_id`.
- The migration does not revoke default `EXECUTE`, grant only `service_role`, check `auth.uid()`, validate positive bounded amounts, or set a fixed `search_path`.

Impact:
- If this function is active with default Supabase grants, authenticated clients may be able to call it directly and credit arbitrary users.

Recommended fix:
- Recreate the function with `SET search_path = public`.
- Validate `p_amount > 0` and cap refund amounts.
- Revoke from `PUBLIC`, `anon`, and `authenticated`; grant only to `service_role` if refunds should be server-only.
- Confirm it refunds the same ledger used by `consume_credits`.

MVP decision:
- Implement this as server-only via service role.

### 3. High - Public PDF renderer launches Puppeteer for arbitrary content

Evidence:
- `src/app/api/generate-pdf/route.ts:22-45` accepts arbitrary request JSON without `auth.getUser()`.
- `src/app/api/generate-pdf/route.ts:86-95` uses `marked(markdown)` without sanitization.
- `src/app/api/generate-pdf/route.ts:255-264` and `453-464` inject template values/content into HTML.
- `src/app/api/generate-pdf/route.ts:41-67` launches Chromium with JavaScript enabled and only closes the browser on the success path.

Impact:
- Unauthenticated users can trigger expensive server-side browser work.
- Crafted markdown/HTML can execute during render, load remote resources, and potentially probe internal network-accessible URLs from the server environment.

Recommended fix:
- Require auth and accept a document id/type, then fetch stored content after project ownership verification.
- Enforce size limits and rate limits.
- Sanitize/escape HTML and title fields.
- Disable JavaScript or intercept/deny network requests during rendering.
- Close the browser in a `finally` block.

MVP decision:
- Change the API contract to submit document id/type instead of raw markdown content.

### 4. High - HTML proxy is unauthenticated and accepts arbitrary allowed-host URLs

Evidence:
- `src/app/api/stitch/html/route.ts:10-29` has no auth check and accepts any URL under `contribution.usercontent.google.com` or `lh3.googleusercontent.com`.
- `src/app/api/stitch/html/route.ts:31-44` has no ownership check, content-type check, response size cap, timeout, or CSP.

Impact:
- Even outside the iframe flow, a crafted proxy URL can produce first-party active content if the allowed upstream can host attacker-controlled HTML.
- The route can also be abused for fetch amplification and cache/storage churn.

Recommended fix:
- Require auth.
- Validate the URL against stored mockup records for the current user's project.
- Add upstream timeout, content-type validation, and byte limits.
- Return untrusted HTML only under a sandboxed response policy or isolated origin.

### 5. High - Stripe webhook credit grants are not idempotent

Evidence:
- `src/app/api/stripe/webhook/route.ts:68-114` logs `event.id` but does not persist it before creating/updating subscriptions and calling `add_credits`.
- `src/app/api/stripe/webhook/route.ts:168-198` grants renewal credits on `invoice.paid` without a unique processed-event or invoice-period guard.

Impact:
- Stripe retries or manual event replays can grant duplicate credits.

Recommended fix:
- Add a `processed_stripe_events` table keyed by Stripe event id.
- Process credit grants transactionally with a unique event insert.
- For renewals, also guard by subscription id plus invoice id or billing period.

### 6. High - Project allowance check is raceable

Evidence:
- `src/app/api/projects/create-from-intake/route.ts:218-231` checks `canCreateProject()`.
- `src/app/api/projects/create-from-intake/route.ts:267-339` inserts the project, intake, and generation queue after the check.
- The count/check and insert are not atomic.

Impact:
- Parallel create requests can all pass the allowance check before any insert is counted, allowing users to exceed monthly project limits.

Recommended fix:
- Move allowance check plus project/intake/queue creation into a database RPC or transaction.
- Use a per-user advisory lock or serializable transaction around the allowance check and insert.

### 7. Medium - App-wide security headers are missing

Evidence:
- `next.config.ts:3-8` only configures Turbopack root.
- Scans did not find configured `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`, or `Permissions-Policy`.

Impact:
- XSS and clickjacking impact is higher, especially with markdown rendering, generated HTML previews, and third-party content flows.

Recommended fix:
- Add baseline security headers in `next.config.ts` or middleware.
- Use a strict CSP for the app shell and a separate, more locked-down policy for preview/render routes.

### 8. Medium - No central rate limiting for expensive or public endpoints

Evidence:
- Scans did not find application rate limiting.
- Public or expensive endpoints include `/api/generate-pdf`, `/api/stitch/html`, `/api/intake/pending`, `/api/waitlist`, AI chat/generation routes, Stitch generation, and Stripe checkout/session creation.

Impact:
- Abuse can create AI/API spend, Puppeteer CPU load, database writes, and waitlist/pending-intake spam.

Recommended fix:
- Add IP-based and user-based rate limiting.
- Use stricter limits for PDF rendering, AI generation, Stitch generation, auth handoff, waitlist, and checkout/session creation.

MVP decision:
- Start with a simple server-side limiter.
- Track distributed/serverless-safe rate limiting as post-MVP work.

### 9. Medium - Prompt chat accepts arbitrary model ids from clients

Evidence:
- `src/app/api/prompt-chat/route.ts:202-208` reads `body.model`.
- `src/app/api/prompt-chat/route.ts:348-356` passes that model to OpenRouter.
- `src/app/api/prompt-chat/route.ts:234-241` bills only from message length, not the selected model.
- `PROJECT_CONTEXT.md` says model selection was removed and fixed defaults should be used.

Impact:
- Clients can choose more expensive or unintended models while paying the same credit amount.

Recommended fix:
- Ignore client-supplied model ids in this route or validate against a server-side allowlist.
- Calculate credits from the effective server-selected model.

### 10. Medium - Generation failure paths can keep deducted credits

Evidence:
- `src/app/api/generate-app/route.ts:88-105` consumes credits before generation.
- `src/app/api/generate-app/route.ts:153-157` and `206-225` return failures without refunding; one message explicitly says credits were deducted.
- `src/app/api/mockups/generate/route.ts:70-89` consumes credits before Stitch work.
- `src/app/api/mockups/generate/route.ts:132-153` and `187-195` report failures without refunding.
- `src/app/api/launch/plan/route.ts:74-88` consumes credits before insert and does not refund if later work fails.

Impact:
- Users can lose credits for failed paid operations.
- This also makes credit ledgers harder to audit.

Recommended fix:
- Use one server-only refund helper for every post-consumption failure.
- Add tests for "consume succeeds, generation/save fails, refund called".

### 11. Medium - Cancelled charged queue items can strand credits

Evidence:
- `src/app/api/generate-all/cancel/route.ts:92-96` leaves generating items in `generating` and only updates the stage message.
- `src/app/api/generate-all/status/route.ts:47-51` only recovers stale generating items when the queue is `running` or `queued`, not when cancelled.
- `src/app/api/generate-all/execute/route.ts:260-267` refunds after executor acknowledgement, but if the executor dies after charging and before acknowledgement, cancellation can become terminal.

Impact:
- Charged generating items can remain unrefunded after a cancellation plus executor interruption.

Recommended fix:
- Add a stale charged-cancellation finalizer.
- When a cancelled queue has charged stale generating items, mark them cancelled and refund once their lease is stale.

### 12. Medium - Stitch prompt path bypasses existing secure prompt wrapper

Evidence:
- `src/lib/stitch-pipeline.ts:34-39` sends raw `mvpPlan` as the user message to OpenRouter.
- `src/lib/stitch-pipeline.ts:142-157` forwards the resulting prompt into Stitch generation.
- `src/lib/prompts/mockups.ts:65-79` has a safer `buildMockupPrompt()` helper that wraps sanitized project name and MVP plan in `<user_input>` delimiters, but this pipeline imports only `STITCH_PROMPT_ENGINEER_SYSTEM_PROMPT`.

Impact:
- Prompt-injection text in generated or user-edited MVP plans can steer generated HTML and combine with the same-origin preview issue.

Recommended fix:
- Use secure prompt construction/delimiters for the MVP plan in the Stitch prompt-engineering step.
- Treat prior generated documents as untrusted data.
- Sanitize or isolate generated HTML before previewing.

### 13. Medium - Dependency audit has production critical/high advisories

Evidence:
- `npm audit --omit=dev` reported 12 production advisories: 2 critical, 6 high, 4 moderate.
- Direct dependencies with advisories include `next`, `jspdf`, and `mermaid`.
- Notable transitive paths:
  - `@google/stitch-sdk -> @modelcontextprotocol/sdk -> @hono/node-server`, `hono`, `express-rate-limit`, `path-to-regexp`
  - `puppeteer -> @puppeteer/browsers -> proxy-agent -> ... -> basic-ftp`
  - `jspdf -> dompurify`
  - `mermaid -> lodash-es`, `dompurify`, `uuid`

Impact:
- The Next advisory includes DoS and CSRF-related issues in versions below patched ranges.
- PDF/HTML rendering libraries appear in areas already handling untrusted content.

Recommended fix:
- Update direct dependencies first: `next`, `jspdf`, `mermaid`, `puppeteer`, and `@google/stitch-sdk` when patched.
- Re-run `npm audit --omit=dev`.
- Pay special attention to any breaking changes around PDF export and Mermaid rendering.

MVP decision:
- Defer dependency upgrade work to a later pass after the behavioral security fixes.

### 14. Low - Password reset route can be redirected away after recovery login

Evidence:
- `src/lib/supabase/middleware.ts:53-66` treats `/reset-password` as an auth page and redirects authenticated users away.
- `src/app/callback/route.ts:8-12` exchanges auth codes and supports `next=/reset-password`.

Impact:
- Recovery users may be redirected to `/projects` before the reset form loads, blocking password reset.

Recommended fix:
- Remove `/reset-password` from the redirect-away list or special-case recovery sessions.

### 15. Low - Auth callback trusts `x-forwarded-host` for production redirects

Evidence:
- `src/app/callback/route.ts:31-39` builds the final redirect host from `x-forwarded-host` in production.

Impact:
- If the hosting/proxy layer allows clients to influence this header, the auth callback can become a host-level open redirect despite safe path sanitization.

Recommended fix:
- Use a configured canonical app origin or an explicit host allowlist.

## Positive Observations

- Most user-owned API routes use `supabase.auth.getUser()` and then constrain data access with `.eq("user_id", user.id)` or project ownership checks.
- Recent generation queue migrations remove client-side insert/update/delete policies for queue authority fields.
- Auth redirect path sanitization in `src/lib/safe-redirect.ts` rejects absolute URLs, protocol-relative URLs, backslashes, control characters, and non-allowlisted paths.
- `.env*` files are ignored and not currently tracked by git.
- Current-source secret scan found environment variable references and placeholders, but no obvious hardcoded live API keys in tracked source.

## Immediate Fix Order

1. Completed - Lock down `refund_credits` grants and semantics in Supabase.
2. Completed - Change PDF export to auth + document id/type + ownership-verified server fetch.
3. Completed - Add a simple server-side rate limiter to public and expensive endpoints.
4. Completed - Add Stripe webhook idempotency.
5. Partially completed - Add short-lived project creation locking and a second server-side allowance check. A single DB RPC/transaction remains a V2 hardening item.
6. Completed - Add baseline security headers.
7. Completed - Fix refund gaps and model allowlisting.
8. Deferred - Keep live HTML previews unchanged for MVP; track isolation/replacement in the V2 running list.
9. Deferred - Dependency upgrades remain a later pass.
