import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { SpectralSignalClient } from "@/components/dev/spectral-signal-client"
import { isDevOnlyFeatureEnabled } from "@/lib/dev-only"

export const metadata: Metadata = {
  title: "Spectral Signal · Maker Compass",
  description: "Development-only radial lens and motion experiment.",
}

interface SpectralSignalPageProps {
  searchParams: Promise<{
    capture?: string | string[]
    time?: string | string[]
  }>
}

export default async function SpectralSignalPage({ searchParams }: SpectralSignalPageProps) {
  if (!isDevOnlyFeatureEnabled()) {
    notFound()
  }

  const params = await searchParams
  const requestedSeconds = Number(params.time ?? 0)
  const captureSeconds = Number.isFinite(requestedSeconds) ? requestedSeconds : 0

  return (
    <SpectralSignalClient
      captureMode={params.capture === "1"}
      captureSeconds={captureSeconds}
    />
  )
}
