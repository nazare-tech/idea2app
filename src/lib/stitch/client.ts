import { StitchToolClient } from "@google/stitch-sdk"

export { StitchToolClient }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

/** Extract the bare project ID from a create_project raw response */
export function extractProjectId(raw: AnyRecord): string {
  const name: string = raw?.name || raw?.project?.name || raw?.projectId || ""
  if (name.startsWith("projects/")) return name.slice(9)
  if (name) return name
  throw new Error(`[Stitch] Could not extract project ID. Raw: ${JSON.stringify(raw)}`)
}

/** Extract the bare screen ID from a generate_screen_from_text raw response.
 *  Searches ALL outputComponents because the first one may be a designSystem, not a screen.
 */
export function extractFirstScreenId(raw: AnyRecord): string {
  // Search all outputComponents for any that contain design.screens
  const allScreens: AnyRecord[] = (raw?.outputComponents || [])
    .flatMap((c: AnyRecord) => c?.design?.screens || [])

  // Fallback: top-level screens array
  const candidates: AnyRecord[] = allScreens.length > 0 ? allScreens : (raw?.screens || [])

  const first: AnyRecord = candidates[0]
  if (!first) throw new Error(`[Stitch] generate returned no screens. Raw: ${JSON.stringify(raw)}`)

  const name: string = first?.name || first?.id || first?.screenId || ""
  if (name.includes("/screens/")) return name.split("/screens/")[1]
  if (name) return name
  throw new Error(`[Stitch] Could not extract screen ID. Screen: ${JSON.stringify(first)}`)
}

/** Extract all screen IDs from a generate_variants raw response */
export function extractVariantScreenIds(raw: AnyRecord): string[] {
  const screens: AnyRecord[] = (raw?.outputComponents || [])
    .flatMap((a: AnyRecord) => a?.design?.screens || [])

  return screens.map((s: AnyRecord) => {
    const name: string = s?.name || s?.id || s?.screenId || ""
    if (name.includes("/screens/")) return name.split("/screens/")[1]
    return name
  }).filter(Boolean)
}
