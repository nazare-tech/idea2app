# Generate All Feature — Engineering Guide

A complete reference for how the "Generate All" feature works, the architectural decisions behind it, every bug encountered during development, and the patterns that solved them. Written to save the next developer from the same pitfalls.

---

## What the Feature Does

The Prompt tab chat ends with an idea summary. Below that summary a **Generate All** block lets users generate all five documents in a single click:

```
Competitive Research → PRD → MVP Plan → Mockups → Launch Plan
```

Each step is sequential (each document uses the previous one as context). The user can:
- See per-document credit costs and change the AI model for each doc (including Mockups)
- Change the model on a queued item even while generation is running
- Watch a live progress queue as generation runs
- Click a `↗` link on any completed item to navigate directly to that tab
- Stop mid-run (current doc finishes, remaining are cancelled)
- Resume or retry after a stop or error
- Reload the page mid-run and resume via a "Resume" button (page refresh no longer auto-restarts generation)
- Run Generate All on two separate projects simultaneously without interference

---

## Architecture Overview

```
projectStores (module-level Map<projectId, StoreApi>)
└── createGenerateAllStore(projectId)
    ├── State: status, queue[], currentIndex, modelSelections, totalCredits, etc.
    ├── Closure refs: cancelledRef, abortControllerRef, isRunningRef
    ├── Callback refs: generateDocRef, getDocStatusRef  (kept fresh by Hydrator)
    ├── hydrate() → fetches persisted state from Supabase, resumes if needed
    ├── startGenerateAll() → builds queue, persists to DB, calls runLoop() directly
    ├── runLoop() → async function, uses get() for always-fresh state
    │   ├── generateDocRef.current() for each pending item
    │   └── Persists progress via /api/generate-all/update
    ├── cancelGenerateAll() → sets cancelledRef, aborts in-flight request
    └── updateModelSelection() → updates modelSelections + per-item creditCost

GenerateAllHydrator (thin component, renders null)
├── Keeps generateDocRef and getDocStatusRef fresh each render
├── Syncs idle queue when document statuses change
└── Calls store.hydrate() once per project mount

GenerateAllBlock (UI component)
└── useGenerateAllStore(projectId)
    ├── Idle: queue list with model selectors (all docs including Mockups) and credit totals
    ├── Running: model selectors still active for pending items, progress bar, spinners
    ├── Completed: "Done" text + ↗ nav links on every item
    ├── Interrupted: amber icon, count of completed docs, Resume button
    ├── Error: red X on failed item, retry button
    └── Cancelled: shows which docs completed, resume button

GenerateAllNavBadge
└── useGenerateAll(projectId, selector), shows "X/Y" pulsing badge when running
```

### Files

| File | Role |
|---|---|
| `src/stores/generate-all-store.ts` | Zustand store factory, module-level Map, `useGenerateAll` / `useGenerateAllStore` hooks |
| `src/components/workspace/generate-all-hydrator.tsx` | Thin bridge: keeps store callbacks fresh, runs one-time DB hydration |
| `src/components/workspace/generate-all-block.tsx` | UI for the Prompt tab block |
| `src/components/workspace/generate-all-nav-badge.tsx` | Nav badge showing progress |
| `src/lib/generate-all-helpers.ts` | Pure helpers: `buildQueue`, `LOCAL_STORAGE_KEY`, shared types |
| `src/lib/token-economics.ts` | Credit calculation: `getTokenCost`, `estimateGenerateAllCost` |
| `src/lib/document-definitions.ts` | `GENERATE_ALL_QUEUE_ORDER`, `GENERATE_ALL_DEFAULT_MODELS` |
| `src/app/api/generate-all/` | Four endpoints: `status`, `start`, `update`, `cancel` |
| `supabase/migrations/*_create_generation_queues.sql` | Persistent state table |

---

## Core Architecture: Zustand Global Store Map

### Why Zustand replaced React Context

The original implementation used a React Context Provider (`GenerateAllProvider`) wrapping the project workspace. This caused several structural problems:

1. **Context destroyed on navigation** — navigating away from a project unmounted the Provider, destroying all in-progress state. Switching back lost the generation status.
2. **Concurrent projects broken** — opening two projects in the same tab (or navigating between them) created conflicts because the Context only held one project's state.
3. **`useEffect`-triggered loop** — the generation loop ran as a `useEffect` watching `status === "running"`. This required a `workingQueueRef` mutable ref hack to work around React 18's deferred state updates (see [The workingQueueRef Pattern](#the-workingqueueref-pattern-historical) below).

