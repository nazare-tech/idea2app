import Image from "next/image"

import { FeatureProductPreviewLive } from "@/components/landing/feature-product-preview-live"
import { PreviewFrame } from "@/components/landing/preview-frame"
import { getLandingPreviewCapturePath } from "@/lib/landing-preview-captures.mjs"

interface FeatureProductPreviewProps {
  /** Which workspace nav item to preview, e.g. "market-research" */
  navKey: string
  /** Subsection rendered in its active (dark highlight) state */
  activeSectionId: string
  /** Anchor id inside the document to crop to; defaults to activeSectionId */
  cropToId?: string
}

export function FeatureProductPreview(props: FeatureProductPreviewProps) {
  if (process.env.NEXT_PUBLIC_LANDING_LIVE_PREVIEWS === "1") {
    return <FeatureProductPreviewLive {...props} />
  }

  const capturePath = getLandingPreviewCapturePath(props.navKey, props.activeSectionId)

  if (!capturePath) {
    // A missing capture means the landing sections and the capture manifest
    // drifted. Fail loud in development; in production render the empty frame
    // rather than silently showing an unrelated screenshot.
    const message =
      `No landing preview capture for "${props.navKey}" / "${props.activeSectionId}". ` +
      "Add it to src/lib/landing-preview-captures.mjs and re-run " +
      "`node scripts/export-landing-sample.mjs --capture-previews-only`."
    if (process.env.NODE_ENV !== "production") {
      throw new Error(message)
    }
    console.error(message)
    return <PreviewFrame />
  }

  return (
    <PreviewFrame>
      <Image
        src={capturePath}
        alt=""
        fill
        className="object-cover"
        sizes="(min-width: 1280px) 536px, (min-width: 768px) 44vw, calc(100vw - 4rem)"
      />
    </PreviewFrame>
  )
}
