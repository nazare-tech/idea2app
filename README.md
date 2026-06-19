# Maker Compass

Maker Compass is an AI-powered SaaS app that turns a business idea into structured planning artifacts: Market Research, Product Plan, First Version Plan, and Design Mockups.

The app is built with Next.js App Router, Supabase, Stripe, OpenRouter, and Sentry. `PROJECT_CONTEXT.md` is the source of truth for architecture and product behavior.

## Prerequisites

- Node.js `>=22 <23` or `>=24 <25`
- npm
- Supabase project credentials
- Stripe account credentials for billing flows
- OpenRouter API key for AI generation
- Optional Sentry project for production monitoring

## Environment Variables

Create `.env.local` for local development. Use real values only in local/hosting environments, never in committed files.

| Name | Purpose |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Base app URL for redirects and Stripe return URLs |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser/server Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Supabase service role for trusted operations |
| `OPENROUTER_API_KEY` | OpenRouter text/image generation |
| `OPENROUTER_MOCKUP_IMAGE_MODEL` | Optional image model override |
| `OPENROUTER_MOCKUP_PLANNER_MODEL` | Optional mockup planner model override |
| `STRIPE_SECRET_KEY` | Server-side Stripe API access |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Browser Stripe publishable key when needed |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional Sentry DSN for client/server error reporting |
| `SENTRY_ORG` | Optional Sentry source map upload org |
| `SENTRY_PROJECT` | Optional Sentry source map upload project |
| `SENTRY_AUTH_TOKEN` | Optional Sentry source map upload token |
| `SENTRY_ENVIRONMENT` | Optional server-side Sentry environment label |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | Optional browser Sentry environment label |
| `SENTRY_TRACES_SAMPLE_RATE` | Optional server/edge tracing sample rate |
| `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | Optional browser tracing sample rate |

## Commands

```bash
npm run dev
npm test
npm run lint
npm run typecheck
npm run build
```

## Project Docs

- `PROJECT_CONTEXT.md` - current architecture, product behavior, file map, and operational notes
- `QA_TEST_PLAN.md` - manual verification flows
- `docs/` - security reviews, guides, and implementation notes
- `plans/` - active and completed project plans

## Notes

PDF export has been retired and removed from the app surface. Document generation is singleton-by-default: active documents are reused instead of duplicated unless future versioning is deliberately added.
