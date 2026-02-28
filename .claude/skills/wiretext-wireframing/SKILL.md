---
name: wiretext-wireframing
description: Generate ASCII wireframes for web applications using wiretext.app MCP integration. Use when generating mockups, wireframes, or screen layouts for a project. Covers the full pipeline — AI prompt design, wiretext MCP object schema, sanitization, rendering, and frontend display of ASCII wireframes.
---

# Wiretext Wireframing Skill

Generate production-quality ASCII wireframes for web applications using the wiretext.app MCP (Model Context Protocol) server. This skill covers the end-to-end pipeline from AI-generated wireframe objects to rendered ASCII art displayed in a frontend viewer.

## When to Use

- Generating wireframe mockups for a project's core screens
- Debugging wiretext MCP rendering errors (overlapping elements, out-of-bounds, missing fields)
- Modifying the AI prompt that drives wireframe generation
- Updating the wireframe viewer component or its rendering behavior
- Adding new component types to the wireframe system

## Architecture Overview

The wireframing pipeline has 4 stages:

1. **AI Generation** — An LLM (via OpenRouter) receives the project's MVP plan and outputs wiretext object JSON
2. **Sanitization** — `sanitizeWireObjects()` auto-fixes common AI mistakes (width too narrow, missing fields, out-of-bounds)
3. **MCP Rendering** — `@wiretext/mcp` converts objects to ASCII art (`render_wireframe`) and a shareable URL (`create_wireframe`)
4. **Frontend Display** — `MockupScreenViewer` component renders the ASCII art with proper monospace font handling

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/wiretext-mcp.ts` | MCP client, sanitizer, `WiretextMCP` class |
| `src/app/api/mockups/generate/route.ts` | API route: AI generation + MCP rendering + DB storage |
| `src/components/ui/mockup-screen-viewer.tsx` | Frontend ASCII viewer with tab navigation |

## Wiretext MCP Tools

The `@wiretext/mcp` package exposes exactly 2 MCP tools via stdio transport:

| Tool | Input | Output |
|------|-------|--------|
| `render_wireframe` | `{ objects: WireObject[] }` | ASCII art text |
| `create_wireframe` | `{ objects: WireObject[] }` | `https://wiretext.app/#...` URL (lz-string compressed) |

There is no read-back tool — wiretext.app is view-only from the integration's perspective.

### MCP Client Setup

Spawn the MCP server via `npx -y @wiretext/mcp` as a stdio child process using `@modelcontextprotocol/sdk`:

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"

const transport = new StdioClientTransport({
  command: "npx",
  args: ["-y", "@wiretext/mcp"],
})
const client = new Client({ name: "my-app", version: "1.0.0" })
await client.connect(transport)
```

Always close the client after rendering all screens to avoid orphaned processes.

## Wiretext Object Schema

Read `references/wiretext-object-schema.md` for the complete schema of all supported wiretext object types, including primitives and components.

**Critical rules:**
- Position uses `{ col, row }` — NEVER `x` / `y`
- All UI elements use `type: "component"` with a `componentType` field
- Primitives are: `box`, `text`, `line`, `arrow`, `connector`
- Text objects require `content` (not `label` or `text`)
- Arrows and connectors require `endPosition: { col, row }`

## Layout Rules

Read `references/layout-rules.md` for the complete layout constraints that the AI prompt enforces and the sanitizer corrects.

**Summary:**
- Browser container at col:0, row:0, width:80 is the outermost wrapper
- Children must fit in cols 1-78 (inside browser border)
- No overlapping: leave 1-row vertical gaps, ensure `left.col + left.width + 1 <= right.col` horizontally
- 8-12 objects per screen maximum for clean wireframes
- Bordered components need height >= 3; buttons need width >= label.length + 4

## Sanitizer

The `sanitizeWireObjects()` function in `src/lib/wiretext-mcp.ts` auto-fixes common AI generation errors:

1. **Missing position** — Defaults to `{ col: 0, row: 0 }`
2. **Width too narrow for label** — Computes `label.length + padding` per component type (button: +4, select: +5, input: +6, others: +4)
3. **Height too small for bordered components** — Forces minimum height of 3
4. **Out-of-bounds children** — Clamps `col >= 1` and shrinks width if `col + width > maxCol`
5. **Missing endPosition on arrows/connectors** — Adds a default endpoint 20 cols to the right

When modifying the sanitizer, add new fixes that address recurring MCP validation errors. Track which component types need specific width padding in the `WIDTH_PADDING` map.

## Frontend ASCII Rendering

The `MockupScreenViewer` component renders ASCII art inside a `<pre><code>` block. Critical rendering rules:

- **Font**: Use `fontFamily: "'Courier New', Courier, 'Lucida Console', monospace"` via inline style. Do NOT use Tailwind's `font-mono` class — its font stack (`ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas...`) renders box-drawing characters at inconsistent widths, causing right-edge misalignment.
- **Line height**: Use `lineHeight: 1.4` (not 1.6 — too much vertical spacing distorts the wireframe)
- **Ligatures**: Disable with `fontVariantLigatures: "none"` to prevent character merging
- **Tab size**: Set `tabSize: 4`
- **Centering**: Use `flex justify-center` on the `<pre>` and `inline-block` on the `<code>` to center the wireframe
- **Color**: Emerald-on-black (`text-emerald-400` on `bg-zinc-950`) for terminal aesthetic

## Common Issues and Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Right edges don't line up | `font-mono` uses variable-width box-drawing chars | Use explicit `Courier New` font via inline style |
| MCP error: "width too small for label" | AI generates `width: 10` for label "Submit Order" (12 chars) | Sanitizer adds padding; also enforce in AI prompt |
| Components overlap browser border | AI places child at col:0 or width extends to col:80 | Sanitizer clamps col >= 1 and shrinks width |
| Missing endPosition error | AI omits `endPosition` on arrows/connectors | Sanitizer adds default endpoint |
| Wireframe too tall / truncated | Browser height too small for content | Instruct AI to calculate browser height based on content |
| Blank screen (render failed) | MCP process crashed or timed out | Ensure `mcp.close()` is called; check npx availability |

## Workflow: Adding Wireframes to a New Project

1. Ensure `@modelcontextprotocol/sdk` is installed (`npm install @modelcontextprotocol/sdk`)
2. Create the MCP client module (see `src/lib/wiretext-mcp.ts` for reference)
3. Build the AI prompt using the schema from `references/wiretext-object-schema.md` and rules from `references/layout-rules.md`
4. Call the LLM to generate wiretext objects JSON, then pass each screen's objects through `sanitizeWireObjects()` before calling `renderScreen()`
5. Store `ascii_art` and `wiretext_url` per screen
6. Display using a viewer component that follows the font rules above
