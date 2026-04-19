# Project Page Redesign — Scrollable Document View

**Date**: 2026-04-17
**Status**: Approved
**Pencil Reference**: `idea2App-design.pen` → frame `j3sHl` ("Realistic data fill")

---

## Context

The current project workspace (`/projects/[id]`) uses a three-column layout: ProjectSidebar (dark, project list) + DocumentNav (pipeline tabs) + ContentEditor (single active document). Users can only view one document at a time and must click tabs to switch between them.

The redesign transforms this into a two-column layout where all generated documents stack vertically in a scrollable content area, with a sticky left navigation sidebar that shows all document tabs with expandable sub-tabs (section anchors). This gives users a continuous reading experience and quick navigation to any section across all documents.

---

## Layout Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│  Project Header (64px)                                            │
│  [icon + name]      Projects / ProjectName ✎       [avatar ▾]   │
├──────────────┬────────────────────────────────────────────────────┤
│  AnchorNav   │  Scrollable Content Area                           │
│  (sticky)    │  (overflow-y: auto)                                │
│  ~300px      │                                                    │
│              │  ┌─ Overview ─────────────────────────────────┐    │
│  ● Overview  │  │  (competitive analysis: summary section)   │    │
│  ◉ Market    │  └────────────────────────────────────────────┘    │
│  ○ PRD       │  ┌─ Market Research ──────────────────────────┐    │
│  ○ MVP Plan  │  │  (competitive analysis: detail section)    │    │
│  ○ Mockups   │  └────────────────────────────────────────────┘    │
│  ○ Marketing │  ┌─ PRD ──────────────────────────────────────┐    │
│              │  └────────────────────────────────────────────┘    │
│              │  ┌─ MVP Plan ─────────────────────────────────┐    │
│              │  └────────────────────────────────────────────┘    │
│              │  ┌─ Mockups ──────────────────────────────────┐    │
│              │  └────────────────────────────────────────────┘    │
│              │  ┌─ Marketing ────────────────────────────────┐    │
│              │  └────────────────────────────────────────────┘    │
└──────────────┴────────────────────────────────────────────────────┘
```

- **ProjectSidebar is removed** from the project page. Navigation back to the project list is via the header breadcrumb.
- **Prompt/Chat** is excluded from the scroll view. When the user selects "Explain the idea", the page switches to the existing full-screen prompt chat view.
- All other documents render in the scrollable content area simultaneously.

---

## Project Header

Replaces the current three-part workspace header. Matches the Pencil design node `R9642`.

### Structure

| Section | Content | Styling |
|---------|---------|---------|
| **Left** | Red square icon (24x24, corner-radius 4px, `#FF3B30`) with white initial letter (Space Grotesk 13px bold) + App/website name — e.g., "Idea2App" (`#666666`, Inter 14px medium). This is the **brand wordmark**, not the project name. | `gap: 12px`, horizontal flex |
| **Center** | "Projects" (`#666666`, Inter 14px medium, clickable link to `/dashboard`) + "/" (`#999999`, Inter 14px normal) + Project name (`#0A0A0A`, Inter 14px semibold) + pencil icon (`#999999`, lucide `pencil`, 14px) | Absolutely positioned center, `gap: 12px` between breadcrumb items, `gap: 8px` between name + pencil icon |
| **Right** | Dark avatar circle (28x28, `#111111`, white initials Inter 11px bold) + User name (`#0A0A0A`, Inter 13px medium) + chevron-down icon (`#999999`, lucide, 16px) | Pill shape (`border-radius: 999px`), bg `#FAFAFA`, border `#E5E5E5` 1px, padding `8px 12px`, `gap: 10px` |
| **Container** | White bg (`#FFFFFF`), height 64px, bottom border `#E5E5E5` 1px, `justify-content: space-between`, padding `0 24px` | Full width |

### Behavior
- Left side shows the app brand wordmark (e.g., "Idea2App"), clickable as a home link to `/dashboard`
- Clicking "Projects" in center breadcrumb navigates to the project list (`/dashboard` or `/projects`)
- Project name + pencil icon in center breadcrumb enables inline editing (reuses existing `onProjectNameUpdate` logic)
- Avatar dropdown shows user menu (sign out, settings) — reuses existing dropdown patterns

---

## AnchorNav (Left Sidebar)

Replaces the current `DocumentNav` component. A single card containing all document tabs with expandable sub-tabs.

### Layout
- Width: 300px (matching Pencil)
- Sticky positioning: `position: sticky; top: 0; align-self: flex-start` within the flex row
- Height: `calc(100vh - 64px)` (viewport minus header)
- `overflow-y: auto` with custom scrollbar for long nav lists
- Background: transparent (inherits `#FAFAFA` from workspace body)
- Padding: `20px 24px`

### Tab Visual States (from Pencil)

Each tab has a vertical colored bar (4px wide, 16-17px tall, corner-radius 2px) on the left.

