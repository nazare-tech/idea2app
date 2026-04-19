# Project Page Redesign — Scrollable Document View

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the project workspace from a 3-column single-document-at-a-time layout into a 2-column scrollable layout with a sticky anchor navigation sidebar showing all documents and their sub-sections.

**Architecture:** The existing `ProjectWorkspace` component is refactored in-place. `DocumentNav` is replaced by a new `AnchorNav` component with sub-tabs. `ContentEditor` is replaced by a new `ScrollableContent` component that renders all documents stacked vertically. The competitive analysis document is split into two visual sections (Overview + Market Research). An `IntersectionObserver` syncs scroll position with the active nav item.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Radix UI, Lucide icons

**Spec:** `docs/superpowers/specs/2026-04-17-project-page-redesign-design.md`
**Pencil Design:** `idea2App-design.pen` → frame `j3sHl` ("Realistic data fill")

---

## File Structure

### New Files
| File | Purpose |
|------|---------|
| `src/components/layout/anchor-nav.tsx` | Sticky left sidebar with document tabs, sub-tabs, status indicators, and scroll-to-section click handlers |
| `src/components/layout/scrollable-content.tsx` | Stacked document renderer — renders all documents vertically with section anchor IDs |
| `src/components/layout/project-header.tsx` | Project-specific header matching Pencil design (brand left, breadcrumb center, avatar right) |
| `src/lib/document-sections.ts` | Hardcoded sub-tab/section definitions per document type with anchor IDs |

### Modified Files
| File | Change |
|------|--------|
| `src/components/workspace/project-workspace.tsx` | Replace 3-column layout with 2-column. Wire up AnchorNav + ScrollableContent. Add IntersectionObserver. Separate prompt vs document mode |
| `src/components/analysis/competitive-analysis-document.tsx` | Export two sub-components: `CompetitiveOverviewSection` and `CompetitiveDetailSection` for the split rendering |
| `src/components/layout/dashboard-shell.tsx` | No change needed — already hides header on project pages (line 23-25) |
| `src/lib/document-definitions.ts` | No structural changes — section definitions go in new `document-sections.ts` file to keep concerns separate |

### Unchanged Files
| File | Reason |
|------|--------|
| `src/components/layout/document-nav.tsx` | Kept for backwards compatibility but no longer imported by ProjectWorkspace |
| `src/components/layout/content-editor.tsx` | Kept for potential reuse but no longer imported by ProjectWorkspace |
| `src/components/layout/stacked-tab-nav.tsx` | Not used by AnchorNav (different visual pattern) |
| `src/stores/generate-all-store.ts` | No changes — polling logic unchanged |
| All API routes | No backend changes |
| Database schema | No changes |

---

## Task 1: Create Document Section Definitions

**Files:**
- Create: `src/lib/document-sections.ts`

This provides the hardcoded sub-tab labels and anchor IDs for each document type. This is the data structure that both AnchorNav and ScrollableContent will consume.

- [ ] **Step 1: Create the section definitions file**

```typescript
// src/lib/document-sections.ts
import type { DocumentType } from "@/lib/document-definitions"

export interface DocumentSection {
  /** Unique anchor ID used for scroll targeting and URL hash */
  id: string
  /** Display label shown in the nav sub-tab */
  label: string
}

export interface DocumentNavItem {
  /** Matches DocumentType or a visual sub-type like "overview" / "market-research" */
  key: string
  /** Display label for the nav tab */
  label: string
  /** Which DocumentType this maps to for status/content lookup */
  sourceType: DocumentType
  /** Sub-sections within this document */
  sections: DocumentSection[]
}

/**
 * Ordered list of navigation items for the scrollable project view.
 * "competitive" is split into two visual items: "overview" and "market-research".
 * "prompt" is excluded (rendered as separate full-screen chat view).
 * "techspec" and "deploy" are excluded (not shown in nav per existing config).
 */
export const SCROLLABLE_NAV_ITEMS: DocumentNavItem[] = [
  {
    key: "overview",
    label: "Overview",
    sourceType: "competitive",
    sections: [
      { id: "overview-executive-summary", label: "Executive Summary" },
      { id: "overview-founder-verdict", label: "Founder Verdict" },
      { id: "overview-strategic-recommendations", label: "Strategic Recommendations" },
    ],
  },
  {
    key: "market-research",
    label: "Market Research",
    sourceType: "competitive",
    sections: [
      { id: "market-research-direct-competitors", label: "Direct Competitors" },
      { id: "market-research-feature-matrix", label: "Feature and Workflow Matrix" },
      { id: "market-research-pricing", label: "Pricing and Packaging" },
      { id: "market-research-moat", label: "Moat / Defensibility" },
      { id: "market-research-positioning", label: "Positioning Map" },
      { id: "market-research-differentiation", label: "Differentiation Wedges" },
      { id: "market-research-gap-analysis", label: "Gap Analysis" },
      { id: "market-research-risks", label: "Risks / Countermoves" },
    ],
  },
  {
    key: "prd",
    label: "PRD",
    sourceType: "prd",
    sections: [
      { id: "prd-user-needs", label: "User Needs / Problem" },
      { id: "prd-value-proposition", label: "Value Proposition" },
      { id: "prd-personas", label: "Personas" },
      { id: "prd-requirements", label: "Requirements" },
      { id: "prd-user-stories", label: "User Stories" },
      { id: "prd-prioritization", label: "Prioritization / UI UX" },
    ],
  },
  {
    key: "mvp",
    label: "MVP Plan",
    sourceType: "mvp",
    sections: [
      { id: "mvp-wedge", label: "MVP Wedge / Scope" },
      { id: "mvp-core-features", label: "Core Features" },
      { id: "mvp-user-flow", label: "User Flow" },
      { id: "mvp-timeline", label: "Timeline / Risks" },
      { id: "mvp-success-metrics", label: "Success Metrics" },
    ],
  },
  {
    key: "mockups",
    label: "Mockups",
    sourceType: "mockups",
    sections: [
      { id: "mockups-concept-1", label: "Concept 1" },
      { id: "mockups-concept-2", label: "Concept 2" },
      { id: "mockups-concept-3", label: "Concept 3" },
    ],
  },
  {
    key: "launch",
    label: "Marketing",
    sourceType: "launch",
    sections: [
      { id: "marketing-audience", label: "Audience Segments" },
      { id: "marketing-gtm", label: "GTM / Distribution Signals" },
      { id: "marketing-budget", label: "Budget Allocation" },
      { id: "marketing-copy-pack", label: "Copy Pack / 14-Day Checklist" },
    ],
  },
]

/** Get the nav item key for a given anchor section ID */
export function getNavKeyForSection(sectionId: string): string | null {
  for (const item of SCROLLABLE_NAV_ITEMS) {
    if (item.sections.some((s) => s.id === sectionId)) {
      return item.key
    }
  }
  return null
}

/** Get all section IDs as a flat array (for IntersectionObserver registration) */
export function getAllSectionIds(): string[] {
  return SCROLLABLE_NAV_ITEMS.flatMap((item) => [
    item.key, // the document-level anchor
    ...item.sections.map((s) => s.id),
  ])
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/document-sections.ts
git commit -m "feat: add document section definitions for scrollable nav"
```

