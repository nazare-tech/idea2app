import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  GitBranch,
  Milestone,
  ShieldCheck,
  Timer,
} from "lucide-react"

export const dynamic = "force-static"

type CriticalStep = {
  id: string
  phase: string
  title: string
  owner: string
  duration: string
  outcome: string
  risk: "low" | "medium" | "high"
  dependency?: string
}

const criticalPath: CriticalStep[] = [
  {
    id: "01",
    phase: "Discovery",
    title: "Referral or concierge discovery",
    owner: "Growth",
    duration: "Day 0",
    outcome: "Qualified member intent captured",
    risk: "low",
  },
  {
    id: "02",
    phase: "Intake",
    title: "Membership application",
    owner: "Ops",
    duration: "Day 0",
    outcome: "Household, pet, and coverage requirements submitted",
    risk: "medium",
    dependency: "Discovery must identify urgency and service area.",
  },
  {
    id: "03",
    phase: "Gate",
    title: "Admin review",
    owner: "Founder",
    duration: "4 hours",
    outcome: "Approved member tier or decline path",
    risk: "high",
    dependency: "Manual quality bar protects supply and brand trust.",
  },
  {
    id: "04",
    phase: "Setup",
    title: "Account, tier, and pet profile setup",
    owner: "Product",
    duration: "1 day",
    outcome: "Ready-to-book member profile",
    risk: "medium",
  },
  {
    id: "05",
    phase: "Payment",
    title: "Stripe membership payment",
    owner: "Engineering",
    duration: "15 min",
    outcome: "Active subscription and billing record",
    risk: "low",
  },
  {
    id: "06",
    phase: "Booking",
    title: "Submit booking request",
    owner: "Member",
    duration: "5 min",
    outcome: "Date, pet, and home-care requirements locked",
    risk: "medium",
  },
  {
    id: "07",
    phase: "Match",
    title: "Concierge matches sitter",
    owner: "Ops",
    duration: "2 hours",
    outcome: "Certified sitter assigned and confirmed",
    risk: "high",
    dependency: "Supply quality and availability are the core constraint.",
  },
  {
    id: "08",
    phase: "Service",
    title: "Service in progress",
    owner: "Sitter",
    duration: "Booking window",
    outcome: "Real-time updates and incident handling",
    risk: "medium",
  },
  {
    id: "09",
    phase: "Retention",
    title: "Rebooking and vet coordination",
    owner: "Concierge",
    duration: "Post-service",
    outcome: "Next visit, renewal signal, and follow-up tasks",
    risk: "low",
  },
]

const branchPaths = [
  {
    label: "Rejected",
    title: "Waitlist or decline email",
    detail: "Preserve brand quality while giving the founder a clean reason code.",
  },
  {
    label: "Approved",
    title: "Account setup continues",
    detail: "Move the member directly into tier selection, payment, and profile completion.",
  },
]

const stageSummaries = [
  { label: "Critical gates", value: "3", detail: "Admin review, payment, sitter match" },
  { label: "Manual risk", value: "High", detail: "Ops matching is the MVP bottleneck" },
  { label: "Happy path", value: "2 days", detail: "Application to first confirmed booking" },
]

function riskStyle(risk: CriticalStep["risk"]) {
  if (risk === "high") {
    return "border-[#FCA5A5] bg-[#FEF2F2] text-[#7F1D1D]"
  }

  if (risk === "medium") {
    return "border-[#FED7AA] bg-[#FFF7ED] text-[#7C2D12]"
  }

  return "border-[#BBF7D0] bg-[#F0FDF4] text-[#14532D]"
}

