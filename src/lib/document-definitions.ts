import type { ElementType } from "react"
import {
  Code,
  FileText,
  LayoutGrid,
  PenLine,
  Rocket,
  Search,
  Target,
} from "lucide-react"
import {
  FIRST_VERSION_PLAN_DEFAULT_MODEL,
  PRODUCT_PLAN_DEFAULT_MODEL,
} from "@/lib/planning-document-requests"

export const DOCUMENT_TYPES = [
  "prompt",
  "competitive",
  "prd",
  "mvp",
  "mockups",
  "techspec",
  "deploy",
] as const

export type DocumentType = typeof DOCUMENT_TYPES[number]

export interface DocumentDefinition {
  type: DocumentType
  label: string
  title: string
  subtitle: string
  description: string
  icon: ElementType
  creditCost: number
  showInNav?: boolean
}

export const DOCUMENT_DEFINITIONS: DocumentDefinition[] = [
  {
    type: "prompt",
    label: "Explain the idea",
    title: "Explain the idea",
    subtitle: "Define your project requirements and goals",
    description: "",
    icon: PenLine,
    creditCost: 0,
    showInNav: true,
  },
  {
    type: "competitive",
    label: "Market Research",
    title: "Market Research",
    subtitle: "Market analysis and competitor insights",
    description: "",
    icon: Search,
    creditCost: 10,
    showInNav: true,
  },
  {
    type: "prd",
    label: "Product Plan",
    title: "Product Plan",
    subtitle: "Clear brief for what to build",
    description: "",
    icon: FileText,
    creditCost: 10,
    showInNav: true,
  },
  {
    type: "mvp",
    label: "First Version Plan",
    title: "First Version Plan",
    subtitle: "MVP scope and launchable build plan",
    description: "",
    icon: Target,
    creditCost: 10,
    showInNav: true,
  },
  {
    type: "mockups",
    label: "Design Mockups",
    title: "Design Mockups",
    subtitle: "Interactive UI mockups showing information architecture",
    description: "",
    icon: LayoutGrid,
    creditCost: 0,
    showInNav: true,
  },
  {
    type: "techspec",
    label: "Tech Spec",
    title: "Tech Spec",
    subtitle: "Technical specifications and architecture",
    description: "",
    icon: Code,
    creditCost: 15,
    showInNav: false,
  },
  {
    type: "deploy",
    label: "Deploy",
    title: "Deploy",
    subtitle: "Generate and deploy your application",
    description: "",
    icon: Rocket,
    creditCost: 5,
    showInNav: false,
  },
] satisfies DocumentDefinition[]

export const DOCUMENT_DEFINITION_MAP = Object.fromEntries(
  DOCUMENT_DEFINITIONS.map((definition) => [definition.type, definition])
) as Record<DocumentType, DocumentDefinition>

export const NAV_DOCUMENT_DEFINITIONS = DOCUMENT_DEFINITIONS.filter(
  (definition) => definition.showInNav !== false
)

export function isDocumentType(value: string | null | undefined): value is DocumentType {
  return typeof value === "string" && DOCUMENT_TYPES.includes(value as DocumentType)
}

export function getDocumentDefinition(type: DocumentType): DocumentDefinition {
  return DOCUMENT_DEFINITION_MAP[type]
}

/** Ordered list of document types for Generate All pipeline */
export const GENERATE_ALL_QUEUE_ORDER: DocumentType[] = [
  "competitive",
  "prd",
  "mvp",
  "mockups",
]

/**
 * Text planning documents in the Generate All pipeline. These stream partial
 * markdown while generating and follow plan-tier model routing; mockups keep
 * their dedicated image model and never stream text. Single source for the
 * store, the status route, and the execute route.
 */
export const PLANNING_TEXT_DOC_TYPES = ["competitive", "prd", "mvp"] as const
export type PlanningTextDocType = (typeof PLANNING_TEXT_DOC_TYPES)[number]

export function isPlanningTextDocType(value: unknown): value is PlanningTextDocType {
  return typeof value === "string" &&
    (PLANNING_TEXT_DOC_TYPES as readonly string[]).includes(value)
}

/** Default AI models for each Generate All document type */
export const GENERATE_ALL_DEFAULT_MODELS: Record<string, string> = {
  competitive: "google/gemini-3.1-pro-preview",
  prd:         PRODUCT_PLAN_DEFAULT_MODEL,
  mvp:         FIRST_VERSION_PLAN_DEFAULT_MODEL,
  mockups:     "openai/gpt-5.4-image-2",
}
