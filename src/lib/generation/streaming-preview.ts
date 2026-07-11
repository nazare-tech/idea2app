/**
 * Delta protocol for the Generate All streaming preview.
 *
 * The status route used to resend the full accumulated partial markdown on
 * every ~3s poll (O(n^2) cumulative transfer over a long document). The
 * client now reports how much it already has per doc type and the server
 * responds with only the new tail. Clients that send no lengths (the intake
 * wizard, older tabs) keep receiving full content.
 */

import { isPlanningTextDocType, type PlanningTextDocType } from "@/lib/document-definitions"

export type StreamingPreviewPayload = (
  | { docType: PlanningTextDocType; mode: "full"; content: string }
  | { docType: PlanningTextDocType; mode: "suffix"; baseLength: number; content: string }
  | { docType: PlanningTextDocType; mode: "unchanged"; totalLength: number }
) & {
  /**
   * Competitive only: live competitor source pairs (validated server-side
   * from generation_queue_items.partial_metadata) so the streaming renderer
   * can link competitor mentions before the saved analyses row exists. Sent
   * whole on every poll while present (a few hundred bytes); not part of the
   * text delta protocol.
   */
  competitorSources?: { name: string; url: string }[]
}

/**
 * Server side: decide what to send for the currently streaming document
 * given the client's reported length for it.
 * - no client state → full
 * - server longer → just the suffix
 * - equal → nothing to resend
 * - server shorter → full (the run was replaced; the client must rewind)
 */
export function buildStreamingPreviewPayload(
  docType: PlanningTextDocType,
  content: string,
  clientLength: number | undefined,
): StreamingPreviewPayload {
  if (!clientLength || !Number.isFinite(clientLength) || clientLength <= 0) {
    return { docType, mode: "full", content }
  }
  if (content.length > clientLength) {
    return { docType, mode: "suffix", baseLength: clientLength, content: content.slice(clientLength) }
  }
  if (content.length === clientLength) {
    return { docType, mode: "unchanged", totalLength: content.length }
  }
  return { docType, mode: "full", content }
}

/** Client side: "competitive:1234,prd:80" for every non-empty preview. */
export function encodeStreamingPreviewLengths(
  previews: Partial<Record<PlanningTextDocType, string>>,
): string {
  return Object.entries(previews)
    .filter(([, content]) => typeof content === "string" && content.length > 0)
    .map(([docType, content]) => `${docType}:${(content as string).length}`)
    .join(",")
}

/** Server side: parse the client's reported lengths; malformed entries are ignored. */
export function parseStreamingPreviewLengths(
  raw: string | null,
): Partial<Record<PlanningTextDocType, number>> {
  if (!raw) return {}
  const lengths: Partial<Record<PlanningTextDocType, number>> = {}
  for (const entry of raw.split(",")) {
    const [docType, value] = entry.split(":")
    const length = Number.parseInt(value ?? "", 10)
    if (isPlanningTextDocType(docType) && Number.isInteger(length) && length > 0) {
      lengths[docType] = length
    }
  }
  return lengths
}

/**
 * Client side: fold a status payload into the per-docType preview map.
 * Suffixes only append when the base length matches exactly (a mismatch
 * self-heals: the next poll reports the true length). Legacy payloads
 * without a mode keep the old longest-wins behavior.
 */
export function mergeStreamingPreview(
  previous: Partial<Record<PlanningTextDocType, string>>,
  incoming: unknown,
): Partial<Record<PlanningTextDocType, string>> {
  if (!incoming || typeof incoming !== "object") return previous
  const payload = incoming as { docType?: unknown; mode?: unknown; content?: unknown; baseLength?: unknown }
  if (!isPlanningTextDocType(payload.docType)) return previous
  const docType = payload.docType
  const existing = previous[docType] ?? ""

  if (payload.mode === "unchanged") return previous
  if (payload.mode === "suffix") {
    if (typeof payload.content !== "string" || payload.content.length === 0) return previous
    if (payload.baseLength !== existing.length) return previous
    return { ...previous, [docType]: existing + payload.content }
  }

  if (typeof payload.content !== "string" || payload.content.length === 0) return previous
  if (payload.content === existing) return previous
  // Legacy payloads (no mode) never rewind; explicit full payloads may,
  // because the server only sends a shorter full body for a replaced run.
  if (payload.mode !== "full" && existing.length >= payload.content.length) return previous
  return { ...previous, [docType]: payload.content }
}

/**
 * Client side: fold the competitive source pairs riding on a streaming
 * preview payload. Sticky once seen (links must never disappear mid-stream);
 * a larger set wins so late-arriving pairs can still land.
 */
export function mergeStreamingCompetitorSources(
  previous: { name: string; url: string }[],
  incoming: unknown,
): { name: string; url: string }[] {
  if (!incoming || typeof incoming !== "object") return previous
  const payload = incoming as { docType?: unknown; competitorSources?: unknown }
  if (payload.docType !== "competitive") return previous
  if (!Array.isArray(payload.competitorSources)) return previous

  const sources = payload.competitorSources.filter(
    (source): source is { name: string; url: string } =>
      Boolean(
        source &&
        typeof source === "object" &&
        typeof (source as { name?: unknown }).name === "string" &&
        typeof (source as { url?: unknown }).url === "string",
      ),
  )
  return sources.length > previous.length ? sources : previous
}
