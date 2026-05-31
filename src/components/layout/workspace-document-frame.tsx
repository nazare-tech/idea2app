import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface WorkspaceDocumentFrameProps {
  children: ReactNode
  contentClassName?: string
  navKey?: string
}

export function WorkspaceDocumentFrame({
  children,
  contentClassName = "space-y-2",
  navKey,
}: WorkspaceDocumentFrameProps) {
  return (
    <div
      id={navKey}
      className="mx-auto w-full max-w-[1020px] rounded-lg bg-card"
      data-section={navKey}
    >
      <div className={cn("px-5 py-6 sm:px-8 lg:px-10 lg:py-8", contentClassName)}>
        {children}
      </div>
    </div>
  )
}
