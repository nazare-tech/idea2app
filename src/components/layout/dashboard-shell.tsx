"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/layout/header"

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
            rightContent={
              <span className="text-sm text-foreground/80">
                Credits: {credits >= 999999 ? "∞" : credits.toLocaleString()}
              </span>
            }
          >
            <Link href="/projects" className="inline-flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight">Idea2App</span>
            </Link>
          </Header>
        )}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
