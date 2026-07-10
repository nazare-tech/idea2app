import { notFound } from "next/navigation"

import { MotionLabClient } from "@/components/dev/motion-lab-client"
import { AppPageHeader, AppPageShell } from "@/components/layout/app-page-shell"
import { isMotionLabEnabled } from "@/lib/motion-lab"

export default function MotionLabPage() {
  if (!isMotionLabEnabled()) {
    notFound()
  }

  return (
    <AppPageShell contentClassName="max-w-[1800px]">
      <AppPageHeader
        eyebrow="Local development"
        title="Motion Lab"
        description="Prototype generation and animation states against the real workspace renderers. Executive Summary and Market Research render from sample content through the same components production uses."
      />
      <MotionLabClient />
    </AppPageShell>
  )
}
