# Setup and Build
Setup guide: prerequisites and .env.local variables including NEXT_PUBLIC_SUPABASE_URL/ANON_KEY, OPENROUTER_API_KEY, ANTHROPIC_API_KEY, Stripe, Perplexity, Tavily keys.
Mockup env vars: OPENROUTER_MOCKUP_PLANNER_MODEL, OPENROUTER_MOCKUP_IMAGE_MODEL, SUPABASE_MOCKUP_STORAGE_BUCKET; UI_TEST_EMAIL/UI_TEST_PASSWORD for local UI login.
Database setup lists Supabase tables (profiles, projects, analyses, prds, mvp_plans, mockups, generation_queues, generation_queue_items, waitlist) with RLS enabled.
Credit RPCs: consume_credits, add_credits, get_credit_balance, and service-role-only refund_credits from migration 20260425004000_security_hardening_followups.sql.
Commands: npm run dev/build/start/lint/test; tests use Node's built-in runner via tsx over src/**/*.test.ts(x); CI enforces lint, typecheck, test, and build.
Also covers the git/PR workflow rules, Vercel and Docker deployment, guard-webpack-chunky.mjs build guard, and the in-app browser UI verification default.
---

## 6. Setup & Build

### Prerequisites

- **Node.js**: Latest LTS version
- **npm**: Latest version
- **Supabase Account**: For database and auth
- **Stripe Account**: For payments (optional for dev)
- **API Keys**: Anthropic, OpenRouter

### Environment Variables

Create `.env.local` in the root directory:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# AI Models
OPENROUTER_API_KEY=sk-or-xxx...
OPENROUTER_CHAT_MODEL=anthropic/claude-sonnet-4-6
OPENROUTER_ANALYSIS_MODEL=anthropic/claude-sonnet-4-6
# Optional: dedicated low-cost model for Exa-backed competitor discovery.
OPENROUTER_COMPETITOR_RESEARCH_MODEL=google/gemini-3.5-flash
# Emergency rollback: set to 1 to restore Perplexity/Tavily as the primary path.
OPENROUTER_EXA_MARKET_RESEARCH_DISABLED=0
ANTHROPIC_API_KEY=sk-ant-xxx...

# Stripe
STRIPE_SECRET_KEY=sk_secret_xxx...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx...

# Perplexity (fallback competitor research in competitive analysis)
PERPLEXITY_API_KEY=pplx-xxx...

# Tavily (fallback URL content extraction in competitive analysis)
TAVILY_API_KEY=tvly-xxx...

# OpenRouter image mockups
OPENROUTER_MOCKUP_PLANNER_MODEL=anthropic/claude-sonnet-4-6 # optional; falls back to OPENROUTER_ANALYSIS_MODEL
OPENROUTER_MOCKUP_IMAGE_MODEL=openai/gpt-5.4-image-2
# Optional provider-specific image_config overrides; leave unset unless the selected provider supports them.
# OPENROUTER_MOCKUP_IMAGE_ASPECT_RATIO=21:9
# OPENROUTER_MOCKUP_IMAGE_SIZE=1K
OPENROUTER_MOCKUP_IMAGE_MAX_TOKENS=16384
OPENROUTER_MOCKUP_PLANNER_MAX_TOKENS=16384
SUPABASE_MOCKUP_STORAGE_BUCKET=mockups

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# UI/browser testing login credentials live in .env.e2e.local, NOT in .env.local
# (local only; never commit real values):
#   E2E_TEST_EMAIL=test-user@example.com
#   E2E_TEST_PASSWORD=replace-with-local-secret
```

### Installation

```bash
# Clone repository
git clone <repository-url>
cd idea2app-root-v2

