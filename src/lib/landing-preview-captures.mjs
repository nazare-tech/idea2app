// Single source of truth for the landing feature preview captures.
//
// Consumed by BOTH sides of the capture pipeline so they cannot drift:
//   - scripts/export-landing-sample.mjs (plain Node) captures each
//     /landing-preview/[navKey] route into public/landing/samples/previews/
//   - src/components/landing/feature-product-preview.tsx serves the captured
//     image for the same navKey/activeSectionId pair on the landing page
//
// Plain .mjs (not .ts) so the export script can import it without a TS loader.
// Adding a landing feature section means adding an entry here and re-running
// `node scripts/export-landing-sample.mjs --capture-previews-only`.

/**
 * @typedef {Object} LandingPreviewCapture
 * @property {string} navKey Workspace nav item rendered by /landing-preview/[navKey]
 * @property {string} activeSectionId Subsection shown in its active state
 * @property {string} fileName Capture file under public/landing/samples/previews/
 */

/** @type {LandingPreviewCapture[]} */
export const LANDING_PREVIEW_CAPTURES = [
  {
    navKey: "market-research",
    activeSectionId: "market-research-feature-matrix",
    fileName: "market-research-feature-matrix.png",
  },
  {
    navKey: "prd",
    activeSectionId: "prd-user-personas",
    fileName: "prd-user-personas.png",
  },
  {
    navKey: "mvp",
    activeSectionId: "mvp-validation-plan",
    fileName: "mvp-validation-plan.png",
  },
  {
    navKey: "mockups",
    activeSectionId: "mockups-concept-1",
    fileName: "mockups-concept-1.png",
  },
  {
    navKey: "ai-prompts",
    activeSectionId: "ai-prompts-recommended-build-tool",
    fileName: "ai-prompts-recommended-build-tool.png",
  },
]

/**
 * Public URL of the capture for a navKey/activeSectionId pair, or null when
 * no capture exists (the caller decides how loudly to fail).
 *
 * @param {string} navKey
 * @param {string} activeSectionId
 * @returns {string | null}
 */
export function getLandingPreviewCapturePath(navKey, activeSectionId) {
  const capture = LANDING_PREVIEW_CAPTURES.find(
    (entry) => entry.navKey === navKey && entry.activeSectionId === activeSectionId,
  )
  return capture ? `/landing/samples/previews/${capture.fileName}` : null
}
