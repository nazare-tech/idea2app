# Dev Tasks and Troubleshooting
Common development tasks: adding dashboard pages, API route.ts endpoints, CVA UI components, and database tables with supabase gen types regeneration.
Credit cost changes edit src/lib/token-economics.ts: BASE_ACTION_TOKENS plus model multipliers determine final getTokenCost() values.
Troubleshooting covers build errors, auth issues (redirect URLs, RLS), API key errors (OpenRouter, Anthropic, Stripe), and internal credit ledger checks.
Analysis pipeline debugging: [CompetitiveAnalysis] log prefix, Exa-first with Perplexity/Tavily fallback, OPENROUTER_EXA_MARKET_RESEARCH_DISABLED=1 rollback flag.
Generate All issues: inspect the generation_queues row status/current_index/queue, apply the refund_credits migration 20260425004000, cancel at step boundaries.
Mockup generation timing (790s OpenRouter timeout, sequential Options A/B/C), database.ts BOM corruption recovery via git checkout, and the retired PDF export policy.
---

## 10. Common Development Tasks

### Adding a New Page

```bash
# 1. Create page file
src/app/(dashboard)/new-page/page.tsx

# 2. Add to navigation (if needed)
src/components/layout/anchor-nav.tsx
```

### Adding a New API Endpoint

```bash
# 1. Create route file
src/app/api/new-endpoint/route.ts

# 2. Implement POST/GET/PUT/DELETE handlers
export async function POST(request: Request) { ... }
```

### Adding a New UI Component

```bash
# 1. Create component file
src/components/ui/new-component.tsx

# 2. Use CVA pattern for variants
const variants = cva("base", { variants: { ... } })

# 3. Export forwardRef component
```

### Adding a New Database Table

```bash
# 1. Create migration in Supabase
# 2. Add RLS policies
# 3. Update database types
npx supabase gen types typescript --project-id <id> > src/types/database.ts

# 4. Access in code
const { data } = await supabase.from("new_table").select()
```

### Modifying Credit Costs

```typescript
// Edit: src/lib/token-economics.ts
export const BASE_ACTION_TOKENS = {
  chat: 1,
  "competitive-analysis": 15,
  prd: 10,
  // Update base action costs here
}

// Model multipliers in the same file determine final getTokenCost() values.
```

---

## 11. Troubleshooting

### Common Issues

**Build Errors**
- Run `npm install` to ensure all dependencies are installed
- Check TypeScript errors: `npm run build`
- Clear `.next/` folder and rebuild

**Auth Issues**
- Verify environment variables are set correctly
- Check Supabase redirect URLs in project settings
- Ensure RLS policies allow access

**API Errors**
- Check API key validity (OpenRouter, Anthropic, Stripe)
- Verify database connection (Supabase URL/key)
- Check server logs for detailed error messages

**Internal Credit Ledger Issues**
- Verify `consume_credits()` function exists in database
- Check the internal credit balance source used by the failing route
- Review `credits_history` for transaction log

**Analysis Pipeline Issues**
- Competitive analysis uses OpenRouter-managed Exa first; if Exa errors, produces unusable output, or returns no citations, the pipeline falls back to Perplexity/Tavily and then degrades gracefully if those providers are also unavailable
- Check server logs for `[CompetitiveAnalysis]` prefixed messages to trace pipeline step failures
- Ensure `OPENROUTER_API_KEY` is set for primary Exa research; keep `PERPLEXITY_API_KEY` and `TAVILY_API_KEY` configured for fallback coverage
- Set `OPENROUTER_EXA_MARKET_RESEARCH_DISABLED=1` to restore the legacy primary path during an OpenRouter server-tool incident
- External research calls retry up to 3 times on 429/5xx/network errors with 1s/2s/4s backoff

**Generate All Issues**
- If generation appears stuck: check `generation_queues` row in Supabase — `status`, `current_index`, and `queue` show the live server state
- If credits were lost without a document being generated: the hardened `refund_credits` RPC must exist in Supabase (run `supabase/migrations/20260425004000_security_hardening_followups.sql`)
- After running the migration, regenerate database types: `npx supabase gen types typescript --project-id <id> > src/types/database.ts` to remove the `(supabase.rpc as any)` casts
- Cancellation: the execute route checks DB `status === "cancelled"` before each step — cancel takes effect at the next step boundary, which can be several minutes for a slow OpenRouter image mockup step

**Mockup Generation Timing**
- Manual mockup generation can take several minutes per option because OpenRouter image models can be slow and each option has a `790s` OpenRouter timeout inside the Vercel Pro function window.
- The workspace intentionally runs Options A/B/C one after another. This increases total wall-clock time, but it reduces wasted OpenRouter spend because successful uploaded options can be recovered and finalized instead of losing all three requests to one shared timeout.
- Lowering the timeout only fails faster; it does not make image generation faster. To reduce actual delay, use a faster model via `OPENROUTER_MOCKUP_IMAGE_MODEL`, generate fewer default options, shorten the MVP context/prompt, ask for lower-detail wireframes, or move mockups to a durable background worker so the browser is not waiting on a long API request.

**database.ts Corruption**
- If `src/types/database.ts` contains a BOM or npm install prompt at the top (UTF-16 encoding artifact from `supabase gen types` with npx), restore it from git: `git checkout <clean-commit> -- src/types/database.ts`

**Retired PDF Export**
- PDF export is intentionally removed. Do not re-add `/api/generate-pdf`, `pdf-utils.ts`, Puppeteer, or PDF buttons unless PDF returns as a deliberate product feature.

---

