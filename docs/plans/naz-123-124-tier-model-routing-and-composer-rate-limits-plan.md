# NAZ-123 Tier Model Routing + NAZ-124 Composer Rate Limits

- linear: NAZ-123, NAZ-124
- implemented: true
- implemented_at: 2026-07-10T18:45:00-07:00
- implementation summary: New `src/lib/generation-model-policy.ts` routes Free/Starter to `google/gemini-3.5-flash` and Pro+ to `openai/gpt-5.6-sol`, both with `reasoning.effort: "high"` and max_tokens headroom, wired into the analysis route, generate-all execute route (text docs only), and composer route via `getUserPlanName()`. Composer rate limits now 40/user/hour + 200/user/day + 90/IP/hour. Kill switch `TIER_MODEL_ROUTING_DISABLED`; per-tier env overrides. Verified: 476 unit tests, typecheck, lint, and real-flow generation on the local dev server (pro path produced a 47k-char tech spec on gpt-5.6-sol; composer answered through the tier model). Evidence: `ui-evidence/2026-07-10/naz-123-124-tier-model-routing/`. Composer precedence adjusted during verification: `OPENROUTER_CHAT_MODEL` demoted to legacy-only so it cannot silently defeat tier routing.
- created: 2026-07-10

## Goal

1. **NAZ-123**: Route document generation and the project composer to plan-tier models: Free and Starter use Gemini 3 Flash at high thinking; Pro (and higher) uses GPT 5.6 Sol at high thinking.
2. **NAZ-124**: Raise the project composer rate limit to 40 messages per user per hour and add a 200/day backstop. Rate limits are abuse prevention; plan allowances remain the usage meter.

## Assumptions

- OpenRouter ids verified live on 2026-07-10 via `GET /api/v1/models`:
  - `google/gemini-3.5-flash` (newest stable Flash; supports `reasoning` / `reasoning_effort`; $1.5/M in, $9/M out)
  - `openai/gpt-5.6-sol` (supports `reasoning` / `reasoning_effort`; $5/M in, $30/M out)
  - `google/gemini-3-flash-preview` also exists, but is an older preview; the stable 3.5 Flash is the better "Gemini 3 Flash" reading for production.
- "High thinking" maps to OpenRouter `reasoning: { effort: "high" }`, passed through the OpenAI SDK as an extra body field.
- Reasoning tokens count against `max_tokens` on these providers, so routed calls need headroom or documents will truncate at the existing caps (the pipeline treats `finish_reason === "length"` as a failure).
- Onboarding bundle items are charged 0 credits (`isBundledItem`), so tier routing does not change onboarding billing; manual regenerations charge `getTokenCost(action, model)` at execution with the routed model.

## Clarifying Questions (answered via Recommendation A)

1. Which Gemini id? **A: `google/gemini-3.5-flash` (stable)**, B: `google/gemini-3-flash-preview` (literal match, but preview). A selected.
2. Where to route generate-all models? **A: at execution time in the execute route** (plan resolved at generation time, works for already-enqueued rows, single choke point), B: at enqueue in queue-service (client optimistic estimates match sooner but stale for old rows). A selected.
3. Composer model precedence? **A: env override (`OPENROUTER_COMPOSER_MODEL`/`OPENROUTER_CHAT_MODEL`) still wins, tier model otherwise**, B: tier always wins. A selected (preserves ops escape hatch).
4. Rate limit shape? **A: 40/user/hour + 200/user/day backstop, keep 90/IP/hour** (hourly stops bursts, daily stops around-the-clock riding), B: hourly only. A selected.

## Design

New module `src/lib/generation-model-policy.ts`:

- `STANDARD_TIER_TEXT_MODEL = "google/gemini-3.5-flash"`, `PRO_TIER_TEXT_MODEL = "openai/gpt-5.6-sol"`, env-overridable via `OPENROUTER_STANDARD_TIER_MODEL` / `OPENROUTER_PRO_TIER_MODEL`.
- `resolveGenerationTier(planName)`: `pro | growth | team | business | enterprise | internal dev` -> `"pro"`; everything else (free, starter, basic, unknown) -> `"standard"`.
- `resolveTierTextModel(planName)`: tier -> model id.
- `isTierModelRoutingEnabled()`: `TIER_MODEL_ROUTING_DISABLED` env kill switch (rollback path).
- `getReasoningParams(model)`: `{ reasoning: { effort: "high" } }` for the two tier models, `{}` otherwise.
- `withReasoningHeadroom(model, baseMaxTokens, headroom = 8192)`: adds headroom only for tier reasoning models.

Plan lookup: export `getUserPlanName(clientLike, userId)` from `src/lib/project-allowance.ts` (reuses the existing `getActiveSubscription` + `getJoinedPlan` + `getPlanName` internals; one Supabase query; "Free" when no active subscription or on lookup error — fail-safe to the cheaper model).

Call sites:

