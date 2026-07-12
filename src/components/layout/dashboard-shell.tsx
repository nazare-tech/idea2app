"use client"

import { usePathname } from "next/navigation"
import { Header } from "@/components/layout/header"

interface DashboardShellProps {
  children: React.ReactNode
  user?: {
    email?: string
    full_name?: string
    avatar_url?: string
  }
}

export function DashboardShell({
  children,
  user,
}: DashboardShellProps) {
  const pathname = usePathname()
  const shouldShowHeader = pathname
    ? pathname === "/projects/new" || !pathname.startsWith("/projects/")
    : true
  const pageTitle = pathname === "/projects"
    ? (
        <span className="text-base font-normal leading-5 text-text-secondary">
          Projects
        </span>
      )
    : pathname === "/projects/new"
    ? "New Project"
    : pathname?.startsWith("/preferences")
    ? "Preferences"
    : pathname?.startsWith("/billing")
      ? "Billing"
      : pathname === "/dashboard"
        ? "Dashboard"
        : "Projects"
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <div className="flex h-full flex-1 flex-col overflow-hidden">
        {shouldShowHeader && (
          <Header
            user={user}
            pageTitle={pageTitle}
          />
        )}
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}
