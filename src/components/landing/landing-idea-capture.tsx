"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { validateIdeaInput } from "@/lib/intake/idea-validation"
import {
  buildLandingAuthModalPath,
  buildLandingIntakeNextPath,
} from "@/lib/landing-intake-handoff"

const SESSION_IDEA_KEY = "makercompass:intake:draft"

interface LandingIdeaCaptureProps {
  isAuthenticated?: boolean
}

/** Textarea heights for the collapsed one-line row and the focused multi-line state. */
const COLLAPSED_HEIGHT = 46
const EXPANDED_HEIGHT = 118
/** Horizontal room reserved for the side-by-side button while collapsed (button + gap). */
const BUTTON_ZONE = 158

export function LandingIdeaCapture({ isAuthenticated = false }: LandingIdeaCaptureProps) {
  const router = useRouter()
  const [idea, setIdea] = useState("")
  const [loadingMode, setLoadingMode] = useState<"signin" | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Collapsed: one-line input with the button beside it. Focusing animates the
  // textarea taller and slides the button below it (it collapses back only
  // when the field loses focus while empty).
  const [expanded, setExpanded] = useState(false)
  // The one-line row only fits comfortably at sm+; small screens always
  // render the stacked (expanded) layout.
  const [isRowLayout, setIsRowLayout] = useState(true)

  useEffect(() => {
    const rowQuery = window.matchMedia("(min-width: 640px)")
    const syncRowLayout = () => setIsRowLayout(rowQuery.matches)

    syncRowLayout()
    rowQuery.addEventListener("change", syncRowLayout)
    return () => rowQuery.removeEventListener("change", syncRowLayout)
  }, [])

  const isOpen = expanded || !isRowLayout

  const trimmedIdea = idea.trim()
  const hasIdea = trimmedIdea.length > 0
  // Empty input still allows a plain sign-up; a partial idea must reach the
  // shared minimum before we accept it into the intake flow.
  const ideaValidation = validateIdeaInput(idea)
  const ideaHint = hasIdea && ideaValidation.status !== "ok" ? ideaValidation.message : null

  const startFlow = async () => {
    setError(null)
    setLoadingMode("signin")

    try {
      let nextPath = hasIdea ? buildLandingIntakeNextPath() : "/projects/new"

      if (hasIdea) {
        window.sessionStorage.setItem(SESSION_IDEA_KEY, idea)
        const response = await fetch("/api/intake/pending", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idea: trimmedIdea, source: "landing" }),
        })
        const data = await response.json().catch(() => null)

        if (response.ok && data?.token) {
          nextPath = buildLandingIntakeNextPath(data.token)
        } else {
          setError("We saved this idea in this browser tab. Sign in to continue; if it does not appear, paste it again.")
        }
      }

      if (isAuthenticated) {
        router.push(nextPath)
        return
      }

      router.push(buildLandingAuthModalPath(nextPath), { scroll: false })
    } catch {
      const nextPath = hasIdea ? buildLandingIntakeNextPath() : "/projects/new"
      if (hasIdea) {
        setError("We saved this idea in this browser tab. Sign in to continue; if it does not appear, paste it again.")
      }

      if (isAuthenticated) {
        router.push(nextPath)
        return
      }

      router.push(buildLandingAuthModalPath(nextPath), { scroll: false })
    } finally {
      setLoadingMode(null)
    }
  }

  return (
    <div
      data-testid="landing-idea-capture"
      className="relative w-full max-w-[652px] rounded-md border border-[#8A8480] bg-white p-3 text-left"
      onBlur={(event) => {
        // Collapse only when focus leaves the whole widget while empty, so
        // clicking Get Started never yanks the button out from under the pointer.
        const next = event.relatedTarget as Node | null
        if (!event.currentTarget.contains(next) && !hasIdea && loadingMode === null) {
          setExpanded(false)
        }
      }}
    >
      <label htmlFor="landing-idea" className="sr-only">
        Describe what you want to build
      </label>
      <Textarea
        id="landing-idea"
        value={idea}
        onChange={(event) => setIdea(event.target.value)}
        onFocus={() => setExpanded(true)}
        placeholder="Describe what you want to build in a few sentences..."
        className="block min-h-0 resize-none overflow-hidden rounded-md border-border-strong bg-white px-[13px] py-3 text-[15px] leading-[1.25] text-text-primary placeholder:text-text-secondary transition-[height,width] duration-[350ms] ease-out-expo"
        style={{
          height: isOpen ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT,
          width: isOpen ? "100%" : `calc(100% - ${BUTTON_ZONE}px)`,
        }}
      />
      {ideaHint && (
        <p className="mt-3 text-[13px] leading-snug text-text-secondary" data-testid="landing-idea-hint">
          {ideaHint}
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {/* Grows to open a row below the textarea; the absolutely positioned
          button rides the container's bottom-right corner into that row. */}
      <div
        aria-hidden="true"
        className="transition-[height] duration-[350ms] ease-out-expo"
        style={{ height: isOpen ? COLLAPSED_HEIGHT + 12 : 0 }}
      />
      <Button
        type="button"
        onClick={startFlow}
        disabled={loadingMode !== null || ideaHint !== null}
        className="absolute bottom-3 right-3 h-[46px] rounded-md bg-[#1C1917] px-5 text-sm font-semibold text-white hover:bg-[#1C1917]/85"
        data-testid="landing-idea-signup"
      >
        {loadingMode === "signin" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {loadingMode === "signin" ? "Validating" : "Get Started"}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