### The module-level store map

```typescript
// src/stores/generate-all-store.ts
const projectStores = new Map<string, StoreApi<GenerateAllStore>>()

export function getGenerateAllStore(projectId: string) {
  if (!projectStores.has(projectId)) {
    projectStores.set(projectId, createGenerateAllStore(projectId))
  }
  return projectStores.get(projectId)!
}
```

The Map lives in module scope — it persists for the entire browser session, surviving React unmounts and route navigation. Each project gets its own isolated store instance. Two browser tabs are separate JS contexts with their own Maps.

**Concurrent project scenarios:**
- **Same-tab switching**: Store persists in memory when navigating away. Navigate back → generation state is exactly where you left it.
- **Two browser tabs**: Each tab has its own module-scope Map and its own Supabase row (unique constraint on `project_id + user_id`). Fully isolated.

### Loop runs directly as async code, not via useEffect

```typescript
// In startGenerateAll():
set({ status: "running", queue: freshQueue, ... })
runLoop()  // called directly — no useEffect trigger needed

// In hydrate() when resuming:
set({ status: "running", queue: hydratedQueue, ... })
runLoop()  // same pattern
```

`runLoop` is a plain async function defined inside the `createStore` callback. It closes over `set`, `get`, and the internal refs. Since Zustand's `get()` always returns **current** state and `set()` is synchronous, there are no stale closure or deferred update issues. The `workingQueueRef` pattern is gone.

### Keeping callbacks fresh

The store holds refs to the `generateDocument` and `getDocumentStatus` callbacks provided by the workspace. These are recreated on every workspace render (not `useCallback`), so they must be kept current:

```typescript
// GenerateAllHydrator — runs after every render
useEffect(() => {
  getGenerateAllStore(projectId)
    .getState()
    ._updateCallbacks(generateDocument, getDocumentStatus)
})
```

`_updateCallbacks` just updates the closure refs (no Zustand `set` call unless status is idle, in which case it also rebuilds the idle queue). This mirrors the original context's `generateDocumentRef.current = generateDocument` pattern — ref assignment on every render, no performance cost.

---

## The workingQueueRef Pattern (Historical)

> This section documents the pattern used in the original React Context implementation. It is no longer in the codebase, but understanding it explains why Zustand was a meaningful improvement.

### The problem: React 18 deferred state in async loops

React 18 batches state updates. Calling `setState` inside an async function does **not** give you the new value synchronously:

```typescript
// ❌ BROKEN — this never works in React 18 async code
const [queue, setQueue] = useState([...])

async function runLoop() {
  for (const item of queue) {           // reads stale snapshot from closure
    setQueue(prev => markGenerating(prev, item))  // update is deferred
    await generateDocument(item)
    setQueue(prev => markDone(prev, item))
    // If you read `queue` here, it's STILL the original value
  }
}
```

### The old solution: mutable ref owned by the loop

```typescript
// ✅ ORIGINAL FIX — the loop owns a mutable working copy
const workingQueueRef = useRef<QueueItem[]>([])

useEffect(() => {
  if (status !== "running") return

  // React guarantees state is up-to-date at the START of a useEffect.
  workingQueueRef.current = [...queue]

  function patchItem(index: number, patch: Partial<QueueItem>) {
    workingQueueRef.current[index] = { ...workingQueueRef.current[index], ...patch }
    setQueue([...workingQueueRef.current])  // trigger re-render
  }

  async function runLoop() {
    const wq = workingQueueRef.current
    for (let i = 0; i < wq.length; i++) {
      patchItem(i, { status: "generating" })
      await generateDocument(wq[i].docType, ...)
      patchItem(i, { status: "done" })
    }
  }

  runLoop()
}, [status]) // triggered when status becomes "running"
```

### Why Zustand eliminates this

In Zustand, `get()` always returns the current store state and `set()` is synchronous:

```typescript
// ✅ CURRENT — clean loop with no ref tricks
async function runLoop() {
  for (let i = startIdx; i < queueLength; i++) {
    const item = get().queue[i]  // always fresh, no closure staleness
    set(s => ({ queue: s.queue.map((q, idx) =>
      idx === i ? { ...q, status: "generating" } : q
    )}))
    await generateDocRef.current!(item.docType, model, options)
    set(s => ({ queue: s.queue.map((q, idx) =>
      idx === i ? { ...q, status: "done" } : q
    )}))
  }
}
```

---

## The Stale Closure Problem: Prerequisites

