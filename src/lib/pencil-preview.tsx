import { readFile } from "node:fs/promises"
import path from "node:path"
import * as LucideIcons from "lucide-react"
import type { CSSProperties, ReactNode } from "react"

export type PenDimension = number | string | null | undefined

type PenThickness = number | { top?: number; right?: number; bottom?: number; left?: number }

export type PenStroke = {
  align?: "inside" | "center" | "outside"
  thickness?: PenThickness
  fill?: string
}

export type PenNode = {
  id?: string
  type?: string
  name?: string | null
  x?: number | null
  y?: number | null
  width?: PenDimension
  height?: PenDimension
  fill?: string | null
  opacity?: number | null
  cornerRadius?: number | null
  padding?: number | number[] | null
  gap?: number | null
  layout?: "horizontal" | "vertical" | "none" | null
  justifyContent?: "center" | "space_between" | "end" | null
  alignItems?: "center" | "end" | null
  stroke?: PenStroke | null
  content?: string | null
  fontFamily?: string | null
  fontSize?: number | null
  fontWeight?: number | string | null
  letterSpacing?: number | null
  lineHeight?: number | null
  textAlign?: "left" | "center" | "right" | null
  textGrowth?: "fixed-width" | string | null
  iconFontFamily?: string | null
  iconFontName?: string | null
  children?: PenNode[]
}

type PenDocument = {
  children?: PenNode[]
}

function isFrameLike(node: PenNode): boolean {
  return node.type === "frame" || node.type === "group" || node.type === "rectangle" || node.type === "ellipse"
}

function parseFillContainer(value: string): number | null {
  const match = value.match(/^fill_container\((\d+)\)$/)
  return match ? Number(match[1]) : null
}

function isFillContainer(value: PenDimension): boolean {
  return typeof value === "string" && value.startsWith("fill_container")
}

function normalizeWeight(weight: PenNode["fontWeight"]): CSSProperties["fontWeight"] {
  if (typeof weight === "number") return weight
  if (typeof weight === "string") {
    if (weight === "normal") return 400
    const parsed = Number(weight)
    return Number.isFinite(parsed) ? parsed : 400
  }
  return 400
}

function normalizeJustify(value: PenNode["justifyContent"]): CSSProperties["justifyContent"] {
  if (value === "space_between") return "space-between"
  if (value === "end") return "flex-end"
  if (value === "center") return "center"
  return undefined
}

function normalizeAlign(value: PenNode["alignItems"]): CSSProperties["alignItems"] {
  if (value === "end") return "flex-end"
  if (value === "center") return "center"
  return undefined
}

function paddingStyle(padding: PenNode["padding"]): CSSProperties["padding"] {
  if (typeof padding === "number") return `${padding}px`
  if (!Array.isArray(padding)) return undefined
  if (padding.length === 2) return `${padding[0]}px ${padding[1]}px`
  if (padding.length === 4) return `${padding[0]}px ${padding[1]}px ${padding[2]}px ${padding[3]}px`
  return undefined
}

function getStrokeStyle(stroke: PenStroke | null | undefined): CSSProperties {
  if (!stroke?.fill || stroke.thickness == null) return {}
  if (typeof stroke.thickness === "number") {
    return { border: `${stroke.thickness}px solid ${stroke.fill}` }
  }

  return {
    borderTop: stroke.thickness.top ? `${stroke.thickness.top}px solid ${stroke.fill}` : undefined,
    borderRight: stroke.thickness.right ? `${stroke.thickness.right}px solid ${stroke.fill}` : undefined,
    borderBottom: stroke.thickness.bottom ? `${stroke.thickness.bottom}px solid ${stroke.fill}` : undefined,
    borderLeft: stroke.thickness.left ? `${stroke.thickness.left}px solid ${stroke.fill}` : undefined,
  }
}

function inferLayout(node: PenNode): "horizontal" | "vertical" | "none" {
  if (node.layout === "horizontal" || node.layout === "vertical") return node.layout
  const children = node.children ?? []
  if (children.length === 0) return "none"
  if (children.some((child) => typeof child.x === "number" || typeof child.y === "number")) return "none"

  const widthFillCount = children.filter((child) => isFillContainer(child.width)).length
  const heightFillCount = children.filter((child) => isFillContainer(child.height)).length
  const fixedWidthCount = children.filter(
    (child) => typeof child.width === "number" || parseFillContainer(String(child.width ?? "")) != null
  ).length
  const fixedHeightCount = children.filter(
    (child) => typeof child.height === "number" || parseFillContainer(String(child.height ?? "")) != null
  ).length

  if (heightFillCount > 0 && (fixedWidthCount > 0 || widthFillCount > 0)) return "horizontal"
  if (widthFillCount > 0 && (fixedHeightCount > 0 || heightFillCount > 0)) return "vertical"
  if ((node.justifyContent || node.alignItems) && children.length <= 4) return "horizontal"

  return "vertical"
}

