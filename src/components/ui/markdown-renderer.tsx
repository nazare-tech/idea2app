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

// Unique marker for inline diff
const DIFF_MARKER = "___INLINE_DIFF_MARKER___"

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
  // Use a single ref to track if any editing UI is active
  const isEditingRef = useRef(false)

  // Keep ref in sync with editing states
  useEffect(() => {
    isEditingRef.current = showEditor || pendingEdit !== null
  }, [showEditor, pendingEdit])

  useEffect(() => {
    if (!enableInlineEditing) return

    const handleSelectionChange = () => {
      // Don't update selection while any editing UI is active
      if (isEditingRef.current) return

      const sel = window.getSelection()
      if (!sel || sel.isCollapsed) {
        setSelection(null)
        return
      }

      // Get the raw selected text (preserve whitespace for accurate matching)
      const rawSelectedText = sel.toString()
      if (!rawSelectedText.trim()) {
        setSelection(null)
        return
      }

      // Check if selection is within our content
      const range = sel.getRangeAt(0)
      if (!contentRef.current?.contains(range.commonAncestorContainer)) {
        setSelection(null)
        return
      }

      // Use the raw text but trim only leading/trailing whitespace for storage
      // This preserves internal whitespace/newlines for accurate content matching
      const selectedText = rawSelectedText.trim()
      const rect = range.getBoundingClientRect()

      // Verify this text exists in the content (for better UX)
      if (!content.includes(selectedText)) {
        // Selection might span across markdown formatting - still allow but warn
        console.debug("Selected text may include formatting that won't match source")
      }

      setSelection({
        text: selectedText,
        position: {
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
        },
      })
    }

    document.addEventListener("selectionchange", handleSelectionChange)
    return () => document.removeEventListener("selectionchange", handleSelectionChange)
  }, [enableInlineEditing, content])

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
    isEditingRef.current = true
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

  // Accept the inline diff
  const handleAcceptEdit = useCallback(() => {
    if (!pendingEdit || !onContentUpdate) return

    // Replace the original text with the suggested text
    const updatedContent = content.replace(pendingEdit.originalText, pendingEdit.suggestedText)

    // Clear all editing state FIRST before triggering content update
    isEditingRef.current = false
    window.getSelection()?.removeAllRanges()
    setSelection(null)
    setEditorData(null)
    setPendingEdit(null)
    setShowEditor(false)

    // Then trigger the content update
    onContentUpdate(updatedContent)
  }, [pendingEdit, content, onContentUpdate])

  // Reject the inline diff
  const handleRejectEdit = useCallback(() => {
    // Clear all editing state
    isEditingRef.current = false
    window.getSelection()?.removeAllRanges()
    setSelection(null)
    setEditorData(null)
    setPendingEdit(null)
    setShowEditor(false)
  }, [])

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

    // Clear all editing state
    isEditingRef.current = false
    window.getSelection()?.removeAllRanges()
    setSelection(null)
    setEditorData(null)
    setShowEditor(false)
    setPendingEdit(null)

    onContentUpdate(updatedContent)
  }, [editorData, content, onContentUpdate])

  const handleCancelEdit = useCallback(() => {
    // Clear all editing state
    isEditingRef.current = false
    window.getSelection()?.removeAllRanges()
    setSelection(null)
    setEditorData(null)
    setPendingEdit(null)
    setShowEditor(false)
  }, [])

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
  const renderTextWithDiff = (text: string) => {
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
  }

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

  return (
    <>
      <div ref={contentRef} className={`${proseClasses} ${className}`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
          // Helper to process children for diff markers
          // This handles both direct string children and nested children
          ...(() => {
            const processChildren = (children: React.ReactNode): React.ReactNode => {
              return React.Children.map(children, (child) => {
                if (typeof child === "string" && child.includes(DIFF_MARKER)) {
                  return renderTextWithDiff(child)
                }
                return child
              })
            }

            return {
              // Handle text nodes to render inline diffs in paragraphs
              p({ children, ...props }: { children?: React.ReactNode }) {
                return <p {...props}>{processChildren(children)}</p>
              },
              // List items
              li({ children, ...props }: { children?: React.ReactNode }) {
                return <li {...props}>{processChildren(children)}</li>
              },
              // Headings
              h1({ children, ...props }: { children?: React.ReactNode }) {
                return <h1 {...props}>{processChildren(children)}</h1>
              },
              h2({ children, ...props }: { children?: React.ReactNode }) {
                return <h2 {...props}>{processChildren(children)}</h2>
              },
              h3({ children, ...props }: { children?: React.ReactNode }) {
                return <h3 {...props}>{processChildren(children)}</h3>
              },
              h4({ children, ...props }: { children?: React.ReactNode }) {
                return <h4 {...props}>{processChildren(children)}</h4>
              },
              // Blockquotes
              blockquote({ children, ...props }: { children?: React.ReactNode }) {
                return <blockquote {...props}>{processChildren(children)}</blockquote>
              },
              // Strong/Bold
              strong({ children, ...props }: { children?: React.ReactNode }) {
                return <strong {...props}>{processChildren(children)}</strong>
              },
              // Emphasis/Italic
              em({ children, ...props }: { children?: React.ReactNode }) {
                return <em {...props}>{processChildren(children)}</em>
              },
              // Table cells
              td({ children, ...props }: { children?: React.ReactNode }) {
                return <td {...props}>{processChildren(children)}</td>
              },
              th({ children, ...props }: { children?: React.ReactNode }) {
                return <th {...props}>{processChildren(children)}</th>
              },
              // Code blocks
              code({ className, children, ...props }: { className?: string; children?: React.ReactNode }) {
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

                // Inline code - check for diff marker
                const codeContent = String(children)
                if (codeContent.includes(DIFF_MARKER)) {
                  return <code className={className} {...props}>{renderTextWithDiff(codeContent)}</code>
                }

                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                )
              },
            }
          })(),
        }}
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