Documents depend on each other:
- PRD needs the Competitive Analysis content
- MVP Plan needs the PRD content
- Mockups needs the MVP Plan content

### What breaks

```typescript
// ❌ BROKEN — closure captures props at render time
const generateDocument = useCallback(async (docType, model) => {
  const competitiveAnalysis = analyses.find(a => a.type === "competitive-analysis")
  // analyses is stale — it was captured before router.refresh() propagated
}, [analyses, prds, mvpPlans, project, router])
```

After generating Competitive Analysis, `router.refresh()` is called. But the callback's closure still holds the old `analyses[]` from the last render. The next call for PRD gets `competitiveAnalysis = undefined`.

### The fix: fetch prerequisites directly from Supabase, with closure fallback

```typescript
// ✅ CORRECT — fetch fresh data at the moment it's needed, fall back to closure value
const generateDocument = useCallback(async (docType, model, options) => {
  const supabase = createSupabaseClient()

  if (docType === "prd") {
    const { data } = await supabase
      .from("analyses")
      .select("content")
      .eq("project_id", project.id)
      .eq("type", "competitive-analysis")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()  // ← maybeSingle(), NOT single() — see Bug 7b below
    competitiveContent = data?.content ?? analyses.find(a => a.type === "competitive-analysis")?.content
  }
  if (docType === "mockups") {
    const { data } = await supabase
      .from("mvp_plans")
      .select("content")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    mvpContent = data?.content ?? mvpPlans[0]?.content
  }
  // ... same pattern for mvp (reads prd)
}, [project, projectName, router, saveGeneratingState, analyses, prds, mvpPlans])
//                                                       ^^^^^^^^^^^^^^^^^^^
// Array deps kept in sync by _updateCallbacks so closures are never stale
```

**Rule:** Never rely solely on a Supabase query for prerequisite data — if the row doesn't exist yet (0 rows), `.single()` throws a PGRST116 error that silently nulls `data`. Use `.maybeSingle()` and always provide a closure fallback. Keep the array deps (`analyses`, `prds`, `mvpPlans`) in the `useCallback` dep list so `_updateCallbacks` keeps them fresh.

---

## Bug Log: Every Issue Encountered

### Bug 1: Credits showing wrong values (gpt-5-mini showing 15 instead of ~9)

**Symptom:** Selecting `gpt-5-mini` (0.85× multiplier) showed the same credit cost as `gpt-5` (1.5×).

**Root cause:** `MODEL_MULTIPLIERS` had `"gpt-5"` before `"gpt-5-mini"`. `Array.find()` returned the first substring match — `"gpt-5-mini".includes("gpt-5")` is `true`.

**Fix:** More specific strings before generic ones:
```typescript
// ✅ gpt-5-mini BEFORE gpt-5
{ match: "gpt-5-mini", multiplier: 0.85 },
{ match: "gpt-5",      multiplier: 1.5  },
```

---

### Bug 2: "Generate All" does nothing — everything shows "Queued"

**Symptom:** All items queued, nothing started generating.

