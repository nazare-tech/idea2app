"use client"

import { useMemo, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { AlertTriangle, RefreshCw, LayoutGrid, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  type CompetitiveAnalysisV2SectionName,
  type CompetitiveAnalysisView,
  getCompetitiveAnalysisViewModel,
} from "@/lib/competitive-analysis-v2"

interface CompetitiveAnalysisDocumentProps {
  content: string
  metadata?: Record<string, unknown> | null
  currentVersion?: number
  projectId: string
  onContentUpdate?: (newContent: string) => void
  onUpgrade: () => void
  isUpgrading: boolean
}

type CardTone = "default" | "muted" | "dark"

function SectionMarkdown({
  content,
  tone = "default",
}: {
  content: string
  tone?: CardTone
}) {
  const proseClasses = cn(
    "prose prose-sm max-w-none",
    "[&_p]:leading-relaxed [&_p]:mb-3 [&_ul]:my-3 [&_ul]:space-y-1.5 [&_ol]:my-3 [&_ol]:space-y-1.5",
    "[&_li]:leading-relaxed [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm",
    "[&_th]:border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold",
    "[&_td]:border [&_td]:px-3 [&_td]:py-2 [&_td]:align-top",
    "[&_h3]:mt-0 [&_h3]:mb-3 [&_h3]:text-base [&_h3]:font-semibold",
    "[&_h4]:mt-0 [&_h4]:mb-2 [&_h4]:text-sm [&_h4]:font-semibold",
    "[&_strong]:font-semibold [&_code]:rounded-none [&_code]:px-1.5 [&_code]:py-0.5",
    tone === "dark"
      ? "[&_p]:text-white/80 [&_li]:text-white/80 [&_h3]:text-white [&_h4]:text-white [&_strong]:text-white [&_code]:bg-white/10 [&_code]:text-white [&_th]:border-white/10 [&_th]:bg-white/10 [&_th]:text-white [&_td]:border-white/10 [&_td]:text-white/80 [&_a]:text-white [&_blockquote]:border-l-white/40 [&_blockquote]:text-white/70"
      : "[&_p]:text-[#666666] [&_li]:text-[#666666] [&_h3]:text-[#0A0A0A] [&_h4]:text-[#0A0A0A] [&_strong]:text-[#0A0A0A] [&_code]:bg-black/[0.04] [&_code]:text-[#0A0A0A] [&_th]:border-[#E5E5E5] [&_th]:bg-[#0A0A0A] [&_th]:text-white [&_td]:border-[#E5E5E5] [&_td]:text-[#666666] [&_a]:text-[#DC2626] [&_blockquote]:border-l-[#DC2626] [&_blockquote]:text-[#666666]"
  )

  return (
    <div className={proseClasses}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}

function SectionCard({
  title,
  children,
  tone = "default",
  className,
}: {
  title: string
  children: React.ReactNode
  tone?: CardTone
  className?: string
}) {
  return (
    <section
      className={cn(
        "border rounded-none",
        tone === "dark"
          ? "border-[#0A0A0A] bg-[#0A0A0A]"
          : tone === "muted"
            ? "border-[#E5E5E5] bg-[#F5F5F5]"
            : "border-[#E5E5E5] bg-white",
        className
      )}
    >
      <div className="border-b border-inherit px-6 py-4">
        <p
          className={cn(
            "font-mono text-[11px] uppercase tracking-[0.16em]",
            tone === "dark" ? "text-white/60" : "text-[#777777]"
          )}
        >
          {title}
        </p>
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  )
}

function SectionPair({
  left,
  right,
  sections,
}: {
  left: { title: CompetitiveAnalysisV2SectionName; tone?: CardTone }
  right: { title: CompetitiveAnalysisV2SectionName; tone?: CardTone }
  sections: Partial<Record<CompetitiveAnalysisV2SectionName, string>>
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <SectionCard title={left.title} tone={left.tone}>
        <SectionMarkdown content={sections[left.title] ?? ""} tone={left.tone} />
      </SectionCard>
      <SectionCard title={right.title} tone={right.tone}>
        <SectionMarkdown content={sections[right.title] ?? ""} tone={right.tone} />
      </SectionCard>
    </div>
  )
}

function CompetitiveModules({
  sections,
  competitorEntries,
}: {
  sections: Partial<Record<CompetitiveAnalysisV2SectionName, string>>
  competitorEntries: Array<{ heading: string; content: string }>
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard title="Executive Summary">
          <SectionMarkdown content={sections["Executive Summary"] ?? ""} />
        </SectionCard>
        <SectionCard title="Founder Verdict" tone="dark">
          <div className="space-y-4">
            <SectionMarkdown
              content={sections["Founder Verdict"] ?? ""}
              tone="dark"
            />
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Direct Competitors">
        {competitorEntries.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {competitorEntries.map((competitor, index) => (
              <div
                key={`${competitor.heading}-${index}`}
                className={cn(
                  "border rounded-none px-5 py-4",
                  index % 2 === 0 ? "bg-[#FAFAFA]" : "bg-white"
                )}
              >
                <h3 className="mb-3 text-base font-semibold tracking-tight text-[#0A0A0A]">
                  {competitor.heading}
                </h3>
                <SectionMarkdown content={competitor.content} />
              </div>
            ))}
          </div>
        ) : (
          <SectionMarkdown content={sections["Direct Competitors"] ?? ""} />
        )}
      </SectionCard>

      <SectionCard title="Feature and Workflow Matrix">
        <SectionMarkdown content={sections["Feature and Workflow Matrix"] ?? ""} />
      </SectionCard>

      <SectionPair
        left={{ title: "Pricing and Packaging" }}
        right={{ title: "Audience Segments", tone: "muted" }}
        sections={sections}
      />

      <SectionPair
        left={{ title: "Competitive Landscape Overview" }}
        right={{ title: "Positioning Map" }}
        sections={sections}
      />

      <SectionPair
        left={{ title: "GTM / Distribution Signals" }}
        right={{ title: "Gap Analysis", tone: "muted" }}
        sections={sections}
      />

      <SectionPair
        left={{ title: "Differentiation Wedges" }}
        right={{ title: "Moat and Defensibility" }}
        sections={sections}
      />

      <SectionPair
        left={{ title: "SWOT Analysis" }}
        right={{ title: "Risks and Countermoves", tone: "muted" }}
        sections={sections}
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="MVP Wedge Recommendation">
          <SectionMarkdown content={sections["MVP Wedge Recommendation"] ?? ""} />
        </SectionCard>
        <SectionCard title="Strategic Recommendations" tone="dark">
          <SectionMarkdown
            content={sections["Strategic Recommendations"] ?? ""}
            tone="dark"
          />
        </SectionCard>
      </div>
    </div>
  )
}

export function CompetitiveAnalysisDocument({
  content,
  metadata,
  currentVersion = 0,
  projectId,
  onContentUpdate,
  onUpgrade,
  isUpgrading,
}: CompetitiveAnalysisDocumentProps) {
  const viewModel = useMemo(
    () => getCompetitiveAnalysisViewModel(content, metadata),
    [content, metadata]
  )
  const viewResetKey = `${currentVersion}-${viewModel.documentVersion}`

  return (
    <CompetitiveAnalysisDocumentInner
      key={viewResetKey}
      content={content}
      viewModel={viewModel}
      projectId={projectId}
      onContentUpdate={onContentUpdate}
      onUpgrade={onUpgrade}
      isUpgrading={isUpgrading}
    />
  )
}

function CompetitiveAnalysisDocumentInner({
  content,
  viewModel,
  projectId,
  onContentUpdate,
  onUpgrade,
  isUpgrading,
}: {
  content: string
  viewModel: ReturnType<typeof getCompetitiveAnalysisViewModel>
  projectId: string
  onContentUpdate?: (newContent: string) => void
  onUpgrade: () => void
  isUpgrading: boolean
}) {
  const [activeView, setActiveView] = useState<CompetitiveAnalysisView>(
    viewModel.defaultView
  )
  const selectedView =
    viewModel.canRenderModules || activeView !== "modules"
      ? activeView
      : "markdown"

  return (
    <div className="space-y-4">
      {viewModel.legacyNotice && (
        <div className="border border-[#E5E5E5] bg-[#FFF7ED] px-5 py-4 rounded-none">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="font-semibold text-[#0A0A0A]">
                {viewModel.legacyNotice}
              </p>
              <p className="text-sm text-[#666666]">
                Existing versions stay intact. Regenerating creates a new v2
                version with the modules dashboard.
              </p>
            </div>
            <button
              type="button"
              onClick={onUpgrade}
              disabled={isUpgrading}
              className="inline-flex items-center gap-2 rounded-none border border-[#0A0A0A] bg-[#0A0A0A] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={cn("h-4 w-4", isUpgrading && "animate-spin")}
              />
              {isUpgrading ? "Regenerating..." : "Regenerate as V2"}
            </button>
          </div>
        </div>
      )}

      {viewModel.warning && (
        <div className="flex items-start gap-3 border border-[#FCA5A5] bg-[#FEF2F2] px-5 py-4 rounded-none">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2626]" />
          <div className="space-y-1">
            <p className="font-semibold text-[#7F1D1D]">
              Modules view unavailable
            </p>
            <p className="text-sm text-[#991B1B]">{viewModel.warning}</p>
          </div>
        </div>
      )}

      <Tabs
        value={selectedView}
        onValueChange={(value) => setActiveView(value as CompetitiveAnalysisView)}
      >
        <TabsList className="h-auto rounded-none border border-[#E5E5E5] bg-white p-1">
          <TabsTrigger
            value="modules"
            disabled={!viewModel.canRenderModules}
            className="rounded-none border-0 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] data-[state=active]:bg-[#0A0A0A] data-[state=active]:text-white data-[state=active]:shadow-none"
          >
            <LayoutGrid className="mr-2 h-3.5 w-3.5" />
            Modules
          </TabsTrigger>
          <TabsTrigger
            value="markdown"
            className="rounded-none border-0 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] data-[state=active]:bg-[#0A0A0A] data-[state=active]:text-white data-[state=active]:shadow-none"
          >
            <FileText className="mr-2 h-3.5 w-3.5" />
            Markdown
          </TabsTrigger>
        </TabsList>

        <TabsContent value="modules" className="mt-4">
          {viewModel.canRenderModules ? (
            <CompetitiveModules
              sections={viewModel.parsed.sections}
              competitorEntries={viewModel.parsed.competitorEntries}
            />
          ) : null}
        </TabsContent>

        <TabsContent value="markdown" className="mt-4">
          <MarkdownRenderer
            content={content}
            projectId={projectId}
            enableInlineEditing={true}
            onContentUpdate={onContentUpdate}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
