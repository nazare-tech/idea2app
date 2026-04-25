"use client"

import React, { useEffect, useState, useRef, useMemo, useCallback, useSyncExternalStore } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { renderMermaid } from "beautiful-mermaid"
import { Maximize2, Minimize2, RotateCcw } from "lucide-react"

interface LazySyntaxHighlighterModule {
  Highlighter: React.ComponentType<{
    language: string
    style: Record<string, React.CSSProperties>
    PreTag: string
    customStyle: React.CSSProperties
    children: React.ReactNode
  }>
  style: Record<string, React.CSSProperties>
}

let syntaxHighlighterLoadPromise: Promise<LazySyntaxHighlighterModule> | null = null

function loadSyntaxHighlighterModule(): Promise<LazySyntaxHighlighterModule> {
  if (!syntaxHighlighterLoadPromise) {
    syntaxHighlighterLoadPromise = Promise.all([
      import("react-syntax-highlighter"),
      import("react-syntax-highlighter/dist/esm/styles/prism"),
    ]).then(([highlighterModule, styleModule]) => ({
      Highlighter: highlighterModule.Prism as React.ComponentType<{
        language: string
        style: Record<string, React.CSSProperties>
        PreTag: string
        customStyle: React.CSSProperties
        children: React.ReactNode
      }>,
      style: styleModule.vscDarkPlus as Record<string, React.CSSProperties>,
    }))
  }

  return syntaxHighlighterLoadPromise
}

