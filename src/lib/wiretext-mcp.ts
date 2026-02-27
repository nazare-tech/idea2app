import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"

interface WireObject {
  type: string
  position?: { col: number; row: number }
  componentType?: string
  width?: number
  height?: number
  label?: string
  [key: string]: unknown
}

interface WiretextResult {
  ascii_art: string | null
  wiretext_url: string | null
  render_error: string | null
  create_error: string | null
}

const BORDERED_COMPONENTS = new Set([
  "button", "input", "select", "card", "browser", "table",
  "tabs", "progress", "icon", "image", "alert", "avatar",
])

// Width padding per component type (label.length + padding = minimum width)
const WIDTH_PADDING: Record<string, number> = {
  button: 4,
  select: 5,
  input: 6,
  card: 4,
  alert: 4,
  tabs: 4,
}
const DEFAULT_WIDTH_PADDING = 4

function sanitizeWireObjects(objects: WireObject[]): WireObject[] {
  // Find the browser container to determine bounds (default 80 wide)
  const browser = objects.find(
    (o) => o.type === "component" && o.componentType === "browser"
  )
  const maxCol = browser ? (browser.width || 80) - 1 : 79 // inner right edge

  return objects.map((obj) => {
    const fixed = { ...obj }

    // Ensure position exists
    if (!fixed.position) {
      fixed.position = { col: 0, row: 0 }
    }

    // Fix width for components with labels
    if (fixed.type === "component" && fixed.componentType && fixed.width != null) {
      const labelText = (fixed.label as string) || ""
      if (labelText.length > 0) {
        const padding = WIDTH_PADDING[fixed.componentType] ?? DEFAULT_WIDTH_PADDING
        const minWidth = labelText.length + padding
        if (fixed.width < minWidth) {
          fixed.width = minWidth
        }
      }
    }

    // Fix height for bordered components (minimum 3)
    if (
      fixed.type === "component" &&
      fixed.componentType &&
      BORDERED_COMPONENTS.has(fixed.componentType)
    ) {
      if (!fixed.height || (fixed.height as number) < 3) {
        fixed.height = 3
      }
    }

    // Clamp children to stay within browser bounds (skip the browser itself)
    const isBrowser = fixed.type === "component" && fixed.componentType === "browser"
    if (!isBrowser && fixed.position && fixed.width != null) {
      // Ensure col >= 1 (inside browser border)
      if (fixed.position.col < 1) {
        fixed.position = { ...fixed.position, col: 1 }
      }
      // Shrink width if it extends past the right edge
      if (fixed.position.col + fixed.width > maxCol) {
        fixed.width = maxCol - fixed.position.col
      }
    }

    // Fix missing endPosition on arrows/connectors
    if ((fixed.type === "arrow" || fixed.type === "connector") && !fixed.endPosition) {
      const pos = fixed.position || { col: 0, row: 0 }
      fixed.endPosition = { col: pos.col + 20, row: pos.row }
    }

    return fixed
  })
}

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

  async renderScreen(wireObjects: WireObject[]): Promise<WiretextResult> {
    let ascii_art: string | null = null
    let wiretext_url: string | null = null
    let render_error: string | null = null
    let create_error: string | null = null

    const sanitized = sanitizeWireObjects(wireObjects)

    try {
      const renderResult = await this.client.callTool({
        name: "render_wireframe",
        arguments: { objects: sanitized },
      })
      if (renderResult.isError) {
        const errText = Array.isArray(renderResult.content)
          ? renderResult.content.map((c: any) => c.text || "").join("")
          : "Unknown MCP error"
        render_error = errText
        console.error("[WiretextMCP] render_wireframe error:", errText)
      } else if (renderResult.content && Array.isArray(renderResult.content)) {
        const textContent = renderResult.content.find(
          (c: { type: string }) => c.type === "text"
        )
        if (textContent && "text" in textContent) {
          ascii_art = textContent.text as string
        }
      }
    } catch (err) {
      render_error = err instanceof Error ? err.message : String(err)
      console.error("[WiretextMCP] render_wireframe failed:", err)
    }

    try {
      const createResult = await this.client.callTool({
        name: "create_wireframe",
        arguments: { objects: sanitized },
      })
      if (createResult.isError) {
        const errText = Array.isArray(createResult.content)
          ? createResult.content.map((c: any) => c.text || "").join("")
          : "Unknown MCP error"
        create_error = errText
        console.error("[WiretextMCP] create_wireframe error:", errText)
      } else if (createResult.content && Array.isArray(createResult.content)) {
        const textContent = createResult.content.find(
          (c: { type: string }) => c.type === "text"
        )
        if (textContent && "text" in textContent) {
          wiretext_url = textContent.text as string
        }
      }
    } catch (err) {
      create_error = err instanceof Error ? err.message : String(err)
      console.error("[WiretextMCP] create_wireframe failed:", err)
    }

    return { ascii_art, wiretext_url, render_error, create_error }
  }

  async close(): Promise<void> {
    try {
      await this.client.close()
    } catch {
      // ignore close errors
    }
  }
}