# Install dependencies
npm install
```

### Database Setup (Supabase)

1. Create a new Supabase project
2. Run SQL migrations to create tables:
   - `profiles` - User profile and plan metadata; credit balances are not shown in the product UI
   - `projects` - Business idea projects
   - `messages` - Chat message history
   - `analyses` - Competitive and gap analyses
   - `prds` - Product requirement documents
   - `mvp_plans` - MVP development plans
   - `mockups` - OpenRouter image mockup documents
   - `tech_specs` - Technical specifications
   - `deployments` - Historical generated app deployment rows retained for legacy data only
   - `waitlist` - Public early-access waitlist email captures
   - `credits` - Credit balance tracking
   - `credits_history` - Credit transaction log
   - `plans` - Subscription plans
   - `subscriptions` - User subscriptions
   - `generation_queues` - Generate All pipeline state (status, queue JSON, model_selections, current_index, started_at, completed_at, error_info)
   - `generation_queue_items` - Normalized per-document queue items with status, dependencies, retries, credit state, and output references

3. Enable Row Level Security (RLS) on all tables
4. Create PostgreSQL stored functions:
   - `consume_credits(user_id, amount, action, description)` — atomically deduct credits
   - `add_credits(user_id, amount, action, description)` — add credits (subscription refill, purchases)
   - `get_credit_balance(user_id)` — read current balance
   - `refund_credits(user_id, amount, action, description, metadata)` — service-role-only refund helper hardened in `supabase/migrations/20260425004000_security_hardening_followups.sql`

5. Configure authentication:
   - Enable email/password auth
   - Add redirect URLs (e.g., `http://localhost:3000/callback`)
   - Configure OAuth providers (optional)

### Development

```bash
# Start development server
npm run dev

# Server runs at http://localhost:3000
# Hot module reload enabled
```

### Git and PR Workflow

- When asked to create a PR, keep using the current branch. Do not create a new branch unless explicitly requested.
- Before creating or updating a PR, compare the current branch with its remote tracking branch.
- If the current branch is behind its remote tracking branch, stop and ask what to do before rebasing, merging, force-pushing, or creating the PR.
- If the current branch has no remote tracking branch, push the current branch and create the PR from that branch.

### Build & Production

```bash
# Build for production
npm run build

# Output in .next/ directory

# Start production server
npm start

# Runs at http://localhost:3000
```

### Linting

```bash
# Run ESLint
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

### Testing

```bash
# Run the unit test suite
npm test

# Playwright e2e (one-time browser download on a fresh clone)
npx playwright install chromium
npm run e2e        # free smoke tier
npm run e2e:paid   # + paid intake specs (small AI spend)
```

- Unit tests use Node's built-in test runner via `tsx`; discovery is recursive across `src/**/*.test.ts` and `src/**/*.test.tsx`. Inventory: `docs/testing/test-inventory.md`.
- E2E tests use Playwright (`e2e/`, `playwright.config.ts`); tiers and writing rules in `docs/testing/e2e-guide.md`. A fresh clone must run `npx playwright install chromium` once before `npm run e2e`.
- CI (`.github/workflows/ci.yml`) enforces `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` on every push and PR to `main`. A red pipeline blocks merging; keep `main` green.
- `Design System/` design tooling lives in its own repo, not the app tree. It is git-ignored here and excluded from lint (`eslint.config.mjs`). Do not re-add it to the app repo.
- For browser/UI verification of authenticated routes, use the login from `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD` in `.env.e2e.local`. Treat the values as secrets; never commit real emails/passwords, screenshots containing secrets, cookies, or session storage dumps.
- For agent-driven UI verification and evidence, real Google Chrome is the default per `docs/operating-system/ui-verification.md`; the Playwright suite complements it for repeatable regression checks, it does not replace real-Chrome evidence for UI changes.

### Deployment

**Recommended: Vercel**
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy automatically on push

**Alternative: Docker**
```bash
# Build Docker image
docker build -t idea2app .

# Run container
docker run -p 3000:3000 idea2app
```

### Scripts Reference

```json
{
  "dev": "next dev",                                       // Development server
  "build": "next build && node ./scripts/guard-webpack-chunky.mjs", // Production build + chunky bundle guard
  "start": "next start",                                  // Production server
  "lint": "eslint",                                       // Run linting
  "test": "node --import tsx --test src/**/*.test.ts src/**/*.test.tsx",
  "guard:chunky": "node ./scripts/guard-webpack-chunky.mjs",
  "guard:chunky:dev": "CHECK_DEV_VENDOR=1 node ./scripts/guard-webpack-chunky.mjs"
}
```

---

