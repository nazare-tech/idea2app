"use client"

import { useCallback, useState } from "react"

import { parseStripeRedirectResponse } from "@/lib/stripe/billing-flow"

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
      const data = await response.json().catch(() => null)
      const result = parseStripeRedirectResponse(
        data,
        response.status,
        "Unable to open billing portal.",
      )

      if (result.ok) {
        window.location.assign(result.url)
        return { ok: true }
      }

      return result
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
