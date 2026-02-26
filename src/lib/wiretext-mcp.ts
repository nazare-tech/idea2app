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
