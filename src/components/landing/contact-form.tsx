"use client"

import { useState } from "react"
import { ArrowRight, CheckCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CONTACT_MESSAGE_MAX, CONTACT_MESSAGE_MIN, CONTACT_NAME_MAX } from "@/lib/contact"

const fieldClassName = "rounded-sm border-border-subtle bg-white text-[15px]"

/**
 * Public contact form on /contact. Submissions are stored in the
 * contact_requests table via POST /api/contact; there is no support inbox.
 */
export function ContactForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus("loading")
    setErrorMessage("")

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      })
      const data = (await res.json()) as { error?: string }

      if (!res.ok) {
        setStatus("error")
        setErrorMessage(data.error ?? "Something went wrong. Please try again.")
      } else {
        setStatus("success")
      }
    } catch {
      setStatus("error")
      setErrorMessage("Something went wrong. Please try again.")
    }
  }

  if (status === "success") {
    return (
      <div className="flex items-center gap-3 rounded-sm border border-green-200 bg-green-50 px-6 py-5 text-green-800">
        <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />
        <p className="text-sm font-medium">
          Message received. A human will read it and reply to your email, usually within one business day.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="contact-name" className="text-sm font-medium text-text-primary">
            Name <span className="font-normal text-text-muted">(optional)</span>
          </Label>
          <Input
            id="contact-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={CONTACT_NAME_MAX}
            disabled={status === "loading"}
            className={fieldClassName}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="contact-email" className="text-sm font-medium text-text-primary">
            Email
          </Label>
          <Input
            id="contact-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            disabled={status === "loading"}
            className={fieldClassName}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="contact-message" className="text-sm font-medium text-text-primary">
          Message
        </Label>
        <Textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What do you need help with? For product feedback, a couple of sentences on what you expected to happen is plenty."
          required
          minLength={CONTACT_MESSAGE_MIN}
          maxLength={CONTACT_MESSAGE_MAX}
          rows={6}
          disabled={status === "loading"}
          className={`${fieldClassName} min-h-[160px] resize-y`}
        />
      </div>

      {status === "error" && errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

      <div>
        <Button
          type="submit"
          disabled={status === "loading"}
          className="h-11 rounded-md bg-primary px-6 text-sm font-semibold text-white hover:bg-primary/90"
        >
          {status === "loading" ? "Sending…" : "Send message"}
          {status !== "loading" && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </div>
    </form>
  )
}