| State | Bar Color | Background | Title Color | Title Weight | Sub-tab Color | Indicator |
|-------|-----------|------------|-------------|-------------|---------------|-----------|
| **Done** | `#22C55E` (green) | `#F5F5F5` or white | `#0A0A0A` | 700 | `#777777` | Green dot (6x6 ellipse, opacity 0.45) |
| **In Progress** | `#FF3B30` (red) | `#0A0A0A` (dark) | `#FFFFFF` | 700 | `#FFFFFF` (opacity 0.55-0.9) | Red spinner (partial ellipse, `sweepAngle: 265`, animated rotation) |
| **Pending** | `#CCCCCC` (grey) | `#FFFFFF` | `#777777` | 700 | `#999999` | None |

### Tab Structure

Each tab renders as:
```
┌─ Tab Container (rounded 6px, padding 8px) ──────────┐
│  [bar] [Title Text]                    [indicator]   │
│  ┌─ Sub-tabs (indented, vertical line connector) ──┐ │
│  │ │ Sub-tab 1                                      │ │
│  │ │ Sub-tab 2                                      │ │
│  │ │ Sub-tab 3 (active = bold/red)                  │ │
│  └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

- Tab title: Inter 16px, weight 700
- Sub-tabs: Inter 12px, weight normal
- Sub-tab connector: 1px vertical line (`#E5E5E5`), `padding-left: 3px` with `border-left: 1px`
- Gap between sub-tabs: 2px
- Gap between tab title row and sub-tabs: determined by tab container gap (4-5px)
- Active sub-tab (currently scrolled to): `#FF3B30`, `fontWeight: 600`
- Sub-tabs in "in_progress" tab: white text with varying opacity (0.45-0.9, higher = closer to current generation point)

### Document Tabs & Sub-tab Definitions

**Overview** (visual split of competitive analysis — summary portion):
- Executive Summary
- Founder Verdict
- Strategic Recommendations

**Market Research** (visual split of competitive analysis — detail portion):
- Direct Competitors
- Feature and Workflow Matrix
- Pricing and Packaging
- Moat / Defensibility
- Positioning Map
- Differentiation Wedges
- Gap Analysis
- Risks / Countermoves

**PRD**:
- User Needs / Problem
- Value Proposition
- Personas
- Requirements
- User Stories
- Prioritization / UI UX

**MVP Plan**:
- MVP Wedge / Scope
- Core Features
- User Flow
- Timeline / Risks
- Success Metrics

**Mockups**:
- Concept 1
- Concept 2
- Concept 3

**Marketing**:
- Audience Segments
- GTM / Distribution Signals
- Budget Allocation
- Copy Pack / 14-Day Checklist

### Scroll ↔ Nav Synchronization

- **IntersectionObserver** is attached to each document section wrapper and sub-section heading element
- As sections enter/exit the viewport, the active tab and sub-tab highlight updates in the nav
- The observer uses `rootMargin: "-20% 0px -70% 0px"` (or similar) so the "active" section is roughly at the top 20-30% of the viewport
- **Clicking a tab**: `document.getElementById(sectionId).scrollIntoView({ behavior: 'smooth' })`
- **Clicking a sub-tab**: Same smooth scroll to the sub-section anchor
- **URL hash**: Updates on scroll to enable deep-linking (e.g., `#market-research`, `#prd-personas`)

---

## Scrollable Content Area

### Container
- Background: `#FAFAFA`
- Padding: `20px 24px 20px 0` (no left padding — the nav provides visual separation)
- `overflow-y: auto` — this is the scrollable container
- `flex: 1` (takes remaining width after AnchorNav)

### Document Wrappers

Each document renders in a `docWrap` card:
- Background: `#FFFFFF`
- Border: `1px solid #E5E5E5` (matching Pencil `stroke`)
- No corner radius (matching Pencil — the docWraps have sharp corners)
- Gap between documents: `12px`
- Width: `fill_container` (100% of content area)

### Document Inner Shell (`docInShell`)

Inside each docWrap:
- Background: `#FFFFFF`
- Padding: `32px 40px`
- Layout: vertical, gap `24px`

### Document Header (`faithfulHeader`)

Each document section starts with a header row:
- Layout: horizontal, `justify-content: space-between`, padding `8px 0`
- Left side: Title stack — kicker label (uppercase, small) + main title (Space Grotesk, large, bold) + subtitle
- Right side: Action buttons (Download PDF, copy) — only visible on hover or for the active/completed sections

### Competitive Analysis Split

The competitive analysis (`competitive` document type) renders as **two separate document wrappers**:

1. **Overview** (`docWrap / Overview`): Contains market snapshot card (dark bg), founder verdict card (dark bg), executive summary, "why now", "biggest risk", "entry thesis", strategic recommendations
2. **Market Research** (`docWrap / Market Research`): Contains competitor profiles, feature matrix table, positioning map, pricing table, gap analysis + differentiation wedges (side by side), moat cards, SWOT card, risks + countermoves

