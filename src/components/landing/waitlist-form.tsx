"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRight, CheckCircle } from "lucide-react"

interface WaitlistFormProps {
  /** Show the "See How It Works" secondary button below the form (hero usage). */
  showSecondary?: boolean
}

export function WaitlistForm({ showSecondary = false }: WaitlistFormProps) {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus("loading")
    setMessage("")

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = (await res.json()) as { error?: string }

      if (!res.ok) {
        setStatus("error")
        setMessage(data.error ?? "Something went wrong. Please try again.")
      } else {
        setStatus("success")
        setEmail("")
      }
    } catch {
      setStatus("error")
      setMessage("Something went wrong. Please try again.")
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-4 w-full">
        <div className="flex items-center gap-3 rounded-sm border border-green-200 bg-green-50 px-6 py-4 text-green-800 w-full max-w-[500px]">
          <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />
          <p className="text-sm font-medium">
            You&apos;re on the list! We&apos;ll notify you when a spot opens up.
          </p>
        </div>
        {showSecondary && (
          <Link href="#features">
            <Button
              variant="outline"
              className="h-14 px-7 border-border-subtle text-base font-semibold bg-white text-text-primary"
            >
              See How It Works
            </Button>
          </Link>
        )}
      </div>
    )
  }

  return (
    <div id="waitlist" className="flex flex-col items-center gap-4 w-full">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-[500px] flex-col gap-3 sm:flex-row"
      >
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          disabled={status === "loading"}
          className="h-14 flex-1 border-border-subtle bg-white text-base px-4"
        />
        <Button
          type="submit"
          disabled={status === "loading"}
          className="h-14 px-7 bg-primary text-base font-semibold text-white shrink-0"
        >
          {status === "loading" ? "Joining…" : "Join Waitlist"}
          {status !== "loading" && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </form>

      {status === "error" && message && (
        <p className="text-sm text-red-600">{message}</p>
      )}

      {showSecondary && (
        <Link href="#features">
          <Button
            variant="outline"
            className="h-14 px-7 border-border-subtle text-base font-semibold bg-white text-text-primary"
          >
            See How It Works
          </Button>
        </Link>
      )}
    </div>
  )
}
