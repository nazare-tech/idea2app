import type { Metadata } from "next"
import Link from "next/link"

import { InfoPageShell } from "@/components/landing/info-page-shell"

export const metadata: Metadata = {
  title: "Terms of Service - Maker Compass",
  description: "The terms that govern your use of Maker Compass.",
}

const sectionHeading = "mt-10 text-[20px] font-semibold tracking-[-0.02em]"
const body = "mt-3 text-[15px] leading-relaxed text-text-secondary"

export default function TermsPage() {
  return (
    <InfoPageShell kicker="Legal" title="Terms of Service">
      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-text-muted">
        Last updated: July 6, 2026
      </p>

      <h2 className={sectionHeading}>The service</h2>
      <p className={body}>
        Maker Compass turns your product ideas into AI-generated research, planning documents, and design
        mockups. Generated content is a starting point for your own judgment, not professional, legal, or
        financial advice; verify anything you rely on.
      </p>

      <h2 className={sectionHeading}>Your account</h2>
      <p className={body}>
        You are responsible for your account credentials and for what is submitted from your account. You must
        be able to form a binding contract to use the service.
      </p>

      <h2 className={sectionHeading}>Plans and billing</h2>
      <p className={body}>
        Paid plans are billed through Stripe on the interval you choose and set how many new projects you can
        create per month. You can cancel any time from the billing page; access continues through the period
        you have paid for.
      </p>

      <h2 className={sectionHeading}>Your content</h2>
      <p className={body}>
        You own the ideas you submit and the documents and mockups generated for your projects. We use your
        inputs only to operate the service, as described in the{" "}
        <Link href="/privacy" className="text-text-primary underline underline-offset-2 hover:text-text-secondary">
          privacy policy
        </Link>
        .
      </p>

      <h2 className={sectionHeading}>Acceptable use</h2>
      <p className={body}>
        Do not use the service to generate content that is unlawful, infringes others&rsquo; rights, or attempts
        to disrupt or reverse-engineer the platform. We may suspend accounts that do.
      </p>

      <h2 className={sectionHeading}>Disclaimers</h2>
      <p className={body}>
        The service is provided as-is. To the maximum extent permitted by law, our liability is limited to the
        amount you paid us in the twelve months before a claim.
      </p>

      <h2 className={sectionHeading}>Changes and contact</h2>
      <p className={body}>
        We may update these terms as the product evolves and will note the date above. Questions: use the{" "}
        <Link href="/contact" className="text-text-primary underline underline-offset-2 hover:text-text-secondary">
          contact page
        </Link>
        .
      </p>
    </InfoPageShell>
  )
}
