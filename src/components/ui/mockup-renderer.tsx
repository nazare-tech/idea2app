"use client"

import React from "react"

interface MockupRendererProps {
  content: string
  className?: string
}

interface Section {
  type: "header" | "code" | "text"
  content: string
  level?: number
}

/**
 * Parses mockup markdown content into structured sections.
 * Handles code fences, headers, and auto-detects unfenced ASCII art.
 */
function parseMockupContent(raw: string): Section[] {
  const lines = raw.split("\n")
  const sections: Section[] = []
  let inCodeFence = false
  let codeBlock: string[] = []
  let textBlock: string[] = []

  const hasBoxChars = (line: string) =>
    /[┌┐└┘├┤┬┴┼─│═║╔╗╚╝╠╣╦╩╬]/.test(line)

  const isAsciiArtLine = (line: string) => {
    const t = line.trim()
    if (!t) return false
    return (
      hasBoxChars(t) ||
      /^\+[-+]+\+$/.test(t) ||
      (/^\|/.test(t) && /\|$/.test(t))
    )
  }

  const flushText = () => {
    if (textBlock.length === 0) return
    const text = textBlock.join("\n").trim()
    if (text) {
      sections.push({ type: "text", content: text })
    }
    textBlock = []
  }

  const flushCode = () => {
    if (codeBlock.length === 0) return
    // Trim trailing empty lines
    while (codeBlock.length > 0 && !codeBlock[codeBlock.length - 1].trim()) {
      codeBlock.pop()
    }
    if (codeBlock.length > 0) {
      sections.push({ type: "code", content: codeBlock.join("\n") })
    }
    codeBlock = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Handle code fences
    if (trimmed.startsWith("```")) {
      if (inCodeFence) {
        flushCode()
        inCodeFence = false
      } else {
        flushText()
        inCodeFence = true
      }
      continue
    }

    if (inCodeFence) {
      codeBlock.push(line)
      continue
    }

    // Detect markdown headers
    const headerMatch = trimmed.match(/^(#{1,6})\s+(.+)$/)
    if (headerMatch) {
      flushText()
      flushCode()
      sections.push({
        type: "header",
        content: headerMatch[2],
        level: headerMatch[1].length,
      })
      continue
    }

    // Detect ASCII art lines (not inside code fences)
    if (isAsciiArtLine(line)) {
      flushText()
      codeBlock.push(line)
      continue
    }

    // If we're accumulating ASCII art (unfenced), handle continuation
    if (codeBlock.length > 0) {
      if (!trimmed) {
        // Blank line: check if more art follows within next few lines
        let moreArt = false
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
          if (isAsciiArtLine(lines[j])) {
            moreArt = true
            break
          }
          if (lines[j].trim().match(/^#{1,6}\s/)) break
        }
        if (moreArt) {
          codeBlock.push(line)
        } else {
          flushCode()
          textBlock.push(line)
        }
      } else {
        // Non-empty, non-art line while in art block — check if it's a label within art
        let moreArt = false
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          if (isAsciiArtLine(lines[j])) {
            moreArt = true
            break
          }
          if (lines[j].trim().match(/^#{1,6}\s/)) break
        }
        if (moreArt) {
          codeBlock.push(line) // label within ASCII art
        } else {
          flushCode()
          textBlock.push(line)
        }
      }
      continue
    }

    // Regular text line
    textBlock.push(line)
  }

  // Flush remaining content
  flushText()
  flushCode()

  return sections
}

/**
 * Renders mockup content (ASCII art wireframes) without ReactMarkdown.
 * Completely bypasses markdown parsing to prevent box-drawing characters
 * from being misinterpreted as table syntax.
 */
export function MockupRenderer({ content, className = "" }: MockupRendererProps) {
  const sections = React.useMemo(() => parseMockupContent(content), [content])

  return (
    <div className={`space-y-5 ${className}`}>
      {sections.map((section, i) => {
        switch (section.type) {
          case "header": {
            const level = Math.min(section.level || 2, 6)
            const sizeClass =
              level === 1
                ? "text-2xl font-bold"
                : level === 2
                  ? "text-xl font-bold"
                  : level === 3
                    ? "text-lg font-semibold"
                    : "text-base font-semibold"
            return (
              <div key={i} className={`${sizeClass} text-foreground pt-2`}>
                {section.content}
              </div>
            )
          }
          case "code":
            return (
              <pre
                key={i}
                className="bg-zinc-950 border border-zinc-800 rounded-lg p-5 overflow-x-auto"
              >
                <code className="font-mono text-[13px] leading-[1.6] text-emerald-400 whitespace-pre block">
                  {section.content}
                </code>
              </pre>
            )
          case "text":
            return (
              <p
                key={i}
                className="text-sm text-muted-foreground leading-relaxed"
              >
                {section.content}
              </p>
            )
          default:
            return null
        }
      })}
    </div>
  )
}
