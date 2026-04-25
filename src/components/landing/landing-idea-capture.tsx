"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

const SESSION_IDEA_KEY = "idea2app:intake:draft"

interface LandingIdeaCaptureProps {
  isAuthenticated?: boolean
}

export function LandingIdeaCapture({ isAuthenticated = false }: LandingIdeaCaptureProps) {
  const router = useRouter()
  const [idea, setIdea] = useState("")
  const [loadingMode, setLoadingMode] = useState<"signin" | "signup" | null>(null)
  const [error, setError] = useState<string | null>(null)

  const trimmedIdea = idea.trim()
  const hasIdea = trimmedIdea.length > 0

  const startFlow = async (mode: "signin" | "signup") => {
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
    <div data-testid="landing-idea-capture" className="w-full max-w-[720px] border border-border-subtle bg-white p-4 sm:p-5">
      <label htmlFor="landing-idea" className="text-sm font-semibold text-text-primary">
        Start with your idea
      </label>
      <Textarea
        id="landing-idea"
        value={idea}
        onChange={(event) => setIdea(event.target.value)}
        placeholder="Describe what you want to build in a few sentences..."
        className="mt-3 min-h-[118px] rounded-md bg-white text-[15px] leading-relaxed"
      />
      {error && (
        <p className="mt-3 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-text-secondary">
          {hasIdea
            ? "Your idea will be waiting in the project wizard after sign-in."
            : "You can also start blank and write the idea after signing in."}
        </p>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => startFlow("signin")}
            disabled={loadingMode !== null}
            className="h-11"
            data-testid="landing-idea-signin"
          >
            {loadingMode === "signin" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Sign In
          </Button>
          <Button
            type="button"
            onClick={() => startFlow("signup")}
            disabled={loadingMode !== null}
            className="h-11"
            data-testid="landing-idea-signup"
          >
            {loadingMode === "signup" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
