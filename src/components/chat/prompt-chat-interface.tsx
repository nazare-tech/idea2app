"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Send, Bot, User, Copy, Check, ChevronDown, Sparkles, Zap, ArrowUp } from "lucide-react"
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
  const [mounted, setMounted] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const composerRef = useRef<HTMLDivElement>(null)

  // Prevent hydration mismatch with Radix UI dropdowns
  useEffect(() => {
    setMounted(true)
  }, [])

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
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`
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

  const currentModel = AVAILABLE_MODELS.find((m) => m.id === selectedModel)
  const currentModelName = currentModel?.name || selectedModel

  // Get short model name for the pill
  const getShortModelName = (name: string) => {
    if (name.includes("Claude")) return name.replace("Claude ", "")
    if (name.includes("GPT-4")) return name.replace("GPT-", "")
    if (name.includes("Gemini")) return name.split(" ")[1] || name
    if (name.includes("Llama")) return "Llama 3.3"
    if (name.includes("DeepSeek")) return "DeepSeek"
    return name
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Minimal Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm shadow-primary/20">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground tracking-tight">Idea Refinement</h2>
            <p className="text-xs text-muted-foreground/70">Powered by AI</p>
          </div>
        </div>

        {/* Credits Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/80 border border-border/50">
          <Zap className="h-3 w-3 text-primary" />
          <span className="text-xs font-medium text-foreground/80">
            {credits >= 999999 ? "∞" : credits.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center text-center py-16 px-4">
              <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-6 border border-primary/10 shadow-lg shadow-primary/5">
                <Bot className="h-10 w-10 text-primary/50" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2 tracking-tight">
                Welcome to {projectName}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mb-8 leading-relaxed">
                Let's refine your idea with a few targeted questions to build a comprehensive understanding.
              </p>
              {initialIdea && (
                <div className="w-full max-w-xl bg-card border border-border/50 rounded-2xl p-5 mb-8 shadow-sm">
                  <p className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-widest">Your Initial Idea</p>
                  <p className="text-sm text-foreground leading-relaxed">{initialIdea}</p>
                </div>
              )}
              <button
                onClick={startConversation}
                disabled={loading || !initialIdea}
                className="group inline-flex items-center gap-2.5 px-6 py-3 bg-primary text-primary-foreground text-sm font-semibold rounded-2xl hover:bg-primary/90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Sparkles className="h-4 w-4 group-hover:rotate-12 transition-transform duration-300" />
                Start Refining
              </button>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3 mb-6 group animate-fade-up",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shrink-0 mt-0.5 border border-primary/10 shadow-sm">
                  <Bot className="h-4 w-4 text-primary/70" />
                </div>
              )}

              <div
                className={cn(
                  "rounded-2xl px-4 py-3 max-w-[85%] relative",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "bg-card border border-border/50 shadow-sm"
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
                    className="absolute -bottom-2 right-2 p-1.5 rounded-lg bg-card border border-border/50 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-secondary hover:scale-105 shadow-sm"
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
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <User className="h-4 w-4 text-primary/70" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 mb-6 animate-fade-up">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shrink-0 border border-primary/10 shadow-sm">
                <Bot className="h-4 w-4 text-primary/70" />
              </div>
              <div className="bg-card border border-border/50 rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Modern Composer Bar */}
      {messages.length > 0 && (
        <div className="px-4 pb-4 pt-2 bg-gradient-to-t from-background via-background to-transparent">
          <div className="max-w-3xl mx-auto">
            <div
              ref={composerRef}
              className={cn(
                "relative rounded-2xl border bg-card shadow-lg transition-all duration-300",
                isFocused
                  ? "border-primary/40 shadow-xl shadow-primary/5 ring-4 ring-primary/5"
                  : "border-border/50 shadow-md hover:shadow-lg hover:border-border"
              )}
            >
              {/* Top Row: Model Selector */}
              <div className="flex items-center justify-between px-4 pt-3 pb-1">
                {mounted ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/80 hover:bg-secondary border border-border/50 hover:border-border transition-all duration-200 hover:shadow-sm">
                        <div className="h-4 w-4 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                          <Sparkles className="h-2 w-2 text-primary-foreground" />
                        </div>
                        <span className="text-xs font-medium text-foreground/80 group-hover:text-foreground">
                          {getShortModelName(currentModelName)}
                        </span>
                        <ChevronDown className="h-3 w-3 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64 p-2 rounded-xl border-border/50 shadow-xl">
                      <div className="px-2 py-1.5 mb-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Select Model</p>
                      </div>
                      {AVAILABLE_MODELS.map((model) => (
                        <DropdownMenuItem
                          key={model.id}
                          onClick={() => setSelectedModel(model.id)}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                            selectedModel === model.id ? "bg-primary/5" : ""
                          )}
                        >
                          <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                            selectedModel === model.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-foreground/60"
                          )}>
                            <Sparkles className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-foreground">{model.name}</span>
                              {selectedModel === model.id && (
                                <Check className="h-4 w-4 text-primary shrink-0" />
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground line-clamp-1">{model.description}</span>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/80 border border-border/50">
                    <div className="h-4 w-4 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                      <Sparkles className="h-2 w-2 text-primary-foreground" />
                    </div>
                    <span className="text-xs font-medium text-foreground/80">{getShortModelName(currentModelName)}</span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground/60" />
                  </div>
                )}

                {/* Keyboard hint - subtle */}
                <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
                  <kbd className="px-1.5 py-0.5 rounded bg-secondary/80 font-mono">↵</kbd>
                  <span>to send</span>
                </div>
              </div>

              {/* Textarea */}
              <div className="relative px-4 pb-3">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="Describe your idea or answer the questions..."
                  className="w-full bg-transparent text-sm resize-none focus-visible:outline-none placeholder:text-muted-foreground/40 min-h-[48px] max-h-[160px] py-2 pr-14"
                  rows={1}
                  disabled={loading}
                />

                {/* Send Button - positioned inside */}
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className={cn(
                    "absolute right-4 bottom-3 h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-300",
                    input.trim() && !loading
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 active:scale-95"
                      : "bg-secondary text-muted-foreground/40 cursor-not-allowed"
                  )}
                >
                  {loading ? (
                    <Spinner size="sm" />
                  ) : (
                    <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                  )}
                </button>
              </div>
            </div>

            {/* Bottom hint */}
            <p className="text-[11px] text-muted-foreground/40 mt-2.5 text-center">
              Shift + Enter for new line
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
