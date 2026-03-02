"use client"

import { useState, useRef, useEffect } from "react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { uiStylePresets } from "@/lib/ui-style-presets"
import { Send, Bot, User, Copy, Check } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface Message {
  id: string
  project_id: string
  role: string
  content: string
  metadata: unknown
  created_at: string | null
}

interface ChatInterfaceProps {
  projectId: string
  initialMessages: Message[]
  credits: number
}

export function ChatInterface({ projectId, initialMessages, credits }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput("")
    setLoading(true)

    // Optimistic update - add user message
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      project_id: projectId,
      role: "user",
      content: userMessage,
      metadata: null,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          message: userMessage,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message")
      }

      // Replace temp message with real ones
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        data.userMessage,
        data.assistantMessage,
      ])
    } catch (error) {
      console.error("Chat error:", error)
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          project_id: projectId,
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          metadata: null,
          created_at: new Date().toISOString(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-320px)] min-h-[400px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3 group",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.role !== "user" && (
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#00D4FF]/20 to-[#7c3aed]/20 border border-[rgba(0,212,255,0.15)] flex items-center justify-center shrink-0 mt-1">
                <Bot className={uiStylePresets.chatBrandIcon} />
              </div>
            )}

            <div
              className={cn(
                "rounded-2xl px-4 py-3 max-w-[80%] relative",
                message.role === "user"
                  ? "bg-gradient-to-r from-[#00D4FF] to-[#7c3aed] text-white shadow-[0_0_15px_rgba(0,212,255,0.15)]"
                  : "bg-[rgba(12,12,20,0.7)] backdrop-blur-sm border border-surface-mid"
              )}
            >
              {message.role === "user" ? (
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              ) : (
                <div className="prose prose-invert prose-sm max-w-none [&_p]:text-foreground [&_li]:text-foreground [&_strong]:text-foreground [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_a]:text-[#00D4FF] [&_code]:text-[#00D4FF] [&_code]:bg-[rgba(0,212,255,0.08)]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}

              {/* Copy button */}
              <button
                onClick={() => handleCopy(message.content, message.id)}
                className={cn(
                  "absolute -bottom-3 right-2 p-1.5 rounded-lg bg-[rgba(12,12,20,0.9)] border border-surface-strong opacity-0 group-hover:opacity-100 transition-all duration-200 hover:border-[rgba(0,212,255,0.3)]",
                  message.role === "user" && "hidden"
                )}
              >
                {copiedId === message.id ? (
                  <Check className="h-3 w-3 text-[#34d399]" />
                ) : (
                  <Copy className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
            </div>

            {message.role === "user" && (
              <div className="h-8 w-8 rounded-xl bg-surface-mid border border-surface-strong flex items-center justify-center shrink-0 mt-1">
                <User className="ui-icon-16 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#00D4FF]/20 to-[#7c3aed]/20 border border-[rgba(0,212,255,0.15)] flex items-center justify-center shrink-0">
                <Bot className={uiStylePresets.chatBrandIcon} />
            </div>
            <div className="bg-[rgba(12,12,20,0.7)] border border-surface-mid rounded-2xl px-4 py-3">
              <div className="ui-row-gap-2">
                <Spinner size="sm" />
                <span className="ui-text-sm-muted">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-surface-mid pt-4">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your business idea or ask a question..."
              className="w-full rounded-2xl border border-surface-strong bg-surface-soft px-4 py-3 pr-12 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(0,212,255,0.4)] focus-visible:ring-offset-0 focus-visible:border-[rgba(0,212,255,0.3)] placeholder:text-text-secondary min-h-[48px] max-h-[200px] transition-all duration-200"
              rows={1}
              disabled={loading}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            size="icon"
            className="h-12 w-12 rounded-2xl shrink-0"
          >
            {loading ? (
              <Spinner size="sm" />
            ) : (
              <Send className="ui-icon-16" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {credits >= 999999 ? "Unlimited credits" : `${credits} credits remaining`} | Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