- `src/app/api/analysis/[type]/route.ts`: when routing enabled, `model = resolveTierTextModel(planName)` for all four analysis types; legacy `ANALYSIS_DEFAULT_MODELS` when disabled.
- `src/app/api/generate-all/execute/route.ts`: for text doc types (`competitive`, `prd`, `mvp`) resolve tier model from the queue owner's plan; `mockups` keeps its image model. Legacy path when disabled.
- `src/app/api/projects/[id]/composer/route.ts`: tier model from the already-fetched `allowanceStatus.planName` unless env override set; add reasoning params + headroom; bump rate limits (40/hour, +200/day bucket).
- `src/lib/analysis-pipelines.ts`: all five `chat.completions.create` calls get `...getReasoningParams(model)` and `withReasoningHeadroom(model, <existing cap>)`.
- `src/lib/token-economics.ts`: add multipliers `gemini-3.5-flash: 0.9` and `gpt-5.6-sol: 1.5` (specific-before-generic ordering preserved).

## Implementation Phases

1. Policy module + tests.
2. `getUserPlanName` export + test.
3. Analysis route, execute route, composer route wiring.
4. Pipelines reasoning/headroom, token-economics multipliers.
5. NAZ-124 rate limit change.
6. Verify: unit tests, typecheck, lint; real-UI generation spot check.
7. Update backend-change-history, Linear evidence comments.

## Test Strategy

- Unit: policy module (tier mapping, env overrides, kill switch, reasoning params, headroom), token-economics multiplier ordering, `getUserPlanName` fallbacks.
- Existing suites: `token-economics.test.ts`, `rate-limit.test.ts`, route tests must stay green.
- Real-flow: composer message + one document generation through local UI (small expected OpenRouter spend, allowed per repo rules).

## Rollback / Recovery

- `TIER_MODEL_ROUTING_DISABLED=1` reverts every generation path to the pre-change fixed defaults without a deploy rollback.
- `OPENROUTER_STANDARD_TIER_MODEL` / `OPENROUTER_PRO_TIER_MODEL` allow hot-swapping either tier model (e.g. if `gpt-5.6-sol` misbehaves) without code changes.
- Rate limit values are plain constants in the composer route; revert commit restores 30/hour.

## Architecture Improvement Opportunities

- **Central model policy module** (selected): one source of truth for tier models instead of per-route constants; benefit: future tiers/models are one-file changes; trade-off: one more indirection layer.
- **Env kill switch + per-tier overrides** (selected): rollback without deploy; trade-off: more env surface, documented here.
- **Plan-name resolver reuse** (selected): export from project-allowance instead of a second subscription-lookup implementation; avoids drift in plan semantics.
- **Enqueue-time model persistence for client estimates** (deferred): client optimistic credit estimates still use `GENERATE_ALL_DEFAULT_MODELS`; server recomputes at execution so charges are correct, but pre-run estimates can drift for Pro users on manual regenerations. Defer until estimate UX matters; over-engineering for launch.
- **Per-plan rate-limit tiers** (rejected for now): single 40/hour limit for all paid plans is enough for abuse prevention; plan-differentiated limits add config surface without launch value.

## Critique

- **Architecture**: routing at three call sites is acceptable because all three consume one policy module; the real risk is a fourth generation path added later that forgets the policy — mitigated by naming the module obviously and noting it in PROJECT_CONTEXT.md.
- **Product**: Pro promise ("deeper research with the thinking model") is now technically backed. Free/Starter also get high thinking on a cheaper model, which arguably improves quality for lower tiers too, consistent with the pricing page not promising thinking exclusivity.
- **Customer**: no user-visible copy changes; failures surface as the existing generation error states. Risk: gpt-5.6-sol latency higher than current defaults; the 9-minute route budget still holds.
- **Engineering**: reasoning-token headroom is the subtle part; without it, high-effort reasoning truncates documents at existing caps. Covered by `withReasoningHeadroom` and the existing `finish_reason === "length"` guard.
- **Risk/Security**: no new trust boundaries; plan lookup is server-side against Supabase; fail-safe direction is the cheap model, so a lookup failure cannot grant Pro-model spend. Rate limit change is strictly tightening in the daily dimension and a mild loosening hourly (30 -> 40), both intended.
- **Cost**: Pro output tokens 3.3x standard ($30/M vs $9/M). NAZ-124 limits plus plan allowances bound the exposure; monitoring note recorded on the Linear ticket.

## Redis note (NAZ-124 context)

`src/lib/rate-limit.ts` uses Upstash/Vercel-KV style REST Redis when `RATE_LIMIT_REDIS_REST_URL`/`UPSTASH_REDIS_REST_URL`/`KV_REST_API_URL` (+token) are set, and falls back to per-instance in-memory buckets otherwise. Neither local env files nor the linked Vercel project currently define these, so rate limiting today is in-memory per serverless instance — weak in production (each lambda instance counts separately). Recommendation recorded: provision Upstash Redis and set the env vars before launch for the limits to be globally enforced.
