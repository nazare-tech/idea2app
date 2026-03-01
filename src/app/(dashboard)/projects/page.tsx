import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { DashboardProjectCard } from "@/components/projects/dashboard-project-card"
import { ArrowRight } from "lucide-react"

type ActiveProject = {
  id: string
  name: string
  description: string | null
  href: string
}

type DbProject = {
  id: string
  name: string
  description: string | null
}

const fallbackProjects: ActiveProject[] = [
  {
    id: "fallback-1",
    name: "Prompt Forge",
    description:
      '> optimize persona="CTO" constraints=[latency<500ms, tone=concise]',
    href: "/projects/new",
  },
  {
    id: "fallback-2",
    name: "Prompt Forge",
    description:
      '> optimize persona="CTO" constraints=[latency<500ms, tone=concise]',
    href: "/projects/new",
  },
  {
    id: "fallback-3",
    name: "Workflow Pilot",
    description:
      '"create runbook from incident log + auto-generate rollback checklist"',
    href: "/projects/new",
  },
]

const inspirationProjects = [
  {
    category: "FINTECH • CRM",
    title: "Apex Revenue OS",
    description: "+34% qualified pipeline in 60 days",
    action: "View Project",
    buttonClass: "bg-[#FF3B30] border-[#FF3B30] text-white",
    cardClass: "bg-[#0A0A0A] text-white",
    titleClass: "text-white",
    categoryClass: "text-[#FF3B30]",
    href: "/projects",
  },
  {
    category: "TRAVEL • MARKETPLACE",
    title: "StayFlow Booking Platform",
    description: "Cut onboarding time by 41% with instant host setup",
    action: "Explore Breakdown",
    buttonClass: "bg-[#0A0A0A] border-[#0A0A0A] text-white",
    cardClass: "bg-white text-[#0A0A0A]",
    titleClass: "text-[#0A0A0A]",
    categoryClass: "text-[#FF3B30]",
    href: "/projects",
  },
  {
    category: "FINANCE • ANALYTICS",
    title: "Northstar Budget Suite",
    description: "Improved monthly retention by 22% via insight alerts",
    action: "View Project",
    buttonClass: "bg-[#0A0A0A] border-[#0A0A0A] text-white",
    cardClass: "bg-white text-[#0A0A0A]",
    titleClass: "text-[#0A0A0A]",
    categoryClass: "text-[#FF3B30]",
    href: "/projects",
  },
]

export default async function ProjectsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", user!.id)
    .order("updated_at", { ascending: false })

  const activeProjects: ActiveProject[] = (projects?.length ? (projects as DbProject[]) : fallbackProjects).map(
    (project) => ({
      id: project.id,
      name: project.name,
      description: project.description ?? null,
      href: project.id?.startsWith("fallback-")
        ? "/projects/new"
        : `/projects/${project.id}`,
    })
  )

  return (
    <div className="flex flex-col h-full bg-background px-6 py-6 md:px-12 md:py-6 lg:px-[56px] lg:py-6">
      <section className="rounded-2xl border border-[#E0E0E0] bg-[#0A0A0A] p-8 text-white">
        <header className="mb-7">
          <h1 className="font-[700] text-[24px] leading-tight tracking-[-0.5px] text-[#FFFFFF]">
            Projects
          </h1>
          <p className="mt-2 text-sm text-[#999999]">
            Manage and organize your AI-powered applications.
          </p>
        </header>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {activeProjects.map((project) => (
            <DashboardProjectCard
              key={project.id}
              id={project.id}
              name={project.name}
              description={project.description}
              href={project.href}
              showDelete={project.id?.startsWith("fallback-") === false}
            />
          ))}
        </div>
      </section>

      <div className="h-[1px] bg-[#E0E0E0] my-6" />

      <section className="rounded-2xl border border-[#E0E0E0] bg-white p-7">
        <div className="mb-4 flex flex-col gap-3">
          <h2 className="text-[24px] leading-tight font-[700] tracking-[-0.5px] text-[#0A0A0A]">
            Get inspired by pre-made projects
          </h2>
          <p className="text-sm leading-[1.5] text-[#666666]">
            Browse successful apps already launched by other teams and use them as a starting point for your next build.
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex h-7 items-center rounded-full border border-[#0A0A0A] bg-[#0A0A0A] px-3 text-xs font-medium text-white">
              Case Studies
            </span>
            <span className="inline-flex h-7 items-center rounded-full border border-[#E0E0E0] bg-white px-3 text-xs font-medium text-[#0A0A0A]">
              Top Performers
            </span>
            <span className="inline-flex h-7 items-center rounded-full border border-[#E0E0E0] bg-white px-3 text-xs font-medium text-[#0A0A0A]">
              Recently Shipped
            </span>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {inspirationProjects.map((project) => (
            <article
              key={project.title}
              className={`min-h-[210px] rounded-2xl border border-[#E0E0E0] p-5 ${project.cardClass} flex flex-col justify-between`}
            >
              <div className="space-y-2">
                <p className={`text-[12px] font-medium ${project.categoryClass}`}>
                  {project.category}
                </p>
                <h3 className={`text-[24px] leading-tight font-[700] tracking-[-0.5px] ${project.titleClass}`}>
                  {project.title}
                </h3>
                <p className="text-sm text-[#999999] dark:text-[#666666]">
                  {project.description}
                </p>
              </div>
              <Link
                href={project.href}
                className={`mt-6 inline-flex h-9 items-center gap-2 rounded-lg border px-[18px] py-2 text-sm font-medium ${project.buttonClass}`}
              >
                {project.action}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
