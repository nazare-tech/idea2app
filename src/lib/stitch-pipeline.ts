/**
 * Stitch mockup generation pipeline — extracted so it can be called from both
 * the individual mockup route and the server-side Generate All execute route.
 */
import {
  StitchToolClient,
  extractProjectId,
  extractFirstScreenId,
  extractVariantScreenIds,
} from "@/lib/stitch/client"

const OPTION_LABELS = ["A", "B", "C"]

function buildStitchPrompt(mvpPlan: string, projectName: string): string {
  return (
    `Design the main application screen for "${projectName}".\n\n` +
    `MVP context:\n${mvpPlan}\n\n` +
    `Create a modern, polished, production-ready UI. ` +
    `Focus on the primary user-facing screen with all key features visible and accessible.`
  )
}

/**
 * Generate 3 Stitch design variants using direct tool calls.
 *
 * We bypass the high-level SDK methods (project.generate / screen.variants)
 * because they have no null-safety on the response path:
 *   raw.outputComponents[0].design.screens[0]  ← crashes when design is undefined
 *
 * Using StitchToolClient.callTool() directly lets us apply defensive extraction.
 *
 * @returns JSON string — `{ type: "stitch", options: [{ label, title, htmlUrl, imageUrl }] }`
 */
export async function generateStitchMockup(
  mvpPlan: string,
  projectName: string,
  send?: (event: object) => void,
): Promise<string> {
  if (!process.env.STITCH_API_KEY) {
    throw new Error("STITCH_API_KEY environment variable is not configured")
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Raw = Record<string, any>

  const client = new StitchToolClient({ apiKey: process.env.STITCH_API_KEY })

  function screenIdFromItem(item: Raw): string {
    const name: string = item?.name || item?.id || item?.screenId || ""
    if (name.includes("/screens/")) return name.split("/screens/")[1]
    return name
  }

  try {
    send?.({ type: "stage", message: "Creating design project...", step: 1, totalSteps: 4 })

    const projectRaw = await client.callTool<Raw>("create_project", { title: projectName })
    console.log("[Stitch] create_project raw:", JSON.stringify(projectRaw))
    const stitchProjectId = extractProjectId(projectRaw)

    send?.({ type: "stage", message: "Generating initial design...", step: 2, totalSteps: 4 })

    const prompt = buildStitchPrompt(mvpPlan, projectName)
    const generateRaw = await client.callTool<Raw>("generate_screen_from_text", {
      projectId: stitchProjectId,
      prompt,
      deviceType: "DESKTOP",
    })
    console.log("[Stitch] generate_screen_from_text raw:", JSON.stringify(generateRaw))

    let initialScreenId: string
    try {
      initialScreenId = extractFirstScreenId(generateRaw)
    } catch {
      console.log("[Stitch] No screen in generate response — listing screens to find it")
      const listRaw = await client.callTool<Raw>("list_screens", { projectId: stitchProjectId })
      console.log("[Stitch] list_screens raw:", JSON.stringify(listRaw))
      const listed: Raw[] = listRaw?.screens || []
      if (listed.length === 0) throw new Error("[Stitch] No screens found after generate_screen_from_text")
      initialScreenId = screenIdFromItem(listed[0])
    }

    console.log("[Stitch] initialScreenId:", initialScreenId)
    send?.({ type: "stage", message: "Generating 3 design variants...", step: 3, totalSteps: 4 })

    const variantsRaw = await client.callTool<Raw>("generate_variants", {
      projectId: stitchProjectId,
      selectedScreenIds: [initialScreenId],
      prompt: "Generate 3 visually distinct design alternatives with different layouts and color schemes",
      variantOptions: { variantCount: 3, creativeRange: "EXPLORE", aspects: ["COLOR_SCHEME", "LAYOUT"] },
      deviceType: "DESKTOP",
    })
    console.log("[Stitch] generate_variants raw:", JSON.stringify(variantsRaw))

    let variantIds = extractVariantScreenIds(variantsRaw)
    if (variantIds.length === 0) {
      console.log("[Stitch] No variants in response — listing screens to find them")
      const listRaw2 = await client.callTool<Raw>("list_screens", { projectId: stitchProjectId })
      console.log("[Stitch] list_screens (post-variants) raw:", JSON.stringify(listRaw2))
      const allScreens: Raw[] = listRaw2?.screens || []
      variantIds = allScreens
        .map(screenIdFromItem)
        .filter((id) => id && id !== initialScreenId)
        .slice(0, 3)
    }

    if (variantIds.length === 0) {
      throw new Error("[Stitch] generate_variants returned no variant screens")
    }

    send?.({ type: "stage", message: "Fetching design assets...", step: 4, totalSteps: 4 })

    const variants = await Promise.all(
      variantIds.slice(0, 3).map(async (screenId, i) => {
        const screenRaw = await client.callTool<Raw>("get_screen", {
          projectId: stitchProjectId,
          screenId,
          name: `projects/${stitchProjectId}/screens/${screenId}`,
        })
        return {
          label: OPTION_LABELS[i],
          title: `Design Variant ${OPTION_LABELS[i]}`,
          htmlUrl: screenRaw?.htmlCode?.downloadUrl || "",
          imageUrl: screenRaw?.screenshot?.downloadUrl || "",
        }
      }),
    )

    return JSON.stringify({ type: "stitch", options: variants })
  } finally {
    await client.close()
  }
}
