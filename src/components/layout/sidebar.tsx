"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FolderKanban,
  CreditCard,
  Settings,
  Lightbulb,
  LogOut,
  Coins,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Billing", href: "/billing", icon: CreditCard },
  { name: "Settings", href: "/settings", icon: Settings },
]

interface SidebarProps {
  credits?: number
}

export function Sidebar({ credits = 0 }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <div className="flex h-full w-64 flex-col border-r border-[rgba(255,255,255,0.04)] bg-[rgba(8,8,14,0.8)] backdrop-blur-xl">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-6 border-b border-[rgba(255,255,255,0.04)]">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#00d4ff] to-[#7c3aed] flex items-center justify-center shadow-[0_0_12px_rgba(0,212,255,0.3)]">
          <Lightbulb className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight">Idea2App</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-[rgba(0,212,255,0.1)] to-[rgba(124,58,237,0.08)] text-[#00d4ff] shadow-[inset_0_0_0_1px_rgba(0,212,255,0.15)]"
                  : "text-muted-foreground hover:bg-[rgba(255,255,255,0.04)] hover:text-foreground"
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Credits Display */}
      <div className="p-4 border-t border-[rgba(255,255,255,0.04)]">
        <div className="rounded-xl bg-gradient-to-br from-[rgba(0,212,255,0.06)] to-[rgba(124,58,237,0.04)] border border-[rgba(255,255,255,0.06)] p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-2">
            <Coins className="h-3.5 w-3.5 text-[#00d4ff]" />
            <span>Credits</span>
          </div>
          <p className="text-2xl font-black tracking-tight">
            {credits >= 999999 ? (
              <span className="gradient-text">Unlimited</span>
            ) : (
              credits.toLocaleString()
            )}
          </p>
          {credits < 999999 && credits < 20 && (
            <Link href="/billing">
              <Button size="sm" className="w-full mt-3">
                Get More Credits
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Sign Out */}
      <div className="p-4 border-t border-[rgba(255,255,255,0.04)]">
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
