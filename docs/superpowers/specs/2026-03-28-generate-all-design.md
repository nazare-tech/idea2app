# Generate All — Design Specification

## Context

Currently, users must manually generate each document (Competitive Research, PRD, MVP Plan, Mockups, Launch Plan) one at a time by navigating to each tab and clicking "Generate." This creates friction — after the AI summarizes the idea in the Prompt tab, users must figure out the right order and click through 5 tabs sequentially. "Generate All" automates this into a single action with full visibility into the queue.

## Scope

**Documents in queue (in order):**
1. Competitive Research (10 base credits, model-selectable)
2. PRD (10 base credits, model-selectable)
3. MVP Plan (10 base credits, model-selectable)
4. Mockups (30 base credits, fixed: Stitch SDK)
5. Launch Plan (5 base credits, model-selectable — marketing brief auto-filled from idea context)

**Tech Spec is excluded** (currently hidden in nav).

**Out of scope:** Server-side queue orchestration, parallel generation.

---

## Architecture: Client-Side Queue with React Context

### New Files

| File | Purpose |
|------|---------|
| `src/contexts/generate-all-context.tsx` | React context provider for queue state, orchestration logic, and DB persistence |
| `src/components/workspace/generate-all-block.tsx` | The UI block shown in the Prompt tab (idle, in-progress, completed states) |
| `src/components/workspace/generate-all-nav-badge.tsx` | Small badge shown in DocumentNav during generation |
| `src/app/api/generate-all/status/route.ts` | GET endpoint to fetch queue state for a project |
| `src/app/api/generate-all/start/route.ts` | POST endpoint to create/upsert queue record |
| `src/app/api/generate-all/update/route.ts` | PATCH endpoint to update queue item status |
| `src/app/api/generate-all/cancel/route.ts` | POST endpoint to cancel remaining items |
| `supabase/migrations/XXXX_create_generation_queues.sql` | DB migration for the `generation_queues` table |

### Modified Files

| File | Change |
|------|--------|
| `src/components/workspace/project-workspace.tsx` | Wrap with `GenerateAllProvider`, pass project data and existing `handleGenerateContent` |
| `src/components/chat/prompt-chat-interface.tsx` | Render `GenerateAllBlock` after summary is detected |
| `src/components/layout/document-nav.tsx` | Add `GenerateAllNavBadge` overlay during generation |
| `src/lib/token-economics.ts` | Update base costs: `competitive-analysis: 5→10`, `mockup: 15→30`. Add `estimateGenerateAllCost()` function that accepts per-doc model selections. Add `"launch-plan"` as a new `TokenBillableAction` with base cost 5. |
| `src/lib/document-definitions.ts` | Add `GENERATE_ALL_QUEUE_ORDER` constant and `defaultModel` per doc type |
| `src/types/database.ts` | Add `generation_queues` table types (or regenerate) |

### Reused Existing Code

| Existing | Reuse |
|----------|-------|
| `getTokenCost(action, modelId)` from `token-economics.ts` | Calculate per-doc credit cost based on selected model |
| `getModelTokenMultiplier()` from `token-economics.ts` | Dynamic credit recalculation when model changes |
| `DOCUMENT_PRIMARY_MODELS` / `DOCUMENT_MORE_MODELS` from `prompt-chat-config.ts` | Model options for per-doc selectors |
| `DocumentModelSelector` from `components/ui/document-model-selector.tsx` | Dropdown UI for model selection per queue item |
| `handleGenerateContent()` in `project-workspace.tsx` | The actual generation call — reused directly for each doc |
| `saveGeneratingState()` / `getStorageKey()` in `project-workspace.tsx` | localStorage pattern for persisting generation state |
| `getDocumentStatus()` in `project-workspace.tsx` | Detect which docs are already generated (to skip them) |
| `parseDocumentStream` from `lib/parse-document-stream.ts` | Read NDJSON stage events for progress display |

---

## GenerateAllContext — State & Orchestration

