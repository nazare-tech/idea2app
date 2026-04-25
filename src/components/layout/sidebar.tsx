"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { BrandWordmark } from "@/components/layout/brand-wordmark"
import {
  LayoutDashboard,
  FolderKanban,
  CreditCard,
  Settings,
  LogOut,
  Coins,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuthSignOut } from "@/hooks/use-auth-signout"
import { CreditBalance } from "@/components/ui/credit-balance"
import { hasUnlimitedCredits } from "@/lib/credits"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Billing", href: "/billing", icon: CreditCard },
  { name: "Preferences", href: "/preferences?tab=profile", icon: Settings },
]

interface SidebarProps {
  credits?: number
}

export function Sidebar({ credits = 0 }: SidebarProps) {
  const pathname = usePathname()
  const handleSignOut = useAuthSignOut()

  return (
    <div className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar-bg">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-6 border-b border-[var(--color-surface-ghost)]">
        <BrandWordmark
          href="/projects"
          logoClassName="rounded-lg"
          labelClassName="ui-section-title tracking-normal"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const itemPath = item.href.split("?")[0]
          const isActive = pathname.startsWith(itemPath)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "ui-row-gap-3 rounded-lg px-3.5 py-2.5 text-sm ui-font-medium transition-colors duration-200",
                isActive
                  ? "bg-sidebar-active text-sidebar-foreground"
                  : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Credits Display */}
      <div className="p-4 border-t border-[var(--color-surface-ghost)]">
        <div className="rounded-lg border border-sidebar-border bg-sidebar-active p-4">
          <div className="ui-row-gap-2 mb-2 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-sidebar-muted">
            <Coins className="h-3.5 w-3.5 text-text-accent" />
            <span>Credits</span>
          </div>
          <p className="text-2xl font-black ui-tracking-tight">
            <CreditBalance
              credits={credits}
              className="text-2xl font-black ui-tracking-tight"
              unlimitedClassName="text-primary"
            />
          </p>
          {!hasUnlimitedCredits(credits) && credits < 20 && (
            <Link href="/billing">
              <Button size="sm" className="w-full mt-3">
                Get More Credits
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Sign Out */}
      <div className="p-4 border-t border-[var(--color-surface-ghost)]">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-[#ff3b5c]"
          onClick={handleSignOut}
        >
          <LogOut className="h-[18px] w-[18px]" />
          Sign out
        </Button>
      </div>
    </div>
  )
}
