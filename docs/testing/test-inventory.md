# Test Inventory
Unit tests run with `npm test`: the Node built-in test runner via tsx (`node --import tsx --test 'src/**/*.test.ts' 'src/**/*.test.tsx'`), no Jest/Vitest.
91 test files sit colocated beside their source under `src/`; component tests render HTML strings via react-dom/server renderToStaticMarkup, no jsdom.
Heaviest coverage: intake question generation/validation, market research provider fallbacks (Exa/Perplexity/Tavily), streaming parsers, prompt contracts.
Also covered: planning document renderers/requests, mockup image pipeline and drafts, Stripe checkout/webhooks/credits, product analytics, workspace UI policy.
UNCOVERED: 32 of 34 API route handlers (only two deprecated 410 routes have tests), auth flows, Supabase clients/middleware, and dashboard/landing pages.
UNCOVERED: most hooks (only use-smoothed-stream), interactive client behavior (effects, event handlers), real DB queries; browser flows rely on e2e evidence.
---

## Intake

- `src/components/projects/intake-submission-loading-panel.test.tsx` — loader message-index and line-width timing math plus rendered kicker/artifact labels of IntakeSubmissionLoadingPanel
- `src/lib/intake/answers.test.ts` — toggleOption/toggleOther/toggleDecideForMe/supportsAnswerEscapeHatches/hasAnswer/buildAnswers: single vs multi select state transitions, decide-for-me exclusivity, escape-hatch eligibility, and trimmed submission payload shaping
- `src/lib/intake/idea-validation.test.ts` — validateIdeaInput character floor (30-char boundary), word-count minimum, whitespace normalization, and max-length cap
- `src/lib/intake/keyboard-submit.test.ts` — shouldSubmitOnEnter: plain Enter submits; Shift+Enter, IME composition, key repeat, and disabled state do not
- `src/lib/intake/question-count.test.ts` — getProjectIntakeQuestionCountError accepts three to five wizard questions and rejects too few or too many
- `src/lib/intake/question-generation.test.ts` — parseIntakeQuestionSet/generateIntakeQuestions: model JSON parsing, canonical platform question normalization, rejection verdicts, retry rules
- `src/lib/intake/required-questions.test.ts` — ensureRequiredPlatformQuestion canonicalization/dedup and validateRequiredPlatformAnswer single-selection rules including decide-for-me rejection
- `src/lib/intake/summary.test.ts` — buildProjectIntakePayload, summarizeIntakeAnswers, buildProjectSummary, and formatProjectIntakeForAi payload/summary shaping
- `src/lib/landing-intake-handoff.test.ts` — buildLandingIntakeNextPath/buildLandingAuthModalPath: intake token plus autostart query ordering and safe signin next paths

## Market Research / Competitive Analysis

- `src/components/analysis/competitive-analysis-document.test.tsx` — competitive v2 document renderer: modules-first layout, verified source mention links, positioning scale, fallback profiles, legacy markdown fallback
- `src/components/analysis/competitive-streaming-document.test.tsx` — live Market Research streaming renderer: active designed blocks, verified source links, titled skeleton contract, and Executive Summary fill
- `src/lib/analysis-pipelines.test.ts` — research orchestration: Exa-primary provider chain, Perplexity/Tavily fallback provenance, progress stages, live-research prompt context from search results
- `src/lib/competitive-analysis-prompt.test.ts` — competitive analysis prompt contract: exec summary guidance, untrusted delimited excerpts, workspace section ownership, scored positioning evidence
- `src/lib/competitive-analysis-streaming.test.ts` — streamed competitive markdown: H2-boundary section completion, alias headings, safe-tail withholding of partial tables/bold/headings
- `src/lib/competitive-analysis-v2.test.ts` — parseCompetitiveAnalysisV2: v2 document validation, removed-section stripping, positioning axis/score parsing, markdown fallback on malformed metadata
- `src/lib/competitor-mention-links.test.ts` — competitor mention linkifier: HTTP(S)-only source normalization, longest-name matching, hostile-input bounds, source metadata round-trip and streaming merge
- `src/lib/competitor-research.test.ts` — parseCompetitorSearchResponse bounded JSON extraction plus getUsableCompetitors and getCompetitorSearchStatus result classification
- `src/lib/openrouter-competitor-research.test.ts` — OpenRouter+Exa competitor search call: bounded search selection, seven-candidate cap, prompt delimiter escaping, parse-failure status
- `src/lib/perplexity.test.ts` — legacy Perplexity competitor search prompt and parsePerplexityCompetitorResponse valid/empty/parse-failed semantics

