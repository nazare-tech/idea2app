import type { Metadata } from "next"

import { ContactForm } from "@/components/landing/contact-form"
import { InfoPageShell } from "@/components/landing/info-page-shell"

export const metadata: Metadata = {
  title: "Contact - Maker Compass",
  description: "Questions, feedback, or account help: send the Maker Compass team a message.",
}

export default function ContactPage() {
  return (
    <InfoPageShell kicker="Support" title="Get in touch.">
      <p className="max-w-[560px] text-[17px] leading-relaxed text-text-secondary">
        Questions, feedback, or trouble with your account? Send us a message and a human will reply, usually
        within one business day.
      </p>

      <div className="mt-8 border border-border-subtle bg-white p-7">
        <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-text-muted">
          Send a message
        </p>
        <p className="mt-3 max-w-[520px] text-[15px] leading-relaxed text-text-secondary">
          For account or billing issues, use the email address on your account so we can find it.
        </p>
        <div className="mt-6">
          <ContactForm />
        </div>
      </div>

      <p className="mt-6 max-w-[560px] text-sm leading-relaxed text-text-muted">
        Billing questions about an active subscription can also be handled from the billing page inside your
        account.
      </p>
    </InfoPageShell>
  )
}
