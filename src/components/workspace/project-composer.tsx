// src/components/workspace/project-composer.tsx
// "Ask this project" floating composer (command-bar form factor from the
// Project Composer v3 design). Ephemeral scratch session: messages live only
// in component state, nothing is saved, and answers never edit documents.
"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  AlignLeft,
  ArrowUp,
  ChevronDown,
  CircleHelp,
  ListChecks,
  RotateCcw,
  Sparkle,
  X,
  Clock,
} from "lucide-react"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer"
import { cn } from "@/lib/utils"
import { UpgradeCtaLink } from "@/components/analytics/upgrade-cta-link"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useSheetModalFocus } from "@/hooks/use-sheet-modal-focus"

interface ComposerMessage {
  id: number
  role: "user" | "assistant"
  text: string
  isError?: boolean
}

interface ProjectComposerProps {
  projectId: string
  projectName: string
  /** Nav key of the document currently in view (e.g. "prd", "market-research") */
  activeDocKey: string
  /** Free-plan gate: render an upgrade CTA instead of the chat input. */
  upgradeRequired?: boolean
  /** Mobile chrome auto-hide state; the FAB drops with the peek bar. */
  mobileChromeHidden?: boolean
  /** Mobile documents sheet open: the FAB rides above the sheet. */
  mobileLifted?: boolean
  /** Lets the workspace react to the composer opening (e.g. close the documents sheet). */
  onOpenChange?: (open: boolean) => void
}

const MAX_INPUT_HEIGHT_PX = 132
// How close to the bottom (px) still counts as "at the bottom" for sticky
// autoscroll. Absorbs fractional scrollTop values and tiny accidental nudges.
const STICK_TO_BOTTOM_THRESHOLD_PX = 48

/** Mono uppercase kicker, matching the workspace mc-label idiom. */
const kickerClass =
  "font-mono text-[10px] font-medium uppercase tracking-[0.18em]"

interface SuggestionChipConfig {
  label: string
  prompt: string
  icon: "summary" | "steps" | "question"
}

/**
 * Two realistic starter questions per document. Chips follow the document in
 * view so the suggestions match what the user is reading, but every question
 * is answered with whole-project context.
 */
const SUGGESTION_CHIPS: Record<string, [SuggestionChipConfig, SuggestionChipConfig]> = {
  "executive-summary": [
    { label: "Summarize this project", prompt: "Give me a short summary of this project and where it stands.", icon: "summary" },
    { label: "What should I do first?", prompt: "What should I do first to move this project forward?", icon: "steps" },
  ],
  "market-research": [
    { label: "Summarize the market research", prompt: "Summarize the market research: market size, competitors, and the main opportunity.", icon: "summary" },
    { label: "Who are my main competitors?", prompt: "Who are my main competitors, and how is this product different from them?", icon: "question" },
  ],
  prd: [
    { label: "Summarize the product plan", prompt: "Summarize the product plan: what we're building, for whom, and the core features.", icon: "summary" },
    { label: "Which features matter most?", prompt: "Which features in the product plan matter most, and why?", icon: "question" },
  ],
  mvp: [
    { label: "Summarize the first version plan", prompt: "Summarize the first version plan: the goal, the scope, and what's deliberately left out.", icon: "summary" },
    { label: "What do I build first?", prompt: "According to the build sequence, what should I build first and how do I test it?", icon: "steps" },
  ],
  mockups: [
    { label: "Compare the design concepts", prompt: "Compare the design mockup concepts and their trade-offs.", icon: "summary" },
    { label: "Which concept should I pick?", prompt: "Which design concept best fits the product plan, and why?", icon: "question" },
  ],
  "ai-prompts": [
    { label: "How do I use these files?", prompt: "How do I use the AI prompt files to start building? Walk me through the order.", icon: "steps" },
    { label: "Which AI tool should I use?", prompt: "Which AI build tool is recommended for this project, and why?", icon: "question" },
  ],
}

const DEFAULT_CHIPS = SUGGESTION_CHIPS["executive-summary"]

