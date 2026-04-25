import Link from "next/link"
import Script from "next/script"
import { loadTopLevelPenFrames } from "@/lib/pencil-preview"

export const dynamic = "force-static"

export default async function PencilPreviewIndexPage() {
  const frames = await loadTopLevelPenFrames()

  return (
    <>
      <Script src="https://mcp.figma.com/mcp/html-to-design/capture.js" strategy="afterInteractive" />
      <main style={{ minHeight: "100vh", background: "#f3f4f6", padding: "48px" }}>
        <div style={{ margin: "0 auto", maxWidth: "960px" }}>
          <h1 style={{ margin: 0, fontSize: "28px", fontFamily: "Hanken Grotesk, sans-serif" }}>Pencil Frame Preview</h1>
          <p style={{ margin: "8px 0 24px", color: "#4b5563", lineHeight: 1.6 }}>
            Open any top-level frame from <code>design/idea2App-design v2.pen</code> as a standalone route for Figma capture.
          </p>

          <div
            style={{
              display: "grid",
              gap: "12px",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            }}
          >
            {frames.map((frame) => (
              <Link
                key={frame.id}
                href={`/dev/pencil-preview/${frame.id}`}
                style={{
                  display: "block",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  background: "#ffffff",
                  padding: "16px",
                  color: "#111827",
                  textDecoration: "none",
                }}
              >
                <div
                  style={{
                    fontFamily: "Fira Mono, monospace",
                    fontSize: "11px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#6b7280",
                    marginBottom: "8px",
                  }}
                >
                  {frame.id}
                </div>
                <div style={{ fontWeight: 600 }}>{frame.name}</div>
                <div style={{ marginTop: "8px", fontSize: "13px", color: "#6b7280" }}>
                  {frame.width} x {frame.height}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </>
  )
}
