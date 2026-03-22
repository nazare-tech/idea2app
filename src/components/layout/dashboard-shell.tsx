"use client"

import { usePathname } from "next/navigation"
import { Header } from "@/components/layout/header"
import { HeaderLogo } from "@/components/layout/header-logo"

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

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {shouldShowHeader && (
          <Header
            user={user}
            credits={credits}
          >
            <div className="inline-flex items-center min-w-0">
              <HeaderLogo />
              <span className="pl-3 text-lg font-bold tracking-tight">Projects</span>
            </div>
          </Header>
        )}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
