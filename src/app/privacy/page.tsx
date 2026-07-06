import type { Metadata } from "next"
import Link from "next/link"

import { InfoPageShell } from "@/components/landing/info-page-shell"
import { SUPPORT_EMAIL } from "@/lib/support"

export const metadata: Metadata = {
  title: "Privacy Policy - Maker Compass",
  description: "How Maker Compass collects, uses, and protects your data.",
}

const sectionHeading = "mt-10 text-[20px] font-semibold tracking-[-0.02em]"
const body = "mt-3 text-[15px] leading-relaxed text-text-secondary"

export default function PrivacyPage() {
  return (
    <InfoPageShell kicker="Legal" title="Privacy Policy">
      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-text-muted">
        Last updated: July 6, 2026
      </p>

      <h2 className={sectionHeading}>What we collect</h2>
      <p className={body}>
        When you create an account we store your email address and profile basics. When you use the product we
        store the ideas you submit, your intake answers, and the documents and mockups generated for your
        projects. We also collect standard usage and error data to keep the service reliable.
      </p>

      <h2 className={sectionHeading}>How we use it</h2>
      <p className={body}>
        Your project inputs are used to generate your research, plans, and mockups, and for nothing else. Usage
        data helps us fix problems and improve the product. We do not sell your data, and we do not use your
        project content to advertise to you.
      </p>

      <h2 className={sectionHeading}>Third-party services</h2>
      <p className={body}>
        We rely on a small set of processors to run Maker Compass: Supabase (database and authentication),
        Stripe (payments; we never see your full card details), AI model providers that process your project
        inputs to generate documents, and Sentry (error monitoring). Each receives only what it needs to do its
        job.
      </p>

      <h2 className={sectionHeading}>Retention and deletion</h2>
      <p className={body}>
        Your projects stay in your account until you delete them or your account. To request deletion of your
        account and its data, email us at {SUPPORT_EMAIL} from the address on your account.
      </p>

      <h2 className={sectionHeading}>Contact</h2>
      <p className={body}>
        Questions about this policy: email {SUPPORT_EMAIL} or use the{" "}
        <Link href="/contact" className="text-text-primary underline underline-offset-2 hover:text-text-secondary">
          contact page
        </Link>
        .
      </p>
    </InfoPageShell>
  )
}
