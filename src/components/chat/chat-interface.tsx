"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { consumeNdjsonStream } from "@/lib/ndjson-stream"
import { formatRemainingCredits } from "@/lib/credits"
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

type StreamEvent =
  | { type: "start"; userMessage: Message }
  | { type: "token"; content: string }
  | { type: "done"; userMessage: Message; assistantMessage: Message }
  | { type: "error"; error: string }

const MESSAGE_PAGE_SIZE = 30

export function ChatInterface({ projectId, initialMessages, credits }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [visibleMessageCount, setVisibleMessageCount] = useState(MESSAGE_PAGE_SIZE)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useAutoResizingTextarea(input, 200)
  const { copiedId, copyText } = useCopyFeedback()

  const visibleMessages = useMemo(
    () => messages.slice(-Math.min(visibleMessageCount, messages.length)),
    [messages, visibleMessageCount]
  )
  const canLoadMore = visibleMessages.length < messages.length

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const loadMoreMessages = () => {
    setVisibleMessageCount((prev) => Math.min(prev + MESSAGE_PAGE_SIZE, messages.length))
  }

  const parseChatStream = async (response: Response, userTempId: string, assistantTempId: string) => {
    const appendToken = (token: string) => {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantTempId
            ? { ...message, content: `${message.content}${token}` }
            : message
        )
      )
    }

    const finalizeMessage = (userMessage: Message, assistantMessage: Message) => {
      setMessages((prev) =>
        prev.map((message) => {
          if (message.id === userTempId) return userMessage
          if (message.id === assistantTempId) return assistantMessage
          return message
        })
      )
    }

    await consumeNdjsonStream<StreamEvent>(response, async (event) => {
      if (event.type === "start") {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === userTempId ? event.userMessage : message
          )
        )
        return
      }

      if (event.type === "token") {
        appendToken(event.content)
        return
      }

      if (event.type === "done") {
        finalizeMessage(event.userMessage, event.assistantMessage)
        return
      }

      if (event.type === "error") {
        throw new Error(event.error || "Chat stream error")
      }
    })
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput("")
    setLoading(true)

    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      project_id: projectId,
      role: "user",
      content: userMessage,
      metadata: null,
      created_at: new Date().toISOString(),
    }
    const assistantTempMsg: Message = {
      id: `assistant-temp-${Date.now()}`,
      project_id: projectId,
      role: "assistant",
      content: "",
      metadata: {
        source: "openrouter",
        model: "pending",
      },
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, tempUserMsg, assistantTempMsg])

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          message: userMessage,
          stream: true,
        }),
      })

      const contentType = response.headers.get("content-type") || ""
      if (contentType.includes("application/x-ndjson")) {
        if (!response.ok && response.status !== 200) {
          const errorText = await response.text()
          throw new Error(errorText || "Failed to send message")
        }
        await parseChatStream(response, tempUserMsg.id, assistantTempMsg.id)
        return
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message")
      }

      if (data.userMessage && data.assistantMessage) {
        setMessages((prev) =>
          prev
            .filter((message) => message.id !== tempUserMsg.id)
            .filter((message) => message.id !== assistantTempMsg.id)
            .concat([data.userMessage, data.assistantMessage])
        )
        return
      }

      if (data.messages) {
        setMessages(dedupeMessages([...(data.messages as Message[])]))
      } else {
        throw new Error("No message data returned")
      }
    } catch (error) {
      console.error("Chat error:", error)
      setMessages((prev) =>
        prev
          .filter((message) => message.id !== tempUserMsg.id && message.id !== assistantTempMsg.id)
          .concat([
            {
              id: `error-${Date.now()}`,
              project_id: projectId,
              role: "assistant",
              content: "Sorry, I encountered an error. Please try again.",
              metadata: null,
              created_at: new Date().toISOString(),
            },
          ])
      )
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex min-h-[400px] flex-col h-[calc(100vh-320px)]">
      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        {canLoadMore && (
          <div className="px-4 pt-2">
            <div className="mx-auto block w-fit">
              <ChatLoadMoreButton
                onClick={loadMoreMessages}
                label="Load earlier messages"
                className="border-surface-strong bg-surface-ink-soft text-foreground hover:bg-surface-mid"
              />
            </div>
          </div>
        )}

        {visibleMessages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "group flex gap-3",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.role !== "user" && <ChatAssistantAvatar />}

            <div
              className={cn(
                "relative max-w-[80%] rounded-2xl px-4 py-3",
                message.role === "user"
                  ? "bg-text-primary text-white"
                  : "border border-border-subtle bg-white"
              )}
            >
              {message.role === "user" ? (
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              ) : (
                <ChatMarkdownBody
                  content={message.content}
                  className="prose prose-invert prose-sm max-w-none [&_p]:text-foreground [&_li]:text-foreground [&_strong]:text-foreground [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_a]:text-[var(--color-text-accent)] [&_code]:text-[var(--color-text-accent)] [&_code]:bg-[var(--color-accent-primary-whisper)]"
                />
              )}

              {message.role !== "user" && (
                <ChatCopyButton
                  copied={copiedId === message.id}
                  onClick={() => {
                    void copyText(message.content, message.id)
                  }}
                  className="border-surface-strong bg-[var(--color-surface-ink-strong)] hover:border-[var(--color-accent-primary-mid)]"
                />
              )}
            </div>

            {message.role === "user" && (
              <ChatUserAvatar className="border-surface-strong bg-surface-mid" />
            )}
          </div>
        ))}

        {loading && visibleMessages.length > 0 && (
          <ChatThinkingIndicator
            assistantAvatar={<ChatAssistantAvatar className="mt-0" />}
            contentClassName="border border-surface-mid bg-[var(--color-surface-ink-soft)]"
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      <ChatComposer
        value={input}
        onChange={setInput}
        onKeyDown={handleKeyDown}
        onSend={handleSend}
        disabled={loading || !input.trim()}
        loading={loading}
        placeholder="Describe your business idea or ask a question..."
        textareaRef={textareaRef}
        className="border-t border-surface-mid pt-4"
        textareaClassName="max-h-[200px] border-border-subtle bg-white pr-12 transition-[border-color,box-shadow] duration-200"
        footer={
          <p className="mt-2 text-xs text-muted-foreground">
            {formatRemainingCredits(credits)} | Press Enter to send, Shift+Enter for new line
          </p>
        }
      />
    </div>
  )
}

function dedupeMessages(messages: Message[]) {
  const seen = new Set<string>()
  const deduped: Message[] = []

  for (const message of messages) {
    if (seen.has(message.id)) continue
    seen.add(message.id)
    deduped.push(message)
  }

  return deduped
}