function sizeStyle(
  value: PenDimension,
  axis: "width" | "height",
  parentLayout: "horizontal" | "vertical" | "none"
): CSSProperties {
  if (typeof value === "number") return { [axis]: `${value}px` }
  if (typeof value !== "string") return {}
  if (value === "fill_container") {
    if (parentLayout === "horizontal" && axis === "width") return { flex: 1, minWidth: 0 }
    if (parentLayout === "vertical" && axis === "height") return { flex: 1, minHeight: 0 }
    return { [axis]: "100%" }
  }

  const parsedFill = parseFillContainer(value)
  if (parsedFill !== null) return { [axis]: `${parsedFill}px` }
  return {}
}

function getLucideIcon(name: string | null | undefined) {
  if (!name) return LucideIcons.Square
  const pascalName = name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")
  const icon = (LucideIcons as unknown as Record<string, typeof LucideIcons.Square>)[pascalName]
  return icon ?? LucideIcons.Square
}

function getNodeStyle(node: PenNode, parentLayout: "horizontal" | "vertical" | "none"): CSSProperties {
  const resolvedLayout = inferLayout(node)
  const shouldAbsolutePosition =
    parentLayout === "none" && (typeof node.x === "number" || typeof node.y === "number")

  const base: CSSProperties = {
    boxSizing: "border-box",
    position: shouldAbsolutePosition ? "absolute" : "relative",
    left: shouldAbsolutePosition && typeof node.x === "number" ? `${node.x}px` : undefined,
    top: shouldAbsolutePosition && typeof node.y === "number" ? `${node.y}px` : undefined,
    background: node.type === "group" ? "transparent" : (node.fill ?? "transparent"),
    opacity: node.opacity ?? 1,
    borderRadius: node.type === "ellipse" ? "9999px" : node.cornerRadius ? `${node.cornerRadius}px` : undefined,
    overflow: "hidden",
    ...getStrokeStyle(node.stroke),
    ...sizeStyle(node.width, "width", parentLayout),
    ...sizeStyle(node.height, "height", parentLayout),
  }

  if (resolvedLayout !== "none") {
    base.display = "flex"
    base.flexDirection = resolvedLayout === "horizontal" ? "row" : "column"
    base.gap = node.gap ?? 0
    base.padding = paddingStyle(node.padding)
    base.justifyContent = normalizeJustify(node.justifyContent)
    base.alignItems = normalizeAlign(node.alignItems) ?? "stretch"
  }

  return base
}

function renderNode(node: PenNode, parentLayout: "horizontal" | "vertical" | "none"): ReactNode {
  if (node.type === "text") {
    const widthStyle =
      node.textGrowth === "fixed-width" && node.width != null
        ? sizeStyle(node.width, "width", parentLayout)
        : {}

    const style: CSSProperties = {
      ...getNodeStyle(node, parentLayout),
      ...widthStyle,
      color: node.fill ?? "#111111",
      fontFamily: node.fontFamily ?? "Inter, sans-serif",
      fontSize: node.fontSize ? `${node.fontSize}px` : undefined,
      fontWeight: normalizeWeight(node.fontWeight),
      letterSpacing: node.letterSpacing != null ? `${node.letterSpacing}px` : undefined,
      lineHeight: node.lineHeight != null ? `${node.lineHeight}px` : undefined,
      textAlign: node.textAlign ?? undefined,
      background: "transparent",
      display: "block",
      overflow: "visible",
      whiteSpace: "pre-wrap",
      minWidth: 0,
    }

    return (
      <div key={node.id ?? `${node.type}-${node.name}`} style={style}>
        {node.content ?? ""}
      </div>
    )
  }

  if (node.type === "icon_font") {
    const Icon = getLucideIcon(node.iconFontName)
    const boxSize = typeof node.width === "number" ? node.width : 18
    const style: CSSProperties = {
      ...getNodeStyle(node, parentLayout),
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: node.fill ?? "#111111",
      background: "transparent",
      width: `${boxSize}px`,
      height: `${typeof node.height === "number" ? node.height : boxSize}px`,
      flex: "0 0 auto",
    }

    return (
      <div key={node.id ?? `${node.type}-${node.name}`} style={style}>
        <Icon size={boxSize} strokeWidth={2} />
      </div>
    )
  }

  if (!isFrameLike(node)) return null
  const resolvedLayout = inferLayout(node)
  const style = getNodeStyle(node, parentLayout)

  return (
    <div key={node.id ?? `${node.type}-${node.name}`} style={style}>
      {(node.children ?? []).map((child) => renderNode(child, resolvedLayout))}
    </div>
  )
}

export async function loadPenDocument() {
  const filePath = path.join(process.cwd(), "design", "idea2App-design v2.pen")
  const raw = await readFile(filePath, "utf8")
  return JSON.parse(raw) as PenDocument
}

export async function loadTopLevelPenFrames() {
  const doc = await loadPenDocument()
  return (doc.children ?? []).filter(
    (node) => node.type === "frame" && typeof node.width === "number"
  )
}

export function PencilFrameView({ frame }: { frame: PenNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        padding: "48px",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div
        style={{
          margin: "0 auto",
          width: typeof frame.width === "number" ? `${frame.width}px` : "1440px",
        }}
      >
        <div
          style={{
            marginBottom: "16px",
            fontFamily: "Fira Mono, monospace",
            fontSize: "12px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#6b7280",
          }}
        >
          {frame.name}
        </div>
        {renderNode(frame, "vertical")}
      </div>
    </div>
  )
}
