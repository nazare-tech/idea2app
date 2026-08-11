export const PRO_MAX_STYLE_SELECTION_MAX_BYTES = 8_192
export const PRO_MAX_TREATMENT_PROMPT_MAX_CHARS = 1_600

export const PRO_MAX_FIELD_CAPS = {
  id: 64,
  name: 80,
  style: 80,
  rationale: 180,
  color: 9,
  font: 80,
  guidance: 220,
  arrayItem: 100,
  maxArrayItems: 4,
} as const

export type ProMaxTreatmentTier = "foundation" | "distinctive" | "experimental"
export type ProMaxDensity = "low" | "medium" | "high"
export type MockupStyleDirectionLabel = "A" | "B" | "C"

export interface ProMaxVisualTreatment {
  id: string
  tier: ProMaxTreatmentTier
  name: string
  style: string
  rationale: string
  palette: {
    background: string
    surface: string
    primary: string
    accent: string
    onAccent: string
    text: string
    muted: string
    border: string
    destructive: string
  }
  typography: {
    heading: string
    body: string
    data: string
  }
  density: ProMaxDensity
  layoutStrategy: string
  navigationPattern: string
  motifs: string[]
  effects: string[]
  avoid: string[]
  mobileNotes: string
  desktopNotes: string
}

export type ProMaxTreatmentTriad = {
  A: ProMaxVisualTreatment
  B: ProMaxVisualTreatment
  C: ProMaxVisualTreatment
}

export interface MockupStyleSelection {
  source: "promax" | "legacy-bank"
  catalogVersion: string
  treatments: ProMaxTreatmentTriad
}
