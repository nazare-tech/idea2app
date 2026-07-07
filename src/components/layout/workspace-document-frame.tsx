import type { CSSProperties, ReactNode } from "react"

interface WorkspaceDocumentFrameProps {
  children: ReactNode
  navKey?: string
  performanceContain?: boolean
  intrinsicSize?: string
}

export function WorkspaceDocumentFrame({
  children,
  navKey,
  performanceContain = false,
  intrinsicSize = "auto 2400px",
}: WorkspaceDocumentFrameProps) {
  const containmentStyle: CSSProperties | undefined = performanceContain
    ? {
        contentVisibility: "auto",
        containIntrinsicSize: intrinsicSize,
      }
    : undefined

  return (
    <div
      id={navKey}
      className="mx-auto w-full max-w-[1020px] rounded-lg bg-card px-5 py-6 sm:px-8 sm:py-7 lg:px-10 lg:py-8"
      data-section={navKey}
      style={containmentStyle}
    >
      {children}
    </div>
  )
}
