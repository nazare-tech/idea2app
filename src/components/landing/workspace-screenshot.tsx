"use client"

// Natural-size workspace replica rendered inside the /landing-preview/[navKey]
// iframe. The iframe is fixed at a desktop CSS width by the landing page, so
// the renderers' viewport media queries resolve to the desktop layout on every
// device; this component only lays out the rail beside the document and crops
// the document to the target section anchor.

import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { SCROLLABLE_NAV_ITEMS, filterNavItemsByRenderedSections } from "@/lib/document-sections"
import { AnchorNavTab } from "@/components/layout/anchor-nav"

/** Natural px of breathing room kept above the cropped section header */
const CROP_TOP_GAP = 24

/** Walk the offsetParent chain to get an element's layout offset inside root. */
function computeOffsetTop(target: HTMLElement, root: HTMLElement): number {
  let top = 0
  let el: HTMLElement | null = target
  while (el && el !== root) {
    top += el.offsetTop
    el = el.offsetParent as HTMLElement | null
  }
  return top
}

interface WorkspaceScreenshotProps {
  /** Which workspace nav item to show in the rail, e.g. "market-research" */
  navKey: string
  /** Subsection rendered in its active (dark highlight) state */
  activeSectionId: string
  /** Anchor id inside the document to crop to; defaults to activeSectionId */
  cropToId?: string
  /** The real document renderer (CompetitiveDetailSection, PrdDocumentBlocks, ...) */
  children: ReactNode
}

export function WorkspaceScreenshot({
  navKey,
  activeSectionId,
  cropToId,
  children,
}: WorkspaceScreenshotProps) {
  const anchorId = cropToId ?? activeSectionId
  const contentRef = useRef<HTMLDivElement>(null)
  const [cropOffset, setCropOffset] = useState<number | null>(null)
  // Section ids the document actually rendered, joined for cheap state equality
  const [renderedIdsKey, setRenderedIdsKey] = useState<string | null>(null)

  const measure = useCallback(() => {
    const content = contentRef.current
    if (!content) return

    const target = content.querySelector<HTMLElement>(`#${CSS.escape(anchorId)}`)
    setCropOffset(target ? Math.max(0, computeOffsetTop(target, content) - CROP_TOP_GAP) : 0)

    // Same rule as the real workspace: the nav lists only sections the
    // document actually rendered, so retired sections drop out automatically.
    const item = SCROLLABLE_NAV_ITEMS.find((navItem) => navItem.key === navKey)
    if (item) {
      setRenderedIdsKey(
        item.sections
          .filter((section) => content.querySelector(`#${CSS.escape(section.id)}`))
          .map((section) => section.id)
          .join("|")
      )
    }
  }, [anchorId, navKey])

  useLayoutEffect(() => {
    // Measure-then-position: the crop offset can only be known from the DOM,
    // so the first synchronous measure before paint is intentional.
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    measure()
    // Fonts and late layout shift the document after hydration; re-measure on
    // any reflow (translateY doesn't change layout, so this cannot loop).
    const observer = new ResizeObserver(measure)
    if (contentRef.current) observer.observe(contentRef.current)
    window.addEventListener("resize", measure)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [measure])

  const registryItem = SCROLLABLE_NAV_ITEMS.find((navItem) => navItem.key === navKey)
  if (!registryItem) return null

  const navItem =
    renderedIdsKey !== null
      ? filterNavItemsByRenderedSections(
          [registryItem],
          new Set(renderedIdsKey.split("|").filter(Boolean))
        )[0]
      : registryItem
  const ready = cropOffset !== null && renderedIdsKey !== null

  return (
    // inert: this document is a screenshot, never an interactive workspace
    <div
      aria-hidden="true"
      inert
      className="pointer-events-none flex h-screen w-full select-none overflow-clip bg-background"
      style={{ visibility: ready ? "visible" : "hidden" }}
    >
      {/* Rail replica: same width, padding, and divider as the real workspace nav */}
      <div className="w-[300px] shrink-0 border-r border-[#E2DDD6] bg-background px-6 py-5">
        <AnchorNavTab
          item={navItem}
          status="done"
          activeSectionId={activeSectionId}
          onNavigate={() => {}}
          expandSubTabs
        />
      </div>

      {/* Content area with the real workspace gutter, cropped to the anchor */}
      <div className="relative min-w-0 flex-1 overflow-clip">
        <div
          ref={contentRef}
          className="relative px-10 py-8"
          style={{ transform: `translateY(${-(cropOffset ?? 0)}px)` }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