const CHIP_ICONS = {
  summary: <AlignLeft className="h-[15px] w-[15px]" />,
  steps: <ListChecks className="h-[15px] w-[15px]" />,
  question: <CircleHelp className="h-[15px] w-[15px]" />,
} as const

/**
 * Mobile "Ask this project" floating action button (design: 54px red circle,
 * bottom-right, riding above whichever bottom chrome is showing). The 60dvh
 * lift matches MOBILE_DOCUMENT_SHEET_HEIGHT_CLASS in mobile-document-bar.tsx —
 * Tailwind's JIT needs the literal here.
 */
function AskProjectFab({
  onClick,
  chromeHidden,
  lifted,
  reduceMotion,
}: {
  onClick: () => void
  chromeHidden: boolean
  lifted: boolean
  reduceMotion: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Ask this project"
      className={cn(
        "absolute right-4 z-[45] flex h-[54px] w-[54px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_4px_20px_rgba(15,23,42,0.18)] lg:hidden",
        !reduceMotion && "transition-[bottom] duration-[280ms] ease-[var(--ease-out-expo)]",
        lifted
          ? "bottom-[calc(60dvh+0.875rem)]"
          : chromeHidden
            ? "bottom-[calc(env(safe-area-inset-bottom)+0.75rem)]"
            : "bottom-[calc(env(safe-area-inset-bottom)+4.25rem)]",
      )}
    >
      <Sparkle aria-hidden="true" className="h-[22px] w-[22px]" />
    </button>
  )
}

function SuggestionChip({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3.5 py-2 text-[13.5px] font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-primary/[0.02]"
    >
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      {label}
    </button>
  )
}

