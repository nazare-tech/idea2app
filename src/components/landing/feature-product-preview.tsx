import Image from "next/image"

import { FeatureProductPreviewLive } from "@/components/landing/feature-product-preview-live"

interface FeatureProductPreviewProps {
  /** Which workspace nav item to preview, e.g. "market-research" */
  navKey: string
  /** Subsection rendered in its active (dark highlight) state */
  activeSectionId: string
  /** Anchor id inside the document to crop to; defaults to activeSectionId */
  cropToId?: string
}

const previewCapturePaths: Record<string, string> = {
  "market-research|market-research-feature-matrix|": "/landing/samples/previews/market-research-feature-matrix.png",
  "prd|prd-user-personas|": "/landing/samples/previews/prd-user-personas.png",
  "mvp|mvp-validation-plan|": "/landing/samples/previews/mvp-validation-plan.png",
  "mockups|mockups-concept-1|": "/landing/samples/previews/mockups-concept-1.png",
  "ai-prompts|ai-prompts-recommended-build-tool|": "/landing/samples/previews/ai-prompts-recommended-build-tool.png",
}

function getCapturePath({ navKey, activeSectionId, cropToId }: FeatureProductPreviewProps) {
  const key = `${navKey}|${activeSectionId}|${cropToId ?? ""}`
  return previewCapturePaths[key] ?? previewCapturePaths[`${navKey}|${activeSectionId}|`] ?? "/landing/samples/previews/market-research-feature-matrix.png"
}

export function FeatureProductPreview(props: FeatureProductPreviewProps) {
  if (process.env.NEXT_PUBLIC_LANDING_LIVE_PREVIEWS === "1") {
    return <FeatureProductPreviewLive {...props} />
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none flex h-full w-full select-none items-center justify-center bg-[#F5F0EB] p-5 sm:p-6"
    >
      <div className="relative aspect-[4/3] w-full overflow-clip border border-[#E2DDD6] bg-background shadow-[0_4px_20px_rgba(15,23,42,0.06)]">
        <Image
          src={getCapturePath(props)}
          alt=""
          fill
          className="object-cover"
          sizes="(min-width: 1280px) 536px, (min-width: 768px) 44vw, calc(100vw - 4rem)"
        />
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#FAFAFA] to-transparent" />
      </div>
    </div>
  )
}
