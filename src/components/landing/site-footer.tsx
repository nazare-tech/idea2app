import Link from "next/link"

import { BrandWordmark } from "@/components/layout/brand-wordmark"

const productLinks = [
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/#pricing" },
  { label: "FAQ", href: "/#faq" },
]

/**
 * The one public-site footer, shared by the landing page and the
 * contact/privacy/terms info pages. Sign-in / signup CTAs intentionally live
 * in the header and hero only, so the footer stays product + help + legal.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-border-subtle bg-[#F5F0EB]">
      <div className="mx-auto grid w-full max-w-[1320px] gap-10 px-4 py-14 sm:grid-cols-2 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr] lg:px-14">
        <div>
          <BrandWordmark href="/" logoSize={32} logoClassName="rounded-sm" labelClassName="text-base font-semibold tracking-[0.01em]" />
          <p className="mt-4 max-w-[320px] text-sm leading-relaxed text-text-secondary">
            Turn a one-line idea into research, a product plan, mockups, and a first-version build plan you can hand to a coding agent.
          </p>
        </div>

        <div>
          <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-text-muted">Product</p>
          <ul className="mt-4 space-y-3 text-sm">
            {productLinks.map((item) => (
              <li key={item.label}>
                <Link href={item.href} className="text-text-secondary hover:text-text-primary">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-text-muted">Help</p>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <Link href="/contact" className="text-text-secondary hover:text-text-primary">
                Contact us
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="mx-auto flex min-h-[64px] w-full max-w-[1320px] flex-wrap items-center justify-between gap-3 border-t border-border-subtle px-4 text-sm sm:px-8 lg:px-14">
        <span className="font-mono text-[0.6875rem] tracking-[0.18em] text-text-muted">© 2026 Maker Compass. All rights reserved.</span>
        <nav className="flex items-center gap-6 font-mono text-[0.6875rem] tracking-[0.18em]">
          <Link href="/privacy" className="text-text-muted hover:text-text-primary">
            PRIVACY
          </Link>
          <Link href="/terms" className="text-text-muted hover:text-text-primary">
            TERMS
          </Link>
        </nav>
      </div>
    </footer>
  )
}
