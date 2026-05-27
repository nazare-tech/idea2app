"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"

interface DashboardShellProps {
  children: React.ReactNode
  user?: {
    email?: string
    full_name?: string
    avatar_url?: string
  }
  credits?: number
}

export function DashboardShell({
  children,
  user,
  credits = 0,
}: DashboardShellProps) {
  const pathname = usePathname()
  const shouldShowHeader = pathname
    ? pathname === "/projects/new" || !pathname.startsWith("/projects/")
    : true
  const pageTitle = pathname === "/projects"
    ? null
    : pathname === "/projects/new"
    ? "New Project"
    : pathname?.startsWith("/preferences")
    ? "Preferences"
    : pathname?.startsWith("/billing")
      ? "Billing"
      : pathname === "/dashboard"
        ? "Dashboard"
        : "Projects"
  const rightContent = pathname === "/projects"
    ? (
        <Link href="/projects/new" className="shrink-0" prefetch={false}>
          <Button className="h-9 bg-primary px-4 text-sm text-primary-foreground">
            New Project
          </Button>
        </Link>
      )
    : undefined

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="flex h-full flex-1 flex-col overflow-hidden">
        {shouldShowHeader && (
          <Header
            user={user}
            credits={credits}
            pageTitle={pageTitle}
            rightContent={rightContent}
          />
        )}
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}
