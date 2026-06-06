import { useMemo, useState } from "react"

import type { PromptLabConfig, PromptLabProject } from "../core/index.js"

export interface PromptLabLauncherProps {
  config: PromptLabConfig
  enabled?: boolean
}

export function PromptLabLauncher({ config, enabled = isDevelopmentRuntime() }: PromptLabLauncherProps) {
  const [open, setOpen] = useState(false)
  const artifactCount = config.artifacts.length
  const title = useMemo(() => artifactCount === 1 ? "1 artifact" : `${artifactCount} artifacts`, [artifactCount])

  if (!enabled) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={launcherStyle}
        aria-label="Open PromptLab"
      >
        PromptLab
      </button>
      {open && (
        <div style={overlayStyle} role="presentation">
          <section style={sheetStyle} role="dialog" aria-modal="true" aria-label="PromptLab">
            <header style={headerStyle}>
              <div>
                <p style={kickerStyle}>Local development</p>
                <h2 style={titleStyle}>PromptLab</h2>
                <p style={subtitleStyle}>{title}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} style={closeStyle} aria-label="Close PromptLab">
                Close
              </button>
            </header>
            <PromptLabPlaceholder config={config} />
          </section>
        </div>
      )}
    </>
  )
}

function isDevelopmentRuntime() {
  return typeof process === "undefined" || process.env?.NODE_ENV !== "production"
}

function PromptLabPlaceholder({ config }: { config: PromptLabConfig<PromptLabProject> }) {
  return (
    <div style={bodyStyle}>
      <aside style={panelStyle}>
        <h3 style={panelTitleStyle}>Artifacts</h3>
        <div style={listStyle}>
          {config.artifacts.map((artifact) => (
            <button key={artifact.id} type="button" style={artifactButtonStyle}>
              <span>{artifact.label}</span>
              <small>{artifact.outputKind}</small>
            </button>
          ))}
        </div>
      </aside>
      <main style={mainStyle}>
        <h3 style={panelTitleStyle}>Workbench</h3>
        <p style={subtitleStyle}>
          Wire project adapters, context sources, and artifact runners in your PromptLab config to enable runs.
        </p>
      </main>
    </div>
  )
}

const launcherStyle = {
  position: "fixed",
  right: 24,
  bottom: 24,
  zIndex: 50,
  border: "1px solid #111827",
  borderRadius: 999,
  background: "#111827",
  color: "#ffffff",
  padding: "10px 14px",
  font: "600 13px system-ui, sans-serif",
  boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
} as const

const overlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 60,
  background: "rgba(17,24,39,0.42)",
  padding: "32px 40px",
} as const

const sheetStyle = {
  height: "100%",
  width: "100%",
  borderRadius: 16,
  background: "#ffffff",
  color: "#111827",
  boxShadow: "0 25px 80px rgba(0,0,0,0.28)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
} as const

const headerStyle = {
  borderBottom: "1px solid #e5e7eb",
  padding: "20px 24px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
} as const

const kickerStyle = {
  margin: 0,
  color: "#6b7280",
  font: "600 11px system-ui, sans-serif",
  letterSpacing: 0,
  textTransform: "uppercase",
} as const

const titleStyle = {
  margin: "4px 0 0",
  font: "700 24px system-ui, sans-serif",
} as const

const subtitleStyle = {
  margin: "6px 0 0",
  color: "#6b7280",
  font: "400 14px/1.5 system-ui, sans-serif",
} as const

const closeStyle = {
  border: "1px solid #d1d5db",
  borderRadius: 8,
  background: "#ffffff",
  color: "#111827",
  padding: "8px 12px",
  font: "600 13px system-ui, sans-serif",
} as const

const bodyStyle = {
  flex: 1,
  minHeight: 0,
  display: "grid",
  gridTemplateColumns: "320px minmax(0,1fr)",
  gap: 0,
} as const

const panelStyle = {
  borderRight: "1px solid #e5e7eb",
  padding: 20,
  overflow: "auto",
} as const

const mainStyle = {
  padding: 20,
  overflow: "auto",
} as const

const panelTitleStyle = {
  margin: "0 0 12px",
  font: "700 14px system-ui, sans-serif",
} as const

const listStyle = {
  display: "grid",
  gap: 8,
} as const

const artifactButtonStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  background: "#f9fafb",
  color: "#111827",
  padding: 12,
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  font: "500 13px system-ui, sans-serif",
} as const
