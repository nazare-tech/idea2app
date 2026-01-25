"use client"

import { useState, useRef, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
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
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}

            <div
              className={cn(
                "rounded-xl px-4 py-3 max-w-[80%] relative",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border"
              )}
            >
              {message.role === "user" ? (
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              ) : (
                <div className="prose prose-invert prose-sm max-w-none [&_p]:text-foreground [&_li]:text-foreground [&_strong]:text-foreground [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_a]:text-primary">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}

              {/* Copy button */}
              <button
                onClick={() => handleCopy(message.content, message.id)}
                className={cn(
                  "absolute -bottom-3 right-2 p-1 rounded bg-muted/80 opacity-0 group-hover:opacity-100 transition-opacity",
                  message.role === "user" && "hidden"
                )}
              >
                {copiedId === message.id ? (
                  <Check className="h-3 w-3 text-emerald-400" />
                ) : (
                  <Copy className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
            </div>

            {message.role === "user" && (
              <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-1">
                <User className="h-4 w-4 text-secondary-foreground" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="bg-card border border-border rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Spinner size="sm" />
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border pt-4">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your business idea or ask a question..."
              className="w-full rounded-xl border border-input bg-background px-4 py-3 pr-12 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[48px] max-h-[200px]"
              rows={1}
              disabled={loading}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            size="icon"
            className="h-12 w-12 rounded-xl shrink-0"
          >
            {loading ? (
              <Spinner size="sm" />
            ) : (
              <Send className="h-4 w-4" />
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
