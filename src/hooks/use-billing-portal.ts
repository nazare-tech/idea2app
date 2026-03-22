"use client"

import { useCallback, useState } from "react"

interface BillingPortalResult {
  ok: boolean
  error?: string
}

export function useBillingPortal() {
  const [loading, setLoading] = useState(false)

  const openBillingPortal = useCallback(async (): Promise<BillingPortalResult> => {
    setLoading(true)

    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      })
      const data = await response.json()

      if (data?.url) {
        window.location.href = data.url
        return { ok: true }
      }

      return { ok: false, error: data?.error || "Unable to open billing portal." }
    } catch {
      return { ok: false, error: "Unable to open billing portal." }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    openBillingPortal,
  }
}