---

## Task 2: Create the Project Header Component

**Files:**
- Create: `src/components/layout/project-header.tsx`

This replaces the header section currently inline in `ProjectWorkspace` (lines 1070-1130). Matches the Pencil design node `R9642` exactly.

- [ ] **Step 1: Create the project header component**

```typescript
// src/components/layout/project-header.tsx
"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, Pencil } from "lucide-react"
import { HeaderLogo, APP_HEADER_LOGO_SIZE } from "@/components/layout/header-logo"
import { useAuthSignOut } from "@/hooks/use-auth-signout"
import { CreditBalance } from "@/components/ui/credit-balance"
import { uiStylePresets } from "@/lib/ui-style-presets"

interface ProjectHeaderProps {
  projectName: string
  isNameSet: boolean
  nameJustSet: boolean
  onStartRename: () => void
  onFinishRename: (name: string) => Promise<void>
  isSavingName: boolean
  user: {
    email?: string
    full_name?: string
    avatar_url?: string
  }
  credits: number
}

export function ProjectHeader({
  projectName,
  isNameSet,
  nameJustSet,
  onStartRename,
  onFinishRename,
  isSavingName,
  user,
  credits,
}: ProjectHeaderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(projectName)
  const inputRef = useRef<HTMLInputElement>(null)
  const handleSignOut = useAuthSignOut()

  useEffect(() => {
    setDraft(projectName)
  }, [projectName])

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  const finishEdit = async () => {
    const trimmed = draft.trim()
    setIsEditing(false)
    if (trimmed && trimmed !== projectName) {
      await onFinishRename(trimmed)
    } else {
      setDraft(projectName)
    }
  }

  const initials = user.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || user.email?.[0].toUpperCase() || "U"

  const profileLabel = user.full_name
    ? (() => {
        const parts = user.full_name.trim().split(/\s+/)
        if (parts.length === 1) return parts[0]
        return `${parts[0]} ${parts[1]?.charAt(0).toUpperCase() || ""}.`
      })()
    : user.email?.split("@")[0] || "User"

  return (
    <header className="flex h-16 items-center justify-between border-b border-border/40 bg-white px-6">
      {/* Left: Brand wordmark */}
      <Link href="/projects" className="flex items-center gap-3">
        <HeaderLogo size={APP_HEADER_LOGO_SIZE} />
        <span className="text-sm font-medium text-text-secondary">
          Idea2App
        </span>
      </Link>

      {/* Center: Breadcrumb */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
        <Link
          href="/projects"
          className="text-sm font-medium text-text-secondary transition-colors hover:text-foreground"
        >
          Projects
        </Link>
        <span className="text-sm text-muted-foreground">/</span>
        {isEditing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => void finishEdit()}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); void finishEdit() }
              if (e.key === "Escape") { setDraft(projectName); setIsEditing(false) }
            }}
            className="h-8 w-[min(22rem,40vw)] rounded-md border border-border/70 bg-background px-2.5 text-sm font-semibold text-foreground outline-none focus:border-primary/60"
            disabled={isSavingName}
          />
        ) : isNameSet ? (
          <button
            type="button"
            onClick={() => { setIsEditing(true); onStartRename() }}
            className="flex items-center gap-2 text-left"
          >
            <span
              className="text-sm font-semibold text-foreground"
              style={nameJustSet ? { animation: "projectNameFadeIn 0.7s ease forwards" } : undefined}
            >
              {projectName}
            </span>
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        ) : (
          <div className="flex items-center gap-2 cursor-default select-none">
            <span className="text-sm font-semibold text-muted-foreground">
              {projectName}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-violet-300 bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-800">
              ✦ AI naming
            </span>
          </div>
        )}
      </div>

      {/* Right: User avatar dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2.5 rounded-full border border-border/60 bg-secondary/50 px-3 py-1.5"
          >
            <Avatar className="h-7 w-7 rounded-full">
              <AvatarImage src={user.avatar_url} alt={user.full_name || "User"} />
              <AvatarFallback className="bg-foreground text-[11px] font-bold text-background">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-[13px] font-medium text-foreground">
              {profileLabel}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-[260px] border border-border-subtle bg-white p-2 text-text-primary"
          align="end"
        >
          {typeof credits === "number" && (
            <DropdownMenuItem className="cursor-default focus:bg-transparent focus:text-text-primary">
              <span className="text-sm font-medium">
                Credits: <CreditBalance credits={credits} compact />
              </span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href="/preferences?tab=profile" className={uiStylePresets.headerOutlineTab}>
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/preferences?tab=settings" className={uiStylePresets.headerOutlineTab}>
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/preferences?tab=subscriptions" className={uiStylePresets.headerOutlineTab}>
              <span>Subscriptions</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSignOut} className={uiStylePresets.headerLogoutItem}>
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/project-header.tsx
git commit -m "feat: add ProjectHeader component matching Pencil design"
```

