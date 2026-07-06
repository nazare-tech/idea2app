import { Plus } from "lucide-react"

const faqs = [
  {
    question: "What do I get for each project?",
    answer:
      "One intake produces market research, a product plan, a first version plan, three design mockup directions, and ready-to-paste AI prompts. Everything lives in one project workspace.",
  },
  {
    question: "Do I need to know how to code?",
    answer:
      "No. The output is structured for AI coding tools like Cursor, Claude Code, or Lovable. You download the prompt files, paste the first prompt into the tool we recommend, and build from there.",
  },
  {
    question: "How long does generation take?",
    answer:
      "Most projects finish in a few minutes. Generation runs on our servers, so you can close the tab and come back; nothing is lost.",
  },
  {
    question: "Can I try it for free?",
    answer:
      "Yes. The Free plan includes one lifetime project with the full bundle: research, plans, mockups, and prompts. No credit card required.",
  },
  {
    question: "What happens when I hit my monthly project limit?",
    answer:
      "Existing projects stay fully accessible. To start more projects in the same month, upgrade your plan; otherwise your allowance resets with the next billing month.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. Manage or cancel your subscription from the billing page at any time; access continues through the period you have already paid for.",
  },
]

/**
 * Landing FAQ: native details/summary rows so it works without JS, styled
 * with the hairline-row idiom used across the page.
 */
export function FaqSection() {
  return (
    <section id="faq" className="py-3">
      <h2 className="max-w-[760px] text-[2rem] leading-[0.98] tracking-[-0.06em] font-semibold sm:text-[2.65rem] lg:text-[3.35rem]">
        Frequently asked questions
      </h2>
      <div className="mt-10 border-t border-border-subtle">
        {faqs.map((faq) => (
          <details key={faq.question} className="group border-b border-border-subtle">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left [&::-webkit-details-marker]:hidden">
              <span className="text-[17px] font-semibold tracking-[-0.01em] sm:text-[19px]">{faq.question}</span>
              <Plus
                className="h-5 w-5 shrink-0 text-text-muted transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-open:rotate-45"
                aria-hidden="true"
              />
            </summary>
            <p className="max-w-[720px] pb-6 text-[15px] leading-relaxed text-text-secondary">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
