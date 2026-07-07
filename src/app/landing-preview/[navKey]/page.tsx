// Capture source for the static landing feature preview images.
// The export script renders this route at a desktop viewport, crops the
// visible workspace region, and writes the result under public/landing/samples.

import { notFound } from "next/navigation"
import { SCROLLABLE_NAV_ITEMS } from "@/lib/document-sections"
import { SamplePreviewDocument } from "@/components/landing/sample-preview-document"
import { WorkspaceScreenshot } from "@/components/landing/workspace-screenshot"

// Decorative embed only; keep it out of search indexes
export const metadata = {
  robots: { index: false, follow: false },
}

interface LandingPreviewPageProps {
  params: Promise<{ navKey: string }>
  searchParams: Promise<{ active?: string; crop?: string }>
}

export default async function LandingPreviewPage({ params, searchParams }: LandingPreviewPageProps) {
  const { navKey } = await params
  const { active, crop } = await searchParams

  const navItem = SCROLLABLE_NAV_ITEMS.find((item) => item.key === navKey)
  if (!navItem) notFound()

  return (
    <WorkspaceScreenshot
      navKey={navKey}
      activeSectionId={active ?? navItem.sections[0]?.id ?? ""}
      cropToId={crop}
    >
      <SamplePreviewDocument navKey={navKey} />
    </WorkspaceScreenshot>
  )
}
