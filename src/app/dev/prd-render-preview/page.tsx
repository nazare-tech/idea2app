import { notFound } from "next/navigation"

import { PrdDocumentBlocks } from "@/components/analysis/planning-document-blocks"
import { WorkspaceDocumentFrame } from "@/components/layout/workspace-document-frame"

export const dynamic = "force-static"

const content = `# PRD: Wear It Now AI Mirror

## 1. Introduction/overview
Wear It Now AI Mirror helps shoppers preview outfits before buying or styling them.

## 2. Goals
### Business goals
- Validate whether shoppers trust generated try-on previews.
- Reach 500 preview generations in the first 30 days.

### User goals
- Decide what to wear faster.
- Understand whether a retailer item matches their body profile and style.

## 3. User personas
### 3.2 Persona details
**Priya Mehta**
- **Archetype**: The Outfit Optimizer
- **Meta**: Age 26; Product designer; Toronto; Technical-adjacent
- **Description**: Priya is a fashion-conscious shopper who wants outfit confidence before buying.
- **Needs**:
  - Better styling guidance
  - Fast outfit previews
- **Pain points**:
  - Unclear fit and style from flat product photos
  - Wastes time comparing outfit combinations
- **Motivation**: Priya wants to feel confident before spending money on clothes.

## 4. User stories and acceptance criteria
### US-001: Preview outfit
**User story**
As a shopper, I want to preview an outfit on my body profile.
**Acceptance criteria**
- The preview appears on the retailer page.
- The user can save or discard the result.

## 5. Functional requirements
### 5.1 Core requirements
- **FR-001**: Avatar upload
  - Users can upload one base photo.
- **FR-002**: Retailer overlay
  - Users can trigger try-on from supported product pages.

## 6. Technical considerations
- Keep image generation on the server.
- Store generated images in private storage.

## 7. Non-goals / out of scope
- Native mobile apps are deferred.
- Multi-user styling teams are deferred.

## 8. Success metrics
### User metrics
- 60% of users generate a first preview within one day.
- Refund rate stays below 5%.

### Business metrics
- 500 paid preview credits are purchased within 30 days.

### Technical/performance metrics
- Preview generation completes in under 45 seconds.
- Generation errors stay below 2%.

## 9. Timeline and milestones
### Project estimate
- **Size**: Medium
- **Estimated total duration**: 8 weeks

### Team composition
- **Product manager**: Scope and acceptance criteria
- **Full-stack engineer**: Extension, UI, and backend routes
- **Designer**: Overlay and result review workflow

### Phase 1: Foundation
- **Goal**: Create the upload and account shell.
- **Estimated duration**: 3 weeks
- **Key deliverables**:
  - Avatar upload
  - Private storage

### Phase 2: Extension and generation
- **Goal**: Generate try-on previews from retailer pages.
- **Estimated duration**: 5 weeks
- **Key deliverables**:
  - Retailer overlay
  - AI generation route

## 10. Risks and mitigation
- **Risk**: Retailer websites break the extension by updating their DOM structure or implementing anti-scraping measures.
  - **Impact**: The overlay fails to appear on affected sites, rendering the product unusable on those retailers without warning.
  - **Mitigation**: Use a remotely fetched configuration file for site selectors so fixes deploy without a full extension release.
- **Risk**: AI image quality misses user expectations.
  - **Impact**: Users lose trust after poor previews and ask for refunds.
  - **Mitigation**: Add quality gates before charging credits and show clear retry states.

## 11. Dependencies and assumptions
### 11.1 Dependencies
- **Chrome Web Store approval**: The extension must pass Google's review process, which can take 1-7 business days.
- **AI generation API**: A reliable image-to-image virtual try-on API must be selected before Phase 2 begins.
- **Stripe account**: A verified Stripe account must be approved before credit purchase can be tested.
- **Cloud storage provider**: Private object storage must be configured before photo upload can be built.

### 11.2 Assumptions
- **Target user**: The primary target user is a mid-tier fashion influencer using a desktop computer with Chrome.
- **Platform**: Desktop Chrome browser only. No mobile app or other browser support is assumed for MVP.
- **Authentication**: Email/password authentication is sufficient for MVP.
- **AI model**: A suitable image-to-image model exists and is accessible via API with acceptable latency. This is the single highest-risk technical assumption.
- **Credit pricing**: Suggested credit pricing is a starting hypothesis.

## 12. Open questions
- **AI model selection**: Which specific virtual try-on model will be used, and what is the confirmed cost per generation?
- **Retailer legal posture**: Should the product proactively reach out to retailers, or proceed without disclosure?
- **Refund policy**: Beyond automatic credit refunds for system failures, will there be a manual refund policy?
- **Generation queue UX**: If a user navigates away while generation is in progress, should the result be delivered via notification?
`

export default function PrdRenderPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound()
  }

  return (
    <main className="min-h-screen bg-[#F7F5F2] py-8 text-[#1C1917]">
      <WorkspaceDocumentFrame navKey="prd">
        <PrdDocumentBlocks content={content} projectId="prd-render-preview" />
      </WorkspaceDocumentFrame>
    </main>
  )
}