export default function CriticalPathPreviewPage() {
  return (
    <main className="min-h-screen bg-[#FAFAFA] px-6 py-8 text-[#1C1917] lg:px-10">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-8">
        <header className="flex flex-col gap-4 border-b border-[#E8DDD5] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-[#8A8480]">
              Native MVP Artifact
            </p>
            <h1 className="mt-3 max-w-4xl text-3xl font-bold tracking-[-0.03em] text-[#1C1917] lg:text-5xl">
              Critical Path Diagram
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[#4A4040]">
              A document-native alternative to a tiny Mermaid flowchart: readable
              steps, explicit gates, branch paths, owners, timing, and risk.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:w-[560px]">
            {stageSummaries.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-[#E8DDD5] bg-white px-4 py-3"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8A8480]">
                  {item.label}
                </p>
                <p className="mt-2 text-xl font-bold tracking-[-0.02em] text-[#1C1917]">
                  {item.value}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#4A4040]">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="overflow-hidden rounded-lg border border-[#E8DDD5] bg-white">
            <div className="flex items-center justify-between gap-4 border-b border-[#E8DDD5] bg-[#F5F0EB] px-5 py-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8A8480]">
                  Main Path
                </p>
                <h2 className="mt-1 text-lg font-bold tracking-[-0.02em]">
                  Read left to right, scroll only when the path earns it
                </h2>
              </div>
              <div className="hidden items-center gap-2 text-sm font-medium text-[#4A4040] md:flex">
                <Milestone className="h-4 w-4 text-[#DC2626]" />
                9 linked steps
              </div>
            </div>

            <div className="overflow-x-auto px-5 py-6">
              <div className="flex min-w-[1380px] items-start">
                {criticalPath.map((step, index) => (
                  <div key={step.id} className="flex items-start">
                    <article className="w-[230px] rounded-lg border border-[#E8DDD5] bg-[#FFFFFF]">
                      <div className="border-b border-[#E8DDD5] bg-[#FAFAFA] px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8A8480]">
                              {step.phase}
                            </p>
                            <h3 className="mt-2 text-[15px] font-bold leading-5 tracking-[-0.01em]">
                              {step.title}
                            </h3>
                          </div>
                          <span className="rounded-full border border-[#E8DDD5] bg-white px-2 py-1 font-mono text-[10px] text-[#4A4040]">
                            {step.id}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-4 px-4 py-4">
                        <p className="text-sm leading-6 text-[#4A4040]">
                          {step.outcome}
                        </p>

                        {step.dependency ? (
                          <div className="rounded-md bg-[#F5F0EB] px-3 py-2 text-xs leading-5 text-[#4A4040]">
                            {step.dependency}
                          </div>
                        ) : null}

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="font-mono uppercase tracking-[0.14em] text-[#8A8480]">
                              Owner
                            </p>
                            <p className="mt-1 font-semibold text-[#1C1917]">
                              {step.owner}
                            </p>
                          </div>
                          <div>
                            <p className="font-mono uppercase tracking-[0.14em] text-[#8A8480]">
                              Time
                            </p>
                            <p className="mt-1 font-semibold text-[#1C1917]">
                              {step.duration}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${riskStyle(
                            step.risk
                          )}`}
                        >
                          {step.risk} risk
                        </span>
                      </div>
                    </article>

                    {index < criticalPath.length - 1 ? (
                      <div className="flex h-[154px] w-10 items-center justify-center">
                        <ArrowRight className="h-5 w-5 text-[#8A8480]" />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-4">
            <section className="rounded-lg border border-[#E8DDD5] bg-white p-5">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-[#DC2626]" />
                <h2 className="text-base font-bold tracking-[-0.01em]">
                  Decision branch
                </h2>
              </div>

              <div className="mt-4 space-y-3">
                {branchPaths.map((branch) => (
                  <div
                    key={branch.label}
                    className="rounded-lg border border-[#E8DDD5] bg-[#FAFAFA] p-4"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8A8480]">
                      {branch.label}
                    </p>
                    <p className="mt-2 text-sm font-bold text-[#1C1917]">
                      {branch.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#4A4040]">
                      {branch.detail}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-[#E8DDD5] bg-white p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#DC2626]" />
                <h2 className="text-base font-bold tracking-[-0.01em]">
                  Why this beats the tiny diagram
                </h2>
              </div>

              <ul className="mt-4 space-y-3 text-sm leading-6 text-[#4A4040]">
                <li className="flex gap-3">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#22C55E]" />
                  Text stays readable inside the document view.
                </li>
                <li className="flex gap-3">
                  <Timer className="mt-1 h-4 w-4 shrink-0 text-[#DC2626]" />
                  Timing and ownership become first-class planning data.
                </li>
                <li className="flex gap-3">
                  <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-[#D95F3B]" />
                  Risk gates are visible without opening a modal.
                </li>
              </ul>
            </section>
          </aside>
        </section>
      </div>
    </main>
  )
}