Both are sourced from the same `analyses` database record. The split is purely visual — a rendering concern, not a data model change.

### Document Content Rendering

Each document type uses its existing renderer:
- **Overview / Market Research**: `CompetitiveAnalysisDocument` (split into two render passes)
- **PRD**: `MarkdownRenderer`
- **MVP Plan**: `MarkdownRenderer`
- **Mockups**: `MockupRenderer` (existing Stitch card layout)
- **Marketing**: `MarkdownRenderer` (with brief inputs above)

### Section Anchors

Each sub-section within a document gets an `id` attribute matching the anchor definitions, e.g.:
```html
<div id="overview-executive-summary">...</div>
<div id="market-research-direct-competitors">...</div>
<div id="prd-personas">...</div>
```

These IDs are used by both the IntersectionObserver and the smooth-scroll click handlers.

---

## Prompt / Chat View

When the user is in the "Explain the idea" (prompt) view:
- The scrollable document layout is hidden
- The full-screen `PromptChatInterface` renders (existing behavior)
- A way to switch back to the document view is provided (e.g., a "View Documents" button or clicking any document tab in a minimal nav)

The transition between prompt view and document view can be:
- Controlled by `activeDocument` state — if `prompt`, show chat; otherwise show scroll layout
- The prompt tab could appear as a separate control in the header or as a toggle

---

## Loading / Generation States

### Per-Document Loading
When a document is being generated (`status === "in_progress"`):
- The nav tab shows the dark background with red spinner
- The document wrapper in the content area shows a loading skeleton or shimmer
- Sub-tabs in the nav show with reduced opacity (they're known but content isn't ready yet)

### Generate All
- The existing `generate-all-store.ts` polling mechanism continues to work
- As each document completes, the nav tab transitions from spinner to green indicator
- The content area updates with the generated content (via `router.refresh()` or local state update)

---

## Responsive Considerations

- At narrow viewports (< 768px), the AnchorNav could collapse into a top horizontal tab bar or a slide-out drawer
- For the initial implementation, target desktop widths (1024px+) matching the Pencil design (1440px)
- The AnchorNav's 300px width is fixed, not responsive

---

## Files to Modify

| File | Change | Impact |
|------|--------|--------|
| `src/lib/document-definitions.ts` | Add `sections` array with sub-tab labels and anchor IDs per document type. Add `overview` and `marketResearch` as visual sub-types of `competitive` | Low risk — additive |
| `src/components/layout/document-nav.tsx` | Complete rewrite → new `AnchorNav` component with sub-tabs, visual states, IntersectionObserver | High impact — complete replacement |
| `src/components/layout/content-editor.tsx` | Refactor from single-document view to stacked all-documents view. Remove resize handles. Add section anchor IDs | High impact — major refactor |
| `src/components/workspace/project-workspace.tsx` | Update layout from 3-column to 2-column. Add scroll container ref, IntersectionObserver setup, prompt/document mode switching. Remove DocumentNav integration, replace with AnchorNav | High impact — significant refactor |
| `src/app/(dashboard)/projects/[id]/page.tsx` | Remove ProjectSidebar rendering for project pages | Medium — layout change |
| `src/app/(dashboard)/layout.tsx` | Support conditional ProjectSidebar (show for dashboard/billing/settings, hide for project pages) | Medium — layout logic |
| `src/components/layout/project-header.tsx` | **New file** — Project-specific header with breadcrumb, avatar dropdown, project name editing | New component |

### Files NOT Modified
- `src/components/chat/prompt-chat-interface.tsx` — unchanged, still renders full-screen
- `src/stores/generate-all-store.ts` — unchanged, polling logic stays the same
- `src/lib/analysis-pipelines.ts` — no backend changes
- `src/app/api/**` — no API changes
- Database schema — no changes

---

## Verification Plan

1. **Visual match**: Compare the rendered page against the Pencil design screenshot (node `j3sHl`)
2. **Scroll behavior**: Click each tab and sub-tab, verify smooth scroll to the correct section
3. **Active tracking**: Scroll manually, verify the nav highlights update correctly
4. **Loading states**: Trigger document generation, verify spinner appears in nav and loading state in content
5. **Generate All**: Run Generate All, verify documents appear sequentially as they complete
6. **Prompt view**: Switch to prompt tab, verify chat interface renders full-screen; switch back, verify document scroll view returns
7. **Navigation**: Click "Projects" in breadcrumb, verify navigation to project list
8. **Project name editing**: Click pencil icon in header, verify inline editing works
9. **URL hash**: Scroll to sections, verify URL hash updates; reload page with hash, verify scroll position restores
10. **Edge cases**: Empty project (no generated docs), project with only some docs generated, project mid-generation
