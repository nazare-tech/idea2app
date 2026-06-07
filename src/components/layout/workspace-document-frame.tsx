import type { ReactNode } from "react"

interface WorkspaceDocumentFrameProps {
  children: ReactNode
  navKey?: string
}

export function WorkspaceDocumentFrame({
  children,
  navKey,
}: WorkspaceDocumentFrameProps) {
  return (
    <div
      id={navKey}
      className="mx-auto w-full max-w-[1020px] rounded-lg bg-card px-5 py-6 sm:px-8 lg:px-10 lg:py-8"
      data-section={navKey}
    >
      {children}
    </div>
  )
}