```typescript
interface GenerateAllState {
  status: "idle" | "running" | "completed" | "cancelled" | "error"
  queue: QueueItem[]
  currentIndex: number // which item is actively generating (-1 if idle)
  startedAt: number | null // timestamp for elapsed timer
  modelSelections: Record<DocType, string> // per-doc model choices
  error: { docType: string; message: string } | null
}

interface QueueItem {
  docType: "competitive" | "prd" | "mvp" | "mockups" | "launch"
  status: "skipped" | "pending" | "generating" | "done" | "error" | "cancelled"
  creditCost: number // computed from model selection
  stageMessage?: string // live NDJSON stage text (e.g., "Synthesizing research data...")
}
```

### Orchestration Flow

1. **User clicks "Generate All":**
   - Check which docs are already generated (via `getDocumentStatus`) → mark as `skipped`
   - Calculate total credits for remaining docs
   - Verify user has enough credits (single upfront check, but credits deducted per-doc by existing API)
   - Set `status: "running"`, save state to localStorage
   - Begin generating first non-skipped item

2. **Per-document generation:**
   - Set item status to `"generating"`, update `currentIndex`
   - Call the existing `handleGenerateContent(docType, model, options)` from `project-workspace.tsx`
   - For Launch Plan: auto-fill `marketingBrief` from idea context (see section below)
   - Listen for NDJSON stage events → update `stageMessage` for live progress text
   - On success: mark `"done"`, advance to next item
   - On error: mark `"error"`, store error message, stop queue (don't skip — user decides)

3. **Cancellation:**
   - User clicks "Stop"
   - Current generation finishes (AbortController not called — let it complete)
   - Remaining items marked `"cancelled"`
   - Status set to `"cancelled"`
   - Completed items are kept

4. **Completion:**
   - All items either `"done"` or `"skipped"` → status becomes `"completed"`
   - Block shows "All done!" state with checkmarks

### Database Persistence (Supabase)

Queue state is persisted in a new `generation_queues` table in Supabase. This ensures the queue survives browser close, device switches, and page reloads.

**New table: `generation_queues`**

```sql
CREATE TABLE generation_queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'cancelled', 'error')),
  queue JSONB NOT NULL, -- array of QueueItem objects
  current_index INTEGER NOT NULL DEFAULT 0,
  model_selections JSONB NOT NULL, -- Record<DocType, string>
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_info JSONB, -- { docType, message } if error
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, user_id) -- one active queue per project per user
);

-- RLS policies
ALTER TABLE generation_queues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own queues"
  ON generation_queues FOR ALL
  USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE TRIGGER update_generation_queues_updated_at
  BEFORE UPDATE ON generation_queues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**API for queue state:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/generate-all/status` | GET | Fetch current queue state for a project |
| `/api/generate-all/start` | POST | Create/upsert queue record, validate total credits |
| `/api/generate-all/update` | PATCH | Update queue item status, current_index, stage messages |
| `/api/generate-all/cancel` | POST | Mark remaining items as cancelled |

**Hydration on mount:**
- Fetch queue state from `/api/generate-all/status?projectId={id}`
- If `status === "running"`, check which docs are now done (via `getDocumentStatus`)
- If all remaining are done → update to `"completed"` via PATCH
- If some still pending → resume from the first pending item
- Queues older than 30 minutes with status `"running"` are treated as stale and auto-completed/cancelled

**Cross-tab sync:** Not needed — generation is driven by the active tab. Other tabs see status via the existing `generatingDocuments` state + polling. But the DB-backed state means any tab can hydrate the current queue on mount.

**localStorage fallback:** A lightweight localStorage key (`generate_all_active_{projectId}`) is kept as a fast flag so the UI can immediately show "generation in progress" without waiting for the DB fetch on initial render. This is cleared when the DB state is hydrated.

---

## Launch Plan Auto-Fill

When "Generate All" reaches the Launch Plan step, it auto-generates the 5 required `marketingBrief` fields from the project context:

```typescript
const autoMarketingBrief = {
  targetAudience: project.description?.match(/target audience[:\s]*([^.]+)/i)?.[1]
    || "Early adopters and tech-savvy users",
  stage: "Pre-launch MVP",
  budget: "Bootstrap / Limited",
  channels: "Social media, Product Hunt, developer communities",
  launchWindow: "Within 30 days of MVP completion",
}
```

This uses simple extraction from the idea summary. If specific fields can't be extracted, sensible defaults are used. The user can always regenerate the Launch Plan individually later with custom inputs.

---

## UI Design

### Generate All Block — States

#### 1. Idle State (default)
- **Location:** Rendered inside `prompt-chat-interface.tsx` after the summary message
- **Header:** Icon (red rounded square with lightning bolt) + "Generate All Documents" + subtitle
- **Queue list:** 5 rows, each with: step number (circle), doc name, credit cost (mono), model selector dropdown
- **Model selectors:** Interactive dropdowns using existing `DocumentModelSelector` component. Mockups shows greyed "Fixed" tag (Stitch SDK). Launch Plan has a normal model selector since it uses AI for generation.
- **Footer:** "Estimated total: XX credits" (left) + red "Generate All" button (right)
- **Disabled state:** If insufficient credits, button is disabled with tooltip "Not enough credits (need XX, have YY)"

**Dynamic Credit Calculation:**
- On render, the block checks `getDocumentStatus()` for each doc type → already-generated docs are marked "skipped" and excluded from the total
- Per-doc credit cost is calculated using `getTokenCost(action, modelId)` from `token-economics.ts` — pure client-side, no API call
- The total is the sum of credits for **non-skipped items only**
- When user changes a model selector → that row's credit cost updates instantly → total recalculates
- If a document gets generated individually (e.g., user clicks Generate in another tab), the block recalculates on next render — that doc becomes "skipped" and its credits are removed from the total
- The user's current credit balance is compared against the total for enabled/disabled button state

#### 2. In-Progress State
- **Header:** "Generating Documents" + "X / Y" counter + "Stop" button (red outline)
- **Progress bar:** 3px red bar below header, width = (completed / total) * 100%
- **Queue list:** Each item shows:
  - **Done:** Green checkmark, greyed name, "Completed · X credits used"
  - **Active:** Blue spinning circle, bold name, live stage message from NDJSON stream
  - **Pending:** Grey number, faded name, "Queued"
  - **Skipped:** (already-generated docs) Green checkmark, "Already generated"
- **Model selectors:** Hidden during generation — replaced with monospace model name tag
- **Footer:** Elapsed timer (updates every second) + "X / Y credits used"

#### 3. Completed State
- **Header:** Green icon + "All Documents Generated" + subtitle
- **Queue list:** All items show green checkmarks
- **Footer:** Total time + total credits used + "View Documents" link (navigates to Competitive tab)
- Auto-transitions to idle after 10 seconds (with fade), so the block is ready for re-use

#### 4. Error State
- Failed item shows red X icon + error message
- "Retry" button to resume from the failed item
- Completed items above are preserved

#### 5. Cancelled State
- Shows which items completed vs cancelled
- "Resume" button to restart from the first cancelled item

### Global Nav Badge (DocumentNav)

During generation, the `DocumentNav` sidebar shows:

- **On the "Explain the idea" tab:** A pulsing blue badge with `"2/5"` (progress counter)
- **On individual doc tabs:** Their existing status badge is updated in real-time:
  - `"Done"` badge (green) when completed by Generate All
  - Spinning dots badge (blue) when currently generating
  - No badge change for queued/pending items

The badge uses the existing `StatusBadge` component styles:
- Generating: `bg: #EFF6FF, color: #3B82F6` (info style)
- Done: `bg: #ECFDF5, color: #22C55E` (success style)

---

## Design System Compliance

| Element | Token/Value |
|---------|-------------|
| Block border | `border-border` (#E5E5E5) |
| Block background | `bg-card` (#FFFFFF) |
| Block radius | `rounded-xl` (12px) |
| Header text | `text-foreground` (#0A0A0A), 16px, font-weight 700, Sora |
| Subtitle text | `text-muted-foreground` (#999999), 13px |
| Step numbers | 24px circle, `border-border`, Sora 600 |
| Doc name | 13px, font-weight 600, Sora |
| Credit cost | 11px, `text-muted-foreground`, IBM Plex Mono |
| Generate button | `bg-primary` (#DC2626), white text, 14px semi-bold, `rounded-lg` (8px) |
| Progress bar | 3px height, `bg-primary` fill on `#f0f0f0` track |
| Done indicator | `text-success` (#22C55E), `bg-success-bg` (#ECFDF5) |
| Active indicator | `text-info` (#3B82F6), `bg-info-bg` (#EFF6FF) |
| Cancel button | Red outline: `border-primary/30`, `text-primary` |
| Footer background | `bg-secondary` (#F5F5F5) |
| Model selector | Existing `DocumentModelSelector` component — no custom styling |

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| **Page reload mid-generation** | Hydrate from DB via `/api/generate-all/status`. Check which docs completed (via `getDocumentStatus`). Resume from first pending. Current in-flight doc completes server-side — polling detects it. |
| **Navigate to another project, come back** | State is per-project in DB (`generation_queues`). Returning fetches and restores the queue. Works across devices too. |
| **Browser/tab close mid-generation** | Current in-flight doc completes server-side. Queue state is in DB. On next visit, hydrates and detects completed docs, resumes remaining. |
| **Switch tabs during generation** | DocumentNav badge shows progress. Individual tab status badges update in real-time via existing `generatingDocuments` state. |
| **Insufficient credits mid-queue** | Each doc's API endpoint checks credits independently. If credits run out mid-queue, that doc's API returns 402 → item marked as error → queue stops → user sees "Insufficient credits" with option to retry after purchasing. |
| **All docs already generated** | Block shows "All documents are up to date" with no Generate button. Each item shows green checkmark with "Already generated." |
| **Some docs already generated** | Those items are auto-marked "skipped" (shown with green checkmark + "Already generated"). Credit total reflects only remaining items. |
| **Generation error on one doc** | Queue stops. Error shown on that item. "Retry" button resumes from failed item. Completed items preserved. |
| **DB fetch fails/slow** | A lightweight localStorage flag (`generate_all_active_{projectId}`) provides instant "generation in progress" UI while the full DB state loads. If DB fetch fails, fall back to existing `generatingDocuments` polling. |
| **User clicks individual Generate while Generate All is running** | Prevented — individual Generate buttons are disabled while Generate All is active (checked via context). |
| **Concurrent tabs** | Only one tab drives generation. Other tabs see status via existing polling. No cross-tab queue coordination needed. |

---

## Verification Plan

1. **Idle state rendering:**
   - Create a project, complete the Prompt tab, get a summary → Generate All block should appear
   - Change models per document → credit costs and total should update
   - Block should not appear if no summary exists

2. **Generation flow:**
   - Click "Generate All" → documents generate in order (Competitive → PRD → MVP → Mockups → Launch)
   - Each step shows live stage messages from NDJSON stream
   - Progress bar advances after each doc completes
   - DocumentNav badges update in real-time
   - Navigate away to another tab → badges still visible → navigate back → progress block still shows

3. **Persistence:**
   - Start generation → reload page → block should resume from where it left off
   - Start generation → navigate to different project → come back → progress should be visible

4. **Cancellation:**
   - Click "Stop" mid-generation → current doc finishes → remaining marked cancelled
   - Can click "Resume" to restart remaining items

5. **Skip logic:**
   - Generate Competitive Research individually → then click "Generate All" → Competitive should show as "Already generated" and be skipped

6. **Credit validation:**
   - Set credits to less than total → button should be disabled with tooltip
   - Set credits to enough for 2 docs but not all → first 2 generate, 3rd fails with 402

7. **Launch Plan auto-fill:**
   - Generate All should auto-populate marketing brief fields from idea summary
   - Launch Plan should generate successfully without user input