export function ProjectComposer({
  projectId,
  projectName,
  activeDocKey,
  upgradeRequired = false,
  mobileChromeHidden = false,
  mobileLifted = false,
  onOpenChange,
}: ProjectComposerProps) {
  const reduceMotion = useReducedMotion()
  // Mount-level breakpoint split (not CSS hiding): a hidden-but-mounted
  // UpgradeCtaLink would record phantom upgrade_cta_viewed impressions.
  const isDesktop = useMediaQuery("(min-width: 1024px)")
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<ComposerMessage[]>([])
  const [streaming, setStreaming] = useState(false)

  const idRef = useRef(0)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const wasOpenRef = useRef(false)
  // Sticky autoscroll: true while the user is at (or near) the bottom of the
  // conversation. Scrolling up to read pauses autoscroll; scrolling back to
  // the bottom, or sending a new message, resumes it. A ref (not state) so
  // scroll events never trigger re-renders.
  const stickToBottomRef = useRef(true)

  const hasConversation = messages.length > 0
  const lastMessage = messages[messages.length - 1]
  const waitingForFirstToken =
    streaming && (!lastMessage || lastMessage.role === "user" || !lastMessage.text)

  // Focus the input when the composer opens. preventScroll: focusing must not
  // scroll the overflow-hidden workspace wrapper, which would drag the mobile
  // sheet (positioned absolute within it) off-screen.
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      inputRef.current?.focus({ preventScroll: true })
    }
    wasOpenRef.current = open
  }, [open])

  // The workspace closes the mobile documents sheet when the composer opens.
  useEffect(() => {
    onOpenChange?.(open)
  }, [open, onOpenChange])

  // Track whether the user is near the bottom of the conversation. Only an
  // upward scroll (scrollTop decreasing) pauses autoscroll; landing back near
  // the bottom resumes it. Distance alone is not enough: our own programmatic
  // scroll event can be handled after new streamed content has already grown
  // scrollHeight, which would look like "away from bottom" and wrongly pause.
  const lastScrollTopRef = useRef(0)
  useEffect(() => {
    const el = panelRef.current
    if (!el || !open) return
    lastScrollTopRef.current = el.scrollTop
    const handleScroll = () => {
      const top = el.scrollTop
      const distanceFromBottom = el.scrollHeight - top - el.clientHeight
      if (top < lastScrollTopRef.current - 1) {
        stickToBottomRef.current = false
      } else if (distanceFromBottom <= STICK_TO_BOTTOM_THRESHOLD_PX) {
        stickToBottomRef.current = true
      }
      lastScrollTopRef.current = top
    }
    // Wheel/trackpad gestures adjust stickiness immediately. The scroll
    // listener alone is not enough during fast streaming: a render can move
    // the panel between the gesture and its scroll event, so the coalesced
    // event misreads the user's intent. Wheel up always pauses; wheel down
    // that would land at (or past) the bottom resumes.
    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY < 0) {
        stickToBottomRef.current = false
      } else if (event.deltaY > 0) {
        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
        if (distanceFromBottom - event.deltaY <= STICK_TO_BOTTOM_THRESHOLD_PX) {
          stickToBottomRef.current = true
        }
      }
    }
    el.addEventListener("scroll", handleScroll, { passive: true })
    el.addEventListener("wheel", handleWheel, { passive: true })
    return () => {
      el.removeEventListener("scroll", handleScroll)
      el.removeEventListener("wheel", handleWheel)
    }
  }, [open])

  // Keep the conversation scrolled to the newest content, unless the user
  // scrolled up to read earlier messages. Runs synchronously after commit
  // (no requestAnimationFrame: the DOM is already up to date here, and rAF
  // callbacks are suspended entirely in background tabs).
  useEffect(() => {
    const el = panelRef.current
    if (!el || !stickToBottomRef.current) return
    el.scrollTop = el.scrollHeight
  }, [messages, streaming])

  // Abort any in-flight request on unmount.
  useEffect(() => () => abortRef.current?.abort(), [])

  // Clicking outside the composer collapses it when the input is empty.
  // Typed-but-unsent text keeps it open, and a streaming answer is never
  // hidden mid-flight.
  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: MouseEvent) => {
      const card = cardRef.current
      if (!card || card.contains(event.target as Node)) return
      if (inputRef.current?.value.trim()) return
      if (streaming) return
      setOpen(false)
    }
    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [open, streaming])

  const resizeInput = useCallback(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT_PX)}px`
  }, [])

  const send = useCallback(
    async (rawText: string) => {
      const text = rawText.trim()
      if (!text || streaming) return

      // History is the conversation before this question, bounded server-side.
      const history = messages
        .filter((m) => !m.isError)
        .map((m) => ({ role: m.role, content: m.text }))

      const userMessage: ComposerMessage = {
        id: ++idRef.current,
        role: "user",
        text,
      }
      setMessages((prev) => [...prev, userMessage])
      setInput("")
      setOpen(true)
      setStreaming(true)
      // A new question always snaps the view back to the latest exchange.
      stickToBottomRef.current = true
      requestAnimationFrame(() => resizeInput())

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const response = await fetch(`/api/projects/${projectId}/composer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // Always answer with whole-project context; docKey tells the
          // assistant which document the user is currently viewing.
          body: JSON.stringify({
            message: text,
            scope: "project",
            docKey: activeDocKey,
            history,
          }),
          signal: controller.signal,
        })

        if (!response.ok || !response.body) {
          const payload = await response.json().catch(() => null)
          throw new Error(
            payload?.error ?? "The assistant could not answer right now. Please try again."
          )
        }

        const assistantId = ++idRef.current
        setMessages((prev) => [
          ...prev,
          { id: assistantId, role: "assistant", text: "" },
        ])

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const token = decoder.decode(value, { stream: true })
          if (!token) continue
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, text: m.text + token } : m
            )
          )
        }
      } catch (error) {
        if (controller.signal.aborted) return
        const message =
          error instanceof Error && error.message
            ? error.message
            : "The assistant could not answer right now. Please try again."
        setMessages((prev) => [
          ...prev,
          {
            id: ++idRef.current,
            role: "assistant",
            text: message,
            isError: true,
          },
        ])
      } finally {
        if (abortRef.current === controller) abortRef.current = null
        setStreaming(false)
      }
    },
    [activeDocKey, messages, projectId, resizeInput, streaming]
  )

  const resetSession = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setMessages([])
    setStreaming(false)
    setInput("")
    setOpen(true)
    inputRef.current?.focus()
  }, [])

  // Mobile sheets get full modal semantics (Escape, focus trap, restore).
  // Desktop keeps the non-modal command bar, so the workspace scroll-spy's
  // aria-modal guard must not engage there.
  const upgradeSheetRef = useRef<HTMLDivElement>(null)
  const upgradeCloseButtonRef = useRef<HTMLButtonElement>(null)
  const closeComposer = useCallback(() => setOpen(false), [])
  const mobileSheetActive = open && !isDesktop
  useSheetModalFocus(upgradeSheetRef, upgradeRequired && mobileSheetActive, {
    onClose: closeComposer,
    initialFocusRef: upgradeCloseButtonRef,
  })
  // The chat sheet manages its own initial focus (the textarea autofocus).
  useSheetModalFocus(cardRef, !upgradeRequired && mobileSheetActive, { onClose: closeComposer })

  // Free-plan gate: the composer is a paid feature. Desktop keeps the compact
  // upgrade bar; mobile gets the same FAB, opening an upgrade bottom sheet.
  // The API enforces the same rule.
  if (upgradeRequired) {
    return (
      <>
        {!isDesktop && !open && (
          <AskProjectFab
            onClick={() => setOpen(true)}
            chromeHidden={mobileChromeHidden}
            lifted={mobileLifted}
            reduceMotion={reduceMotion}
          />
        )}
        {!isDesktop && open && (
          <div className="absolute inset-0 z-40 lg:hidden" data-testid="project-composer-upgrade-sheet">
            <div
              aria-hidden="true"
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-foreground/45"
            />
            <div
              ref={upgradeSheetRef}
              role="dialog"
              aria-modal="true"
              aria-label="Ask this project"
              className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-card px-[18px] pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3.5 shadow-[0_-4px_20px_rgba(15,23,42,0.12)]"
              style={reduceMotion ? undefined : { animation: "composerSheetUp .3s var(--ease-out-expo)" }}
            >
              <style>{`@keyframes composerSheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
              <div className="flex items-center gap-2.5">
                <span className={cn(kickerClass, "inline-flex items-center gap-[7px] text-primary")}>
                  <Sparkle className="h-[13px] w-[13px]" />
                  Ask this project
                </span>
                <div className="flex-1" />
                <button
                  ref={upgradeCloseButtonRef}
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-[15px] w-[15px]" />
                </button>
              </div>
              <p className="mb-4 mt-3 text-sm leading-snug text-muted-foreground">
                Chat with your project documents on a paid plan.
              </p>
              <UpgradeCtaLink
                surface="project_composer"
                projectId={projectId}
                className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Upgrade
              </UpgradeCtaLink>
            </div>
          </div>
        )}
        {isDesktop && (
        <div
          data-testid="project-composer-upgrade"
          className="pointer-events-none absolute bottom-6 left-1/2 z-40 flex w-[min(724px,calc(100%-72px))] -translate-x-1/2 flex-col"
        >
          <div className="pointer-events-auto flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-[0_4px_20px_rgba(15,23,42,0.06)]">
            <span className={cn(kickerClass, "inline-flex shrink-0 items-center gap-[7px] text-primary")}>
              <Sparkle className="h-[13px] w-[13px]" />
              Ask this project
            </span>
            <p className="m-0 min-w-0 flex-1 text-sm leading-snug text-muted-foreground">
              Chat with your project documents on a paid plan.
            </p>
            <UpgradeCtaLink
              surface="project_composer"
              projectId={projectId}
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Upgrade
            </UpgradeCtaLink>
          </div>
        </div>
        )}
      </>
    )
  }

  const canSend = input.trim().length > 0 && !streaming

  const assistantAvatar = (
    <span className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md bg-primary/10">
      <Sparkle className="h-3.5 w-3.5 text-primary" />
    </span>
  )

  return (
    <>
      {/* Mobile: the collapsed composer is a FAB; opening it shows a bottom
          sheet over a dark overlay. Desktop (lg+) keeps the command bar. */}
      {!isDesktop && !open && (
        <AskProjectFab
          onClick={() => setOpen(true)}
          chromeHidden={mobileChromeHidden}
          lifted={mobileLifted}
          reduceMotion={reduceMotion}
        />
      )}
      {!isDesktop && open && (
        <div
          aria-hidden="true"
          onClick={() => setOpen(false)}
          className="absolute inset-0 z-[39] bg-foreground/45 lg:hidden"
        />
      )}
    <div
      data-testid="project-composer"
      className={cn(
        "pointer-events-none absolute z-40 flex-col",
        "lg:bottom-6 lg:left-1/2 lg:flex lg:w-[min(724px,calc(100%-72px))] lg:-translate-x-1/2",
        open ? "inset-x-0 bottom-0 flex lg:inset-x-auto" : "hidden",
      )}
    >
      <style>{`
        @keyframes composerUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes composerDot{0%,80%,100%{opacity:.22}40%{opacity:1}}
        @keyframes composerSheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        /* The composer card is the focus surface; the input itself is borderless per design. */
        [data-testid="project-composer"] textarea:focus-visible{outline:none}
      `}</style>
      <div
        ref={cardRef}
        role={mobileSheetActive ? "dialog" : undefined}
        aria-modal={mobileSheetActive ? "true" : undefined}
        aria-label={mobileSheetActive ? "Ask this project" : undefined}
        className={cn(
          "pointer-events-auto flex flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-[0_4px_20px_rgba(15,23,42,0.06)] lg:rounded-2xl",
          open &&
            "max-lg:h-[70dvh] max-lg:border-x-0 max-lg:border-b-0 max-lg:pb-[env(safe-area-inset-bottom)] max-lg:shadow-[0_-4px_20px_rgba(15,23,42,0.12)]",
          open && !reduceMotion && "max-lg:animate-[composerSheetUp_.3s_var(--ease-out-expo)]",
        )}
      >
        {open && (
          <>
            {/* Header */}
            <div
              className="shrink-0 px-[18px] pb-2.5 pt-3.5"
              style={{ animation: "composerUp .28s var(--ease-out-expo)" }}
            >
              <div className="flex items-center gap-2.5">
                <span className={cn(kickerClass, "inline-flex items-center gap-[7px] text-primary")}>
                  <Sparkle className="h-[13px] w-[13px]" />
                  Ask this project
                </span>
                <div className="flex-1" />
                {hasConversation && (
                  <button
                    type="button"
                    onClick={resetSession}
                    className="inline-flex items-center gap-[5px] rounded-full px-[9px] py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <RotateCcw className="h-3 w-3" />
                    New
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Collapse assistant"
                  className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <ChevronDown className="h-[15px] w-[15px]" />
                </button>
              </div>
            </div>

            {/* Conversation body: bounded below the desktop command bar, the
                flexible middle region of the mobile sheet. */}
            <div
              ref={panelRef}
              className="overflow-y-auto overflow-x-hidden px-[18px] pb-[18px] max-lg:min-h-0 max-lg:flex-1 lg:max-h-[46vh]"
            >
              {!hasConversation && !streaming && (
                <div style={{ animation: "composerUp .28s var(--ease-out-expo)" }}>
                  <p className="m-0 text-sm leading-[1.55] text-text-secondary">
                    Ask anything about {projectName}. Answers read your generated
                    docs.
                  </p>
                  <div className="mt-3.5 flex flex-wrap gap-2">
                    {(SUGGESTION_CHIPS[activeDocKey] ?? DEFAULT_CHIPS).map((chip) => (
                      <SuggestionChip
                        key={chip.label}
                        icon={CHIP_ICONS[chip.icon]}
                        label={chip.label}
                        onClick={() => void send(chip.prompt)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {hasConversation && (
                <div className="flex flex-col gap-4">
                  {messages.map((message) =>
                    message.role === "user" ? (
                      <div
                        key={message.id}
                        className="flex justify-end"
                        style={{ animation: "composerUp .3s var(--ease-out-expo)" }}
                      >
                        <div className="max-w-[80%] whitespace-pre-wrap rounded-[14px] bg-foreground px-3.5 py-2.5 text-sm leading-[1.55] text-background">
                          {message.text}
                        </div>
                      </div>
                    ) : message.text ? (
                      <div
                        key={message.id}
                        className={cn(
                          "rounded-xl border border-border-subtle bg-background px-[18px] py-4",
                          message.isError && "border-primary/30 bg-primary/[0.02]"
                        )}
                        style={{ animation: "composerUp .3s var(--ease-out-expo)" }}
                      >
                        <div className="mb-3 flex items-center gap-2">
                          {assistantAvatar}
                          <span className={cn(kickerClass, "text-muted-foreground")}>
                            Assistant
                          </span>
                        </div>
                        {message.isError ? (
                          <p className="m-0 text-sm leading-relaxed text-text-secondary">
                            {message.text}
                          </p>
                        ) : (
                          <MarkdownRenderer
                            content={message.text}
                            className="text-sm [&>*:first-child]:mt-0"
                          />
                        )}
                      </div>
                    ) : null
                  )}
                </div>
              )}

              {waitingForFirstToken && (
                <div
                  className={cn("flex items-center gap-2.5", hasConversation && "mt-4")}
                  style={{ animation: "composerUp .3s var(--ease-out-expo)" }}
                >
                  {assistantAvatar}
                  <span className="text-[13px] text-text-secondary">
                    Reading your project
                  </span>
                  <span className="inline-flex gap-[3px]">
                    {[0, 1, 2].map((dot) => (
                      <span
                        key={dot}
                        className="h-[5px] w-[5px] rounded-full bg-primary"
                        style={{
                          animation: `composerDot 1.2s infinite ${dot * 0.2}s`,
                        }}
                      />
                    ))}
                  </span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Input area (always visible; the collapsed state is just this row) */}
        <div
          className={cn(
            "shrink-0 bg-card px-3.5 pb-3 pt-2",
            open && "border-t border-border-subtle"
          )}
        >
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(event) => {
                setInput(event.target.value)
                resizeInput()
              }}
              onFocus={() => setOpen(true)}
              onClick={() => setOpen(true)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  void send(input)
                }
                if (event.key === "Escape") {
                  event.currentTarget.blur()
                  setOpen(false)
                }
              }}
              placeholder="Ask anything about this project…"
              maxLength={4000}
              className="max-h-[132px] flex-1 resize-none border-none bg-transparent px-1 py-2 text-base leading-normal text-foreground outline-none placeholder:text-muted-foreground lg:text-[14.5px]"
            />
            <button
              type="button"
              onClick={() => void send(input)}
              disabled={!canSend}
              aria-label="Send"
              className={cn(
                "inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] transition-colors",
                canSend
                  ? "cursor-pointer bg-primary text-primary-foreground"
                  : "cursor-default bg-border text-sidebar-muted"
              )}
            >
              <ArrowUp className="h-[17px] w-[17px]" strokeWidth={2.2} />
            </button>
          </div>
          {open && (
            <div className="mt-[9px] flex flex-wrap items-center gap-3 border-t border-border-subtle pt-[9px]">
              <span className="inline-flex items-center gap-[5px] text-[11.5px] text-muted-foreground">
                <X className="h-3 w-3" />
                This session isn&apos;t saved
              </span>
              <span className="h-[3px] w-[3px] rounded-full bg-border" />
              <span className="inline-flex items-center gap-[5px] text-[11.5px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                History off
              </span>
              <span className="h-[3px] w-[3px] rounded-full bg-border" />
              <span className="text-[11.5px] text-muted-foreground">
                Read-only, never edits your docs
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  )
}
