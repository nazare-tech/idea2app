"use client"

import {
  AlertTriangle,
  Check,
  CircleGauge,
  Compass,
  ShieldCheck,
  Target,
  TrendingUp,
  UsersRound,
} from "lucide-react"

import { ExplainableLabel } from "@/components/analysis/explainable-term"
import type { PlanningDocumentSection } from "@/lib/planning-document-parser"
import {
  extractSectionsByHeading,
  normalizeHeading,
  parseNarrativeTable,
  stripInlineMarkdown,
} from "@/lib/planning-document-parser"
import { cn } from "@/lib/utils"
import {
  NarrativeContent,
  PlanningMarkdownRenderer,
  Warning,
  displayFontClass,
  getCurrentSectionTitle,
  getSectionByAlias,
  getStatValue,
  isCurrentPromptDocument,
  splitLabeledText,
  stripHorizontalRulesFromMarkdown,
  type PlanningDocumentProps,
} from "./planning-blocks-shared"

interface TimelinePhaseDetail {
  label?: string
  body?: string
  bullets: string[]
}

function parseTimelinePhaseDetails(content: string) {
  const details: TimelinePhaseDetail[] = []
  let active: TimelinePhaseDetail | null = null

  for (const rawLine of stripHorizontalRulesFromMarkdown(content).split("\n")) {
    if (!rawLine.trim()) continue

    const listMatch = rawLine.match(/^(\s*)(?:[-*+]|\d+\.)\s+(.+)$/)
    if (listMatch) {
      const indent = listMatch[1]?.length ?? 0
      const text = stripInlineMarkdown(listMatch[2]?.trim() ?? "")
      if (!text) continue

      if (indent > 0 && active) {
        active.bullets.push(text)
        continue
      }

      const labeled = splitLabeledText(text)
      active = {
        label: labeled?.label,
        body: labeled ? labeled.body : text,
        bullets: [],
      }
      details.push(active)
      continue
    }

    const text = stripInlineMarkdown(rawLine.trim())
    if (!text) continue

    if (!active) {
      active = { body: text, bullets: [] }
      details.push(active)
      continue
    }

    if (active.bullets.length > 0) {
      active.bullets[active.bullets.length - 1] = `${active.bullets[active.bullets.length - 1]} ${text}`
    } else {
      active.body = [active.body, text].filter(Boolean).join(" ")
    }
  }

  return details.filter((detail) => detail.label || detail.body || detail.bullets.length > 0)
}

function getTimelineDetail(details: TimelinePhaseDetail[], aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeHeading)

  return details.find((detail) => {
    if (!detail.label) return false
    const label = normalizeHeading(detail.label)
    return normalizedAliases.some((alias) => label === alias || label.includes(alias))
  })
}

function getTimelinePhaseTitle(heading: string) {
  return getCurrentSectionTitle(heading).replace(/^Phase\s+\d+\s*:?\s*/i, "").trim()
}

function getTimelinePhaseDurationWeeks(phase: PlanningDocumentSection) {
  const details = parseTimelinePhaseDetails(phase.content)
  const duration =
    getTimelineDetail(details, ["Estimated duration", "Duration"])?.body ??
    phase.content.match(/Estimated duration\*\*:\s*([^\n]+)/i)?.[1] ??
    phase.content.match(/Duration\*\*:\s*([^\n]+)/i)?.[1] ??
    phase.content.match(/(\d+)\s*(?:weeks?|wks?)/i)?.[0]
  const match = duration?.match(/(\d+)/)

  return match ? Number(match[1]) : null
}

function getTimelinePhaseWeekRanges(phases: PlanningDocumentSection[]) {
  let nextStart = 1

  return phases.map((phase) => {
    const duration = getTimelinePhaseDurationWeeks(phase)
    if (!duration || Number.isNaN(duration)) {
      return null
    }

    const start = nextStart
    const end = nextStart + duration - 1
    nextStart = end + 1

    return `Weeks ${start}-${end}`
  })
}

