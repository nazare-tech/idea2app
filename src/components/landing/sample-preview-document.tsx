// Maps a workspace nav key to the real document renderer fed with exported
// sample content. Used by the /landing-preview/[navKey] iframe route.

import { CompetitiveDetailSection } from "@/components/analysis/competitive-analysis-document"
import {
  AiPromptsDocumentBlocks,
  MvpPlanDocumentBlocks,
  PrdDocumentBlocks,
} from "@/components/analysis/planning-document-blocks"
import { MockupRenderer } from "@/components/ui/mockup-renderer"
import { LANDING_SAMPLE_CONTENT } from "@/lib/landing-sample-content"

export function SamplePreviewDocument({ navKey }: { navKey: string }) {
  const sample = LANDING_SAMPLE_CONTENT
  switch (navKey) {
    case "market-research":
      return sample.competitive ? (
        <CompetitiveDetailSection
          content={sample.competitive.content}
          metadata={sample.competitive.metadata}
          projectId="landing-sample"
        />
      ) : null
    case "prd":
      return sample.prd ? (
        <PrdDocumentBlocks content={sample.prd.content} projectId="landing-sample" />
      ) : null
    case "mvp":
      return sample.mvp ? (
        <MvpPlanDocumentBlocks content={sample.mvp.content} projectId="landing-sample" />
      ) : null
    case "mockups":
      return sample.mockupContent ? (
        <MockupRenderer content={sample.mockupContent} projectId="landing-sample" />
      ) : null
    case "ai-prompts":
      return sample.prd || sample.mvp ? (
        <AiPromptsDocumentBlocks
          prdContent={sample.prd?.content ?? null}
          mvpContent={sample.mvp?.content ?? null}
          projectId="landing-sample"
        />
      ) : null
    default:
      return null
  }
}
