import type { ReactNode } from "react"
import Link from "next/link"

import { ResearchRunControl } from "./research-run-control"

export function StandaloneShell({ children }: { children: ReactNode }) {
  return <div className="app-shell">
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Research Inbox home">
        <span className="brand-mark" aria-hidden="true">R</span>
        <span>Research Inbox</span>
      </Link>
      <div className="header-actions">
        <div className="local-status"><span aria-hidden="true" />Local workspace · JSON-backed</div>
        <ResearchRunControl />
      </div>
    </header>
    {children}
  </div>
}
