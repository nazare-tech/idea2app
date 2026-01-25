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
    <div className="flex h-full w-64 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6 border-b border-border">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Lightbulb className="h-4 w-4 text-primary" />
        </div>
        <span className="text-lg font-bold">Idea2App</span>
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
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Credits Display */}
      <div className="p-4 border-t border-border">
        <div className="rounded-lg bg-muted/50 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Coins className="h-4 w-4" />
            <span>Available Credits</span>
          </div>
          <p className="text-2xl font-bold">
            {credits >= 999999 ? "Unlimited" : credits.toLocaleString()}
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
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5" />
          Sign out
        </Button>
      </div>
    </div>
  )
}
