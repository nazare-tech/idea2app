import type { DocumentType } from "@/lib/document-definitions"

export type ActiveDocumentType =
  | "competitive"
  | "prd"
  | "mvp"
  | "mockups"
  | "techspec"
  | "launch"

export type ActiveDocumentOutputTable =
  | "analyses"
  | "prds"
  | "mvp_plans"
  | "mockups"
  | "tech_specs"

export interface ActiveDocumentIdentity {
  documentType: ActiveDocumentType
  outputTable: ActiveDocumentOutputTable
  analysisType?: "competitive-analysis" | "launch-plan"
}

export interface ExistingActiveDocument extends ActiveDocumentIdentity {
  outputId: string
  createdAt: string | null
}

export interface ActiveDocumentRow {
  id: string
  project_id: string
  created_at: string | null
  type?: string | null
}

const ACTIVE_DOCUMENT_IDENTITIES: Record<ActiveDocumentType, ActiveDocumentIdentity> = {
  competitive: {
    documentType: "competitive",
    outputTable: "analyses",
    analysisType: "competitive-analysis",
  },
  prd: {
    documentType: "prd",
    outputTable: "prds",
  },
  mvp: {
    documentType: "mvp",
    outputTable: "mvp_plans",
  },
  mockups: {
    documentType: "mockups",
    outputTable: "mockups",
  },
  techspec: {
    documentType: "techspec",
    outputTable: "tech_specs",
  },
  launch: {
    documentType: "launch",
    outputTable: "analyses",
    analysisType: "launch-plan",
  },
}

const ANALYSIS_TYPE_TO_DOCUMENT: Record<string, ActiveDocumentType> = {
  "competitive-analysis": "competitive",
  prd: "prd",
  "mvp-plan": "mvp",
  "tech-spec": "techspec",
}

export function getActiveDocumentIdentity(documentType: string): ActiveDocumentIdentity | null {
  return ACTIVE_DOCUMENT_IDENTITIES[documentType as ActiveDocumentType] ?? null
}

export function getActiveDocumentIdentityForAnalysisType(type: string): ActiveDocumentIdentity | null {
  const documentType = ANALYSIS_TYPE_TO_DOCUMENT[type]
  return documentType ? getActiveDocumentIdentity(documentType) : null
}

export function getActiveDocumentIdentityForDocumentType(type: DocumentType | string): ActiveDocumentIdentity | null {
  return getActiveDocumentIdentity(type)
}

// The app uses generated SDK clients and a few service-role clients. Keeping this
// query adapter structural avoids coupling duplicate prevention to one client type.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function findLatestActiveDocument(supabase: any, projectId: string, identity: ActiveDocumentIdentity) {
  let query = supabase
    .from(identity.outputTable)
    .select("id, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)

  if (identity.analysisType) {
    query = query.eq("type", identity.analysisType)
  }

  const { data, error } = await query.maybeSingle()
  if (error) throw error
  if (!data?.id) return null

  return {
    ...identity,
    outputId: data.id as string,
    createdAt: (data.created_at as string | null | undefined) ?? null,
  } satisfies ExistingActiveDocument
}

export function createSkippedActiveDocumentPayload(existingDocument: ExistingActiveDocument) {
  return {
    skipped: true,
    reason: "document_already_exists",
    existingDocument,
  }
}

export function getDuplicateActiveDocumentIds(rows: ActiveDocumentRow[]) {
  const grouped = new Map<string, ActiveDocumentRow[]>()

  for (const row of rows) {
    const key = `${row.project_id}:${row.type ?? ""}`
    grouped.set(key, [...(grouped.get(key) ?? []), row])
  }

  const duplicateIds: string[] = []
  for (const group of grouped.values()) {
    const sorted = [...group].sort((a, b) => {
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
      if (bTime !== aTime) return bTime - aTime
      return b.id.localeCompare(a.id)
    })
    duplicateIds.push(...sorted.slice(1).map((row) => row.id))
  }

  return duplicateIds
}