---

## Task 3: Split Competitive Analysis Document into Overview + Detail

**Files:**
- Modify: `src/components/analysis/competitive-analysis-document.tsx` (lines 711-846)

Export two new sub-components that the `ScrollableContent` will import. The existing `CompetitiveAnalysisDocument` stays as-is for backwards compatibility.

- [ ] **Step 1: Add the two split renderer components**

Add these two new exported components **before** the existing `CompetitiveAnalysisDocument` component (before line 812). They reuse the existing sub-components (`SnapshotHero`, `SmallListCard`, `CompactTableCard`, etc.) that are already defined in the same file.

```typescript
// Add above the existing CompetitiveAnalysisDocument export (line 812)

/**
 * Overview portion of competitive analysis: executive summary, founder verdict,
 * strategic recommendations. Used by ScrollableContent for the "Overview" section.
 */
export function CompetitiveOverviewSection({
  content,
  metadata,
  projectId,
}: CompetitiveAnalysisDocumentProps) {
  const viewModel = useMemo(
    () => getCompetitiveAnalysisViewModel(content, metadata),
    [content, metadata]
  )

  if (!viewModel.canRenderModules) {
    return <MarkdownRenderer content={content} projectId={projectId} />
  }

  const { structured } = viewModel

  return (
    <div className="space-y-6 bg-white p-6 md:p-8 xl:p-10">
      <header className="border border-[#E0E0E0] bg-white px-6 py-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#999999]">
          Market Intelligence
        </p>
        <div className="mt-3">
          <h1
            className={cn(
              displayFontClass,
              "text-[36px] font-bold tracking-[-0.05em] text-[#0A0A0A] md:text-[44px]"
            )}
          >
            Overview
          </h1>
          <p className="mt-2 max-w-3xl text-[13px] leading-6 text-[#666666]">
            Executive summary, founder verdict, and strategic direction.
          </p>
        </div>
      </header>

      <div id="overview-executive-summary">
        <SnapshotHero structured={structured} />
      </div>

      <div id="overview-founder-verdict">
        <CompetitorProfiles competitors={structured.directCompetitors} />
      </div>

      <div id="overview-strategic-recommendations">
        <SmallListCard
          title="Strategic Recommendations"
          items={structured.strategicRecommendations}
        />
      </div>
    </div>
  )
}

/**
 * Detail portion of competitive analysis: competitors, matrices, maps, pricing,
 * gap analysis, moat, SWOT, risks. Used by ScrollableContent for "Market Research".
 */
export function CompetitiveDetailSection({
  content,
  metadata,
  projectId,
}: CompetitiveAnalysisDocumentProps) {
  const viewModel = useMemo(
    () => getCompetitiveAnalysisViewModel(content, metadata),
    [content, metadata]
  )

  if (!viewModel.canRenderModules) {
    return null // Overview section already shows fallback markdown
  }

  const { structured } = viewModel

  return (
    <div className="space-y-6 bg-white p-6 md:p-8 xl:p-10">
      <header className="border border-[#E0E0E0] bg-white px-6 py-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#999999]">
          Deep Analysis
        </p>
        <div className="mt-3">
          <h1
            className={cn(
              displayFontClass,
              "text-[36px] font-bold tracking-[-0.05em] text-[#0A0A0A] md:text-[44px]"
            )}
          >
            Market Research
          </h1>
        </div>
      </header>

      <div id="market-research-direct-competitors">
        <CompetitorProfiles competitors={structured.directCompetitors} />
      </div>

      <div id="market-research-feature-matrix">
        <CompactTableCard
          title="Feature and Workflow Matrix"
          paragraphs={structured.featureMatrix.paragraphs}
          headers={structured.featureMatrix.table?.headers ?? []}
          rows={structured.featureMatrix.table?.rows ?? []}
        />
      </div>

      <div id="market-research-positioning">
        <PositioningMap
          title="Competitive Positioning Map"
          positioningMap={structured.positioningMap}
        />
      </div>

      <div id="market-research-pricing">
        <CompactTableCard
          title="Pricing And Packaging"
          paragraphs={structured.pricingAndPackaging.paragraphs}
          headers={structured.pricingAndPackaging.table?.headers ?? []}
          rows={structured.pricingAndPackaging.table?.rows ?? []}
        />
      </div>

      <div id="market-research-gap-analysis">
        <SmallListCard title="Gap Analysis" items={structured.gapAnalysis} />
      </div>

      <div id="market-research-differentiation">
        <SmallListCard
          title="Differentiation Wedges"
          items={structured.differentiationWedges}
          dark={true}
        />
      </div>

      <div id="market-research-moat">
        <SmallListCard
          title="Moat And Defensibility"
          items={structured.moatAndDefensibility}
        />
      </div>

      <div id="market-research-risks">
        <SWOTCard
          matrix={structured.swotAnalysis.matrix}
          paragraphs={structured.swotAnalysis.paragraphs}
          tableHeaders={structured.swotAnalysis.table?.headers ?? []}
          rows={structured.swotAnalysis.table?.rows ?? []}
        />
        <SmallListCard
          title="Risks And Countermoves"
          items={structured.risksAndCountermoves}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify existing `CompetitiveAnalysisDocument` still works**

Run: `npm run build`
Expected: Build succeeds — existing component unchanged, new exports added.

- [ ] **Step 3: Commit**

```bash
git add src/components/analysis/competitive-analysis-document.tsx
git commit -m "feat: export split CompetitiveOverview and CompetitiveDetail sections"
```

---

## Task 4: Create the AnchorNav Component

**Files:**
- Create: `src/components/layout/anchor-nav.tsx`

This is the sticky left sidebar that shows all document tabs with sub-tabs and status indicators.

- [ ] **Step 1: Create the AnchorNav component**

```typescript
// src/components/layout/anchor-nav.tsx
"use client"