## Planning Documents

- `src/components/analysis/ai-prompts-document-blocks.test.tsx` — AiPromptsDocumentBlocks queued placeholders while source plans generate and incomplete labels for settled missing sections
- `src/components/analysis/first-version-plan-blocks.test.tsx` — MvpPlanDocumentBlocks rendering contract and buildAiPromptFiles paste-ready handoff files (sub-agents.md, project-context.md stack rules)
- `src/components/analysis/first-version-plan-view-model.test.ts` — First Version Plan table/list, risk-label, scope, nested-card, and tactical-shortcut derivation
- `src/components/analysis/planning-document-blocks.test.tsx` — planning document barrel re-exports the Product Plan and First Version renderers
- `src/components/analysis/planning-streaming-document.test.tsx` — PlanningStreamingDocument assembles and sanitizes shipped partial markdown, renders arrived sections as designed blocks, and keeps remaining expected titles as skeletons
- `src/components/analysis/product-plan-blocks.test.tsx` — PrdDocumentBlocks persona cards, current prompt/navigation contract sections, and markdown fallback for loose legacy content
- `src/components/analysis/product-plan-view-model.test.ts` — Product Plan timeline detail parsing, title normalization, and cumulative week-range derivation
- `src/lib/ai-prompts-readiness.test.ts` — getAiPromptsReadiness derived-document states (waiting/partial/incomplete/ready) computed from PRD and MVP source content
- `src/lib/planning-document-requests.first-version-plan.test.ts` — buildFirstVersionPlanPromptRequest keeps full Product Plan context untruncated and matches Prompt Lab default prompt construction
- `src/lib/planning-document-requests.product-plan.test.ts` — buildProductPlanPromptRequest keeps full Market Research context untruncated and matches Prompt Lab default prompt construction
- `src/lib/planning-document-streaming.test.ts` — planning stream sections complete on the next H2; sanitize withholds partial headings, table rows, and unclosed bold from the tail
- `src/lib/planning-prompts.test.ts` — PRD and MVP system prompt contracts: section order, renderer heading contract, required markdown tables and nested card labels
- `src/lib/prompts/mvp-plan.test.ts` — MVP_PLAN_SYSTEM_PROMPT stack guidance: Cloudflare vs Lovable/v0 build paths, D1 server-derived ownership checks, lightweight analytics

## Mockups

- `src/components/ui/mockup-generation-loader.test.tsx` — MockupGenerationLoader static fallback before WebGL detection and canCreateWebGLContext support/error handling
- `src/components/ui/mockup-renderer.test.tsx` — MockupRenderer storyboard concept cards, draft placeholders, retry messages, pending media cells, and lightbox presentation
- `src/lib/mockups/design-plan.test.ts` — parseMockupDesignPlan normalization and per-platform screen limits, mockup generation brief fields, storyboard planner system prompts
- `src/lib/mockups/format-contract.test.ts` — extractMockupOptions and hasThreeOptionProsConsContract enforcement of the 3-option pros/cons mockup content contract
- `src/lib/mockups/openrouter-image-pipeline.test.ts` — OpenRouter image pipeline: data-URL parsing/limits, proxy URL building, skeleton aspect enforcement, model/token/timeout config resolution
- `src/lib/mockups/option-drafts.test.ts` — mockup option draft rows: normalization, insert-only upsert, cleanup of abandoned and finalized drafts without deleting canonical storage
- `src/lib/mockups/option-recovery.test.ts` — mockup option recovery merges DB draft rows with Storage-only files and ignores unsupported Storage files

## Billing / Credits / Stripe

