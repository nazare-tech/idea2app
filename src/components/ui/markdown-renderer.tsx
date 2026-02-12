"use client"

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { renderMermaid } from "beautiful-mermaid"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"
import { Check, X } from "lucide-react"
import { SelectionToolbar } from "./selection-toolbar"
import { InlineAiEditor } from "./inline-ai-editor"

// Unique marker for inline diff - use something very unlikely to appear in content
const DIFF_MARKER = "\u200B___INLINE_DIFF_MARKER___\u200B"

interface MarkdownRendererProps {
  content: string
  className?: string
  projectId?: string
  enableInlineEditing?: boolean
  onContentUpdate?: (newContent: string) => void
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

export function MarkdownRenderer({
  content,
  className = "",
  projectId,
  enableInlineEditing = false,
  onContentUpdate,
}: MarkdownRendererProps) {
  const [selection, setSelection] = useState<{
    text: string
    position: { top: number; left: number; width: number }
  } | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  // Store editor data separately so it persists when browser selection changes
  const [editorData, setEditorData] = useState<{
    text: string
    position: { top: number; left: number }
  } | null>(null)
  // Store pending edit for inline diff display
  const [pendingEdit, setPendingEdit] = useState<{
    originalText: string
    suggestedText: string
  } | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  // Track if editing just completed (to prevent immediate re-selection)
  const editingJustCompletedRef = useRef(false)
  // Cooldown timer ref
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Only check selection on mouseup - no interference during selection
  useEffect(() => {
    if (!enableInlineEditing) return

    const handleMouseUp = () => {
      // Don't check if editing UI is active
      if (editingJustCompletedRef.current) {
        return
      }

      // Use requestAnimationFrame to ensure browser has finalized selection
      requestAnimationFrame(() => {
        const sel = window.getSelection()

        // No selection or collapsed selection
        if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
          setSelection(null)
          return
        }

        const selectedText = sel.toString().trim()
        if (!selectedText) {
          setSelection(null)
          return
        }

        // Check if selection is within our content
        const range = sel.getRangeAt(0)
        const contentEl = contentRef.current
        if (!contentEl) {
          setSelection(null)
          return
        }

        // Verify selection is in our content area
        if (!contentEl.contains(range.startContainer) && !contentEl.contains(range.endContainer)) {
          setSelection(null)
          return
        }

        const rect = range.getBoundingClientRect()

        setSelection({
          text: selectedText,
          position: {
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
          },
        })
      })
    }

    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [enableInlineEditing])

  // Cleanup cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current)
      }
    }
  }, [])

  const handleEditClick = useCallback(() => {
    if (!selection) return
    // Store the selection data for the editor before showing it
    setEditorData({
      text: selection.text,
      position: {
        top: selection.position.top + 100,
        left: selection.position.left + selection.position.width / 2,
      },
    })
    setShowEditor(true)
    // Clear the selection state to hide the toolbar
    setSelection(null)
  }, [selection])

  // Called when AI generates a suggestion - show diff inline
  const handleSuggestionReady = useCallback((suggestedText: string) => {
    if (!editorData) return

    const originalText = editorData.text

    // Check if the original text exists in the content
    // If not found, keep popup open to show its own diff view
    if (!content.includes(originalText)) {
      return
    }

    // Store the pending edit for inline display
    setPendingEdit({
      originalText,
      suggestedText,
    })

    // Close the editor popup (diff will show inline)
    setShowEditor(false)
    setSelection(null)
    window.getSelection()?.removeAllRanges()
  }, [editorData, content])

  // Helper to clear all editing state with cooldown
  const clearEditingState = useCallback(() => {
    // Set cooldown flag to prevent immediate re-selection
    editingJustCompletedRef.current = true

    // Clear browser selection
    window.getSelection()?.removeAllRanges()

    // Clear all state
    setSelection(null)
    setEditorData(null)
    setPendingEdit(null)
    setShowEditor(false)

    // Clear any existing cooldown timer
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current)
    }

    // Remove cooldown after a short delay
    cooldownTimerRef.current = setTimeout(() => {
      editingJustCompletedRef.current = false
    }, 150)
  }, [])

  // Accept the inline diff
  const handleAcceptEdit = useCallback(() => {
    if (!pendingEdit || !onContentUpdate) return

    // Replace the original text with the suggested text
    const updatedContent = content.replace(pendingEdit.originalText, pendingEdit.suggestedText)

    // Clear all editing state with cooldown
    clearEditingState()

    // Then trigger the content update
    onContentUpdate(updatedContent)
  }, [pendingEdit, content, onContentUpdate, clearEditingState])

  // Reject the inline diff
  const handleRejectEdit = useCallback(() => {
    clearEditingState()
  }, [clearEditingState])

  // Handler for direct apply from popup (when user clicks Apply in popup)
  const handleApplyEdit = useCallback((newText: string) => {
    if (!editorData) {
      console.error("[InlineEdit] No editorData available")
      return
    }
    if (!onContentUpdate) {
      console.error("[InlineEdit] No onContentUpdate callback provided")
      return
    }

    const selectedText = editorData.text

    // Try to find and replace the selected text
    let updatedContent: string

    if (content.includes(selectedText)) {
      // Direct match found - simple case
      updatedContent = content.replace(selectedText, newText)
    } else {
      // No direct match - the selected text from rendered HTML differs from markdown source
      // This happens when selection spans markdown formatting (bullets, bold, etc.)
      // Use word-based matching to find the span in the original content

      const selectedWords = selectedText
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .filter(w => w.length >= 3)

      if (selectedWords.length >= 2) {
        const firstWord = selectedWords[0]
        const secondWord = selectedWords[1]
        const lastWord = selectedWords[selectedWords.length - 1]
        const secondLastWord = selectedWords.length > 2 ? selectedWords[selectedWords.length - 2] : null

        // Find where the first word appears in content
        let startIdx = -1
        let searchPos = 0

        while ((startIdx = content.indexOf(firstWord, searchPos)) !== -1) {
          const afterFirst = content.substring(startIdx + firstWord.length, startIdx + firstWord.length + 100)
          if (afterFirst.includes(secondWord)) {
            break
          }
          searchPos = startIdx + 1
        }

        if (startIdx !== -1) {
          let endIdx = -1
          let lastWordSearchPos = startIdx
          let lastWordIdx = -1

          while ((lastWordIdx = content.indexOf(lastWord, lastWordSearchPos)) !== -1) {
            if (lastWordIdx > startIdx + 5000) break

            if (secondLastWord) {
              const beforeLast = content.substring(Math.max(startIdx, lastWordIdx - 200), lastWordIdx)
              if (beforeLast.includes(secondLastWord)) {
                endIdx = lastWordIdx + lastWord.length
              }
            } else {
              endIdx = lastWordIdx + lastWord.length
            }

            lastWordSearchPos = lastWordIdx + 1
          }

          if (endIdx !== -1 && endIdx > startIdx) {
            updatedContent = content.substring(0, startIdx) + newText + content.substring(endIdx)
          } else {
            updatedContent = content
          }
        } else {
          updatedContent = content
        }
      } else {
        updatedContent = content
      }
    }

    // Clear all editing state with cooldown
    clearEditingState()

    onContentUpdate(updatedContent)
  }, [editorData, content, onContentUpdate, clearEditingState])

  const handleCancelEdit = useCallback(() => {
    clearEditingState()
  }, [clearEditingState])

  // Create content with inline diff marker when there's a pending edit
  const displayContent = useMemo(() => {
    if (!pendingEdit) return content
    // Replace the original text with a marker that we'll render as the diff
    return content.replace(pendingEdit.originalText, DIFF_MARKER)
  }, [content, pendingEdit])

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

  // Custom renderer for text nodes to handle diff markers
  const renderTextWithDiff = useCallback((text: string) => {
    if (!pendingEdit || !text.includes(DIFF_MARKER)) {
      return text
    }

    const parts = text.split(DIFF_MARKER)
    return (
      <>
        {parts[0]}
        <span id="inline-diff-wrapper" className="inline-diff-wrapper inline">
          {/* Original text - strikethrough with red background */}
          <span className="bg-red-100 text-red-700 line-through decoration-red-400/60 decoration-2 px-1 py-0.5 rounded-sm">
            {pendingEdit.originalText}
          </span>
          {/* Suggested text - green background */}
          <span className="bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded-sm ml-1">
            {pendingEdit.suggestedText}
          </span>
          {/* Accept/Reject buttons inline */}
          <span className="inline-flex items-center gap-1 ml-2 align-middle">
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleAcceptEdit()
              }}
              onMouseDown={(e) => e.preventDefault()}
              className="inline-flex items-center justify-center w-5 h-5 rounded bg-emerald-500 hover:bg-emerald-600 text-white transition-colors shadow-sm"
              title="Accept edit (Enter)"
            >
              <Check className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleRejectEdit()
              }}
              onMouseDown={(e) => e.preventDefault()}
              className="inline-flex items-center justify-center w-5 h-5 rounded bg-gray-400 hover:bg-gray-500 text-white transition-colors shadow-sm"
              title="Reject edit (Esc)"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        </span>
        {parts[1]}
      </>
    )
  }, [pendingEdit, handleAcceptEdit, handleRejectEdit])

  // Keyboard shortcuts for accepting/rejecting inline diff
  useEffect(() => {
    if (!pendingEdit) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleAcceptEdit()
      } else if (e.key === "Escape") {
        e.preventDefault()
        handleRejectEdit()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [pendingEdit, handleAcceptEdit, handleRejectEdit])

  // Scroll to inline diff when it appears
  useEffect(() => {
    if (!pendingEdit) return

    // Small delay to ensure the diff is rendered
    const timer = setTimeout(() => {
      const diffElement = document.getElementById("inline-diff-wrapper")
      if (diffElement) {
        diffElement.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [pendingEdit])

  // Base code component for syntax highlighting
  const codeComponent = useCallback(({ className, children, ...props }: { className?: string; children?: React.ReactNode }) => {
    const match = /language-(\w+)/.exec(className || "")
    const language = match ? match[1] : ""

    if (language === "mermaid") {
      return <MermaidDiagram code={String(children).replace(/\n$/, "")} />
    }

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

    return <code className={className} {...props}>{children}</code>
  }, [])

  // Only create diff-handling components when there's a pending edit
  // Otherwise use minimal components to allow normal text selection (like PromptChatInterface)
  const markdownComponents = useMemo(() => {
    // When no pending edit, only use code component for syntax highlighting
    // This matches how PromptChatInterface works and allows proper text selection
    if (!pendingEdit) {
      return { code: codeComponent }
    }

    // When there's a pending edit, add diff marker processing
    const processChildren = (children: React.ReactNode): React.ReactNode => {
      return React.Children.map(children, (child) => {
        if (typeof child === "string") {
          if (child.includes(DIFF_MARKER)) {
            return renderTextWithDiff(child)
          }
          return child
        }

        if (React.isValidElement(child)) {
          const childElement = child as React.ReactElement<{ children?: React.ReactNode }>
          if (childElement.props && childElement.props.children) {
            const childrenStr = React.Children.toArray(childElement.props.children)
              .filter((c): c is string => typeof c === "string")
              .join("")

            if (childrenStr.includes(DIFF_MARKER)) {
              return React.cloneElement(childElement, {}, processChildren(childElement.props.children))
            }
          }
        }

        return child
      })
    }

    return {
      code: ({ className, children, ...props }: { className?: string; children?: React.ReactNode }) => {
        const match = /language-(\w+)/.exec(className || "")
        const language = match ? match[1] : ""

        if (language === "mermaid") {
          return <MermaidDiagram code={String(children).replace(/\n$/, "")} />
        }

        if (language) {
          return (
            <SyntaxHighlighter
              style={vscDarkPlus as Record<string, React.CSSProperties>}
              language={language}
              PreTag="div"
              customStyle={{ margin: 0, borderRadius: "0.5rem", background: "rgba(255,255,255,0.05)" } as React.CSSProperties}
            >
              {String(children).replace(/\n$/, "")}
            </SyntaxHighlighter>
          )
        }

        const codeContent = String(children)
        if (codeContent.includes(DIFF_MARKER)) {
          return <code className={className} {...props}>{renderTextWithDiff(codeContent)}</code>
        }

        return <code className={className} {...props}>{children}</code>
      },
      p: ({ children, ...props }: { children?: React.ReactNode }) => <p {...props}>{processChildren(children)}</p>,
      li: ({ children, ...props }: { children?: React.ReactNode }) => <li {...props}>{processChildren(children)}</li>,
      h1: ({ children, ...props }: { children?: React.ReactNode }) => <h1 {...props}>{processChildren(children)}</h1>,
      h2: ({ children, ...props }: { children?: React.ReactNode }) => <h2 {...props}>{processChildren(children)}</h2>,
      h3: ({ children, ...props }: { children?: React.ReactNode }) => <h3 {...props}>{processChildren(children)}</h3>,
      h4: ({ children, ...props }: { children?: React.ReactNode }) => <h4 {...props}>{processChildren(children)}</h4>,
      blockquote: ({ children, ...props }: { children?: React.ReactNode }) => <blockquote {...props}>{processChildren(children)}</blockquote>,
      strong: ({ children, ...props }: { children?: React.ReactNode }) => <strong {...props}>{processChildren(children)}</strong>,
      em: ({ children, ...props }: { children?: React.ReactNode }) => <em {...props}>{processChildren(children)}</em>,
      td: ({ children, ...props }: { children?: React.ReactNode }) => <td {...props}>{processChildren(children)}</td>,
      th: ({ children, ...props }: { children?: React.ReactNode }) => <th {...props}>{processChildren(children)}</th>,
    }
  }, [pendingEdit, codeComponent, renderTextWithDiff])

  return (
    <>
      <div ref={contentRef} className={`${proseClasses} ${className}`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={markdownComponents}
        >
          {displayContent}
        </ReactMarkdown>
      </div>

      {/* Show selection toolbar when text is selected */}
      {enableInlineEditing && selection && !showEditor && !pendingEdit && (
        <SelectionToolbar
          onEditClick={handleEditClick}
          position={selection.position}
        />
      )}

      {/* Show inline editor when edit button is clicked */}
      {enableInlineEditing && showEditor && editorData && projectId && (
        <InlineAiEditor
          selectedText={editorData.text}
          fullContent={content}
          onApply={handleApplyEdit}
          onCancel={handleCancelEdit}
          onSuggestionReady={handleSuggestionReady}
          position={editorData.position}
          projectId={projectId}
        />
      )}
    </>
  )
}
