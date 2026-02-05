"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Send, Bot, User, Copy, Check, ChevronDown, Sparkles } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { AVAILABLE_MODELS, DEFAULT_MODEL } from "@/lib/prompt-chat-config"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"

interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  created_at: string
  metadata?: {
    model?: string
    stage?: "questions" | "gathering" | "summary"
  }
}

interface PromptChatInterfaceProps {
  projectId: string
  projectName: string
  initialIdea: string
  onIdeaSummary?: (summary: string) => void
  credits: number
}

export function PromptChatInterface({
  projectId,
  projectName,
  initialIdea,
  onIdeaSummary,
  credits,
}: PromptChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL)
  const [conversationStage, setConversationStage] = useState<"initial" | "refining" | "summarized">("initial")
  const [isFirstLoad, setIsFirstLoad] = useState(true)
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

  // Load existing messages and start conversation if needed
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const response = await fetch(`/api/prompt-chat?projectId=${projectId}`)
        if (response.ok) {
          const data = await response.json()
          setMessages(data.messages || [])
          setConversationStage(data.stage || "initial")

          // If no messages and initial idea exists, start the conversation
          if (data.messages.length === 0 && initialIdea && isFirstLoad) {
            setIsFirstLoad(false)
            await startConversation()
          }
        }
      } catch (error) {
        console.error("Error loading messages:", error)
      }
    }

    if (projectId) {
      loadMessages()
    }
  }, [projectId])

  const startConversation = async () => {
    if (!initialIdea.trim()) return

    setLoading(true)
    try {
      const response = await fetch("/api/prompt-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          message: initialIdea,
          model: selectedModel,
          isInitial: true,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to start conversation")
      }

      setMessages(data.messages || [])
      setConversationStage("refining")
    } catch (error) {
      console.error("Chat error:", error)
      alert(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

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
      role: "user",
      content: userMessage,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])

    try {
      const response = await fetch("/api/prompt-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          message: userMessage,
          model: selectedModel,
          isInitial: false,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message")
      }

      // Replace temp message with real messages
      setMessages(data.messages || [])
      setConversationStage(data.stage || conversationStage)

      // If we got a summary, notify parent
      if (data.stage === "summarized" && data.summary && onIdeaSummary) {
        onIdeaSummary(data.summary)
      }
    } catch (error) {
      console.error("Chat error:", error)
      // Remove temp message and show error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id))
      alert(error instanceof Error ? error.message : "An error occurred")
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

  const currentModelName = AVAILABLE_MODELS.find((m) => m.id === selectedModel)?.name || selectedModel

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Compact Header with Model Selector */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 backdrop-blur-sm bg-background/95 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground leading-none">Idea Refinement</h2>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-accent/50 transition-colors">
              <span className="max-w-[120px] truncate">{currentModelName}</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {AVAILABLE_MODELS.map((model) => (
              <DropdownMenuItem
                key={model.id}
                onClick={() => setSelectedModel(model.id)}
                className="flex flex-col items-start gap-0.5 cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm font-medium">{model.name}</span>
                  {selectedModel === model.id && (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{model.description}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center text-center py-16 px-4">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
                <Bot className="h-8 w-8 text-primary/60" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Welcome to {projectName}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                Let's refine your idea with a few targeted questions to build a comprehensive understanding.
              </p>
              {initialIdea && (
                <div className="w-full max-w-xl bg-card border border-border rounded-xl p-4 mb-6 shadow-sm">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Your Initial Idea</p>
                  <p className="text-sm text-foreground leading-relaxed">{initialIdea}</p>
                </div>
              )}
              <button
                onClick={startConversation}
                disabled={loading || !initialIdea}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                <Sparkles className="h-4 w-4" />
                Start Refining
              </button>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3 mb-6 group",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1 border border-primary/20">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
              )}

              <div
                className={cn(
                  "rounded-2xl px-4 py-3 max-w-[85%] relative",
                  message.role === "user"
                    ? "bg-card border-2 border-primary text-foreground shadow-sm"
                    : "bg-card border border-border backdrop-blur-sm"
                )}
              >
                {message.role === "user" ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                ) : (
                  <div className="prose prose-sm max-w-none dark:prose-invert [&_p]:text-foreground [&_p]:leading-relaxed [&_li]:text-foreground [&_strong]:text-foreground [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_a]:text-primary [&_a]:no-underline hover:[&_a]:underline [&_code]:text-primary [&_code]:bg-primary/5 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_ol]:text-foreground [&_ul]:text-foreground [&_ol]:my-2 [&_ul]:my-2 [&_li]:my-1">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}

                {/* Copy button for assistant messages */}
                {message.role === "assistant" && (
                  <button
                    onClick={() => handleCopy(message.content, message.id)}
                    className="absolute -bottom-2 right-2 p-1.5 rounded-lg bg-card border border-border opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-muted/50"
                  >
                    {copiedId === message.id ? (
                      <Check className="h-3 w-3 text-success" />
                    ) : (
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    )}
                  </button>
                )}
              </div>

              {message.role === "user" && (
                <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-1">
                  <User className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 mb-6">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="bg-card border border-border rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <Spinner size="sm" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Modern Input Area */}
      {messages.length > 0 && (
        <div className="border-t border-border/50 backdrop-blur-sm bg-background/95">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="flex items-end gap-2">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Refine your idea..."
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary placeholder:text-muted-foreground/60 min-h-[52px] max-h-[200px] transition-all duration-200"
                  rows={1}
                  disabled={loading}
                />
              </div>
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className={cn(
                  "h-[52px] w-[52px] rounded-xl shrink-0 flex items-center justify-center transition-all duration-200",
                  input.trim() && !loading
                    ? "bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
                    : "bg-muted text-muted-foreground/50 cursor-not-allowed"
                )}
              >
                {loading ? (
                  <Spinner size="sm" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground/70 mt-2 text-center">
              {credits >= 999999 ? "∞" : credits} credits · Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Enter</kbd> to send
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
