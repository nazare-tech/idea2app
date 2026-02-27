# Wiretext Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace freeform ASCII mockup generation with structured Wiretext wireframes rendered via MCP, displayed in a per-screen tabbed UI.

**Architecture:** AI generates structured JSON with wiretext component objects per screen. The API route spawns the `@wiretext/mcp` server via the MCP SDK, calls `render_wireframe` and `create_wireframe` for each screen, stores results in a new `mockup_screens` table, and the frontend displays them in a horizontal tab bar with "Edit in Wiretext" links.

**Tech Stack:** Next.js 16 API routes, `@modelcontextprotocol/sdk` (MCP client), `@wiretext/mcp` (MCP server via npx), Supabase (PostgreSQL), React 19, Tailwind CSS 4, Radix UI.

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install MCP SDK**

```bash
npm install @modelcontextprotocol/sdk
```

**Step 2: Verify installation**

```bash
npx -y @wiretext/mcp --help 2>&1 || echo "wiretext mcp available via npx"
```

This verifies `@wiretext/mcp` is available via npx (it's invoked at runtime, not installed as a dependency).

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add @modelcontextprotocol/sdk for wiretext MCP integration"
```

---

## Task 2: Create `mockup_screens` Migration

**Files:**
- Create: `migrations/create_mockup_screens_table.sql`

**Step 1: Write the migration**

```sql
-- Migration: Create mockup_screens table
-- Description: Stores per-screen wiretext wireframe data linked to mockup versions
-- Created: 2026-02-26

CREATE TABLE IF NOT EXISTS mockup_screens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mockup_id UUID NOT NULL REFERENCES mockups(id) ON DELETE CASCADE,
  screen_name TEXT NOT NULL,
  screen_order INTEGER NOT NULL DEFAULT 0,
  wire_objects JSONB NOT NULL DEFAULT '[]'::jsonb,
  ascii_art TEXT,
  wiretext_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mockup_screens_mockup_id ON mockup_screens(mockup_id);
CREATE INDEX IF NOT EXISTS idx_mockup_screens_order ON mockup_screens(mockup_id, screen_order ASC);

-- Enable RLS
ALTER TABLE mockup_screens ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view screens belonging to their mockups
CREATE POLICY "Users can view their own mockup screens"
  ON mockup_screens FOR SELECT
  USING (
    mockup_id IN (
      SELECT m.id FROM mockups m
      JOIN projects p ON m.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- RLS: Users can insert screens to their mockups
CREATE POLICY "Users can insert mockup screens"
  ON mockup_screens FOR INSERT
  WITH CHECK (
    mockup_id IN (
      SELECT m.id FROM mockups m
      JOIN projects p ON m.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- RLS: Users can delete their mockup screens
CREATE POLICY "Users can delete their own mockup screens"
  ON mockup_screens FOR DELETE
  USING (
    mockup_id IN (
      SELECT m.id FROM mockups m
      JOIN projects p ON m.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

COMMENT ON TABLE mockup_screens IS 'Per-screen wiretext wireframe data linked to mockup versions';
COMMENT ON COLUMN mockup_screens.wire_objects IS 'Raw wiretext component objects (JSON array)';
COMMENT ON COLUMN mockup_screens.ascii_art IS 'Rendered ASCII art from wiretext render_wireframe tool';
COMMENT ON COLUMN mockup_screens.wiretext_url IS 'Editable wiretext.app URL from create_wireframe tool';
```

**Step 2: Apply the migration to Supabase**

Run this via the Supabase dashboard SQL editor or CLI:

```bash
supabase db push
```

Or manually execute the SQL in the Supabase SQL Editor.

**Step 3: Commit**

```bash
git add migrations/create_mockup_screens_table.sql
git commit -m "feat: add mockup_screens table for per-screen wiretext wireframes"
```

---

## Task 3: Create Wiretext MCP Client Utility

**Files:**
- Create: `src/lib/wiretext-mcp.ts`

**Step 1: Write the MCP client utility**

This module handles spawning the wiretext MCP server and calling its tools.

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"

interface WireObject {
  type: string
  x: number
  y: number
  width?: number
  height?: number
  label?: string
  [key: string]: unknown
}

interface WiretextResult {
  ascii_art: string | null
  wiretext_url: string | null
}

/**
 * Spawns the @wiretext/mcp server and provides methods to call its tools.
 * One instance per request — call close() when done.
 */
export class WiretextMCP {
  private client: Client
  private transport: StdioClientTransport

  private constructor(client: Client, transport: StdioClientTransport) {
    this.client = client
    this.transport = transport
  }

  static async create(): Promise<WiretextMCP> {
    const transport = new StdioClientTransport({
      command: "npx",
      args: ["-y", "@wiretext/mcp"],
    })

    const client = new Client({
      name: "idea2app-mockup-generator",
      version: "1.0.0",
    })

    await client.connect(transport)
    return new WiretextMCP(client, transport)
  }

  /**
   * Render wire objects as ASCII art and generate an editable URL.
   */
  async renderScreen(wireObjects: WireObject[]): Promise<WiretextResult> {
    let ascii_art: string | null = null
    let wiretext_url: string | null = null

    try {
      const renderResult = await this.client.callTool({
        name: "render_wireframe",
        arguments: { objects: wireObjects },
      })
      if (renderResult.content && Array.isArray(renderResult.content)) {
        const textContent = renderResult.content.find(
          (c: { type: string }) => c.type === "text"
        )
        if (textContent && "text" in textContent) {
          ascii_art = textContent.text as string
        }
      }
    } catch (err) {
      console.error("[WiretextMCP] render_wireframe failed:", err)
    }

    try {
      const createResult = await this.client.callTool({
        name: "create_wireframe",
        arguments: { objects: wireObjects },
      })
      if (createResult.content && Array.isArray(createResult.content)) {
        const textContent = createResult.content.find(
          (c: { type: string }) => c.type === "text"
        )
        if (textContent && "text" in textContent) {
          wiretext_url = textContent.text as string
        }
      }
    } catch (err) {
      console.error("[WiretextMCP] create_wireframe failed:", err)
    }

    return { ascii_art, wiretext_url }
  }

  async close(): Promise<void> {
    try {
      await this.client.close()
    } catch {
      // ignore close errors
    }
  }
}
```

**Step 2: Commit**

```bash
git add src/lib/wiretext-mcp.ts
git commit -m "feat: add WiretextMCP client utility for spawning and calling wiretext tools"
```

---

## Task 4: Rewrite the Mockup Generation API Route

**Files:**
- Modify: `src/app/api/mockups/generate/route.ts`

**Step 1: Replace the MOCKUP_PROMPT function**

Replace the entire `MOCKUP_PROMPT` function (lines 9-80) with a new prompt that instructs the AI to output structured JSON with wiretext component objects.

The new prompt should:
- Tell the AI to identify 3-5 core screens (skip login, settings, generic pages)
- Output valid JSON: `{ "screens": [{ "name": "Screen Name", "objects": [...wiretext objects...] }] }`
- Reference the wiretext component vocabulary (box, navbar, card, table, button, input, tabs, modal, browser, progress, alert, avatar, list, stepper, etc.)
- Provide one example screen as a JSON template
- Emphasize: only core product screens that show the unique value proposition

```typescript
function WIRETEXT_PROMPT(mvpPlan: string, projectName: string): string {
  return `You are an expert UI/UX wireframe designer. Based on the MVP plan below, create wireframe layouts for the 3-5 CORE screens of the product.

**Product Name:** ${projectName}

**MVP Plan:**
${mvpPlan}

## Instructions

1. Identify the 3-5 most important screens that show the product's core value. Examples: Dashboard, Product Detail, Marketplace, Feed, Editor, etc.
2. Do NOT include generic screens like Login, Sign Up, Settings, Profile, 404, or Landing Page.
3. For each screen, output an array of wiretext component objects positioned on a grid.

## Available Wiretext Components

Primitives: box, text, line, arrow, connector
UI Components:
- button: { type: "button", x, y, label, icon?, align? }
- input: { type: "input", x, y, width?, label?, icon? }
- select: { type: "select", x, y, width?, label? }
- checkbox: { type: "checkbox", x, y, label, checked? }
- radio: { type: "radio", x, y, label, checked? }
- toggle: { type: "toggle", x, y, label, checked? }
- table: { type: "table", x, y, width?, columns, rows?, filterable? }
- modal: { type: "modal", x, y, width?, height?, label, body? }
- browser: { type: "browser", x, y, width, height, label? }
- card: { type: "card", x, y, width, height, label?, body? }
- navbar: { type: "navbar", x, y, width?, navItems }
- tabs: { type: "tabs", x, y, width?, tabs }
- progress: { type: "progress", x, y, width?, progress? }
- icon: { type: "icon", x, y, icon }
- image: { type: "image", x, y, width?, height?, label?, icon? }
- alert: { type: "alert", x, y, width?, label, alertType? }
- avatar: { type: "avatar", x, y, label?, icon? }
- divider: { type: "divider", x, y, width?, label? }
- breadcrumb: { type: "breadcrumb", x, y, items, separator? }
- list: { type: "list", x, y, items, listStyle? }
- stepper: { type: "stepper", x, y, items, activeStep? }
- rating: { type: "rating", x, y, value?, maxValue? }
- skeleton: { type: "skeleton", x, y, width?, height? }

## Coordinate System
- x, y are character positions (0-based). y=0 is top.
- width, height are in characters. Typical screen fits within 80x40.
- Place components logically: navbar at top (y=0), content below, buttons at appropriate positions.

## Example

A dashboard screen might look like:
{
  "name": "Dashboard",
  "objects": [
    { "type": "browser", "x": 0, "y": 0, "width": 80, "height": 35, "label": "https://app.example.com/dashboard" },
    { "type": "navbar", "x": 1, "y": 2, "width": 78, "navItems": ["Dashboard", "Projects", "Analytics", "Team"] },
    { "type": "text", "x": 2, "y": 5, "text": "Welcome back, User" },
    { "type": "card", "x": 2, "y": 7, "width": 24, "height": 8, "label": "Active Projects", "body": "12" },
    { "type": "card", "x": 28, "y": 7, "width": 24, "height": 8, "label": "Tasks Due", "body": "5" },
    { "type": "card", "x": 54, "y": 7, "width": 24, "height": 8, "label": "Team Members", "body": "8" },
    { "type": "table", "x": 2, "y": 17, "width": 76, "columns": ["Project", "Status", "Due Date", "Owner"], "rows": 5 }
  ]
}

## Output Format

Respond with ONLY valid JSON, no markdown, no explanation:

{
  "screens": [
    {
      "name": "Screen Name",
      "objects": [ ...wiretext objects... ]
    }
  ]
}`;
}
```

**Step 2: Update the POST handler**

Replace the AI call and storage logic. The new flow:
1. Call AI with `WIRETEXT_PROMPT` → get JSON with screens
2. Parse the JSON (with retry on failure)
3. Spawn WiretextMCP, render each screen
4. Insert parent mockup row
5. Insert each screen into `mockup_screens`

```typescript
import { WiretextMCP } from "@/lib/wiretext-mcp"

// ... inside POST handler, after credit check ...

// 1. Generate wireframe objects via AI
const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
})

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error("OpenRouter API key not configured")
}

const response = await openrouter.chat.completions.create({
  model: selectedModel,
  messages: [
    { role: "user", content: WIRETEXT_PROMPT(mvpPlan, projectName) },
  ],
  max_tokens: 8192,
  response_format: { type: "json_object" },
})

const rawContent = response.choices[0]?.message?.content
if (!rawContent) {
  throw new Error("No content returned from OpenRouter")
}

// 2. Parse AI response
let screens: { name: string; objects: Record<string, unknown>[] }[]
try {
  const parsed = JSON.parse(rawContent)
  screens = parsed.screens
  if (!Array.isArray(screens) || screens.length === 0) {
    throw new Error("No screens in response")
  }
} catch (parseErr) {
  console.error("[Mockup] JSON parse failed, retrying:", parseErr)
  // Retry once with stricter instruction
  const retryResponse = await openrouter.chat.completions.create({
    model: selectedModel,
    messages: [
      { role: "user", content: WIRETEXT_PROMPT(mvpPlan, projectName) },
      { role: "assistant", content: rawContent },
      { role: "user", content: "Your response was not valid JSON. Please respond with ONLY the JSON object, no markdown code fences, no explanation. Start with { and end with }." },
    ],
    max_tokens: 8192,
    response_format: { type: "json_object" },
  })
  const retryContent = retryResponse.choices[0]?.message?.content
  if (!retryContent) throw new Error("Retry returned no content")
  const retryParsed = JSON.parse(retryContent)
  screens = retryParsed.screens
  if (!Array.isArray(screens) || screens.length === 0) {
    throw new Error("Retry also failed to produce valid screens")
  }
}

modelUsed = selectedModel

// 3. Render each screen via Wiretext MCP
const mcp = await WiretextMCP.create()
const renderedScreens: {
  name: string
  order: number
  wire_objects: Record<string, unknown>[]
  ascii_art: string | null
  wiretext_url: string | null
}[] = []

try {
  for (let i = 0; i < screens.length; i++) {
    const screen = screens[i]
    const result = await mcp.renderScreen(screen.objects as any)
    renderedScreens.push({
      name: screen.name,
      order: i,
      wire_objects: screen.objects,
      ascii_art: result.ascii_art,
      wiretext_url: result.wiretext_url,
    })
  }
} finally {
  await mcp.close()
}

// 4. Store in database
const metadata = {
  source: "openrouter+wiretext",
  model: selectedModel,
  generated_at: new Date().toISOString(),
  screen_count: renderedScreens.length,
}

// Build a combined content string for backward compat (optional)
const combinedContent = renderedScreens
  .map((s) => `## ${s.name}\n\n\`\`\`\n${s.ascii_art || "(render failed)"}\n\`\`\``)
  .join("\n\n")

const { data: mockupRow, error: mockupError } = await supabase
  .from("mockups")
  .insert({
    project_id: projectId,
    content: combinedContent,
    model_used: selectedModel,
    metadata,
  })
  .select("id")
  .single()

if (mockupError || !mockupRow) {
  throw new Error("Failed to insert mockup row")
}

// 5. Insert screens
const screenRows = renderedScreens.map((s) => ({
  mockup_id: mockupRow.id,
  screen_name: s.name,
  screen_order: s.order,
  wire_objects: s.wire_objects,
  ascii_art: s.ascii_art,
  wiretext_url: s.wiretext_url,
}))

const { error: screensError } = await supabase
  .from("mockup_screens")
  .insert(screenRows)

if (screensError) {
  console.error("[Mockup] Failed to insert screens:", screensError)
}

// 6. Update project status
await supabase
  .from("projects")
  .update({ status: "active", updated_at: new Date().toISOString() })
  .eq("id", projectId)

return NextResponse.json({
  content: combinedContent,
  screens: renderedScreens,
  model: selectedModel,
  source: "openrouter+wiretext",
})
```

**Step 3: Commit**

```bash
git add src/app/api/mockups/generate/route.ts
git commit -m "feat: rewrite mockup generation to use wiretext MCP for structured wireframes"
```

---

## Task 5: Update Data Fetching in Project Page

**Files:**
- Modify: `src/app/(dashboard)/projects/[id]/page.tsx`

**Step 1: Add mockup_screens to the parallel fetch**

After the existing mockups fetch (line 47), also fetch screens. Modify the `Promise.all` to include a screens fetch, but since screens depend on mockup IDs, we'll fetch them separately after.

Actually, the simpler approach: fetch screens alongside mockups by joining, or fetch screens in the workspace component when a mockup version is selected. The cleanest approach is to **fetch screens in `ProjectWorkspace`** when the user switches mockup versions, since we already have the mockup ID there.

Alternative: Eagerly fetch all screens for all mockup versions. Since screens are small, this is fine for now.

Add after the existing `Promise.all` (around line 51):

```typescript
// Fetch mockup screens for all mockup versions
const mockupIds = (mockups || []).map((m: { id: string }) => m.id)
let mockupScreens: any[] = []
if (mockupIds.length > 0) {
  const { data: screens } = await supabase
    .from("mockup_screens")
    .select("*")
    .in("mockup_id", mockupIds)
    .order("screen_order", { ascending: true })
  mockupScreens = screens || []
}
```

Then pass `mockupScreens` to `ProjectWorkspace`:

```tsx
<ProjectWorkspace
  ...
  mockupScreens={mockupScreens}
  ...
/>
```

**Step 2: Commit**

```bash
git add src/app/(dashboard)/projects/[id]/page.tsx
git commit -m "feat: fetch mockup_screens data in project page"
```

---

## Task 6: Update ProjectWorkspace to Pass Screens Data

**Files:**
- Modify: `src/components/workspace/project-workspace.tsx`

**Step 1: Add MockupScreen interface and prop**

Add interface at the top (near the other interfaces, around line 43):

```typescript
interface MockupScreen {
  id: string
  mockup_id: string
  screen_name: string
  screen_order: number
  wire_objects: Record<string, unknown>[]
  ascii_art: string | null
  wiretext_url: string | null
  created_at: string | null
}
```

Add to `ProjectWorkspaceProps`:

```typescript
mockupScreens: MockupScreen[]
```

Add to destructured props:

```typescript
mockupScreens,
```

**Step 2: Filter screens for the currently selected mockup version**

In the section where `getContentForDocument` returns content (around line 400), add a helper to get screens for the current mockup:

```typescript
const getScreensForCurrentMockup = (): MockupScreen[] => {
  const versionIndex = selectedVersionIndices["mockups"] || 0
  const currentMockup = mockups[versionIndex]
  if (!currentMockup) return []
  return mockupScreens
    .filter((s) => s.mockup_id === currentMockup.id)
    .sort((a, b) => a.screen_order - b.screen_order)
}
```

**Step 3: Pass screens to ContentEditor**

Where `ContentEditor` is rendered (around line 761), add a new `mockupScreens` prop:

```tsx
<ContentEditor
  ...existing props...
  mockupScreens={activeDocument === "mockups" ? getScreensForCurrentMockup() : undefined}
/>
```

**Step 4: Commit**

```bash
git add src/components/workspace/project-workspace.tsx
git commit -m "feat: pass mockup screens data through ProjectWorkspace to ContentEditor"
```

---

## Task 7: Create MockupScreenViewer Component

**Files:**
- Create: `src/components/ui/mockup-screen-viewer.tsx`

**Step 1: Build the component**

```tsx
"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { ExternalLink } from "lucide-react"

interface MockupScreen {
  screen_name: string
  ascii_art: string | null
  wiretext_url: string | null
}

interface MockupScreenViewerProps {
  screens: MockupScreen[]
  className?: string
}

export function MockupScreenViewer({ screens, className = "" }: MockupScreenViewerProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  if (screens.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-muted-foreground">No screens available</p>
      </div>
    )
  }

  const activeScreen = screens[activeIndex]

  return (
    <div className={cn("space-y-4", className)}>
      {/* Screen tab bar */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
        {screens.map((screen, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={cn(
              "px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              "border-b-2 -mb-px",
              i === activeIndex
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
            )}
          >
            {screen.screen_name}
          </button>
        ))}
      </div>

      {/* ASCII art display */}
      {activeScreen?.ascii_art ? (
        <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-5 overflow-x-auto">
          <code className="font-mono text-[13px] leading-[1.6] text-emerald-400 whitespace-pre block">
            {activeScreen.ascii_art}
          </code>
        </pre>
      ) : (
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-5 text-center">
          <p className="text-sm text-muted-foreground">
            Wireframe render failed for this screen
          </p>
        </div>
      )}

      {/* Edit in Wiretext link */}
      {activeScreen?.wiretext_url && (
        <div className="flex justify-end">
          <a
            href={activeScreen.wiretext_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            Edit in Wiretext
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/ui/mockup-screen-viewer.tsx
git commit -m "feat: add MockupScreenViewer component with tabbed screen display"
```

---

## Task 8: Wire Up ContentEditor to Use MockupScreenViewer

**Files:**
- Modify: `src/components/layout/content-editor.tsx`

**Step 1: Add mockupScreens to ContentEditorProps**

Add to the interface (around line 35):

```typescript
mockupScreens?: { screen_name: string; ascii_art: string | null; wiretext_url: string | null }[]
```

Add to the function destructuring.

**Step 2: Replace MockupRenderer with MockupScreenViewer**

Update the import at the top:

```typescript
// Remove: import { MockupRenderer } from "@/components/ui/mockup-renderer"
import { MockupScreenViewer } from "@/components/ui/mockup-screen-viewer"
```

Replace the rendering branch (lines 437-438):

```tsx
// Before:
documentType === "mockups" ? (
  <MockupRenderer content={content} />
)

// After:
documentType === "mockups" ? (
  mockupScreens && mockupScreens.length > 0 ? (
    <MockupScreenViewer screens={mockupScreens} />
  ) : (
    // Fallback for old mockups that don't have screens data
    <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-5 overflow-x-auto">
      <code className="font-mono text-[13px] leading-[1.6] text-emerald-400 whitespace-pre block">
        {content}
      </code>
    </pre>
  )
)
```

This fallback ensures old mockups (generated before this integration) still render.

**Step 3: Commit**

```bash
git add src/components/layout/content-editor.tsx
git commit -m "feat: wire ContentEditor to use MockupScreenViewer for mockups tab"
```

---

## Task 9: End-to-End Testing

**Files:** No files changed — manual verification.

**Step 1: Verify the migration ran**

Check in Supabase SQL editor:

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'mockup_screens' ORDER BY ordinal_position;
```

Expected: id, mockup_id, screen_name, screen_order, wire_objects, ascii_art, wiretext_url, created_at.

**Step 2: Run the dev server**

```bash
npm run dev
```

**Step 3: Test mockup generation**

1. Navigate to a project that has an MVP Plan generated
2. Switch to the Mockups tab
3. Click Generate
4. Wait for generation to complete
5. Verify: Screen tabs appear at top, ASCII wireframe renders in the dark panel, "Edit in Wiretext" link appears

**Step 4: Test the Edit link**

Click "Edit in Wiretext" — verify it opens wiretext.app in a new tab with the wireframe loaded.

**Step 5: Test version switching**

Generate mockups again → verify version dropdown still works and screens update per version.

**Step 6: Test fallback**

If any old mockup data exists, switch to an old version → verify it still renders (fallback rendering path).

**Step 7: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during wiretext integration testing"
```

---

## Task 10: Update PROJECT_CONTEXT.md

**Files:**
- Modify: `PROJECT_CONTEXT.md`

**Step 1: Update the Mockup Generation section**

Update the core functionality entry for mockups to reflect the new behavior:

```markdown
- **Mockup Generation**: Structured wireframe mockups for core product screens using Wiretext MCP integration (with AI model selection)
  - AI identifies 3-5 core screens from the MVP plan
  - Wiretext MCP renders structured component objects as Unicode wireframes
  - Per-screen tabbed display with horizontal screen selector
  - "Edit in Wiretext" external link for visual editing on wiretext.app
  - Skips generic screens (login, settings, profile) — focuses on core product screens
```

**Step 2: Add `@modelcontextprotocol/sdk` to the tech stack table**

**Step 3: Commit**

```bash
git add PROJECT_CONTEXT.md
git commit -m "docs: update PROJECT_CONTEXT.md with wiretext integration details"
```

---

## Summary of Files Changed

| Action | File |
|--------|------|
| Modify | `package.json` (new dependency) |
| Create | `migrations/create_mockup_screens_table.sql` |
| Create | `src/lib/wiretext-mcp.ts` |
| Modify | `src/app/api/mockups/generate/route.ts` (full rewrite of prompt + handler) |
| Modify | `src/app/(dashboard)/projects/[id]/page.tsx` (fetch screens) |
| Modify | `src/components/workspace/project-workspace.tsx` (pass screens) |
| Create | `src/components/ui/mockup-screen-viewer.tsx` |
| Modify | `src/components/layout/content-editor.tsx` (swap renderer) |
| Modify | `PROJECT_CONTEXT.md` (docs update) |