function LazySyntaxHighlighter({
  language,
  code,
}: {
  language: string
  code: string
}) {
  const [module, setModule] = useState<LazySyntaxHighlighterModule | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    let isMounted = true
    loadSyntaxHighlighterModule()
      .then((loadedModule) => {
        if (isMounted) {
          setModule(loadedModule)
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoadFailed(true)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  if (loadFailed) {
    return (
      <pre className="ui-overflow-x-auto ui-p-4 ui-bg-[#0F172A] ui-rounded-lg">
        <code>{code}</code>
      </pre>
    )
  }

  if (!module) {
    return (
      <pre className="ui-overflow-x-auto ui-p-4 ui-bg-[#0F172A] ui-rounded-lg">
        <code>{code}</code>
      </pre>
    )
  }

  return (
    <module.Highlighter
      style={module.style}
      language={language}
      PreTag="div"
      customStyle={{
        margin: 0,
        borderRadius: "0.5rem",
        background: "rgba(255,255,255,0.05)",
      } as React.CSSProperties}
    >
      {code}
    </module.Highlighter>
  )
}

interface MarkdownRendererProps {
  content: string
  className?: string
  projectId?: string
  /** Disable remarkGfm (tables, etc.) — useful for ASCII art content where │ gets misinterpreted as table syntax */
  disableGfm?: boolean
}

function MermaidDiagram({ code }: { code: string }) {
  const [svg, setSvg] = useState<string>("")
  const [error, setError] = useState<boolean>(false)
  // Detect system theme preference using useSyncExternalStore to avoid effect synchronization issues
  const isDark = useSyncExternalStore(
    useCallback((callback) => {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', callback)
      return () => mediaQuery.removeEventListener('change', callback)
    }, []),
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
    () => false // Server snapshot
  )
  const [isExpanded, setIsExpanded] = useState<boolean>(false)

  // Zoom and pan state for expanded view
  const [zoom, setZoom] = useState<number>(100)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState<boolean>(false)
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const diagramContainerRef = useRef<HTMLDivElement>(null)

  // Render diagram with theme-appropriate colors
  useEffect(() => {
    const theme = isDark ? {
      bg: "var(--sidebar-bg)",
      fg: "var(--sidebar-foreground)",
      line: "var(--sidebar-muted)",
      accent: "var(--primary)",
      muted: "var(--sidebar-active)",
      font: "ui-monospace, 'IBM Plex Mono', monospace",
    } : {
      bg: "var(--card)",
      fg: "var(--text-primary)",
      line: "var(--text-muted)",
      accent: "var(--primary)",
      muted: "var(--muted)",
      font: "ui-monospace, 'IBM Plex Mono', monospace",
    }

    renderMermaid(code, theme)
      .then((renderedSvg) => {
        setSvg(renderedSvg)
        setError(false)
      })
      .catch(() => {
        setError(true)
      })
  }, [code, isDark])

  // Close modal on Escape key
  useEffect(() => {
    if (!isExpanded) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExpanded(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isExpanded])

  // Prevent body scroll when modal is open and reset zoom/pan
  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = 'hidden'
      // Reset zoom and pan when opening (intentional state reset on modal open)
      /* eslint-disable react-hooks/set-state-in-effect */
      setZoom(100)
      setPan({ x: 0, y: 0 })
      /* eslint-enable react-hooks/set-state-in-effect */
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isExpanded])

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 10, 200))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 10, 50))
  }, [])

  // Pan handlers for middle mouse button
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) { // Middle mouse button
      e.preventDefault()
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }, [pan])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      })
    }
  }, [isPanning, panStart])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  // Pan handlers for trackpad - free 2D panning without modifiers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Check if this is a horizontal scroll (deltaX) or vertical scroll (deltaY)
    // Allow both to enable free 2D panning
    if (Math.abs(e.deltaX) > 0 || Math.abs(e.deltaY) > 0) {
      e.preventDefault()
      setPan((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }))
    }
  }, [])

  // Reset zoom and pan to defaults
  const handleReset = useCallback(() => {
    setZoom(100)
    setPan({ x: 0, y: 0 })
  }, [])

  if (error) {
    return (
      <div className="mermaid-wrapper my-4 ui-p-4 rounded-lg border border-border-subtle bg-muted/60 overflow-x-auto">
        <pre className="text-sm text-text-secondary ui-font-mono whitespace-pre-wrap">{code}</pre>
      </div>
    )
  }

  return (
    <>
      {/* Compact view - fits within document width */}
      <div className="mermaid-wrapper my-4 ui-p-4 rounded-lg border border-border-subtle bg-muted/60 relative group">
        <div
          className="mermaid-diagram w-full overflow-hidden"
          dangerouslySetInnerHTML={{ __html: svg }}
          style={{
            fontSize: '14px',
            fontFamily: 'ui-monospace, "IBM Plex Mono", monospace',
          }}
        />

        {/* Expand button - bottom right */}
        <button
          onClick={() => setIsExpanded(true)}
          className="absolute bottom-2 right-2 rounded-md border border-border-subtle bg-card p-2 opacity-0 transition-[background-color,border-color,opacity] duration-200 group-hover:opacity-100 hover:bg-muted focus-visible:opacity-100"
          title="Expand diagram"
          aria-label="Expand diagram"
        >
          <Maximize2 className="w-4 h-4 text-text-secondary" />
        </button>
      </div>

      {/* Expanded modal view */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="relative w-[calc(100vw-4rem)] h-[calc(100vh-4rem)] rounded-lg border border-border-subtle bg-card shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setIsExpanded(false)}
              className="absolute top-4 right-4 p-2 rounded-md bg-muted border border-border-subtle hover:bg-secondary transition-colors z-10"
              title="Close (Esc)"
              aria-label="Close expanded view"
            >
              <Minimize2 className="w-5 h-5 text-text-secondary" />
            </button>

            {/* Expanded diagram with pan and zoom */}
            <div
              ref={diagramContainerRef}
              className="flex items-center justify-center w-full h-full overflow-hidden"
              style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
            >
              <div
                className="mermaid-diagram"
                dangerouslySetInnerHTML={{ __html: svg }}
                style={{
                  fontSize: '20px',
                  fontFamily: 'ui-monospace, "IBM Plex Mono", monospace',
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
                  transformOrigin: 'center center',
                  transition: isPanning ? 'none' : 'transform 0.1s ease-out',
                }}
              />
            </div>

            {/* Zoom controls - bottom center */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 ui-row-gap-2 bg-card border border-border-subtle rounded-lg shadow-lg ui-px-3 ui-py-2 z-10">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 50}
                className="p-1.5 rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Zoom out"
                aria-label="Zoom out"
              >
                <span className="text-lg ui-font-semibold text-text-secondary">−</span>
              </button>

              <span className="min-w-[3.5rem] text-center text-sm ui-font-medium text-text-secondary">
                {zoom}%
              </span>

              <button
                onClick={handleZoomIn}
                disabled={zoom >= 200}
                className="p-1.5 rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Zoom in"
                aria-label="Zoom in"
              >
                <span className="text-lg ui-font-semibold text-text-secondary">+</span>
              </button>

              {/* Divider */}
              <div className="w-px h-6 bg-border-subtle mx-1" />

              {/* Reset button */}
              <button
                onClick={handleReset}
                className="p-1.5 rounded hover:bg-muted transition-colors"
                title="Reset view"
                aria-label="Reset zoom and pan"
              >
                <RotateCcw className="w-4 h-4 text-text-secondary" />
              </button>
            </div>

            {/* Pan instruction hint */}
            <div className="absolute top-4 left-4 text-xs text-text-muted bg-card/90 px-2 py-1 rounded">
              Middle-click or trackpad scroll to pan • Reset button to center
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export function MarkdownRenderer({
  content,
  className = "",
  disableGfm = false,
}: MarkdownRendererProps) {
  const proseClasses = `
    prose max-w-none text-[14px]
    [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-6 [&_h1]:text-text-primary [&_h1]:border-b [&_h1]:border-border-subtle [&_h1]:pb-2
    [&_h2]:text-xl [&_h2]:ui-font-semibold [&_h2]:mb-3 [&_h2]:mt-5 [&_h2]:text-text-primary
    [&_h3]:text-lg [&_h3]:ui-font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-text-primary
    [&_h4]:text-base [&_h4]:ui-font-semibold [&_h4]:mb-2 [&_h4]:mt-3 [&_h4]:text-text-primary
    [&_p]:text-[14px] [&_p]:text-text-secondary [&_p]:mb-3 [&_p]:leading-relaxed
    [&_ul]:my-3 [&_ul]:space-y-1 [&_ul]:pl-6
    [&_ol]:my-3 [&_ol]:space-y-1 [&_ol]:pl-6
    [&_li]:text-[14px] [&_li]:text-text-secondary [&_li]:leading-relaxed
    [&_strong]:text-text-primary [&_strong]:ui-font-semibold
    [&_em]:text-text-secondary [&_em]:italic
    [&_a]:text-primary [&_a]:underline [&_a]:hover:text-primary/80 [&_a]:transition-colors
    [&_code]:text-primary [&_code]:bg-[rgba(220,38,38,0.06)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[14px] [&_code]:ui-font-mono
    [&_pre]:bg-muted/60 [&_pre]:border [&_pre]:border-border-subtle [&_pre]:rounded-lg [&_pre]:ui-p-4 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:ui-font-mono
    [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-text-primary [&_pre_code]:ui-font-mono [&_pre_code]:whitespace-pre [&_pre_code]:text-[14px] [&_pre_code]:leading-relaxed
    [&_blockquote]:border [&_blockquote]:border-border-subtle [&_blockquote]:bg-muted/40 [&_blockquote]:rounded-md [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:italic [&_blockquote]:text-[14px] [&_blockquote]:text-text-secondary [&_blockquote]:my-3
    [&_table]:w-full [&_table]:my-3 [&_table]:border-collapse
    [&_th]:border [&_th]:border-border-subtle [&_th]:bg-muted [&_th]:ui-px-4 [&_th]:ui-py-2 [&_th]:text-left [&_th]:ui-font-semibold [&_th]:text-text-primary
    [&_td]:border [&_td]:border-border-subtle [&_td]:ui-px-4 [&_td]:ui-py-2 [&_td]:text-[14px] [&_td]:text-text-secondary
    [&_hr]:border-border-subtle [&_hr]:my-4
  `.trim()

  // Custom code component for syntax highlighting and mermaid diagrams
  const components = useMemo(() => ({
    code: ({ className, children, ...props }: { className?: string; children?: React.ReactNode }) => {
      const match = /language-(\w+)/.exec(className || "")
      const language = match ? match[1] : ""

      if (language === "mermaid") {
        return <MermaidDiagram code={String(children).replace(/\n$/, "")} />
      }

      if (language) {
        return (
          <LazySyntaxHighlighter
            language={language}
            code={String(children).replace(/\n$/, "")}
          />
        )
      }

      return <code className={className} {...props}>{children}</code>
    },
  }), [])

  return (
    <div className={`${proseClasses} ${className}`}>
      <ReactMarkdown
        remarkPlugins={disableGfm ? [] : [remarkGfm]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