- `src/lib/generation/queue-credit-flow.test.ts` — consumeGenerationQueueItemCredits and resolveFailedGenerationCreditStatus: Generate All credit charges and refund-on-failure states
- `src/lib/project-allowance.test.ts` — resolveProjectAllowance/getProjectAllowanceStatus/canCreateProject: plan-based project limits, calendar-month windows, conservative failure blocking
- `src/lib/stripe/billing-flow.test.ts` — getBillingPlanCtaMode checkout vs portal routing per subscription state and parseStripeRedirectResponse hosted-URL validation
- `src/lib/stripe/checkout-analytics.test.ts` — checkout attribution: controlled input acceptance, fallback on invalid attribution, Stripe metadata round-trip, analyticsSessionId transport
- `src/lib/stripe/checkout-idempotency.test.ts` — buildCheckoutSessionIdempotencyKey stability across retries and sensitivity to selected price and attribution fingerprint
- `src/lib/stripe/checkout-plan.test.ts` — normalizeJoinedCheckoutPlan Supabase join shapes and isCheckoutPlanPriceEligible public/active/Stripe-price eligibility rules
- `src/lib/stripe/customer.test.ts` — getUsableStripeCustomerId ownership, deleted-customer, and mode checks plus buildStripeCustomerIdempotencyKey scoping
- `src/lib/stripe/subscription-sync.test.ts` — buildSubscriptionSyncSnapshot plan-price mapping and cancellation detection, invoice/payment-intent resolution, credit grant key stability
- `src/lib/stripe/webhook-lease.test.ts` — claimWebhookEvent/finalizeWebhookEvent: webhook dedup lease claims, stale-processing reclaim, fence-guarded finalize outcomes
- `src/lib/token-economics.test.ts` — BASE_ACTION_TOKENS values, per-model token multipliers, and getTokenCost ceil-to-nearest-5 rounding per action and model

## Product Analytics

- `src/lib/product-analytics/client.test.ts` — createProductEventBatcher: scheduled flush, transient-failure retry, permanent-rejection drops, pagehide flush during in-flight batch
- `src/lib/product-analytics/contracts.test.ts` — product event registry and validators: client/server trust boundaries, allowlists, UUID rules, schema version, batch and byte bounds
- `src/lib/product-analytics/ingest.test.ts` — event ingest: trusted server enrichment of owned client events, whole-batch rejection on unowned projects, dedup lookups, daily quota
- `src/lib/product-analytics/plan-name-cache.test.ts` — getCachedPlanName per-user TTL cache: reload after expiry, failures not cached, per-user keying
- `src/lib/product-analytics/server.test.ts` — recordServerProductEvent: validated idempotent lifecycle events, invalid events not written, analytics failures non-blocking

## Workspace / UI Components

- `src/app/page.test.tsx` — ToolLogoMarquee accessibility: duplicated visual pass hidden from assistive tech, visible names instead of redundant logo alt text
- `src/components/layout/anchor-nav.test.tsx` — AnchorNav lets a derived document override its source document status and never offers Retry for derived incomplete items
- `src/components/layout/scrollable-content.test.tsx` — ScrollableContent workspace section order (AI Prompts after mockups) and below-fold containment of inactive document frames
- `src/components/layout/workspace-document-frame.test.tsx` — WorkspaceDocumentFrame shell dimensions/padding and opt-in browser layout containment without changing anchors
- `src/components/ui/artifact-lightbox.test.tsx` — ArtifactLightbox document vs media presentation modes and displayName replacing the file name in header/action labels
- `src/components/ui/markdown-renderer.test.ts` — sanitizeMermaidSvg fails closed when DOMPurify has no DOM available
- `src/components/workspace/generate-all-block.test.tsx` — buildGenerateAllDisplayQueue appends the derived AI Prompts row without altering the real queue order and marks it done once PRD and MVP are ready
- `src/hooks/use-smoothed-stream.test.ts` — advanceSmoothedReveal word-reveal pacing: baseline and cap rates, backlog ramp, restart on shrunken target, end-of-string clamping
- `src/lib/active-document-policy.test.ts` — active document identity mapping for document/route types, newest-wins duplicate row dedup, skipped-duplicate payloads
- `src/lib/document-generation-display-status.test.ts` — buildDocumentGenerationDisplayStates queue-to-display mapping: content wins over stale queues, error redaction, mockup option/preview attachment
- `src/lib/document-sections.test.ts` — workspace nav items: anchor children, getAllSectionIds dedup, per-document section labels, filtering of unrendered sub-sections
- `src/lib/workspace-scroll-sync.test.ts` — chooseActiveScrollCandidate: nearest-above-marker selection, fall-forward, stable ordering, hysteresis buffer in both scroll directions
- `src/lib/workspace-tab-policy.test.ts` — workspace tab policy: archived tab blocking, fallback to the default document tab, silent URL redirect for blocked tabs
- `src/stores/generate-all-store.test.ts` — getGenerateAllPollDelayMs backs off long-running queues and uses the fast cadence before a start time is known

