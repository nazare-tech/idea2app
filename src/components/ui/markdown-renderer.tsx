"use client"

import React, { useEffect, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { renderMermaid } from "beautiful-mermaid"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"

interface MarkdownRendererProps {
  content: string
  className?: string
}

function MermaidDiagram({ code }: { code: string }) {
  const [svg, setSvg] = useState<string>("")
  const [error, setError] = useState<boolean>(false)
  const [isDark, setIsDark] = useState<boolean>(false)

  // Detect system theme preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setIsDark(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => setIsDark(e.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Render diagram with theme-appropriate colors
  useEffect(() => {
    const theme = isDark ? {
      bg: "#1a1a1a",
      fg: "#e5e5e5",
      line: "#6B7280",
      accent: "#EF4444",
      muted: "#2a2a2a",
      font: "ui-monospace, 'IBM Plex Mono', monospace",
    } : {
      bg: "#FFFFFF",
      fg: "#111827",
      line: "#6B7280",
      accent: "#DC2626",
      muted: "#F5F5F5",
      font: "ui-monospace, 'IBM Plex Mono', monospace",
    }

    renderMermaid(code, theme)
      .then((renderedSvg) => {
        setSvg(renderedSvg)
        setError(false)
      })
      .catch((err) => {
        console.error("Mermaid rendering error:", err)
        setError(true)
      })
  }, [code, isDark])

  if (error) {
    return (
      <div className="mermaid-wrapper my-4 p-4 bg-[#F9FAFB] dark:bg-[#1a1a1a] rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <pre className="text-sm text-gray-700 dark:text-gray-300 font-mono whitespace-pre-wrap">{code}</pre>
      </div>
    )
  }

  return (
    <div className="mermaid-wrapper my-4 p-4 bg-[#F9FAFB] dark:bg-[#1a1a1a] rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
      <div
        className="mermaid-diagram min-w-max"
        dangerouslySetInnerHTML={{ __html: svg }}
        style={{
          fontSize: '14px',
          fontFamily: 'ui-monospace, "IBM Plex Mono", monospace'
        }}
      />
    </div>
  )
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {

  const proseClasses = `
    prose prose-sm max-w-none
    [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-6 [&_h1]:text-gray-900 [&_h1]:border-b [&_h1]:border-gray-200 [&_h1]:pb-2
    [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-3 [&_h2]:mt-5 [&_h2]:text-gray-900
    [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-gray-900
    [&_h4]:text-base [&_h4]:font-semibold [&_h4]:mb-2 [&_h4]:mt-3 [&_h4]:text-gray-900
    [&_p]:text-gray-700 [&_p]:mb-3 [&_p]:leading-relaxed
    [&_ul]:my-3 [&_ul]:space-y-1 [&_ul]:pl-6
    [&_ol]:my-3 [&_ol]:space-y-1 [&_ol]:pl-6
    [&_li]:text-gray-700 [&_li]:leading-relaxed
    [&_strong]:text-gray-900 [&_strong]:font-semibold
    [&_em]:text-gray-700 [&_em]:italic
    [&_a]:text-primary [&_a]:underline [&_a]:hover:text-primary/80 [&_a]:transition-colors
    [&_code]:text-primary [&_code]:bg-[rgba(220,38,38,0.06)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono
    [&_pre]:bg-gray-50 [&_pre]:border [&_pre]:border-gray-200 [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:my-3 [&_pre]:overflow-x-auto
    [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-gray-900
    [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-500 [&_blockquote]:my-3
    [&_table]:w-full [&_table]:my-3 [&_table]:border-collapse
    [&_th]:border [&_th]:border-gray-200 [&_th]:bg-[#EFF6FF] [&_th]:px-4 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-gray-800
    [&_td]:border [&_td]:border-gray-200 [&_td]:px-4 [&_td]:py-2 [&_td]:text-gray-700
    [&_hr]:border-gray-200 [&_hr]:my-4
  `.trim()

  return (
    <div className={`${proseClasses} ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "")
            const language = match ? match[1] : ""

            // Mermaid diagram block
            if (language === "mermaid") {
              return <MermaidDiagram code={String(children).replace(/\n$/, "")} />
            }

            // Fenced code block with syntax highlighting
            if (language) {
              return (
                <SyntaxHighlighter
                  style={vscDarkPlus as Record<string, React.CSSProperties>}
                  language={language}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    borderRadius: "0.5rem",
                    background: "rgba(255,255,255,0.05)",
                  } as React.CSSProperties}
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              )
            }

            // Inline code
            return (
              <code className={className} {...props}>
                {children}
              </code>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
