import type { Metadata } from "next"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { InfoPageShell } from "@/components/landing/info-page-shell"
import { SUPPORT_EMAIL } from "@/lib/support"

export const metadata: Metadata = {
  title: "Contact - Maker Compass",
  description: "Questions, feedback, or account help: email the Maker Compass team.",
}

export default function ContactPage() {
  return (
    <InfoPageShell kicker="Support" title="Get in touch.">
      <p className="max-w-[560px] text-[17px] leading-relaxed text-text-secondary">
        Questions, feedback, or trouble with your account? Email us and a human will reply, usually within one
        business day.
      </p>

      <div className="mt-8 border border-border-subtle bg-white p-7">
        <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-text-muted">
          Email us
        </p>
        <p className="mt-3 text-[22px] font-semibold tracking-[-0.02em]">{SUPPORT_EMAIL}</p>
        <p className="mt-3 max-w-[520px] text-[15px] leading-relaxed text-text-secondary">
          For account or billing issues, send from the email address on your account. For product feedback, a
          couple of sentences on what you expected to happen is plenty.
        </p>
        <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-6 inline-block">
          <Button className="h-11 rounded-md bg-primary px-6 text-sm font-semibold text-white hover:bg-primary/90">
            Write to us
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </a>
      </div>

      <p className="mt-6 max-w-[560px] text-sm leading-relaxed text-text-muted">
        Billing questions about an active subscription can also be handled from the billing page inside your
        account.
      </p>
    </InfoPageShell>
  )
}