## Infrastructure / Utilities

- `src/lib/clipboard.test.ts` — copyTextToClipboard async clipboard path, fallback when the async API rejects, and throwing when no copy path exists
- `src/lib/logger.test.ts` — structured JSON logging: context sanitization/truncation, error normalization, secret and provider-body redaction, request id propagation
- `src/lib/openrouter-timeout.test.ts` — OpenRouter timeout envelopes vs route limits, abort/timeout error detection, and user-facing timeout message formatting
- `src/lib/parse-document-stream.test.ts` — parseDocumentStream warns on malformed NDJSON in development and stays quiet in other environments
- `src/lib/code-path-classification.test.ts` — shared post-commit/sweep path classification covers code/workflow roots while excluding ordinary docs and lockfiles
- `src/lib/post-commit-review.test.ts` — post-commit cross-model review runner: exact-SHA routing, code-path filtering, amend-equivalent patch reuse, durable pass/findings/failure/skip status, and reviewer outage classification using temporary repositories and fake reviewer scripts
- `src/lib/rate-limit.test.ts` — checkRateLimit in-memory fallback limiting and Redis REST usage when env vars are configured
- `src/lib/read-request-body.test.ts` — readRequestTextWithLimit byte caps: rejects streamed overflow and oversized declared content-length before reading
- `src/lib/safe-redirect.test.ts` — sanitizeInternalRedirect/getSafeAuthRedirect: path allowlist, dot-segment normalization, rejection of absolute URLs, backslashes, control chars
- `src/lib/visibility-aware-poller.test.ts` — createVisibilityAwarePoller schedule/stop/replace semantics and getDelayMs re-evaluation on every schedule
- `src/lib/with-retry.test.ts` — withRetry logs retry attempts with structured context and does not log non-retryable failures

## Other

- `src/app/api/launch/plan/route.test.ts` — POST /api/launch/plan archived route returns 410 without consuming credits
- `src/app/api/prompt-chat/route.test.ts` — GET and POST /api/prompt-chat deprecated route both return 410
- `src/lib/contact.test.ts` — validateContactRequest field rules: name/email/message length limits and rejection of every email the DB constraint rejects
- `src/lib/waitlist.test.ts` — isWaitlistMode 200-signup threshold behavior and validateWaitlistEmail format, emptiness, and length rules
- `src/lib/project-name-generation.test.ts` — sanitizeGeneratedProjectName label/markdown/injection cleanup with six-word cap and buildFallbackProjectName title-case fallback
- `src/lib/prompt-lab/default-state.test.ts` — isPromptLabDefaultProductionState default badge shown only for untouched production-backed prompt state
- `src/lib/prompt-lab/index.test.ts` — Prompt Lab gating (blocked in production), artifact and mockup option validation, default prompt building, model option filtering
- `src/lib/generation-model-policy.test.ts` — billing plan to generation tier to model resolution, env overrides, routing kill switch, reasoning params, token headroom
- `src/lib/generation/generate-all-helpers.test.ts` — Generate All client queue: buildQueue order/skip/credit costs and the processing loop's error, cancel, and credit accounting
- `src/lib/generation/onboarding.test.ts` — onboarding generation queue build and loading-row mapping, including derived AI Prompts readiness and mockup progress rows
- `src/lib/generation/queue-service.test.ts` — server generation queue: runnable/blocked item selection, queue status, stale-work recovery, retry resets, status-fenced partial writes
- `src/lib/generation/streaming-preview.test.ts` — streaming preview suffix/full merge protocol: length encoding, suffix-only sends, replaced-run full resend, legacy payload semantics

## E2E Tests

Playwright, Chromium, real dev server and real auth; tiers and writing rules in `docs/testing/e2e-guide.md`.

- `e2e/smoke.spec.ts` — free tier: landing hero/idea-capture/sign-in entry render; idea validation floor disables the idea-capture Get Started; real sign-in via auth modal reaches `/projects` and wizard step 1 Next gating (stops before question generation)
- `e2e/paid-intake.spec.ts` — paid tier (`E2E_PAID_FLOWS=1`): Idea 1.1 through real `/api/intake/questions` generation, asserts primary-platform option and ≥4 question mode labels; deliberately stops before Create project

## Maintenance

- New test files must be added to this inventory in the same commit that introduces them.
- The commit-sweep skill checks this file for staleness against `find src -name "*.test.ts" -o -name "*.test.tsx"`.
