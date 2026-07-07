import type { ReactNode, Ref } from "react"

// Shared chrome for the landing feature previews: warm backdrop, bordered 4:3
// frame, and the bottom fade that makes the crop edge read as intentional.
// Used by both the static capture (production) and the live iframe (dev-only)
// variant so the two cannot drift apart visually.
export function PreviewFrame({
  children,
  frameRef,
}: {
  children?: ReactNode
  /** Ref to the 4:3 frame, for variants that measure it (live iframe scaling) */
  frameRef?: Ref<HTMLDivElement>
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none flex h-full w-full select-none items-center justify-center bg-[#F5F0EB] p-5 sm:p-6"
    >
      <div
        ref={frameRef}
        className="relative aspect-[4/3] w-full overflow-clip border border-[#E2DDD6] bg-background shadow-[0_4px_20px_rgba(15,23,42,0.06)]"
      >
        {children}
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#FAFAFA] to-transparent" />
      </div>
    </div>
  )
}