**Root cause:** React 18 deferred state updates in async loop (see [workingQueueRef section](#the-workingqueueref-pattern-historical)).

**Fix (original):** `workingQueueRef` pattern. **Fix (current):** Zustand's `get()` / `set()`.

---

### Bug 3: Already-completed docs show "Generating..." in the block

**Symptom:** Competitive Analysis was done (visible in nav) but block showed "Generating..." for it.

**Root cause:** `buildQueue()` checked status when the queue was built. User may have generated docs individually between queue build and clicking Generate All.

**Fix:** Re-check live status inside the loop immediately before each item:
```typescript
const liveStatus = getDocStatusRef.current?.(item.docType)
if (liveStatus === "done") {
  set(s => ({ queue: s.queue.map((q, idx) => idx === i ? { ...q, status: "skipped" } : q) }))
  continue
}
```

---

### Bug 4: Stopping doesn't actually stop — docs keep generating

**Symptom:** Clicking "Stop" updated the UI but documents continued generating server-side.

**Root cause:** No `AbortSignal` threading — in-flight fetch had no way to know about the cancellation.

**Fix:** Thread `AbortController` signal from store through to `generateDocument` fetch calls:
```typescript
// Store: create controller when starting
abortControllerRef.current = new AbortController()

// Loop: pass signal in options
{ signal: abortControllerRef.current?.signal }

// cancelGenerateAll():
abortControllerRef.current.abort()

// generateDocument() in project-workspace:
externalSignal?.addEventListener("abort", () => controller.abort(), { once: true })
```

**Rule:** Any cancellable long-running operation must accept and propagate an `AbortSignal`.

---

### Bug 5: Stopping marks already-completed docs as "Cancelled"

**Symptom:** Competitive Analysis completed successfully then showed "Cancelled" after Stop.

**Root cause:** `cancelGenerateAll` mapped over queue and marked all non-`skipped` items as `cancelled` without checking which were actually done.

**Fix:** Check live document status before deciding:
```typescript
set(s => ({
  status: "cancelled",
  queue: s.queue.map((item) => {
    if (item.status === "done" || item.status === "skipped") return item
    const actualStatus = getDocStatusRef.current?.(item.docType)
    if (actualStatus === "done") return { ...item, status: "done", stageMessage: undefined }
    if (item.status === "pending" || item.status === "generating")
      return { ...item, status: "cancelled", stageMessage: undefined }
    return item
  }),
}))
```

---

### Bug 6: "All Documents Generated" shown while Mockups still streaming

**Symptom:** Header turned green while Mockups tab was still actively streaming.

**Root cause:** Loop exited and called `setStatus("completed")` before verifying the last item actually committed. `router.refresh()` inside `generateDocument` is fire-and-forget.

**Fix:** Final verification pass before declaring completed:
```typescript
const finalQueue = get().queue.map((item) => {
  if (item.status === "generating") {
    const live = getDocStatusRef.current?.(item.docType)
    return live === "done"
      ? { ...item, status: "done", stageMessage: undefined }
      : { ...item, status: "error", error: "Generation did not complete" }
  }
  return item
})
set({ queue: finalQueue, status: "completed" })
```

---

### Bug 7a: Mockups fail with "mvpPlan is required" (stale closure)

**Symptom:** Competitive, PRD, MVP generated fine. Mockups got a 400 error.

**Root cause:** Stale closure in `generateDocument` — `mvpPlans[0]` was `undefined` because the component hadn't re-rendered after `router.refresh()`.

**Fix:** Query Supabase fresh inside `generateDocument` (see [Stale Closures section](#the-stale-closure-problem-prerequisites)).

---

### Bug 7b: Mockups fail with "projectId, mvpPlan, and projectName are required" (`.single()` silent failure)

**Symptom:** After the Bug 7a fix was applied, Mockups still failed occasionally. The error said all three fields were missing, not just `mvpPlan`.

**Root cause:** `.single()` returns `{ data: null, error: { code: "PGRST116" } }` when 0 rows match. Since only `data` was destructured, the error was silently swallowed. If the browser Supabase client wasn't authenticated (e.g., auth cookie timing on dev), `data` came back `null`. With `mvpContent = undefined`, the conditional spread `(docType === "mockups" && mvpContent && { mvpPlan, projectName })` evaluated to `false`, and both `mvpPlan` and `projectName` were omitted from the request body entirely.

**Fix:** Three-part fix in `project-workspace.tsx`:
1. Change all prerequisite queries from `.single()` to `.maybeSingle()` — silences the PGRST116 error so data is properly null rather than throwing.
2. Add closure fallbacks for each query: `data?.content ?? mvpPlans[0]?.content` (and similarly for `analyses` and `prds`). `_updateCallbacks` keeps these closure values current on every render.
3. Add `analyses`, `prds`, `mvpPlans` to the `generateDocument` `useCallback` dep array so the closure values are never stale.

```typescript
// Before:
.single()
mvpContent = data?.content ?? undefined

// After:
.maybeSingle()
mvpContent = data?.content ?? mvpPlans[0]?.content
// Closure value is the safety net if Supabase auth isn't ready yet
```

---

### Bug 8: Generate All block disappears when user types a new chat message

**Symptom:** After clicking Generate All or completing generation, typing a follow-up question in the chat caused the block to vanish.

**Root cause:** Block visibility was `{conversationStage === "summarized" && <GenerateAllBlock />}`. When the user typed a new message, `conversationStage` reset to `"refining"`, hiding the block even though generation was in progress or completed.

**Fix:** Also show the block whenever the store has active state:
```typescript
{(conversationStage === "summarized" || generateAllStatus !== "idle") && (
  <GenerateAllBlock projectId={projectId} credits={credits} />
)}
```

`generateAllStatus` is read via `useGenerateAll(projectId, s => s.status)`. Once Generate All has been triggered, the block stays visible regardless of chat input.

---

### Bug 9: Model dropdowns locked for pending items during generation

**Symptom:** While item 1 was generating, the user couldn't change the model for items 3–5.

**Root cause:** The block only showed model selectors when `isIdle`. During `running` state, all items showed status text instead.

**Fix:** Show model selectors for `pending` items even when running:
```typescript
const showModelSelector =
  item.status !== "skipped" &&
  (isIdle || (isRunning && item.status === "pending"))
```

Since the generation loop reads `get().modelSelections[docType]` at generation time (not from a closure), any change the user makes before an item starts is automatically picked up.

---

### Bug 10: Mockups shows "Fixed" instead of an AI model selector

**Symptom:** Mockups had a greyed-out "Fixed" tag instead of a model dropdown, implying no AI was used.

**Root cause:** Mockups was special-cased because the original design assumed Stitch rendered mockups directly. In reality, an AI model writes a Stitch system prompt first — so Mockups does have an AI model preference.

**Fix:** Remove the special case in `generate-all-block.tsx`. Change `GENERATE_ALL_DEFAULT_MODELS.mockups` from `"stitch"` to `"x-ai/grok-4-1-fast"`. Mockups now uses the same model dropdown as all other docs. The Stitch renderer is still the output mechanism — the selected model controls which LLM writes the Stitch prompt.

---

### Bug 11: Navigating between projects loses Generate All state

**Symptom:** Starting Generate All on Project A, navigating to Project B, then back to Project A showed the block in idle state with no progress.

**Root cause:** `GenerateAllProvider` was a React Context Provider wrapping the project workspace. Navigating away unmounted the component, destroying all state.

**Fix:** Zustand module-level store map (see [Architecture section](#core-architecture-zustand-global-store-map)). The store persists for the browser session regardless of React mount/unmount cycles.

---

### Bug 12: "Generation did not complete" error after page refresh mid-generation

**Symptom:** Refreshing the page while (e.g.) Mockups was generating caused that item to show a red ✗ with "Generation did not complete". Other already-completed items showed "Done ↗" correctly.

**Root cause:** On page reload, `hydrate()` fetched the persisted DB queue. Items that were `"generating"` at the time of the refresh were kept as `"generating"` in the hydrated queue — if the doc wasn't done yet. The main `runLoop()` only processes `"pending"` items (`if (item.status !== "pending") continue`), so the stuck `"generating"` item was forever skipped. The final verification pass then caught it still in `"generating"` state and marked it as `"error: Generation did not complete"`.

**Fix:** In the hydration logic, reset any `"generating"` item (whose doc isn't done yet) back to `"pending"`:

```typescript
// In hydrate(), inside the if (dbRow.status === "running") branch:
const hydratedQueue = (dbRow.queue as QueueItem[]).map((item) => {
  if (item.status === "pending" || item.status === "generating") {
    const currentStatus = getDocStatusRef.current?.(item.docType)
    if (currentStatus === "done") {
      return { ...item, status: "done" as const }
    }
    // Reset "generating" → "pending" so the loop can retry it.
    return { ...item, status: "pending" as const }
  }
  return item
})
```

The loop's per-item `liveStatus` check (Bug 3 fix) ensures an item already completed by a previous run is skipped, not re-generated.

---

### Bug 13: Second browser tab shows items stuck in "Generating..."

**Symptom:** Opening the same project in a second tab while Tab 1 was generating showed some items perpetually stuck as "Generating..." even after Tab 1 finished.

**Root cause:** Identical to Bug 12. Tab 2 hydrated the shared Supabase row, found items in `"generating"` state (Tab 1 was actively processing them), and kept those items as `"generating"`. Tab 2's loop skipped them. By the time Tab 2's final verification pass ran, the items may have been done (Tab 1 finished) — but if Tab 1 hadn't finished yet, they were marked as `"error"`. Either way, Tab 2 showed a misleading state.

**Fix:** Same hydration fix as Bug 12. After hydration, `"generating"` → `"pending"`. Tab 2's loop then re-processes them, but the `liveStatus === "done"` guard at the start of each iteration immediately skips any item Tab 1 has already completed. The result is that Tab 2 sees those items as `"skipped"` (already done), which renders as "Done ↗".

**Note on concurrent generation:** Two browser tabs for the same project are two separate JS processes with their own module-level store Maps. They share only the Supabase row for persistence. Tab 2 does not "steal" Tab 1's generation — if Tab 1 is still running when Tab 2 calls `runLoop()`, both may try to generate the same document. The `liveStatus` guard makes this idempotent (whoever finishes first wins; the second gets skipped). This is acceptable behavior, not a race condition.

---

### Bug 14: Clicking ↗ nav link causes infinite tab-switching loop

**Symptom:** Clicking the `↗` arrow on a completed doc (e.g., "Competitive") in the Generate All block caused the URL to flicker rapidly between `?tab=competitive` and `?tab=prompt`, effectively trapping the user.

**Root cause:** Two `useEffect` hooks in `project-workspace.tsx` fired simultaneously on the same `searchParams` change:
- **Effect A** (line ~282): reads `searchParams.get("tab")` and calls `setActiveDocument("competitive")`.
- **Effect B** (line ~305): reads `activeDocument` and calls `router.replace("?tab=prompt")` if the URL tab doesn't match.

When Effect A fired, `activeDocument` hadn't updated yet (still `"prompt"`). Effect B saw the mismatch and immediately overwrote the URL back to `?tab=prompt`. Next render, Effect A fired again, and the loop continued.

**Fix:** In Effect B, add a guard: only sync the URL when it does NOT already contain a valid document type. If the URL already has a valid tab (set by a `<Link>` click), trust it — don't override it.

```typescript
// Before:
if (nextParams.get("tab") !== activeDocument) {
  nextParams.set("tab", activeDocument)
  router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false })
}

// After:
const urlTab = nextParams.get("tab")
if (urlTab !== activeDocument && !isDocumentType(urlTab)) {
  // Only sync URL → state when URL doesn't already contain a valid doc tab.
  // If urlTab IS a valid doc type, Effect A (searchParams → setActiveDocument)
  // will handle it; Effect B must not race against it.
  nextParams.set("tab", activeDocument)
  router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false })
}
```

`isDocumentType` is the existing type guard from `document-definitions.ts`.

---

### Bug 15: Generation status disappears after navigating away and back

**Symptom:** On localhost/dev, starting Generate All, navigating to another project, then navigating back showed the Generate All block in idle state. The Zustand store correctly preserved the `"running"` status, but the block wasn't rendered at all.

**Root cause:** The block's render condition is:
```typescript
{(conversationStage === "summarized" || generateAllStatus !== "idle") && (
  <GenerateAllBlock ... />
)}
```
`generateAllStatus` was `"running"` so that part was fine. But the _Hydrator_ also wasn't called yet (no mounted component), and more critically, `conversationStage` was initializing to `"initial"` on every remount (hardcoded default). With HMR resetting the Zustand store to `"idle"` on the first render tick, both conditions were temporarily `false` and the block didn't render. The store then hydrated and set `status: "running"` — but the chat component had already committed with `conversationStage = "initial"`.

**Fix:** Lazy-initialize `conversationStage` based on whether `initialIdea` (the project description prop) exists. If the project has a description, the chat has already been summarized — initialize directly to `"summarized"` instead of `"initial"`.

```typescript
// Before:
const [conversationStage, setConversationStage] = useState<"initial" | "refining" | "summarized">("initial")

// After:
const [conversationStage, setConversationStage] = useState<"initial" | "refining" | "summarized">(
  () => (initialIdea ? "summarized" : "initial"),
)
```

This ensures the block's render condition is immediately satisfied on remount for projects that have been described, so the GenerateAllBlock is mounted before hydration completes.

---

### Bug 16: Every page refresh during generation fires new API calls

**Symptom:** Refreshing the browser tab while generation was in progress caused duplicate API calls — OpenRouter was called again for competitive/PRD/MVP/launch, and Stitch was called again for mockups. Each refresh was a fresh generation start, not a resume.

**Root cause:** `hydrate()` found a `"running"` row in Supabase, reset any `"generating"` item back to `"pending"`, set `status: "running"`, and immediately called `runLoop()`. This was correct for the original use case (resume after crash) but caused unintended restarts on every page refresh because the row was still `"running"` until the generation completed.

**Fix:** Introduce an `"interrupted"` status. On hydration, if the DB row is `"running"` and there are still pending items, set `status: "interrupted"` instead of `"running"` — and do NOT call `runLoop()`. Remove the localStorage flag. The user must explicitly click **Resume** to restart the loop.

```typescript
// Before (hydrate, running branch):
set({ queue: hydratedQueue, ..., status: "running" })
runLoop()

// After:
set({ queue: hydratedQueue, ..., status: "interrupted" })
localStorage.removeItem(LOCAL_STORAGE_KEY(projectId))
// runLoop() is NOT called — user clicks Resume to trigger startGenerateAll()
```

The `GenerateAllBlock` shows an amber "Generation Interrupted" state with a count of completed docs and a **Resume** button that calls `startGenerateAll()` to restart from where it left off.

**Status type update:**
```typescript
// Before:
export type GenerateAllStatus = "idle" | "loading" | "running" | "completed" | "cancelled" | "error"

// After:
export type GenerateAllStatus = "idle" | "loading" | "running" | "completed" | "cancelled" | "error" | "interrupted"
```

---

## Patterns and Rules Extracted

### 1. Use a module-level store for state that must survive navigation

If state needs to survive React unmounts (tab switching, navigation), it cannot live in React Context. A module-level `Map<id, Store>` is the right tool: it lives outside React's lifecycle but is still reactive via Zustand subscriptions.

### 2. Use get() instead of closures in long-running async loops

Zustand's `get()` always returns current state. Use it inside async loops instead of capturing state values in closures at function creation time.

```
runLoop → get().queue[i]         ← always fresh
       → get().modelSelections   ← picks up user changes mid-run
```

### 3. Never rely on stale closures for prerequisite data

If a callback uses data that may change while an async operation is in flight, fetch that data fresh at call time (Supabase query) instead of reading from the React closure.

### 4. AbortSignal must be threaded all the way to fetch()

A cancel boolean doesn't stop in-flight HTTP requests. The signal must travel: `AbortController` → `options.signal` → `fetch(url, { signal })`.

### 5. Verify completion state before declaring "completed"

An async operation returning `true` doesn't mean the database has been written. Add a final verification pass against live state before transitioning to the terminal "completed" state.

### 6. Re-check live state before each queue item

Between queue construction and processing an item, the user may have generated that document individually. Always re-check immediately before starting each item.

### 7. Model multiplier arrays: specific strings before generic ones

`Array.find()` is first-match. `"gpt-5-mini".includes("gpt-5")` is `true`. Always place more-specific patterns first.

### 8. Extract pure business logic from React files for testability

The `simulateLoop()` function in `generate-all-helpers.test.ts` is a pure TypeScript mirror of `runLoop`. It accepts mock callbacks, drives all edge-case tests without React, without a mock framework, and without API calls.

### 9. Block visibility should depend on store state, not on chat stage

UI that persists after user action (Generate All block) should check the store's own status, not the conversation stage. Conversation stage can regress; store status only advances forward.

### 10. Reset "generating" → "pending" during hydration

When restoring persisted queue state on page load or in a new tab, any item still in `"generating"` state was interrupted mid-flight. Don't keep it as `"generating"` — the loop that was driving it is gone. Reset it to `"pending"` so the new loop can retry it. The `liveStatus` guard at the start of each loop iteration will skip the item safely if it was already completed by another session.

Rule: **hydration is not a snapshot replay — it's a recovery step**. Intermediate states (`"generating"`) are not stable; only terminal states (`"done"`, `"error"`, `"cancelled"`, `"skipped"`) should survive hydration unchanged.

### 11. Don't auto-restart async loops on page reload

If a long-running process was in progress at reload time, do NOT auto-restart it on hydration. Present an explicit "Resume" action instead. Auto-restart causes duplicate API calls on every refresh — the user pays for generation they didn't intend to trigger.

The pattern: set status to `"interrupted"` (not `"running"`) during hydration → block UI shows Resume button → Resume calls the normal `startGenerateAll()` path.

### 12. When two URL-sync effects coexist, only one should own writes

Two effects that both read `searchParams` and both call `router.replace` will race. Assign clear ownership:
- **Effect A (URL → state):** reads `searchParams`, calls `setActiveDocument`. This is the authoritative source when a `<Link>` navigates to a new tab.
- **Effect B (state → URL):** reads `activeDocument`, syncs it to the URL. Must check whether the URL already has a valid value before overwriting — if it does, Effect A owns this render and Effect B should stand down.

Guard pattern:
```typescript
const urlTab = searchParams.get("tab")
if (urlTab !== activeDocument && !isDocumentType(urlTab)) {
  // URL has no valid tab — safe to write activeDocument into it
  router.replace(...)
}
```

### 13. Initialize local UI state from props, not hardcoded defaults

If a component can be unmounted and remounted while the underlying data persists (e.g., navigating between projects), initializing local state to a hardcoded default causes a flash where the derived UI is wrong. Initialize lazily from the prop that reflects the persisted state:

```typescript
// ❌ Always resets to "initial" on remount — loses derived state
const [stage, setStage] = useState("initial")

// ✅ Correct — reads prop to determine correct starting state
const [stage, setStage] = useState(() => initialIdea ? "summarized" : "initial")
```

### 14. Use `.maybeSingle()` not `.single()` for optional prerequisite rows

Supabase's `.single()` returns `{ data: null, error: PGRST116 }` when 0 rows match. If you only destructure `data`, you silently get `null` with no visible error. Use `.maybeSingle()` which returns `{ data: null, error: null }` for 0 rows and is explicit about nullability.

---

## Testing Strategy

All tests use Node.js built-in `node:test` with `tsx` — no Jest, no Vitest, no React Testing Library.

**Run tests:**
```bash
npm test
```

### Test files

| File | Tests | Coverage |
|---|---|---|
| `src/lib/token-economics.test.ts` | 51 | Credit math, model multipliers, regression guards |
| `src/lib/generate-all-helpers.test.ts` | 35 | Queue building, loop simulation with all edge cases |

### Key test: the loop simulation

`generate-all-helpers.test.ts` defines `simulateLoop()` — a pure TypeScript mirror of `runLoop()`. It accepts mock `generateDoc` and `getDocStatus` callbacks:

```typescript
// Example: test that an error mid-loop stops processing
const result = await simulateLoop(
  pendingQueue(),
  DEFAULT_MODELS,
  async (docType) => {
    if (docType === "prd") throw new Error("PRD generation failed")
    return true
  },
  allPending,
  { current: false },
)
assert.equal(result.status, "error")
assert.equal(result.queue.find(i => i.docType === "prd").status, "error")
assert.equal(result.queue.find(i => i.docType === "competitive").status, "done")
assert.equal(result.queue.find(i => i.docType === "mvp").status, "pending") // never reached
```

### Edge cases covered by tests

- Happy path: all 5 docs generate in order
- Empty queue: immediate completion, `generateDoc` never called
- Pre-skipped items: docs that became done since queue was built are skipped
- Error on first, middle, and last doc
- `generateDoc` returning `false` (treated same as throw)
- Credits only accumulate for docs that actually succeeded
- Cancel before loop starts: 0 docs processed
- Cancel mid-loop: partial completion, remaining stay pending
- `AbortError` with `cancelledRef=true` → cancelled (not error)
- `AbortError` with `cancelledRef=false` → unexpected abort, final pass handles stuck item
- Sequential dependency order maintained (competitive → prd → mvp → mockups → launch)
- Regression: `gpt-5-mini` gets 0.85× not 1.5×

---

## Supabase Schema

```sql
create table generation_queues (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  status      text not null default 'running',  -- running | completed | cancelled | error | interrupted
  queue       jsonb not null default '[]',
  current_index integer not null default 0,
  model_selections jsonb default '{}',
  started_at  timestamptz,
  completed_at timestamptz,
  error_info  jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (project_id, user_id)  -- one queue per project per user
);
```

RLS: users can only `select`, `insert`, `update` rows where `user_id = auth.uid()`.

---

## API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/generate-all/status?projectId=` | GET | Fetch persisted queue for this project |
| `/api/generate-all/start` | POST | Create/replace queue row, begin tracking |
| `/api/generate-all/update` | PATCH | Update queue progress (called after each doc) |
| `/api/generate-all/cancel` | POST | Mark queue cancelled, update item statuses |

All endpoints validate auth and project ownership via Supabase server client.

---

## Reload Recovery

On mount, `GenerateAllHydrator` calls `store.hydrate()` once per project:

1. Check `localStorage.getItem("generate_all_active_{projectId}")` — show loading spinner instantly
2. Fetch `/api/generate-all/status` to get persisted DB state
3. Compare each item's recorded status against current live document status
4. If all items are now done → mark completed, clear localStorage flag
5. If some items need to run → reset any `"generating"` items back to `"pending"` (they were interrupted mid-flight; see Bug 12), hydrate the queue, set status to **`"interrupted"`**, and clear the localStorage flag. **Do NOT call `runLoop()`.** The user sees an amber "Generation Interrupted" banner with a Resume button. Clicking Resume calls `startGenerateAll()` which rebuilds from the interrupted queue and starts `runLoop()`.
6. If DB queue is `> 30 minutes old` and still `"running"` → auto-cancel (treat as stale)

**Why `"interrupted"` instead of auto-resume:** Auto-resuming `runLoop()` on every page load caused duplicate API calls (Bug 16). The user refreshed for a reason (network issue, error, etc.). Making resume explicit costs one click but prevents runaway generation charges.

The `isRunningRef` guard prevents `runLoop` from being entered twice. This also guards against `startGenerateAll` and `hydrate` racing to start the loop.
