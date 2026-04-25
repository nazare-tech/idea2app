"use client"

import Image from "next/image"
import { Check, Copy, Send, User, Bot } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { APP_BRAND_LOGO_ALT } from "@/lib/app-brand"
import { cn } from "@/lib/utils"
import { uiStylePresets } from "@/lib/ui-style-presets"

export function ChatAssistantAvatar({
  variant = "icon",
  className,
}: {
  variant?: "icon" | "logo"
  className?: string
}) {
  if (variant === "logo") {
    return (
      <div
        className={cn(
          "mt-0 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md shadow-sm",
          className
        )}
      >
        <Image
          src="/idea2app-logo.jpg"
          alt={APP_BRAND_LOGO_ALT}
          width={32}
          height={32}
          className="object-cover scale-[1.7]"
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[var(--color-accent-primary)] bg-gradient-to-br from-[var(--color-accent-primary-soft)] to-[#7c3aed]/20",
        className
      )}
    >
      <Bot className={uiStylePresets.chatBrandIcon} />
    </div>
  )
}

export function ChatUserAvatar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/60",
        className
      )}
    >
      <User className="h-4 w-4 text-muted-foreground" />
    </div>
  )
}

export function ChatCopyButton({
  copied,
  onClick,
  className,
}: {
  copied: boolean
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "absolute -bottom-3 right-2 rounded-lg border border-border/40 bg-background/90 p-1.5 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:border-primary/50",
        className
      )}
    >
      {copied ? (
        <Check className="h-3 w-3 text-[#34d399]" />
      ) : (
        <Copy className="h-3 w-3 text-muted-foreground" />
      )}
    </button>
  )
}

export function ChatMarkdownBody({
  content,
  className,
}: {
  content: string
  className?: string
}) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}

export function ChatLoadMoreButton({
  onClick,
  disabled,
  label,
  className,
}: {
  onClick: () => void
  disabled?: boolean
  label: string
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-lg border px-3 py-1.5 text-xs transition-colors disabled:opacity-60",
        className
      )}
    >
      {label}
    </button>
  )
}

export function ChatThinkingIndicator({
  children = "Thinking...",
  assistantAvatar,
  className,
  contentClassName,
}: {
  children?: React.ReactNode
  assistantAvatar?: React.ReactNode
  className?: string
  contentClassName?: string
}) {
  return (
    <div className={cn("flex gap-3", className)}>
      {assistantAvatar}
      <div className={cn("rounded-2xl px-4 py-3", contentClassName)}>
        <div className="ui-row-gap-2">
          <Spinner size="sm" />
          <span className="text-sm ui-text-sm-muted">{children}</span>
        </div>
      </div>
    </div>
  )
}

interface ChatComposerProps {
  value: string
  onChange: (value: string) => void
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onSend: () => void
  disabled?: boolean
  sendDisabled?: boolean
  loading: boolean
  placeholder: string
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  rows?: number
  className?: string
  innerClassName?: string
  textareaClassName?: string
  sendButtonClassName?: string
  footer?: React.ReactNode
}

export function ChatComposer({
  value,
  onChange,
  onKeyDown,
  onSend,
  disabled = false,
  sendDisabled,
  loading,
  placeholder,
  textareaRef,
  rows = 5,
  className,
  innerClassName,
  textareaClassName,
  sendButtonClassName,
  footer,
}: ChatComposerProps) {
  const isSendDisabled = sendDisabled ?? disabled

  return (
    <div className={className}>
      <div className={cn("flex items-end gap-3", innerClassName)}>
        <div className="relative min-w-0 flex-1">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className={cn(
              "min-h-[48px] w-full resize-none rounded-2xl border px-4 py-3 text-sm placeholder:text-text-secondary focus-visible:border-[var(--color-accent-primary-mid)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary-light)] focus-visible:ring-offset-0",
              textareaClassName
            )}
            rows={rows}
            disabled={disabled}
          />
        </div>
        <Button
          type="button"
          onClick={onSend}
          disabled={isSendDisabled}
          size="icon"
          className={cn("h-12 w-12 shrink-0 rounded-2xl", sendButtonClassName)}
        >
          {loading ? (
            <Spinner size="sm" className="text-primary-foreground" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      {footer}
    </div>
  )
}