function TimelinePhaseCard({
  phase,
  index,
  weekRange,
}: {
  phase: PlanningDocumentSection
  index: number
  weekRange: string | null
}) {
  const title = getTimelinePhaseTitle(phase.heading)
  const details = parseTimelinePhaseDetails(phase.content)
  const goal = getTimelineDetail(details, ["Goal"])?.body ?? details.find((detail) => detail.body)?.body
  const deliverables =
    getTimelineDetail(details, ["Key deliverables", "Deliverables"])?.bullets ??
    details.flatMap((detail) => detail.bullets)

  return (
    <article className="border border-[#E8DDD5] bg-white px-6 py-6 shadow-[0_4px_18px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          Phase {index + 1}
        </p>
        {weekRange ? (
          <p className="font-mono text-[10px] font-medium tracking-[0.12em] text-[#8A8480]">
            {weekRange}
          </p>
        ) : null}
      </div>

      <h3 className={cn(displayFontClass, "mt-2 text-[20px] font-bold leading-tight tracking-[-0.03em] text-[#0A0A0A]")}>
        {title}
      </h3>

      {goal ? (
        <p className="mt-4 text-[13px] font-medium leading-5 text-[#6F6A66]">
          {goal}
        </p>
      ) : null}

      {deliverables.length > 0 ? (
        <div className="mt-8">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#B8B0AA]">
            Key Deliverables
          </p>
          <ul aria-label={`${title} key deliverables`} className="mt-4 space-y-3">
            {deliverables.map((item, itemIndex) => (
              <li key={`${item}-${itemIndex}`} className="flex gap-3 text-[12.5px] font-medium leading-5 text-[#4A4040]">
                <Check className="mt-1 h-3 w-3 shrink-0 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  )
}

const currentPrdSectionAliases = [
  "Introduction/overview",
  "Goals",
  "Team and Milestones",
  "Success metrics",
  "User personas",
  "User stories and acceptance criteria",
  "Functional requirements",
  "Technical considerations",
  "Non-goals / out of scope",
]

interface CurrentPersona {
  name: string
  fields: Array<{ label: string; body: string; items: string[] }>
}

const standalonePersonaFieldLabels = [
  "Archetype",
  "User type",
  "Role",
  "Meta",
  "Profile",
  "Context",
  "Age",
  "Occupation",
  "Location",
  "Technical level",
  "Technology comfort level",
  "Technology comfort",
  "Tech comfort",
  "Demographics",
  "Background",
  "Description",
  "Who this user is",
  "Needs",
  "What they need",
  "How this product addresses their needs",
  "Pain points",
  "Pain point",
  "Problems they face today",
  "Pain points and frustrations",
  "Frustrations",
  "Motivation",
  "Why they would use this product",
  "Goals",
  "Goal",
  "Goals and motivations",
]

function normalizePersonaFieldLabel(value: string) {
  return normalizeHeading(value).replace(/[^a-z0-9]+/g, " ").trim()
}

function isKnownPersonaFieldLabel(value: string) {
  const label = normalizePersonaFieldLabel(value)
  return standalonePersonaFieldLabels.some((alias) => label === normalizePersonaFieldLabel(alias))
}

function createPersonaField(
  persona: CurrentPersona,
  label: string,
  body = "",
) {
  const field = {
    label: stripInlineMarkdown(label),
    body: stripInlineMarkdown(body),
    items: [],
  }
  persona.fields.push(field)
  return field
}

function isPersonaListField(label: string) {
  const normalized = normalizePersonaFieldLabel(label)
  return [
    "needs",
    "what they need",
    "how this product addresses their needs",
    "pain points",
    "pain point",
    "problems they face today",
    "pain points and frustrations",
    "frustrations",
    "goals",
    "goal",
    "goals and motivations",
  ].includes(normalized)
}

function isPersonaMetadataField(label: string) {
  const normalized = normalizePersonaFieldLabel(label)
  return [
    "meta",
    "profile",
    "context",
    "age",
    "occupation",
    "location",
    "technical level",
    "technology comfort level",
    "technology comfort",
    "tech comfort",
    "demographics",
  ].includes(normalized)
}

function isPersonaFallbackProseField(label: string) {
  return ![
    "archetype",
    "user type",
    "role",
    "needs",
    "what they need",
    "how this product addresses their needs",
    "pain points",
    "pain point",
    "problems they face today",
    "pain points and frustrations",
    "frustrations",
    "motivation",
    "why they would use this product",
    "goals",
    "goal",
    "goals and motivations",
  ].includes(normalizePersonaFieldLabel(label)) && !isPersonaMetadataField(label)
}

function parseCurrentPersonas(content: string): CurrentPersona[] {
  const personas: CurrentPersona[] = []
  let active: CurrentPersona | null = null
  let activeField: CurrentPersona["fields"][number] | null = null

  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    const heading = trimmed.match(/^\*\*([^*:][^*]{1,96})\*\*$/)?.[1]?.trim()

    if (heading) {
      if (active && isKnownPersonaFieldLabel(heading)) {
        activeField = createPersonaField(active, heading)
        continue
      }

      active = { name: heading, fields: [] }
      activeField = null
      personas.push(active)
      continue
    }

    if (!active) continue

    const tagline = trimmed.match(/^\*([^*]{2,96})\*$/)?.[1]?.trim()
    if (tagline && active.fields.length === 0) {
      activeField = createPersonaField(active, "Archetype", tagline)
      continue
    }

    const listMatch = line.match(/^(\s*)(?:[-*+]|\d+\.)\s+(.+)$/)
    const listText = listMatch?.[2]?.trim() ?? trimmed
    const field = listText.match(/^\*\*([^*]+)\*\*:\s*(.*)$/)

    if (field) {
      activeField = createPersonaField(active, field[1].trim(), field[2].trim())
      continue
    }

    const plainField = listText.match(/^([^:]{2,80}):\s*(.+)$/)
    if (plainField && !/[.!?]$/.test(plainField[1].trim())) {
      activeField = createPersonaField(active, plainField[1].trim(), plainField[2].trim())
      continue
    }

    if (activeField && listMatch && listText && (listMatch[1].length > 0 || isPersonaListField(activeField.label))) {
      activeField.items.push(stripInlineMarkdown(listText))
      continue
    }

    if (activeField && trimmed && !/^#{1,6}\s+/.test(trimmed)) {
      const body = stripInlineMarkdown(trimmed.replace(/^\s*(?:[-*+]|\d+\.)\s+/, ""))
      activeField.body = [activeField.body, body].filter(Boolean).join(" ")
    }
  }

  return personas.filter((persona) => !isKnownPersonaFieldLabel(persona.name))
}

function getPersonaField(persona: CurrentPersona, aliases: string[]) {
  const normalizedAliases = aliases.map(normalizePersonaFieldLabel)

  return persona.fields.find((field) => {
    const label = normalizePersonaFieldLabel(field.label)
    return normalizedAliases.some((alias) => label === alias || label.includes(alias))
  })
}

function getPersonaFieldText(field?: CurrentPersona["fields"][number]) {
  if (!field) return ""
  return [field.body, ...field.items].filter(Boolean).join(" ").trim()
}

function splitPersonaList(value: string) {
  return value
    .split(/\s*(?:;|\||\n)\s*/g)
    .map((item) => stripInlineMarkdown(item).trim())
    .filter(Boolean)
}

function getPersonaFieldItems(
  persona: CurrentPersona,
  aliases: string[],
  fallbackAliases: string[] = [],
) {
  const field = getPersonaField(persona, aliases) ?? getPersonaField(persona, fallbackAliases)
  if (!field) return []

  if (field.items.length > 0) {
    return field.items.map((item) => stripInlineMarkdown(item)).filter(Boolean)
  }

  return splitPersonaList(field.body)
}

function formatPersonaMetaField(field: CurrentPersona["fields"][number]) {
  const value = getPersonaFieldText(field)
  if (!value) return ""

  const label = normalizePersonaFieldLabel(field.label)
  if (label === "age") return /^age\b/i.test(value) ? value : `Age ${value}`

  return value
}

function buildPersonaMeta(persona: CurrentPersona) {
  const metaField = getPersonaField(persona, ["Meta", "Profile", "Context"])
  if (metaField) {
    return splitPersonaList([metaField.body, ...metaField.items].filter(Boolean).join("; ")).slice(0, 4)
  }

  return persona.fields
    .filter((field) =>
      ["Age", "Occupation", "Location", "Demographics", "Technology comfort level", "Technology comfort", "Technical level", "Tech comfort", "Role"].some(
        (alias) => normalizePersonaFieldLabel(field.label).includes(normalizePersonaFieldLabel(alias)),
      ),
    )
    .map(formatPersonaMetaField)
    .filter(Boolean)
    .filter((value) => value.length <= 96)
    .slice(0, 4)
}

function normalizePersonaCard(persona: CurrentPersona, index: number) {
  const fallbackProseField = persona.fields.find((field) => isPersonaFallbackProseField(field.label))
  const description =
    getPersonaFieldText(getPersonaField(persona, ["Description", "Who this user is", "Background"])) ||
    getPersonaFieldText(fallbackProseField)
  const needs = getPersonaFieldItems(
    persona,
    ["Needs", "What they need", "How this product addresses their needs"],
    ["Goals", "Goal", "Goals and motivations"],
  )
  const painPoints = getPersonaFieldItems(
    persona,
    ["Pain points", "Pain point", "Problems they face today", "Pain points and frustrations", "Frustrations"],
  )
  const motivation =
    getPersonaFieldText(getPersonaField(persona, ["Motivation", "Why they would use this product"])) ||
    getPersonaFieldText(getPersonaField(persona, ["Goals and motivations", "Goal", "Goals"])) ||
    needs[0] ||
    description

  return {
    name: persona.name,
    archetype:
      getPersonaFieldText(getPersonaField(persona, ["Archetype", "User type", "Role"])) ||
      (persona.name === "Target User Profile" ? "Primary user" : `Persona ${String(index + 1).padStart(2, "0")}`),
    meta: buildPersonaMeta(persona),
    description,
    needs,
    painPoints,
    motivation,
  }
}

function PersonaSilhouette({ variant }: { variant: "female" | "male" | "neutral" }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className="block h-full w-full text-[#4A4040]"
      aria-hidden="true"
    >
      {variant === "female" ? (
        <>
          <rect x="28" y="18" width="44" height="58" rx="22" fill="currentColor" />
          <path d="M17 100 C17 77 32 68 50 68 C68 68 83 77 83 100 Z" fill="currentColor" />
        </>
      ) : variant === "male" ? (
        <>
          <path d="M14 100 C14 73 31 64 50 64 C69 64 86 73 86 100 Z" fill="currentColor" />
          <circle cx="50" cy="35" r="20" fill="currentColor" />
        </>
      ) : (
        <>
          <path d="M17 100 C17 75 32 66 50 66 C68 66 83 75 83 100 Z" fill="currentColor" />
          <circle cx="50" cy="37" r="18" fill="currentColor" />
        </>
      )}
    </svg>
  )
}

function PersonaAvatar({ index }: { index: number }) {
  const variants: Array<"female" | "male" | "neutral"> = ["female", "male", "neutral"]

  return (
    <div className="relative h-[104px] w-[104px] shrink-0 overflow-hidden rounded-full border border-[#E8DDD5] bg-[#F5F0EB] shadow-[0_0_0_3px_#FFFFFF,0_0_0_5px_#DC2626]">
      <div className="absolute inset-0 pt-3.5">
        <PersonaSilhouette variant={variants[index % variants.length]} />
      </div>
    </div>
  )
}

function PersonaSectionLabel({
  icon: Icon,
  children,
}: {
  icon: typeof UsersRound
  children: React.ReactNode
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon className="h-[15px] w-[15px] text-[#8A8480]" strokeWidth={1.75} />
      <span className="font-mono text-[11px] font-medium uppercase leading-tight tracking-[0.18em] text-[#4A4040]">
        {children}
      </span>
    </div>
  )
}

function PersonaItemList({
  items,
  markerClassName,
}: {
  items: string[]
  markerClassName: string
}) {
  if (items.length === 0) {
    return <p className="text-[15px] leading-6 text-[#8A8480]">No structured details available.</p>
  }

  return (
    <ul className="space-y-[11px]">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex items-start gap-[11px]">
          <span className={cn("mt-2 h-1.5 w-1.5 shrink-0 rounded-[1px]", markerClassName)} />
          <span className="text-[15px] leading-[1.5] text-[#4A4040]">{item}</span>
        </li>
      ))}
    </ul>
  )
}

function DetailedPersonaCard({
  persona,
  index,
}: {
  persona: CurrentPersona
  index: number
}) {
  const card = normalizePersonaCard(persona, index)

  return (
    <article className="overflow-hidden border border-[#E8DDD5] bg-white">
      <div className="p-7 sm:p-8">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <PersonaAvatar index={index} />
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-[7px] w-[7px] rounded-[1px] bg-primary" />
              <span className="font-mono text-[10px] font-medium uppercase leading-tight tracking-[0.18em] text-[#4A4040]">
                Persona {index + 1}
              </span>
            </div>
            <h3 className={cn(displayFontClass, "text-[26px] font-extrabold leading-[1.08] tracking-[-0.035em] text-[#1C1917]")}>
              {card.name}
            </h3>
            <p className="mt-1 text-[14px] font-semibold leading-5 text-[#4A4040]">
              {card.archetype}
            </p>
            {card.meta.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {card.meta.map((item) => (
                  <span
                    key={`${card.name}-${item}`}
                    className="inline-flex rounded-full border border-[#EAE0D8] bg-[#F5F0EB] px-[10px] py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[#6B7280]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </header>

        <div className="my-8 border-t border-[#EAE0D8] sm:my-10" />

        <section>
          <PersonaSectionLabel icon={UsersRound}>Description</PersonaSectionLabel>
          <p className="max-w-[64ch] text-[16px] leading-[1.6] text-[#1C1917]">
            {card.description || "No structured description available."}
          </p>
        </section>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <section>
            <PersonaSectionLabel icon={Target}>Needs</PersonaSectionLabel>
            <PersonaItemList items={card.needs} markerClassName="bg-[#8A8480]" />
          </section>
          <section>
            <PersonaSectionLabel icon={AlertTriangle}>Pain points</PersonaSectionLabel>
            <PersonaItemList items={card.painPoints} markerClassName="bg-[#D95F3B]" />
          </section>
        </div>

        <section className="mt-8 border border-[#EAE0D8] bg-[#F5F0EB] p-6">
          <PersonaSectionLabel icon={Compass}>Motivation</PersonaSectionLabel>
          <p className={cn(displayFontClass, "max-w-[60ch] text-[18px] font-semibold leading-[1.45] tracking-[-0.01em] text-[#1C1917]")}>
            {card.motivation || "No structured motivation available."}
          </p>
        </section>
      </div>
    </article>
  )
}

function DetailedPersonaCards({ personas }: { personas: CurrentPersona[] }) {
  return (
    <div className="space-y-5">
      {personas.map((persona, index) => (
        <DetailedPersonaCard
          key={`${persona.name}-${index}`}
          persona={persona}
          index={index}
        />
      ))}
    </div>
  )
}

function ProductPlanMasthead() {
  return (
    <header className="pb-10 pt-6">
      <h1
        className={cn(
          displayFontClass,
          "text-[36px] font-bold tracking-[-0.05em] text-[#0A0A0A] md:text-[44px]",
        )}
      >
        Product Plan
      </h1>
    </header>
  )
}

function DesignedSection({
  id,
  title,
  index,
  total,
  children,
}: {
  id?: string
  kicker: string
  title: string
  index: number
  total: number
  children: React.ReactNode
}) {
  return (
    <section id={id} className="pt-0">
      <div className="mb-8 flex items-end justify-between gap-6 border-b border-[#E8DDD5] pb-6">
        <div>
          <h2 className={cn(displayFontClass, "text-[22px] font-bold tracking-[-0.03em] text-[#0A0A0A]")}>
            {title}
          </h2>
        </div>
        <p className="shrink-0 font-mono text-[13px] tracking-[0.1em] text-[#8A8480]">
          {String(index).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </p>
      </div>
      {children}
    </section>
  )
}

function DesignProse({ section }: { section: PlanningDocumentSection }) {
  const narrative = parseNarrativeTable(section.content)

  return (
    <div className="space-y-7">
      {narrative.paragraphs[0] ? (
        <p className="max-w-4xl text-[22px] font-medium leading-[1.5] tracking-[-0.01em] text-[#0A0A0A]">
          {narrative.paragraphs[0]}
        </p>
      ) : null}
      {narrative.paragraphs.slice(1).length > 0 || narrative.items.length > 0 || narrative.table ? (
        <NarrativeContent
          narrative={{
            ...narrative,
            paragraphs: narrative.paragraphs.slice(1),
          }}
        />
      ) : null}
    </div>
  )
}

function getNestedNarrative(section: PlanningDocumentSection, aliases: string[]) {
  const nested = extractSectionsByHeading(section.content, 3)
  const match = getSectionByAlias(nested, aliases)

  return match ? parseNarrativeTable(match.content) : parseNarrativeTable("")
}

/**
 * Numbered goal cards shared by business and user goals so both lists render
 * with the same UI (mono 01/02/03 badges, matching the Non-goals grid idiom).
 */
function GoalGrid({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="mb-4 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[#4A4040]">
        <span className="h-1.5 w-1.5 bg-primary" />
        {label}
      </p>
      <ul className="grid gap-3 md:grid-cols-2">
        {items.map((item, index) => (
          <li key={`${item}-${index}`} className="flex gap-4 border border-[#E8DDD5] bg-white px-5 py-4 text-[15px] leading-6 text-[#4A4040]">
            <span className="h-fit shrink-0 border border-[#E8DDD5] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#8A8480]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>{stripInlineMarkdown(item)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function GoalsShowcase({ section }: { section: PlanningDocumentSection }) {
  const business = getNestedNarrative(section, ["Business goals", "Business goal"])
  const user = getNestedNarrative(section, ["User goals", "User goal"])

  return (
    <div className="space-y-10">
      {business.items.length > 0 ? (
        // "Proposed" signals these are AI-suggested starting targets, not commitments.
        <GoalGrid label="Proposed Business Goals" items={business.items} />
      ) : (
        <NarrativeContent narrative={parseNarrativeTable(section.content)} />
      )}

      {user.items.length > 0 ? <GoalGrid label="User Goals" items={user.items} /> : null}
    </div>
  )
}

function PersonaShowcase({ section, projectId }: { section?: PlanningDocumentSection; projectId: string }) {
  if (!section) return null

  const nested = extractSectionsByHeading(section.content, 3)
  const personaDetails = getSectionByAlias(nested, ["Persona details"])?.content ?? section.content
  const roleAccess = parseNarrativeTable(
    getSectionByAlias(nested, ["Role-based access"])?.content ?? "",
  )
  const personas = parseCurrentPersonas(personaDetails)

  return (
    <div className="space-y-9">
      {personas.length > 0 ? (
        <DetailedPersonaCards personas={personas} />
      ) : (
        <PlanningMarkdownRenderer content={personaDetails} projectId={projectId} />
      )}

      {/* Cells carry their own top/left hairlines (offset by -1px) so empty space in a partial last row stays white instead of showing a container background. */}
      {roleAccess.items.length > 0 ? (
        <div className="grid border border-[#E8DDD5] bg-white md:grid-cols-2 xl:grid-cols-4">
          {roleAccess.items.map((item, index) => {
            const labeled = splitLabeledText(stripInlineMarkdown(item))

            return (
              <article key={`${item}-${index}`} className="-ml-px -mt-px border-l border-t border-[#E8DDD5] bg-white px-5 py-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
                  Access {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-3 text-[15px] font-bold text-[#0A0A0A]">
                  {labeled?.label ?? `Role ${index + 1}`}
                </h3>
                <p className="mt-2 text-[13px] leading-5 text-[#4A4040]">
                  {labeled?.body ?? stripInlineMarkdown(item)}
                </p>
              </article>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function MetricsShowcase({ section, projectId }: { section?: PlanningDocumentSection; projectId: string }) {
  if (!section) return null

  const nested = extractSectionsByHeading(section.content, 3)
  if (nested.length === 0) {
    return <PlanningMarkdownRenderer content={section.content} projectId={projectId} />
  }

  const icons = [UsersRound, TrendingUp, CircleGauge]

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {nested.map((metricSection, index) => {
        const Icon = icons[index % icons.length]
        const narrative = parseNarrativeTable(metricSection.content)

        return (
          <article key={`${metricSection.heading}-${index}`} className="border border-[#E8DDD5] bg-white">
            <div className="flex items-center gap-3 border-b border-[#E8DDD5] px-6 py-5">
              <Icon className="h-4 w-4 text-[#4A4040]" />
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#4A4040]">
                {getCurrentSectionTitle(metricSection.heading)}
              </p>
            </div>
            <div className="divide-y divide-[#E8DDD5]">
              {[...narrative.items, ...narrative.paragraphs].map((item, itemIndex) => (
                <div key={`${item}-${itemIndex}`} className="px-6 py-4">
                  <p className={cn(displayFontClass, "text-[26px] font-extrabold leading-none tracking-[-0.04em] text-[#0A0A0A]")}>
                    {getStatValue(item, itemIndex)}
                  </p>
                  <p className="mt-2 text-[13px] leading-5 text-[#4A4040]">{stripInlineMarkdown(item)}</p>
                </div>
              ))}
            </div>
          </article>
        )
      })}
    </div>
  )
}

function TimelineShowcase({ section, projectId }: { section?: PlanningDocumentSection; projectId: string }) {
  if (!section) return null

  const nested = extractSectionsByHeading(section.content, 3)
  const estimate = getSectionByAlias(nested, ["Project estimate"])
  const team = getSectionByAlias(nested, ["Team composition", "Team"])
  const phases = nested.filter((item) => /^Phase\s+\d+/i.test(stripInlineMarkdown(item.heading)))
  const phaseWeekRanges = getTimelinePhaseWeekRanges(phases)

  return (
    <div className="space-y-10">
      <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
        {estimate ? (
          <div className="flex border border-[#E8DDD5] bg-[#E8DDD5]">
            {parseNarrativeTable(estimate.content).items.slice(0, 2).map((item, index) => {
              const labeled = splitLabeledText(stripInlineMarkdown(item))

              return (
                <div key={`${item}-${index}`} className="flex-1 bg-white px-6 py-5">
                  <p className={cn(displayFontClass, "text-[30px] font-extrabold leading-none tracking-[-0.04em] text-[#0A0A0A]")}>
                    {labeled?.body ?? stripInlineMarkdown(item)}
                  </p>
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8A8480]">
                    {labeled?.label ?? `Estimate ${index + 1}`}
                  </p>
                </div>
              )
            })}
          </div>
        ) : null}
        {team ? (
          <div>
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.16em] text-[#4A4040]">
              Team Composition
            </p>
            <div className="space-y-2">
              {parseNarrativeTable(team.content).items.map((item, index) => {
                const labeled = splitLabeledText(stripInlineMarkdown(item))

                return (
                  <div key={`${item}-${index}`} className="flex gap-4 text-[13.5px] leading-6">
                    <span className="min-w-[150px] font-semibold text-[#0A0A0A]">{labeled?.label ?? `Role ${index + 1}`}</span>
                    <span className="text-[#4A4040]">{labeled?.body ?? stripInlineMarkdown(item)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>

      {phases.length > 0 ? (
        <div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {phases.map((phase, index) => (
              <TimelinePhaseCard
                key={`${phase.heading}-${index}`}
                phase={phase}
                index={index}
                weekRange={phaseWeekRanges[index] ?? null}
              />
            ))}
          </div>
        </div>
      ) : (
        <PlanningMarkdownRenderer content={section.content} projectId={projectId} />
      )}
    </div>
  )
}

interface FollowThroughItem {
  title: string
  body: string
}

interface RiskItem {
  title: string
  impact: string
  mitigation: string
}

function stripLeadingItemCode(value: string) {
  return value.replace(/^[A-Z]-?\d{1,3}\s*:?\s+/i, "").trim()
}

function splitTitleAndBody(value: string): FollowThroughItem {
  const cleaned = stripLeadingItemCode(stripInlineMarkdown(value))
  const labeled = splitLabeledText(cleaned)
  if (labeled) {
    return {
      title: labeled.label,
      body: labeled.body,
    }
  }

  const sentenceMatch = cleaned.match(/^(.+?[.!?])\s+(.+)$/)
  if (sentenceMatch && sentenceMatch[1].length <= 96) {
    return {
      title: sentenceMatch[1].trim(),
      body: sentenceMatch[2].trim(),
    }
  }

  return {
    title: cleaned,
    body: "",
  }
}

function parseFollowThroughItems(content: string): FollowThroughItem[] {
  const narrative = parseNarrativeTable(content)
  const items = narrative.items.length > 0 ? narrative.items : narrative.paragraphs

  return items
    .map(splitTitleAndBody)
    .filter((item) => item.title || item.body)
}

function parseRiskItems(content: string): RiskItem[] {
  const risks: RiskItem[] = []
  let active: RiskItem | null = null

  for (const rawLine of stripHorizontalRulesFromMarkdown(content).split("\n")) {
    const line = rawLine.trim()
    if (!line) continue

    const listMatch = rawLine.match(/^(\s*)(?:[-*+]|\d+\.)\s+(.+)$/)
    if (!listMatch) {
      if (active) {
        active.title = [active.title, stripInlineMarkdown(line)].filter(Boolean).join(" ")
      }
      continue
    }

    const indent = listMatch[1]?.length ?? 0
    const text = stripInlineMarkdown(listMatch[2]?.trim() ?? "")
    const labeled = splitLabeledText(text)

    if (indent === 0) {
      const title = labeled && normalizeHeading(labeled.label) === "risk"
        ? labeled.body
        : text.replace(/^Risk:\s*/i, "").trim()

      active = {
        title,
        impact: "",
        mitigation: "",
      }
      risks.push(active)
      continue
    }

    if (!active) continue

    const label = normalizeHeading(labeled?.label ?? "")
    const body = labeled?.body ?? text
    if (label === "impact") {
      active.impact = [active.impact, body].filter(Boolean).join(" ")
    } else if (label === "mitigation") {
      active.mitigation = [active.mitigation, body].filter(Boolean).join(" ")
    } else {
      active.mitigation = [active.mitigation, body].filter(Boolean).join(" ")
    }
  }

  if (risks.length > 0) {
    return risks.filter((risk) => risk.title || risk.impact || risk.mitigation)
  }

  return parseFollowThroughItems(content).map((item) => ({
    title: item.title,
    impact: item.body,
    mitigation: "",
  }))
}

function FollowThroughHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[#4A4040]">
      <span className="h-1.5 w-1.5 bg-primary" />
      {children}
    </p>
  )
}

function RiskMitigationShowcase({ section }: { section?: PlanningDocumentSection }) {
  if (!section?.content.trim()) return null

  const risks = parseRiskItems(section.content)
  if (risks.length === 0) return null

  return (
    <section className="space-y-4">
      <FollowThroughHeading>Risks & Mitigation</FollowThroughHeading>
      <div className="space-y-4">
        {risks.map((risk, index) => (
          <article key={`${risk.title}-${index}`} className="border border-[#E8DDD5] bg-white">
            <div className="flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-start">
              <span className="w-fit border border-[#E8DDD5] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-primary">
                R-{String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="max-w-3xl text-[16px] font-bold leading-6 text-[#0A0A0A]">
                {risk.title}
              </h3>
            </div>
            <div className="grid divide-y divide-[#E8DDD5] border-t border-[#E8DDD5] md:grid-cols-2 md:divide-x md:divide-y-0">
              <section className="bg-[#F3F0EC] px-6 py-6">
                <p className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#D95F3B]">
                  <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.75} />
                  <ExplainableLabel termKey="impact">Impact</ExplainableLabel>
                </p>
                <p className="text-[13.5px] leading-6 text-[#4A4040]">
                  {risk.impact || "Impact details were not provided."}
                </p>
              </section>
              <section className="px-6 py-6">
                <p className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#16A34A]">
                  <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
                  <ExplainableLabel termKey="mitigation">Mitigation</ExplainableLabel>
                </p>
                <p className="text-[13.5px] leading-6 text-[#4A4040]">
                  {risk.mitigation || "Mitigation details were not provided."}
                </p>
              </section>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function DependenciesShowcase({ section }: { section?: PlanningDocumentSection }) {
  if (!section?.content.trim()) return null

  const dependencies = parseFollowThroughItems(section.content)
  if (dependencies.length === 0) return null

  return (
    <section className="space-y-4">
      <FollowThroughHeading>Dependencies</FollowThroughHeading>
      <div className="divide-y divide-[#E8DDD5] border border-[#E8DDD5] bg-white">
        {dependencies.map((dependency, index) => (
          <article key={`${dependency.title}-${index}`} className="grid gap-4 px-6 py-6 sm:grid-cols-[48px_1fr]">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#8A8480]">
              D{String(index + 1).padStart(2, "0")}
            </p>
            <div>
              <h3 className="text-[15px] font-bold leading-5 text-[#0A0A0A]">
                {dependency.title}
              </h3>
              {dependency.body ? (
                <p className="mt-2 max-w-3xl text-[13.5px] leading-6 text-[#4A4040]">
                  {dependency.body}
                </p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function isHighestRiskAssumption(item: FollowThroughItem) {
  return /highest[-\s]?risk|single highest|riskiest|high[-\s]?risk/i.test(`${item.title} ${item.body}`)
}

function AssumptionsShowcase({ section }: { section?: PlanningDocumentSection }) {
  if (!section?.content.trim()) return null

  const assumptions = parseFollowThroughItems(section.content)
  if (assumptions.length === 0) return null

  return (
    <section className="space-y-4">
      <FollowThroughHeading>Assumptions</FollowThroughHeading>
      <div className="grid border border-[#E8DDD5] bg-white md:grid-cols-2">
        {assumptions.map((assumption, index) => {
          const highestRisk = isHighestRiskAssumption(assumption)

          return (
            <article
              key={`${assumption.title}-${index}`}
              className={cn(
                "-ml-px -mt-px min-h-[160px] border-l border-t border-[#E8DDD5] px-6 py-6",
                highestRisk ? "bg-[#E7DDD6]" : "bg-white",
              )}
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#8A8480]">
                  A{String(index + 1).padStart(2, "0")}
                </p>
                {highestRisk ? (
                  <span className="border border-primary/20 bg-white px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-primary">
                    <ExplainableLabel termKey="highestRisk">Highest Risk</ExplainableLabel>
                  </span>
                ) : null}
              </div>
              <h3 className="text-[15px] font-bold leading-5 text-[#0A0A0A]">
                {assumption.title}
              </h3>
              {assumption.body ? (
                <p className="mt-3 text-[13.5px] leading-6 text-[#4A4040]">
                  {assumption.body}
                </p>
              ) : null}
            </article>
          )
        })}
      </div>
    </section>
  )
}

function OpenQuestionsShowcase({ section }: { section?: PlanningDocumentSection }) {
  if (!section?.content.trim()) return null

  const questions = parseFollowThroughItems(section.content)
  if (questions.length === 0) return null

  return (
    <section className="space-y-4">
      <FollowThroughHeading>Open Questions</FollowThroughHeading>
      <div className="grid gap-4 lg:grid-cols-2">
        {questions.map((question, index) => (
          <article key={`${question.title}-${index}`} className="min-h-[170px] border border-[#E8DDD5] bg-white px-6 py-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#8A8480]">
              Q{String(index + 1).padStart(2, "0")}
            </p>
            <h3 className="mt-5 text-[16px] font-bold leading-5 text-[#0A0A0A]">
              {question.title}
            </h3>
            {question.body ? (
              <p className="mt-3 text-[13.5px] leading-6 text-[#4A4040]">
                {question.body}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  )
}

/**
 * Displayed Product Plan sections in contract order, with the H2 aliases
 * that source each one. The streaming renderer uses this to show titled
 * skeletons for sections that have not arrived yet; keep it in sync with
 * CurrentPrdDocumentBlocks below.
 */
export const PRD_STREAMING_EXPECTED_SECTIONS: ReadonlyArray<{
  title: string
  aliases: string[]
}> = [
  { title: "Introduction & Overview", aliases: ["Introduction/overview", "Introduction overview"] },
  { title: "Goals", aliases: ["Goals"] },
  { title: "Team & Milestones", aliases: ["Team and Milestones", "Timeline and milestones"] },
  { title: "Success Metrics", aliases: ["Success metrics"] },
  { title: "User Personas", aliases: ["User personas"] },
  { title: "Non-goals & Out of Scope", aliases: ["Non-goals / out of scope", "Out of scope"] },
  {
    title: "Risks, Dependencies & Open Questions",
    aliases: ["Risks and mitigation", "Dependencies and assumptions", "Open questions"],
  },
]

/**
 * Current-format renderer, exported so the streaming preview can render
 * partial documents through the exact same designed blocks without the
 * legacy-format gate (early streams have too few sections to pass it).
 */
export function CurrentPrdDocumentBlocks({ content, projectId }: PlanningDocumentProps) {
  const sections = extractSectionsByHeading(content, 2)
  const introduction = getSectionByAlias(sections, ["Introduction/overview", "Introduction overview"])
  const goals = getSectionByAlias(sections, ["Goals"])
  const teamAndMilestones = getSectionByAlias(sections, ["Team and Milestones", "Timeline and milestones"])
  const metrics = getSectionByAlias(sections, ["Success metrics"])
  const personas = getSectionByAlias(sections, ["User personas"])
  // Functional requirements, user stories, and technical considerations stay
  // in the generated markdown but render only as AI Prompts files.
  const outOfScope = getSectionByAlias(sections, ["Non-goals / out of scope", "Out of scope"])
  const risks = getSectionByAlias(sections, ["Risks and mitigation"])
  const dependenciesAndAssumptions = getSectionByAlias(sections, ["Dependencies and assumptions"])
  const dependencyAssumptionSections = dependenciesAndAssumptions
    ? extractSectionsByHeading(dependenciesAndAssumptions.content, 3)
    : []
  const dependencies =
    getSectionByAlias(dependencyAssumptionSections, ["Dependencies"]) ??
    dependenciesAndAssumptions
  const assumptions = getSectionByAlias(dependencyAssumptionSections, ["Assumptions"])
  const openQuestions = getSectionByAlias(sections, ["Open questions"])
  const hasFollowThroughSections = Boolean(
    risks?.content.trim() ||
      dependencies?.content.trim() ||
      assumptions?.content.trim() ||
      openQuestions?.content.trim(),
  )
  const sectionTotal =
    [
      introduction,
      goals,
      teamAndMilestones,
      metrics,
      personas,
      outOfScope,
    ].filter(Boolean).length + (hasFollowThroughSections ? 1 : 0)
  let sectionIndex = 1
  const nextSectionIndex = () => sectionIndex++

  return (
    <div className="flex flex-col gap-16">
      <ProductPlanMasthead />

      {introduction ? (
        <DesignedSection
          id="prd-introduction-overview"
          kicker="Product Brief"
          title="Introduction & Overview"
          index={nextSectionIndex()}
          total={sectionTotal}
        >
          <DesignProse section={introduction} />
        </DesignedSection>
      ) : null}

      {goals ? (
        <DesignedSection
          id="prd-goals"
          kicker="Outcomes"
          title="Goals"
          index={nextSectionIndex()}
          total={sectionTotal}
        >
          <GoalsShowcase section={goals} />
        </DesignedSection>
      ) : null}

      {teamAndMilestones ? (
        <DesignedSection
          id="prd-team-milestones"
          kicker="Delivery"
          title="Team & Milestones"
          index={nextSectionIndex()}
          total={sectionTotal}
        >
          <TimelineShowcase section={teamAndMilestones} projectId={projectId} />
        </DesignedSection>
      ) : null}

      {metrics ? (
        <DesignedSection
          id="prd-success-metrics"
          kicker="Measurement"
          title="Success Metrics"
          index={nextSectionIndex()}
          total={sectionTotal}
        >
          <MetricsShowcase section={metrics} projectId={projectId} />
        </DesignedSection>
      ) : null}

      {personas ? (
        <DesignedSection
          id="prd-user-personas"
          kicker="Target Users"
          title="User Personas"
          index={nextSectionIndex()}
          total={sectionTotal}
        >
          <PersonaShowcase section={personas} projectId={projectId} />
        </DesignedSection>
      ) : null}

      {outOfScope ? (
        <DesignedSection
          id="prd-non-goals-out-of-scope"
          kicker="Scope"
          title="Non-goals & Out of Scope"
          index={nextSectionIndex()}
          total={sectionTotal}
        >
          <div className="grid border border-[#E8DDD5] bg-white md:grid-cols-2">
            {parseNarrativeTable(outOfScope.content).items.map((item, index) => {
              const labeled = splitLabeledText(stripInlineMarkdown(item))

              return (
                <article key={`${item}-${index}`} className="-ml-px -mt-px flex gap-4 border-l border-t border-[#E8DDD5] bg-white px-5 py-5">
                  <span className="h-fit border border-[#E8DDD5] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#8A8480]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>
                    {labeled ? (
                      <>
                        <span className="block text-[14px] font-semibold text-[#0A0A0A]">{labeled.label}</span>
                        <span className="mt-1 block text-[13px] leading-5 text-[#4A4040]">{labeled.body}</span>
                      </>
                    ) : (
                      <span className="text-[13.5px] leading-5 text-[#4A4040]">{stripInlineMarkdown(item)}</span>
                    )}
                  </span>
                </article>
              )
            })}
          </div>
        </DesignedSection>
      ) : null}

      {hasFollowThroughSections ? (
        <DesignedSection
          id="prd-follow-through"
          kicker="Follow Through"
          title="Risks, Dependencies & Open Questions"
          index={nextSectionIndex()}
          total={sectionTotal}
        >
          <div className="flex flex-col gap-12">
            <RiskMitigationShowcase section={risks} />
            <DependenciesShowcase section={dependencies} />
            <AssumptionsShowcase section={assumptions} />
            <OpenQuestionsShowcase section={openQuestions} />
          </div>
        </DesignedSection>
      ) : null}
    </div>
  )
}

export function PrdDocumentBlocks({ content, projectId }: PlanningDocumentProps) {
  if (isCurrentPromptDocument(content, currentPrdSectionAliases)) {
    return <CurrentPrdDocumentBlocks content={content} projectId={projectId} />
  }

  // Legacy or unstructured Product Plans render as plain markdown.
  return (
    <div className="space-y-4">
      <Warning message="This Product Plan uses an older format, so the designed block view is unavailable. Showing the original document." />
      <PlanningMarkdownRenderer content={content} projectId={projectId} />
    </div>
  )
}
