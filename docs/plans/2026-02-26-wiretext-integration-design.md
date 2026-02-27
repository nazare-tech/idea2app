# Wiretext Integration Design

**Date:** 2026-02-26
**Status:** Approved
**Scope:** Replace current freeform ASCII mockup generation with structured wiretext wireframes

---

## Summary

Integrate the Wiretext MCP server (`@wiretext/mcp`) into the mockup generation pipeline. The AI generates structured wireframe component objects per screen, the Wiretext MCP renders them as ASCII art and produces editable URLs, and the frontend displays them in a tabbed per-screen layout.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Integration approach | Server-side MCP client (Approach 1) | Official tools, output parity with wiretext.app, URL generation handled |
| Scope of mockup tab | Key Page Layouts only | Remove site maps and user flows; focus on core screens |
| Screen selection | AI picks 3-5 core screens | No login, settings, or generic pages |
| Screen organization | Horizontal tab bar (Option B) | Users switch between screens; clean UI |
| Edit experience | External link to wiretext.app (Option A) | Simple, no iframe complexity |
| Regeneration | All-or-nothing (Option A) | Consistent with other tabs, simpler state management |
| Full replacement | Yes | Wiretext replaces all current mockup generation |

## Data Model

### New table: `mockup_screens`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | Screen record ID |
| `mockup_id` | UUID FK → mockups.id ON DELETE CASCADE | Parent mockup version |
| `screen_name` | TEXT NOT NULL | Tab label (e.g., "Dashboard") |
| `screen_order` | INTEGER NOT NULL | Display order in tab bar |
| `wire_objects` | JSONB NOT NULL | Raw wiretext component objects |
| `ascii_art` | TEXT | Rendered ASCII from `render_wireframe` |
| `wiretext_url` | TEXT | Editable wiretext.app URL from `create_wireframe` |
| `created_at` | TIMESTAMPTZ DEFAULT NOW() | Timestamp |

- RLS: Users access screens via mockup → project → user ownership chain
- Index on `mockup_id` for join performance
- Parent `mockups` table unchanged (used for version tracking)

## API Route Flow

**Endpoint:** `POST /api/mockups/generate`

```
1. Receive request (projectId, mvpPlan, model)
2. Call AI via OpenRouter with wiretext-aware prompt
   → AI returns JSON: { screens: [{ name, wire_objects }] }
3. Spawn Wiretext MCP client (npx -y @wiretext/mcp, stdio transport)
4. For each screen:
   a. Call render_wireframe(wire_objects) → ASCII art string
   b. Call create_wireframe(wire_objects) → wiretext.app URL
5. Insert parent row into `mockups` table
6. Insert each screen into `mockup_screens` table
7. Close MCP client
8. Return success
```

### AI Prompt Changes

- Instruct AI to identify 3-5 core screens only (no login, settings, generic pages)
- Output structured JSON with wiretext component objects per screen
- Use wiretext component vocabulary: box, navbar, card, table, button, input, tabs, modal, browser, progress, alert, avatar, list, etc.
- Include MVP plan as context for screen selection

### Error Handling

- Malformed AI JSON → retry once with stricter prompt, then return error
- MCP tool failure per screen → store wire_objects, leave ascii_art/wiretext_url null, show "render failed" in UI

## Frontend Changes

### MockupRenderer → MockupScreenViewer (replace)

Current `MockupRenderer` (`src/components/ui/mockup-renderer.tsx`) is replaced with `MockupScreenViewer`:

- Receives `screens: { screen_name, ascii_art, wiretext_url }[]`
- Horizontal tab bar at top with screen names
- Selected screen's ASCII art in styled `<pre>` block (dark bg, emerald text, IBM Plex Mono)
- "Edit in Wiretext" button opens `wiretext_url` in new tab

### ContentEditor

`src/components/layout/content-editor.tsx` renders `<MockupScreenViewer>` instead of `<MockupRenderer>` for the mockups document type.

### ProjectWorkspace

`src/components/workspace/project-workspace.tsx` fetches `mockup_screens` joined on the selected mockup version. Screens data flows: ProjectWorkspace → ContentEditor → MockupScreenViewer.

### Unchanged

- Document nav, model selector, version switching, generate button, credit cost (15 credits) — all unchanged.

## Dependencies

| Package | Purpose |
|---------|---------|
| `@modelcontextprotocol/sdk` | MCP client for stdio transport |
| `@wiretext/mcp` | Wiretext MCP server (spawned via npx at runtime) |

## Deployment Notes

- Vercel serverless: `npx` available in Node.js runtime, 5-min `maxDuration` already set
- MCP child process spawns once per request, lives for the request duration
- **Fallback:** If Vercel blocks child processes, import wiretext-cli rendering logic directly instead of MCP
