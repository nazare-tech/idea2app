"use client"

import { useEffect, useRef, useState } from "react"
import { LoaderCircle, RefreshCw } from "lucide-react"

import type { PublicResearchRun } from "../lib/server/research-job-service"

const ACTIVE = new Set(["queued", "running", "importing"])

export function ResearchRunControl() {
  const [token, setToken] = useState("")
  const [job, setJob] = useState<PublicResearchRun>({ status: "idle" })
  const [error, setError] = useState<string | null>(null)
  const announcedJob = useRef<string | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    async function initialize() {
      try {
        const bootstrap = await fetch("/api/bootstrap", { cache: "no-store" })
        const bootstrapBody = await bootstrap.json() as { launchToken?: string; error?: string }
        if (!bootstrap.ok || !bootstrapBody.launchToken) throw new Error(bootstrapBody.error || "Could not open the local workspace.")
        if (cancelled) return
        setToken(bootstrapBody.launchToken)
        const response = await fetch("/api/research-job", { cache: "no-store", headers: { "x-research-token": bootstrapBody.launchToken } })
        const body = await response.json() as { job?: PublicResearchRun; error?: string }
        if (!response.ok || !body.job) throw new Error(body.error || "Could not read research status.")
        if (!cancelled) setJob(body.job)
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not read research status.")
      }
    }
    void initialize()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!token || !ACTIVE.has(job.status)) return
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/research-job", { cache: "no-store", headers: { "x-research-token": token } })
        const body = await response.json() as { job?: PublicResearchRun; error?: string }
        if (!response.ok || !body.job) throw new Error(body.error || "Could not read research status.")
        setJob(body.job)
        if (body.job.status === "succeeded" && body.job.id !== announcedJob.current) {
          announcedJob.current = body.job.id
          window.dispatchEvent(new CustomEvent("research-run-complete"))
        }
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Could not read research status.")
      }
    }, 2_500)
    return () => window.clearTimeout(timer)
  }, [job, token])

  async function start() {
    if (!token || ACTIVE.has(job.status)) return
    setError(null)
    setJob({ status: "queued" })
    try {
      const response = await fetch("/api/research-job", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-research-token": token },
        body: "{}",
      })
      const body = await response.json() as { job?: PublicResearchRun; error?: string }
      if (!response.ok || !body.job) throw new Error(body.error || "Could not start research.")
      setJob(body.job)
    } catch (reason) {
      setJob({ status: "failed", retryable: true })
      setError(reason instanceof Error ? reason.message : "Could not start research.")
    }
  }

  const active = ACTIVE.has(job.status)
  const label = active ? "Research running" : job.status === "failed" ? "Retry research" : job.status === "succeeded" ? "Run again" : "Run last 30 days"
  const status = error || (job.status === "succeeded"
    ? `Added ${job.importedCount ?? 0} new cards${job.warningCount ? `, with ${job.warningCount} import warnings` : ""}.`
    : job.status === "failed" ? job.error || "Research failed. Your inbox is unchanged."
      : job.status === "importing" ? "Importing new findings…"
        : active ? "Codex is searching the last 30 days…" : "")

  return <div className="research-run-control">
    <button className="button primary research-run-button" type="button" disabled={!token || active} onClick={start}>
      {active ? <LoaderCircle className="spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}{label}
    </button>
    <span className={error || job.status === "failed" ? "research-run-status is-error" : "research-run-status"} role="status" aria-live="polite" aria-atomic="true">{status}</span>
  </div>
}
