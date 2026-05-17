"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

const SESSION_IDEA_KEY = "makercompass:intake:draft"

interface LandingIdeaCaptureProps {
  isAuthenticated?: boolean
}

export function LandingIdeaCapture({ isAuthenticated = false }: LandingIdeaCaptureProps) {
  const router = useRouter()
  const [idea, setIdea] = useState("")
  const [loadingMode, setLoadingMode] = useState<"signup" | null>(null)
  const [error, setError] = useState<string | null>(null)

  const trimmedIdea = idea.trim()
  const hasIdea = trimmedIdea.length > 0

  const startFlow = async (mode: "signup") => {
    setError(null)
    setLoadingMode(mode)

    try {
      let nextPath = "/projects/new"

      if (hasIdea) {
        window.sessionStorage.setItem(SESSION_IDEA_KEY, idea)
        const response = await fetch("/api/intake/pending", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idea: trimmedIdea, source: "landing" }),
        })
        const data = await response.json().catch(() => null)

        if (response.ok && data?.token) {
          nextPath = `/projects/new?intake=${encodeURIComponent(data.token)}`
        }
      }

      if (isAuthenticated) {
        router.push(nextPath)
        return
      }

      router.push(`/?modal=auth&mode=${mode}&next=${encodeURIComponent(nextPath)}`, { scroll: false })
    } catch {
      setError("We could not save the idea for auth handoff. Please try again.")
    } finally {
      setLoadingMode(null)
    }
  }

  return (
    <div
      data-testid="landing-idea-capture"
      className="w-full max-w-[720px] border border-border-strong bg-white px-4 py-5 shadow-[0_1px_2px_rgba(0,0,0,0.18)] sm:px-[21px] sm:pb-[21px] sm:pt-[23px]"
    >
      <label htmlFor="landing-idea" className="sr-only">
        Describe what you want to build
      </label>
      <Textarea
        id="landing-idea"
        value={idea}
        onChange={(event) => setIdea(event.target.value)}
        placeholder="Describe what you want to build in a few sentences..."
        className="min-h-[118px] resize-none rounded-md border-border-strong bg-[#FFF8F7] px-4 py-3 text-[15px] leading-6 text-text-primary placeholder:text-text-secondary"
      />
      {error && (
        <p className="mt-3 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="mt-[14px] flex justify-end">
        <Button
          type="button"
          onClick={() => startFlow("signup")}
          disabled={loadingMode !== null}
          className="h-11 rounded-md px-5 text-sm"
          data-testid="landing-idea-signup"
        >
          {loadingMode === "signup" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loadingMode === "signup" ? "Validating" : "Validate idea"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
