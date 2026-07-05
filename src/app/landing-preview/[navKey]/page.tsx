// Screenshot document for the landing feature previews.
//
// The landing page embeds this route in an iframe fixed at a desktop CSS
// width, then scales the iframe down. Because media queries resolve against
// the iframe's own viewport, the workspace always renders its desktop layout
// here, even when the landing page is viewed on a phone.

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
