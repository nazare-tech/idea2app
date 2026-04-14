/**
 * Stitch mockup generation pipeline — extracted so it can be called from both
 * the individual mockup route and the server-side Generate All execute route.
 */
import OpenAI from "openai"
import {
  StitchToolClient,
  extractProjectId,
  extractFirstScreenId,
  extractVariantScreenIds,
} from "@/lib/stitch/client"
import { STITCH_PROMPT_ENGINEER_SYSTEM_PROMPT } from "@/lib/prompts/mockups"

const OPTION_LABELS = ["A", "B", "C"]

/**
 * Stage 1: Call OpenRouter (gemini-3.1-pro-preview) with the MVP plan to
 * produce a rich, product-specific design brief for Stitch.
 * Falls back to a minimal prompt if OpenRouter returns empty content.
 */
async function generateStitchDesignPrompt(
  mvpPlan: string,
  projectName: string,
): Promise<string> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY environment variable is not configured")
  }

  const openrouter = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  })

  const response = await openrouter.chat.completions.create({
    model: "google/gemini-3.1-pro-preview",
    messages: [
      { role: "system", content: STITCH_PROMPT_ENGINEER_SYSTEM_PROMPT },
      { role: "user", content: mvpPlan },
    ],
    max_tokens: 1024,
  })

  const content = response.choices[0]?.message?.content?.trim()

  if (!content) {
    console.warn("[Stitch] OpenRouter returned empty content — using fallback prompt")
    return `Design the main screen for "${projectName}". ${mvpPlan.slice(0, 500)}`
  }

  console.log("[Stitch] OpenRouter prompt:\n", content)
  return content
}

/**
 * Generate 3 Stitch designs: 1 original + 2 variants using direct tool calls.
 *
 * Pipeline:
 *   Stage 1 — OpenRouter generates a rich Stitch design brief from the MVP plan
 *   Stage 2 — Stitch create_project
 *   Stage 3 — Stitch generate_screen_from_text (uses AI-generated brief)
 *   Stage 4 — Stitch generate_variants (2 variants)
 *   Stage 5 — Stitch get_screen × 3 (original + 2 variants)
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
    // ── Stage 1: OpenRouter → Stitch design brief ──────────────────────
    send?.({ type: "stage", message: "Generating design brief...", step: 1, totalSteps: 5 })

    const stitchPrompt = await generateStitchDesignPrompt(mvpPlan, projectName)

    // ── Stage 2: Create Stitch project ────────────────────────────────
    send?.({ type: "stage", message: "Creating design project...", step: 2, totalSteps: 5 })

    const projectRaw = await client.callTool<Raw>("create_project", { title: projectName })
    console.log("[Stitch] create_project raw:", JSON.stringify(projectRaw))
    const stitchProjectId = extractProjectId(projectRaw)

    // ── Stage 3: Generate initial screen ─────────────────────────────
    send?.({ type: "stage", message: "Generating initial design...", step: 3, totalSteps: 5 })

    const generateRaw = await client.callTool<Raw>("generate_screen_from_text", {
      projectId: stitchProjectId,
      prompt: stitchPrompt,
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

    // ── Stage 4: Generate 2 variants ─────────────────────────────────
    send?.({ type: "stage", message: "Generating 2 design variations...", step: 4, totalSteps: 5 })

    const variantsRaw = await client.callTool<Raw>("generate_variants", {
      projectId: stitchProjectId,
      selectedScreenIds: [initialScreenId],
      prompt: "Generate 2 visually distinct design alternatives with different layouts and color schemes",
      variantOptions: { variantCount: 2, creativeRange: "EXPLORE", aspects: ["COLOR_SCHEME", "LAYOUT"] },
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
        .slice(0, 2)
    }

    if (variantIds.length === 0) {
      throw new Error("[Stitch] generate_variants returned no variant screens")
    }

    // ── Stage 5: Fetch original + 2 variant screens ───────────────────
    send?.({ type: "stage", message: "Fetching design assets...", step: 5, totalSteps: 5 })

    // Combine: original screen first, then up to 2 variants
    const screenIds = [initialScreenId, ...variantIds.slice(0, 2)]
    const titles = ["Original Design", "Variant B", "Variant C"]

    const options = await Promise.all(
      screenIds.map(async (screenId, i) => {
        const screenRaw = await client.callTool<Raw>("get_screen", {
          projectId: stitchProjectId,
          screenId,
          name: `projects/${stitchProjectId}/screens/${screenId}`,
        })
        return {
          label: OPTION_LABELS[i],
          title: titles[i],
          htmlUrl: screenRaw?.htmlCode?.downloadUrl || "",
          imageUrl: screenRaw?.screenshot?.downloadUrl || "",
        }
      }),
    )

    return JSON.stringify({ type: "stitch", options })
  } finally {
    await client.close()
  }
}
