"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { consumeNdjsonStream } from "@/lib/ndjson-stream"
import { useCopyFeedback } from "@/hooks/use-copy-feedback"
import { useAutoResizingTextarea } from "@/hooks/use-auto-resizing-textarea"
import {
  ChatAssistantAvatar,
  ChatComposer,
  ChatCopyButton,
  ChatLoadMoreButton,
  ChatMarkdownBody,
  ChatThinkingIndicator,
  ChatUserAvatar,
} from "@/components/chat/chat-primitives"

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
  selectedModel: string
  onIdeaSummary?: (summary: string) => void
}

type StreamEvent =
  | { type: "start"; userMessage: Message }
  | { type: "token"; content: string }
  | {
      type: "done"
      userMessage: Message
      assistantMessage: Message
      stage: "refining" | "summarized"
      summary: string | null
    }
  | { type: "error"; error: string }

const PAGE_SIZE = 40

export function PromptChatInterface({
  projectId,
  initialIdea,
  selectedModel,
  onIdeaSummary,
}: PromptChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [conversationStage, setConversationStage] = useState<"initial" | "refining" | "summarized">("initial")
  const [isFirstLoad, setIsFirstLoad] = useState(true)
  const [hasMoreMessages, setHasMoreMessages] = useState(false)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [isLoadingOlder, setIsLoadingOlder] = useState(false)
  const [earliestCursor, setEarliestCursor] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useAutoResizingTextarea(input, 160)
  const requestInFlight = useRef(false)
  const { copiedId, copyText } = useCopyFeedback()

  const dedupeMessages = useCallback((messageList: Message[]) => {
    if (!messageList.length) return []

    const deduped: Message[] = []
    const lastSeen = new Map<string, number>()

    for (const message of messageList) {
      const key = `${message.role}:${message.content.trim()}`
      const currentTime = message.created_at
        ? new Date(message.created_at).getTime()
        : Date.now()
      const lastTime = lastSeen.get(key)
      const isDuplicate = typeof lastTime === "number" && Math.abs(currentTime - lastTime) <= 5000

      if (!isDuplicate) {
        deduped.push(message)
      }

      if (Number.isFinite(currentTime)) {
        lastSeen.set(key, currentTime)
      }
    }

    return deduped
  }, [])

  const loadMessages = useCallback(async (options?: { before?: string | null }) => {
    const before = options?.before
    const params = new URLSearchParams({
      projectId,
      limit: String(PAGE_SIZE),
    })
    if (before) {
      params.set("before", before)
    }

    const response = await fetch(`/api/prompt-chat?${params.toString()}`)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Failed to load messages" }))
      throw new Error(errorData.error || "Failed to load messages")
    }

    const data = await response.json()
    const pageMessages = dedupeMessages(data.messages || [])

    return { pageMessages, hasMore: Boolean(data.hasMore), stage: data.stage || "initial" }
  }, [projectId, dedupeMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const parseStreamResponse = useCallback(async (
    response: Response,
    tempUserMessageId: string,
    tempAssistantMessageId: string
  ) => {
    const appendToken = (token: string) => {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === tempAssistantMessageId
            ? { ...message, content: `${message.content}${token}` }
            : message
        )
      )
    }

    const finalizeMessages = (
      userMessage: Message,
      assistantMessage: Message,
      stage: "refining" | "summarized",
      summary: string | null
    ) => {
      setMessages((prev) =>
        prev.map((message) => {
          if (message.id === tempUserMessageId) return userMessage
          if (message.id === tempAssistantMessageId) return assistantMessage
          return message
        })
      )
      setConversationStage(stage)
      if (summary && onIdeaSummary) onIdeaSummary(summary)
    }

    await consumeNdjsonStream<StreamEvent>(response, async (event) => {
      if (event.type === "start") {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === tempUserMessageId ? event.userMessage : message
          )
        )
        return
      }

      if (event.type === "token") {
        appendToken(event.content)
        return
      }

      if (event.type === "done") {
        finalizeMessages(
          event.userMessage,
          event.assistantMessage,
          event.stage,
          event.summary
        )
        return
      }

      if (event.type === "error") {
        throw new Error(event.error || "Failed to process response")
      }
    })
  }, [onIdeaSummary])

  const startConversation = useCallback(async (overrideIdea?: string) => {
    if (requestInFlight.current) return

    const ideaToUse = overrideIdea || initialIdea
    if (!ideaToUse.trim()) return

    requestInFlight.current = true
    setLoading(true)

    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: ideaToUse,
      created_at: new Date().toISOString(),
    }
    const tempAssistantMsg: Message = {
      id: `assistant-temp-${Date.now()}`,
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => dedupeMessages([...prev, tempUserMsg, tempAssistantMsg]))

    try {
      const response = await fetch("/api/prompt-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          message: ideaToUse,
          model: selectedModel,
          isInitial: true,
          stream: true,
        }),
      })

      if (response.headers.get("content-type")?.includes("application/x-ndjson")) {
        if (!response.ok && response.status !== 200) {
          const errorText = await response.text()
          throw new Error(errorText || "Failed to start conversation")
        }

        await parseStreamResponse(response, tempUserMsg.id, tempAssistantMsg.id)
        return
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to start conversation")
      }

      if (data.userMessage && data.assistantMessage) {
        setMessages((prev) =>
          dedupeMessages(
            prev
              .filter((message) => message.id !== tempUserMsg.id)
              .filter((message) => message.id !== tempAssistantMsg.id)
              .concat(data.userMessage as Message, data.assistantMessage as Message)
          )
        )
      } else if (Array.isArray(data.messages)) {
        setMessages((prev) =>
          dedupeMessages(
            prev
              .filter((message) => message.id !== tempUserMsg.id)
              .filter((message) => message.id !== tempAssistantMsg.id)
              .concat(data.messages as Message[])
          )
        )
      }

      setConversationStage(data.stage || conversationStage)
    } catch (error) {
      console.error("Chat error:", error)
      setMessages((prev) =>
        prev.filter((message) => message.id !== tempUserMsg.id && message.id !== tempAssistantMsg.id)
      )
      alert(error instanceof Error ? error.message : "An error occurred")
    } finally {
      requestInFlight.current = false
      setLoading(false)
    }
  }, [conversationStage, dedupeMessages, initialIdea, parseStreamResponse, projectId, selectedModel])

  useEffect(() => {
    const loadInitialMessages = async () => {
      setMessagesLoading(true)
      try {
        const result = await loadMessages()

        setMessages(result.pageMessages)
        setHasMoreMessages(result.hasMore)
        setEarliestCursor(result.pageMessages[0]?.created_at || null)
        setConversationStage(result.stage)

        if (result.pageMessages.length === 0 && initialIdea && isFirstLoad) {
          setIsFirstLoad(false)
          await startConversation()
        }
      } catch (error) {
        console.error("Error loading messages:", error)
      } finally {
        setMessagesLoading(false)
      }
    }

    if (projectId) {
      loadInitialMessages()
    }
  }, [projectId, initialIdea, isFirstLoad, loadMessages, startConversation])

  const loadOlderMessages = async () => {
    if (!hasMoreMessages || !earliestCursor || isLoadingOlder || loading) return

    const container = messagesContainerRef.current
    const previousHeight = container?.scrollHeight || 0
    const previousTop = container?.scrollTop || 0

    try {
      setMessagesLoading(true)
      setIsLoadingOlder(true)
      const result = await loadMessages({ before: earliestCursor })
      setMessages((prev) => dedupeMessages([...result.pageMessages, ...prev]))
      setHasMoreMessages(result.hasMore)
      setEarliestCursor(result.pageMessages[0]?.created_at || earliestCursor)
      requestAnimationFrame(() => {
        if (!container) return
        const delta = container.scrollHeight - previousHeight
        container.scrollTop = previousTop + Math.max(delta, 0)
      })
    } catch (error) {
      console.error("Error loading older messages:", error)
    } finally {
      setMessagesLoading(false)
      setIsLoadingOlder(false)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || loading || requestInFlight.current) return

    requestInFlight.current = true

    const userMessage = input.trim()
    setInput("")
    setLoading(true)

    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userMessage,
      created_at: new Date().toISOString(),
    }
    const tempAssistantMsg: Message = {
      id: `assistant-temp-${Date.now()}`,
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => dedupeMessages([...prev, tempUserMsg, tempAssistantMsg]))

    try {
      const response = await fetch("/api/prompt-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          message: userMessage,
          model: selectedModel,
          isInitial: false,
          stream: true,
        }),
      })

      if (response.headers.get("content-type")?.includes("application/x-ndjson")) {
        if (!response.ok && response.status !== 200) {
          const errorText = await response.text()
          throw new Error(errorText || "Failed to send message")
        }
        await parseStreamResponse(response, tempUserMsg.id, tempAssistantMsg.id)
        return
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message")
      }

      if (data.userMessage && data.assistantMessage) {
        setMessages((prev) =>
          dedupeMessages(
            prev
              .filter((message) => message.id !== tempUserMsg.id)
              .filter((message) => message.id !== tempAssistantMsg.id)
              .concat(data.userMessage as Message, data.assistantMessage as Message)
          )
        )
      } else if (data.messages) {
        setMessages((prev) => dedupeMessages(prev.concat(data.messages)))
      }

      setConversationStage(data.stage || conversationStage)

      if (data.stage === "summarized" && data.summary && onIdeaSummary) {
        onIdeaSummary(data.summary)
      }
    } catch (error) {
      console.error("Chat error:", error)
      setMessages((prev) =>
        prev.filter((m) => m.id !== tempUserMsg.id && m.id !== tempAssistantMsg.id).concat({
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          created_at: new Date().toISOString(),
        })
      )
      alert(error instanceof Error ? error.message : "An error occurred")
    } finally {
      requestInFlight.current = false
      setLoading(false)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  const hasPendingAssistantMessage = loading && messages.some(
    (message) =>
      message.role === "assistant" &&
      message.id.startsWith("assistant-temp-") &&
      !message.content.trim()
  )

  const visibleMessages = messages.filter(
    (message) =>
      !(
        message.role === "assistant" &&
        message.id.startsWith("assistant-temp-") &&
        !message.content.trim()
      )
  )

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex-1 overflow-y-auto" ref={messagesContainerRef}>
        <div className="mx-auto max-w-3xl px-4 py-6">
          {hasMoreMessages && (
            <div className="mb-4 flex justify-center">
              <ChatLoadMoreButton
                onClick={loadOlderMessages}
                disabled={isLoadingOlder}
                label={isLoadingOlder ? "Loading..." : "Load earlier messages"}
                className="border-border/70 bg-card ui-font-medium text-foreground/80 hover:bg-muted/50"
              />
            </div>
          )}

          {messagesLoading && messages.length === 0 && (
            <div className="flex justify-center py-2">
              <Spinner size="sm" />
            </div>
          )}

          {visibleMessages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "group mb-6 flex gap-3 animate-fade-up",
                message.role === "user" && "pl-[100px]"
              )}
            >
              {message.role === "assistant" && <ChatAssistantAvatar variant="logo" />}

              <div
                className={cn(
                  "relative max-w-[85%]",
                  message.role === "user"
                    ? "rounded-2xl border border-border/60 bg-muted px-4 py-3 text-foreground shadow-sm"
                    : "px-1 py-1 text-foreground"
                )}
              >
                {message.role === "user" ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                ) : (
                  <ChatMarkdownBody
                    content={message.content}
                    className="prose max-w-none text-sm dark:prose-invert [&>*:first-child]:mt-0 [&_p]:my-3 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-foreground [&_strong]:font-semibold [&_strong]:text-foreground [&_h1]:mb-4 [&_h1]:mt-2 [&_h1]:border-b [&_h1]:border-border/60 [&_h1]:pb-2 [&_h1]:text-[1.5rem] [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:text-foreground [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-[1.1rem] [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-7 [&_ol]:text-foreground [&_ol>li::marker]:font-semibold [&_ol>li::marker]:text-foreground [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-foreground [&_li]:my-1.5 [&_li]:text-sm [&_li]:leading-relaxed [&_li]:text-foreground [&_li_p]:my-1 [&_a]:text-primary [&_a]:no-underline hover:[&_a]:underline [&_code]:rounded [&_code]:bg-primary/5 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-primary"
                  />
                )}

                {message.role === "assistant" && (
                  <ChatCopyButton
                    copied={copiedId === message.id}
                    onClick={() => {
                      void copyText(message.content, message.id)
                    }}
                  />
                )}
              </div>

              {message.role === "user" && <ChatUserAvatar />}
            </div>
          ))}

          {hasPendingAssistantMessage && (
            <ChatThinkingIndicator
              className="mb-4 justify-start"
              assistantAvatar={<ChatAssistantAvatar variant="logo" />}
              contentClassName="px-1 py-1"
            />
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-border/70 bg-card/40 p-4">
        <div className="mx-auto w-full max-w-3xl">
          <ChatComposer
            value={input}
            onChange={setInput}
            onKeyDown={handleKeyDown}
            onSend={handleSend}
            disabled={loading || requestInFlight.current}
            sendDisabled={loading || !input.trim() || requestInFlight.current}
            loading={loading}
            placeholder="Type your business idea update or question..."
            textareaRef={textareaRef}
            rows={5}
            innerClassName="items-start"
            textareaClassName="max-h-[160px] border-surface-strong bg-background"
          />
        </div>
      </div>
    </div>
  )
}
