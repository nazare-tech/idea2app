"use client"

import { useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import mermaid from "mermaid"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"

interface MarkdownRendererProps {
  content: string
  className?: string
}

// Initialize mermaid
mermaid.initialize({
  startOnLoad: true,
  theme: "dark",
  themeVariables: {
    primaryColor: "#00d4ff",
    primaryTextColor: "#fff",
    primaryBorderColor: "#00d4ff",
    lineColor: "#00d4ff",
    secondaryColor: "#7c3aed",
    tertiaryColor: "#34d399",
    background: "#0c0c14",
    mainBkg: "#0c0c14",
    secondBkg: "#06060a",
    textColor: "#fff",
    fontSize: "14px",
  },
})

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  const mermaidRef = useRef<number>(0)

  useEffect(() => {
    // Render mermaid diagrams after component mounts
    mermaid.run({
      querySelector: ".mermaid",
    })
  }, [content])

  const proseClasses = `
    prose prose-invert prose-sm max-w-none
    [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-6 [&_h1]:text-foreground [&_h1]:border-b [&_h1]:border-[rgba(0,212,255,0.2)] [&_h1]:pb-2
    [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-3 [&_h2]:mt-5 [&_h2]:text-foreground
    [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-foreground
    [&_h4]:text-base [&_h4]:font-semibold [&_h4]:mb-2 [&_h4]:mt-3 [&_h4]:text-foreground
    [&_p]:text-foreground [&_p]:mb-3 [&_p]:leading-relaxed
    [&_ul]:my-3 [&_ul]:space-y-1 [&_ul]:pl-6
    [&_ol]:my-3 [&_ol]:space-y-1 [&_ol]:pl-6
    [&_li]:text-foreground [&_li]:leading-relaxed
    [&_strong]:text-foreground [&_strong]:font-semibold
    [&_em]:text-foreground [&_em]:italic
    [&_a]:text-[#00d4ff] [&_a]:underline [&_a]:hover:text-[#00b8e6] [&_a]:transition-colors
    [&_code]:text-[#00d4ff] [&_code]:bg-[rgba(0,212,255,0.08)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono
    [&_pre]:bg-[rgba(255,255,255,0.05)] [&_pre]:border [&_pre]:border-[rgba(255,255,255,0.1)] [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:my-3 [&_pre]:overflow-x-auto
    [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-foreground
    [&_blockquote]:border-l-4 [&_blockquote]:border-[#00d4ff] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:my-3
    [&_table]:w-full [&_table]:my-3 [&_table]:border-collapse
    [&_th]:border [&_th]:border-[rgba(255,255,255,0.1)] [&_th]:bg-[rgba(0,212,255,0.1)] [&_th]:px-4 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold
    [&_td]:border [&_td]:border-[rgba(255,255,255,0.1)] [&_td]:px-4 [&_td]:py-2
    [&_hr]:border-[rgba(255,255,255,0.1)] [&_hr]:my-4
  `.trim()

  return (
    <div className={`${proseClasses} ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "")
            const language = match ? match[1] : ""

            // Check if this is a mermaid diagram
            if (language === "mermaid" && !inline) {
              const code = String(children).replace(/\n$/, "")
              const id = `mermaid-${mermaidRef.current++}`

              return (
                <div className="mermaid-wrapper my-4 p-4 bg-[rgba(0,0,0,0.3)] rounded-lg border border-[rgba(0,212,255,0.2)] overflow-x-auto">
                  <div className="mermaid" id={id}>
                    {code}
                  </div>
                </div>
              )
            }

            // Code block with syntax highlighting
            if (!inline && language) {
              return (
                <SyntaxHighlighter
                  style={vscDarkPlus}
                  language={language}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    borderRadius: "0.5rem",
                    background: "rgba(255,255,255,0.05)",
                  }}
                  {...props}
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
