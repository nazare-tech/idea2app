"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
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
            credits={credits}
          >
            <div className="inline-flex items-center">
              <Link href="/projects" className="inline-flex h-10 w-10 shrink-0 items-center justify-center">
                <Image
                  src="/idea2app-logo.jpg"
                  alt="Idea2App logo"
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-md object-cover"
                />
              </Link>
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
