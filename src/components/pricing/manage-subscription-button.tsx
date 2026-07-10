"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { useBillingPortal } from "@/hooks/use-billing-portal"

export function ManageSubscriptionButton() {
  const { loading, openBillingPortal } = useBillingPortal()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="mt-4">
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          setError(null)
          const result = await openBillingPortal()
          if (!result.ok) setError(result.error ?? "Unable to open billing portal.")
        }}
        disabled={loading}
      >
        {loading ? "Opening..." : "Manage Subscription"}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
