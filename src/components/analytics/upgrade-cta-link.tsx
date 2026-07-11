"use client"

import { useEffect, type ReactNode } from "react"
import Link from "next/link"

import type { ProductEventPropertyMap } from "@/lib/product-analytics/contracts"
import { rememberUpgradeAttribution, trackClientProductEvent } from "@/lib/product-analytics/client"

type UpgradeSurface = ProductEventPropertyMap["upgrade_cta_viewed"]["surface"]

export function UpgradeCtaLink({
  surface,
  projectId,
  href = "/billing",
  className,
  children,
}: {
  surface: UpgradeSurface
  projectId?: string
  href?: string
  className?: string
  children: ReactNode
}) {
  useEffect(() => {
    trackClientProductEvent("upgrade_cta_viewed", { surface }, {
      ...(isUuid(projectId) ? { projectId } : {}),
    })
  }, [projectId, surface])

  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        const eventId = trackClientProductEvent("upgrade_cta_clicked", { surface }, {
          ...(isUuid(projectId) ? { projectId } : {}),
        })
        rememberUpgradeAttribution(surface, projectId, eventId)
      }}
    >
      {children}
    </Link>
  )
}

function isUuid(value: string | undefined): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))
}
