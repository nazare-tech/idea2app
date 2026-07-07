"use client"

import { Button } from "@/components/ui/button"
import { useBillingPortal } from "@/hooks/use-billing-portal"

export function ManageSubscriptionButton() {
  const { loading, openBillingPortal } = useBillingPortal()

  return (
    <Button
      variant="outline"
      size="sm"
      className="mt-4"
      onClick={() => {
        void openBillingPortal()
      }}
      disabled={loading}
    >
      {loading ? "Opening..." : "Manage Subscription"}
    </Button>
  )
}
