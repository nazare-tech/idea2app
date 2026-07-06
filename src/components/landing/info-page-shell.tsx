import type { ReactNode } from "react"
import Link from "next/link"

import { BrandWordmark } from "@/components/layout/brand-wordmark"

interface InfoPageShellProps {
  /** Mono uppercase kicker above the page title, e.g. "SUPPORT". */
  kicker: string
  title: string
  children: ReactNode
}

/**
 * Shared shell for public info pages (contact, privacy, terms): landing-style
 * header, narrow reading column, and a minimal footer bar.
 */
export function InfoPageShell({ kicker, title, children }: InfoPageShellProps) {
  return (
    <div className="min-h-screen bg-background text-text-primary">
      <header className="sticky top-0 z-50 border-b border-border-subtle bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex min-h-16 w-full max-w-[1320px] items-center justify-between gap-3 px-4 sm:px-8 lg:px-14">
          <BrandWordmark href="/" logoSize={36} logoClassName="rounded-sm" labelClassName="text-lg font-semibold tracking-[0.01em]" />
          <Link href="/" className="text-sm font-medium text-text-primary hover:text-text-secondary">
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[760px] px-4 py-14 sm:px-8 md:py-20">
        <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-text-muted">{kicker}</p>
        <h1 className="mt-4 text-[2.25rem] font-semibold leading-[0.98] tracking-[-0.06em] sm:text-[3rem]">{title}</h1>
        <div className="mt-8">{children}</div>
      </main>

      <footer className="border-t border-border-subtle bg-[#F5F0EB]">
        <div className="mx-auto flex min-h-[64px] w-full max-w-[1320px] flex-wrap items-center justify-between gap-3 px-4 sm:px-8 lg:px-14">
          <span className="font-mono text-[0.6875rem] tracking-[0.18em] text-text-muted">
            © 2026 Maker Compass. All rights reserved.
          </span>
          <nav className="flex items-center gap-6 font-mono text-[0.6875rem] tracking-[0.18em]">
            <Link href="/contact" className="text-text-muted hover:text-text-primary">
              CONTACT
            </Link>
            <Link href="/privacy" className="text-text-muted hover:text-text-primary">
              PRIVACY
            </Link>
            <Link href="/terms" className="text-text-muted hover:text-text-primary">
              TERMS
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
