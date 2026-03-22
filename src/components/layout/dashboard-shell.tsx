"use client"

import { usePathname } from "next/navigation"
import { Header } from "@/components/layout/header"
import { BrandWordmark } from "@/components/layout/brand-wordmark"

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
            <BrandWordmark href="/projects" label="Projects" labelClassName="text-lg font-bold tracking-tight" />
          </Header>
        )}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