import { cn } from "@/lib/utils"
import { SCROLLABLE_NAV_ITEMS, type DocumentNavItem } from "@/lib/document-sections"
import type { DocumentType } from "@/lib/document-definitions"

type NavStatus = "done" | "in_progress" | "pending"

interface AnchorNavProps {
  /** Status per sourceType (e.g., { competitive: "done", prd: "pending" }) */
  documentStatuses: Record<string, NavStatus>
  /** Currently visible section key (set by IntersectionObserver) */
  activeKey: string | null
  /** Currently visible sub-section ID */
  activeSectionId: string | null
  /** Callback when user clicks a tab or sub-tab */
  onNavigate: (sectionId: string) => void
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
    >
      <circle
        cx="6"
        cy="6"
        r="4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="20"
        strokeDashoffset="5"
      />
    </svg>
  )
}

function NavTab({
  item,
  status,
  isActive,
  activeSectionId,
  onNavigate,
}: {
  item: DocumentNavItem
  status: NavStatus
  isActive: boolean
  activeSectionId: string | null
  onNavigate: (id: string) => void
}) {
  const isDone = status === "done"
  const isInProgress = status === "in_progress"
  const isPending = status === "pending"

  // Bar color
  const barColor = isDone
    ? "bg-[#22C55E]"
    : isInProgress
      ? "bg-[#FF3B30]"
      : "bg-[#CCCCCC]"

  // Container styles
  const containerBg = isInProgress
    ? "bg-[#0A0A0A]"
    : isActive && isDone
      ? "bg-[#F5F5F5]"
      : "bg-white"

  // Title color
  const titleColor = isInProgress
    ? "text-white"
    : isPending
      ? "text-[#777777]"
      : "text-[#0A0A0A]"

  // Sub-tab color
  const subColor = isInProgress
    ? "text-white"
    : isPending
      ? "text-[#999999]"
      : "text-[#777777]"

  return (
    <div className={cn("rounded-md p-2", containerBg)}>
      {/* Tab title row */}
      <button
        type="button"
        onClick={() => onNavigate(item.key)}
        className="flex w-full items-center gap-2"
      >
        <div className={cn("h-4 w-1 shrink-0 rounded-sm", barColor)} />
        <span className={cn("flex-1 text-left text-base font-bold", titleColor)}>
          {item.label}
        </span>
        {isDone && (
          <div className="h-1.5 w-1.5 rounded-full bg-[#22C55E] opacity-45" />
        )}
        {isInProgress && (
          <SpinnerIcon className="text-[#FF3B30]" />
        )}
      </button>

      {/* Sub-tabs */}
      <div className="mt-1 ml-[11px] border-l border-[#E5E5E5] pl-2">
        {item.sections.map((section, idx) => {
          const isActiveSub = activeSectionId === section.id
          // In-progress items: vary opacity by position
          const inProgressOpacity = isInProgress
            ? idx < 3 ? "opacity-90" : idx < 6 ? "opacity-55" : "opacity-45"
            : ""

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onNavigate(section.id)}
              className={cn(
                "block w-full text-left text-xs py-[1px]",
                isActiveSub
                  ? "font-semibold text-[#FF3B30]"
                  : cn(subColor, inProgressOpacity)
              )}
            >
              {section.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function AnchorNav({
  documentStatuses,
  activeKey,
  activeSectionId,
  onNavigate,
}: AnchorNavProps) {
  const getStatus = (item: DocumentNavItem): NavStatus => {
    return documentStatuses[item.sourceType] || "pending"
  }

  return (
    <nav className="sticky top-0 flex h-[calc(100vh-64px)] w-[300px] shrink-0 flex-col gap-2.5 overflow-y-auto bg-[#FAFAFA] px-6 py-5">
      {SCROLLABLE_NAV_ITEMS.map((item) => (
        <NavTab
          key={item.key}
          item={item}
          status={getStatus(item)}
          isActive={activeKey === item.key}
          activeSectionId={activeSectionId}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/anchor-nav.tsx
git commit -m "feat: add AnchorNav sticky sidebar with sub-tabs and status indicators"
```

---

## Task 5: Create the ScrollableContent Component

**Files:**
- Create: `src/components/layout/scrollable-content.tsx`

This renders all documents stacked vertically with section anchor IDs. Each document type uses its appropriate renderer.

- [ ] **Step 1: Create the scrollable content component**

```typescript
// src/components/layout/scrollable-content.tsx
"use client"

import { forwardRef } from "react"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer"
import { MockupRenderer } from "@/components/ui/mockup-renderer"
import {
  CompetitiveOverviewSection,
  CompetitiveDetailSection,
} from "@/components/analysis/competitive-analysis-document"
import { SCROLLABLE_NAV_ITEMS } from "@/lib/document-sections"
import type { DocumentType } from "@/lib/document-definitions"
import type { StreamStage } from "@/lib/parse-document-stream"

interface DocumentData {
  content: string | null
  metadata?: Record<string, unknown> | null
  isGenerating: boolean
  streamStages?: StreamStage[]
  streamCurrentStep?: number
  streamContent?: string
}

interface ScrollableContentProps {
  projectId: string
  projectName: string
  /** Content and state for each source document type */
  documents: Record<string, DocumentData>
}

function DocumentSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-4 p-8">
      <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
      <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
      <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
      <div className="h-4 w-5/6 animate-pulse rounded bg-gray-100" />
      <p className="text-xs text-muted-foreground">Generating {label}...</p>
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
      {label} has not been generated yet.
    </div>
  )
}

function DocumentWrapper({
  navKey,
  children,
}: {
  navKey: string
  children: React.ReactNode
}) {
  return (
    <div
      id={navKey}
      className="bg-white border border-[#E5E5E5]"
      data-section={navKey}
    >
      <div className="px-10 py-8">
        {children}
      </div>
    </div>
  )
}

/**
 * Renders a markdown document with section anchor IDs injected.
 * Section IDs are derived from the nav item's section definitions.
 */
function MarkdownDocumentSection({
  content,
  projectId,
  navKey,
}: {
  content: string
  projectId: string
  navKey: string
}) {
  // Find the nav item to get section definitions
  const navItem = SCROLLABLE_NAV_ITEMS.find((item) => item.key === navKey)

  return (
    <div className="space-y-6">
      <MarkdownRenderer content={content} projectId={projectId} />
      {/* Section anchors are placed via the heading IDs in MarkdownRenderer.
          For sub-section scroll targeting, we rely on heading text matching.
          A future enhancement could inject anchor divs at H2/H3 boundaries. */}
    </div>
  )
}

export const ScrollableContent = forwardRef<HTMLDivElement, ScrollableContentProps>(
  function ScrollableContent({ projectId, projectName, documents }, ref) {
    const competitiveData = documents["competitive"]
    const prdData = documents["prd"]
    const mvpData = documents["mvp"]
    const mockupsData = documents["mockups"]
    const launchData = documents["launch"]

    return (
      <div
        ref={ref}
        className="flex-1 overflow-y-auto bg-[#FAFAFA] px-6 py-5 space-y-3"
      >
        {/* Overview (competitive analysis — summary portion) */}
        <DocumentWrapper navKey="overview">
          {competitiveData?.isGenerating ? (
            <DocumentSkeleton label="Overview" />
          ) : competitiveData?.content ? (
            <CompetitiveOverviewSection
              content={competitiveData.content}
              metadata={competitiveData.metadata}
              projectId={projectId}
            />
          ) : (
            <EmptyState label="Overview" />
          )}
        </DocumentWrapper>

        {/* Market Research (competitive analysis — detail portion) */}
        <DocumentWrapper navKey="market-research">
          {competitiveData?.isGenerating ? (
            <DocumentSkeleton label="Market Research" />
          ) : competitiveData?.content ? (
            <CompetitiveDetailSection
              content={competitiveData.content}
              metadata={competitiveData.metadata}
              projectId={projectId}
            />
          ) : (
            <EmptyState label="Market Research" />
          )}
        </DocumentWrapper>

        {/* PRD */}
        <DocumentWrapper navKey="prd">
          {prdData?.isGenerating ? (
            <DocumentSkeleton label="PRD" />
          ) : prdData?.content ? (
            <MarkdownDocumentSection
              content={prdData.content}
              projectId={projectId}
              navKey="prd"
            />
          ) : (
            <EmptyState label="PRD" />
          )}
        </DocumentWrapper>

        {/* MVP Plan */}
        <DocumentWrapper navKey="mvp">
          {mvpData?.isGenerating ? (
            <DocumentSkeleton label="MVP Plan" />
          ) : mvpData?.content ? (
            <MarkdownDocumentSection
              content={mvpData.content}
              projectId={projectId}
              navKey="mvp"
            />
          ) : (
            <EmptyState label="MVP Plan" />
          )}
        </DocumentWrapper>

        {/* Mockups */}
        <DocumentWrapper navKey="mockups">
          {mockupsData?.isGenerating ? (
            <DocumentSkeleton label="Mockups" />
          ) : mockupsData?.content ? (
            <MockupRenderer content={mockupsData.content} />
          ) : (
            <EmptyState label="Mockups" />
          )}
        </DocumentWrapper>

        {/* Marketing */}
        <DocumentWrapper navKey="launch">
          {launchData?.isGenerating ? (
            <DocumentSkeleton label="Marketing" />
          ) : launchData?.content ? (
            <MarkdownDocumentSection
              content={launchData.content}
              projectId={projectId}
              navKey="launch"
            />
          ) : (
            <EmptyState label="Marketing" />
          )}
        </DocumentWrapper>
      </div>
    )
  }
)
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/scrollable-content.tsx
git commit -m "feat: add ScrollableContent component for stacked document rendering"
```

---

## Task 6: Refactor ProjectWorkspace — New Layout

**Files:**
- Modify: `src/components/workspace/project-workspace.tsx`

This is the core refactor. Replace the 3-column layout with 2-column, wire up `ProjectHeader`, `AnchorNav`, and `ScrollableContent`, add `IntersectionObserver` for scroll-nav sync, and separate prompt vs document mode.

- [ ] **Step 1: Update imports**

At the top of `project-workspace.tsx`, replace the `DocumentNav` and `ContentEditor` imports (lines 6-7) and add new imports:

```typescript
// Remove these imports:
// import { DocumentNav, DocumentType } from "@/components/layout/document-nav"
// import { ContentEditor } from "@/components/layout/content-editor"
// import { Header } from "@/components/layout/header"
// import { APP_HEADER_LOGO_SIZE, HeaderLogo } from "@/components/layout/header-logo"

// Add these imports:
import { AnchorNav } from "@/components/layout/anchor-nav"
import { ScrollableContent } from "@/components/layout/scrollable-content"
import { ProjectHeader } from "@/components/layout/project-header"
import { ContentEditor } from "@/components/layout/content-editor"
import { SCROLLABLE_NAV_ITEMS, getNavKeyForSection } from "@/lib/document-sections"
```

Keep the `ContentEditor` import — it's still used for the prompt chat view. Keep `DocumentType` import from `document-definitions`.

- [ ] **Step 2: Add IntersectionObserver state and refs**

Add these state variables after the existing state declarations (around line 184):

```typescript
// Scroll-nav sync state
const scrollContainerRef = useRef<HTMLDivElement>(null)
const [activeNavKey, setActiveNavKey] = useState<string | null>("overview")
const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
const isScrollingProgrammatically = useRef(false)
```

- [ ] **Step 3: Add IntersectionObserver effect**

Add this effect after the existing effects (around line 340):

```typescript
// On mount: restore scroll position from URL hash
useEffect(() => {
  if (activeDocument === "prompt") return
  const hash = window.location.hash.slice(1)
  if (hash) {
    // Delay to let DOM render
    setTimeout(() => handleScrollNavigate(hash), 100)
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])

// IntersectionObserver: sync scroll position → active nav item
useEffect(() => {
  if (activeDocument === "prompt") return // No observer in prompt mode

  const container = scrollContainerRef.current
  if (!container) return

  const observer = new IntersectionObserver(
    (entries) => {
      if (isScrollingProgrammatically.current) return

      for (const entry of entries) {
        if (entry.isIntersecting) {
          const sectionId = entry.target.getAttribute("data-section")
          if (sectionId) {
            // It's a document-level section
            setActiveNavKey(sectionId)
          }
          const subId = entry.target.id
          if (subId && subId !== sectionId) {
            setActiveSectionId(subId)
            const parentKey = getNavKeyForSection(subId)
            if (parentKey) {
              setActiveNavKey(parentKey)
              window.history.replaceState(null, "", `#${subId}`)
            }
          } else if (sectionId) {
            window.history.replaceState(null, "", `#${sectionId}`)
          }
        }
      }
    },
    {
      root: container,
      rootMargin: "-20% 0px -70% 0px",
      threshold: 0,
    }
  )

  // Observe document-level sections
  const sections = container.querySelectorAll("[data-section]")
  sections.forEach((el) => observer.observe(el))

  // Observe sub-sections by ID
  for (const item of SCROLLABLE_NAV_ITEMS) {
    for (const section of item.sections) {
      const el = container.querySelector(`#${CSS.escape(section.id)}`)
      if (el) observer.observe(el)
    }
  }

  return () => observer.disconnect()
}, [activeDocument])
```

- [ ] **Step 4: Add scroll navigation handler**

Add this callback function after the existing handlers:

```typescript
const handleScrollNavigate = useCallback((targetId: string) => {
  const container = scrollContainerRef.current
  if (!container) return

  const target = container.querySelector(`#${CSS.escape(targetId)}`)
    || container.querySelector(`[data-section="${targetId}"]`)
  if (!target) return

  isScrollingProgrammatically.current = true
  target.scrollIntoView({ behavior: "smooth", block: "start" })

  // Update nav state immediately
  const parentKey = getNavKeyForSection(targetId)
  if (parentKey) {
    setActiveNavKey(parentKey)
    setActiveSectionId(targetId)
  } else {
    // It's a top-level key
    setActiveNavKey(targetId)
    setActiveSectionId(null)
  }

  // Update URL hash for deep-linking
  window.history.replaceState(null, "", `#${targetId}`)

  // Re-enable observer after scroll animation completes
  setTimeout(() => {
    isScrollingProgrammatically.current = false
  }, 800)
}, [])
```

- [ ] **Step 5: Build the document data map for ScrollableContent**

Add this computed value before the return statement:

```typescript
// Build document data map for ScrollableContent
const scrollableDocuments: Record<string, {
  content: string | null
  metadata?: Record<string, unknown> | null
  isGenerating: boolean
}> = {
  competitive: {
    content: getDocumentContent("competitive"),
    metadata: getDocumentMetadata("competitive"),
    isGenerating: generatingDocuments["competitive"],
  },
  prd: {
    content: getDocumentContent("prd"),
    metadata: null,
    isGenerating: generatingDocuments["prd"],
  },
  mvp: {
    content: getDocumentContent("mvp"),
    metadata: null,
    isGenerating: generatingDocuments["mvp"],
  },
  mockups: {
    content: getDocumentContent("mockups"),
    metadata: null,
    isGenerating: generatingDocuments["mockups"],
  },
  launch: {
    content: getDocumentContent("launch"),
    metadata: null,
    isGenerating: generatingDocuments["launch"],
  },
}
```

- [ ] **Step 6: Build the document statuses map for AnchorNav**

Add this computed value:

```typescript
// Build status map for AnchorNav (keyed by sourceType)
const navDocumentStatuses: Record<string, "done" | "in_progress" | "pending"> = {}
for (const item of SCROLLABLE_NAV_ITEMS) {
  if (!navDocumentStatuses[item.sourceType]) {
    navDocumentStatuses[item.sourceType] = getDocumentStatus(item.sourceType as DocumentType)
  }
}
```

- [ ] **Step 7: Replace the JSX return statement**

Replace the entire return block (lines 1062-1174) with:

```tsx
return (
  <>
    <GenerateAllHydrator
      projectId={project.id}
      onStepComplete={router.refresh}
      getDocumentStatus={getDocumentStatus}
    />
    <div className="flex flex-col h-screen">
      <ProjectHeader
        projectName={projectName}
        isNameSet={isNameSet}
        nameJustSet={nameJustSet}
        onStartRename={() => {}}
        onFinishRename={async (name) => {
          await handleProjectNameUpdate(name)
        }}
        isSavingName={isSavingProjectName}
        user={user as { email?: string; full_name?: string; avatar_url?: string }}
        credits={credits}
      />

      {activeDocument === "prompt" ? (
        /* Prompt/Chat view — full width, existing ContentEditor */
        <div className="flex-1 overflow-hidden">
          <ContentEditor
            documentType="prompt"
            projectId={project.id}
            projectName={projectName}
            projectDescription={project.description || ""}
            content={getDocumentContent("prompt")}
            documentMetadata={null}
            onGenerateContent={handleGenerateContent}
            onUpdateDescription={handleUpdateDescription}
            onProjectNameGenerated={handleProjectNameGenerated}
            isGenerating={generatingDocuments["prompt"]}
            streamStages={streamStages}
            streamCurrentStep={streamCurrentStep}
            streamContent={streamContent}
            credits={credits}
            prerequisiteValidation={checkPrerequisites("prompt")}
            currentVersion={0}
            totalVersions={0}
          />
        </div>
      ) : (
        /* Scrollable document view — 2-column layout */
        <div className="flex flex-1 overflow-hidden">
          <AnchorNav
            documentStatuses={navDocumentStatuses}
            activeKey={activeNavKey}
            activeSectionId={activeSectionId}
            onNavigate={handleScrollNavigate}
          />
          <ScrollableContent
            ref={scrollContainerRef}
            projectId={project.id}
            projectName={projectName}
            documents={scrollableDocuments}
          />
        </div>
      )}
    </div>
  </>
)
```

- [ ] **Step 8: Ensure `handleDocumentSelect` switches to prompt correctly**

The existing `handleDocumentSelect` callback should still work since it sets `activeDocument`. When `activeDocument` is `"prompt"`, the layout switches to the chat view. When any other document type is selected (e.g., from the prompt view via a "View Documents" button), it switches to the scrollable view.

Modify the `handleDocumentSelect` to also handle switching from prompt to documents:

```typescript
// In the existing handleDocumentSelect function, add:
// If switching away from prompt, default to "overview" as the active nav key
if (type !== "prompt") {
  setActiveNavKey(type === "competitive" ? "overview" : type)
}
```

- [ ] **Step 9: Run build to verify**

Run: `npm run build`
Expected: Build succeeds with no type errors.

- [ ] **Step 10: Commit**

```bash
git add src/components/workspace/project-workspace.tsx
git commit -m "feat: refactor ProjectWorkspace to 2-column scrollable layout"
```

---

## Task 7: Add Prompt ↔ Document View Switching

**Files:**
- Modify: `src/components/workspace/project-workspace.tsx`
- Modify: `src/components/layout/anchor-nav.tsx`

Users need a way to switch between the prompt chat view and the document scroll view. Add a prompt tab to the top of AnchorNav.

- [ ] **Step 1: Add prompt tab to AnchorNav**

In `anchor-nav.tsx`, add a prompt button at the top of the nav, before the document tabs:

```tsx
// Add to AnchorNavProps:
interface AnchorNavProps {
  // ... existing props
  /** Whether prompt/idea brief is complete */
  promptStatus: NavStatus
  /** Callback to switch to prompt view */
  onSwitchToPrompt: () => void
}

// In the AnchorNav component, add before the nav items map:
<button
  type="button"
  onClick={onSwitchToPrompt}
  className={cn(
    "flex w-full items-center gap-2 rounded-md p-2 mb-2 transition-colors",
    promptStatus === "done" ? "bg-[#F5F5F5]" : "bg-white",
    "hover:bg-[#F0F0F0]"
  )}
>
  <div className={cn(
    "h-4 w-1 shrink-0 rounded-sm",
    promptStatus === "done" ? "bg-[#22C55E]" : "bg-[#CCCCCC]"
  )} />
  <span className={cn(
    "flex-1 text-left text-base font-bold",
    promptStatus === "done" ? "text-[#0A0A0A]" : "text-[#777777]"
  )}>
    Idea Brief
  </span>
  {promptStatus === "done" && (
    <div className="h-1.5 w-1.5 rounded-full bg-[#22C55E] opacity-45" />
  )}
</button>
<div className="h-px bg-[#E5E5E5] mb-2" />
```

- [ ] **Step 2: Wire up in ProjectWorkspace**

Pass the new props to AnchorNav:

```tsx
<AnchorNav
  documentStatuses={navDocumentStatuses}
  activeKey={activeNavKey}
  activeSectionId={activeSectionId}
  onNavigate={handleScrollNavigate}
  promptStatus={getDocumentStatus("prompt")}
  onSwitchToPrompt={() => handleDocumentSelect("prompt")}
/>
```

- [ ] **Step 3: Add "View Documents" button in ContentEditor prompt view**

In the prompt view section of the ProjectWorkspace return, add a way to exit the prompt view. Add a small button bar above the ContentEditor:

```tsx
{activeDocument === "prompt" ? (
  <div className="flex-1 flex flex-col overflow-hidden">
    {/* Prompt exit bar — only visible when project has content */}
    {project.description && (
      <div className="flex items-center gap-2 border-b border-border/40 px-6 py-2 bg-secondary/30">
        <button
          type="button"
          onClick={() => handleDocumentSelect("competitive")}
          className="text-xs font-medium text-text-secondary hover:text-foreground transition-colors"
        >
          ← View Documents
        </button>
      </div>
    )}
    <ContentEditor
      // ... existing props unchanged
    />
  </div>
) : (
  // ... scrollable view
)}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/anchor-nav.tsx src/components/workspace/project-workspace.tsx
git commit -m "feat: add prompt ↔ document view switching"
```

---

## Task 8: Visual Polish and Testing

**Files:**
- Modify: `src/components/layout/anchor-nav.tsx` (minor styling)
- Modify: `src/components/layout/scrollable-content.tsx` (minor styling)
- Modify: `src/components/layout/project-header.tsx` (minor styling)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: Server starts at http://localhost:3000

- [ ] **Step 2: Navigate to a project with generated documents**

Open http://localhost:3000/projects/[an-existing-project-id] in the browser.

Verify:
1. The new header renders with brand wordmark on left, breadcrumb in center, avatar on right
2. The AnchorNav sidebar is visible on the left with all document tabs
3. All generated documents are visible in the scrollable content area
4. Empty documents show the "has not been generated yet" placeholder
5. Clicking a tab smooth-scrolls to that document
6. Clicking a sub-tab smooth-scrolls to that section within the document
7. Scrolling manually updates the active tab highlight in the nav

- [ ] **Step 3: Test prompt view switching**

1. Click "Idea Brief" in the AnchorNav
2. Verify the full-screen prompt chat interface appears
3. Click "← View Documents" button
4. Verify the scrollable document view returns

- [ ] **Step 4: Test with a new/empty project**

Navigate to a new project (with `?new=1`).
Verify:
1. The prompt chat view loads by default
2. After answering questions and getting a summary, clicking "View Documents" shows the scrollable view with all empty states

- [ ] **Step 5: Test Generate All**

From a project with a completed idea:
1. Trigger "Generate All"
2. Verify the AnchorNav shows the spinner on the currently generating document
3. Verify completed documents transition from spinner to green indicator
4. Verify content appears in the scroll area as each document completes

- [ ] **Step 6: Compare against Pencil design**

Open the Pencil file `idea2App-design.pen` and compare the rendered page against the design frame `j3sHl`:
- Header layout matches
- Nav tab styles match (done = green bar, in progress = dark bg + red spinner, pending = grey)
- Sub-tab indentation and connector line match
- Content area spacing and card styles match
- Document headers match the design

- [ ] **Step 7: Fix any visual discrepancies**

Adjust CSS classes in the three new components to match the Pencil design pixel-perfect. Common issues to check:
- Font sizes and weights
- Padding and gaps
- Border colors and radii
- Background colors for different states

- [ ] **Step 8: Build verification**

Run: `npm run build`
Expected: Production build succeeds with no errors.

- [ ] **Step 9: Final commit**

```bash
git add -A
git commit -m "fix: visual polish for project page redesign"
```

---

## Verification Checklist

After all tasks are complete, verify against the spec:

- [ ] Header shows brand wordmark (left), breadcrumb with editable project name (center), avatar dropdown (right)
- [ ] ProjectSidebar is not visible on project pages
- [ ] AnchorNav is sticky, 300px wide, with all 6 document tabs + sub-tabs
- [ ] Tab states: done (green bar, green dot), in-progress (dark bg, red spinner), pending (grey bar)
- [ ] Clicking tabs/sub-tabs triggers smooth scroll to the target section
- [ ] IntersectionObserver updates active nav item on manual scroll
- [ ] Competitive analysis split into Overview + Market Research sections
- [ ] All document types render correctly (markdown, competitive modules, mockups)
- [ ] Prompt view is full-screen and separate from the document scroll view
- [ ] "View Documents" / "Idea Brief" buttons allow switching between views
- [ ] Generate All works with live status updates in the nav
- [ ] New projects default to prompt view
- [ ] Breadcrumb "Projects" link navigates to project list
- [ ] Build passes with no type errors
