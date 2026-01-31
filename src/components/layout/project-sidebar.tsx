"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Folder,
  Plus,
  Search,
  Settings,
  LogOut,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useState } from "react"

interface Project {
  id: string
  name: string
  status: string | null
}

interface UserInfo {
  email?: string
  full_name?: string
}

interface ProjectSidebarProps {
  projects: Project[]
  currentProjectId?: string
  user: UserInfo
}

export function ProjectSidebar({ projects, currentProjectId, user }: ProjectSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getInitials = (name?: string) => {
    if (!name) return "U"
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
  }

  return (
    <div className="flex h-full w-[260px] flex-col bg-sidebar-bg text-sidebar-foreground">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-base">P</span>
        </div>
        <span className="text-[11px] font-medium tracking-[1px] font-mono text-sidebar-foreground">
          PROJECTS
        </span>
      </div>

      {/* New Project Button */}
      <div className="px-6 pb-4">
        <Link
          href="/projects/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary rounded-md hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5 text-primary-foreground" />
          <span className="text-xs font-semibold text-primary-foreground">New Project</span>
        </Link>
      </div>

      {/* Search */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 px-3 py-2 border border-sidebar-border rounded-md">
          <Search className="h-3.5 w-3.5 text-sidebar-muted" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs text-sidebar-foreground placeholder:text-sidebar-muted outline-none w-full font-mono"
          />
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-sidebar-border" />

      {/* Project List */}
      <nav className="flex-1 overflow-y-auto py-2 sidebar-scrollbar">
        {filteredProjects.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-xs text-sidebar-muted">
              {searchQuery ? "No projects found" : "No projects yet"}
            </p>
          </div>
        ) : (
          filteredProjects.map((project) => {
            const isActive = currentProjectId === project.id || pathname === `/projects/${project.id}`
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className={cn(
                  "flex items-center gap-3 px-6 py-3 transition-colors",
                  isActive
                    ? "bg-sidebar-active"
                    : "hover:bg-sidebar-hover"
                )}
              >
                <Folder
                  className={cn(
                    "h-4 w-4",
                    isActive ? "text-primary" : "text-sidebar-muted"
                  )}
                />
                <span
                  className={cn(
                    "text-[13px] truncate",
                    isActive
                      ? "text-sidebar-foreground font-semibold"
                      : "text-sidebar-muted font-normal"
                  )}
                >
                  {project.name}
                </span>
              </Link>
            )
          })
        )}
      </nav>

      {/* Divider */}
      <div className="h-px bg-sidebar-border" />

      {/* Footer */}
      <div className="flex items-center gap-3 px-6 py-3">
        <div className="h-7 w-7 rounded-full bg-gray-dark flex items-center justify-center">
          <span className="text-[10px] font-semibold text-sidebar-foreground">
            {getInitials(user.full_name)}
          </span>
        </div>
        <span className="text-xs font-medium text-sidebar-muted flex-1 truncate">
          {user.full_name || user.email?.split("@")[0] || "User"}
        </span>
        <button
          onClick={() => router.push("/settings")}
          className="p-1 text-sidebar-muted hover:text-sidebar-foreground transition-colors"
        >
          <Settings className="h-4 w-4" />
        </button>
        <button
          onClick={handleSignOut}
          className="p-1 text-sidebar-muted hover:text-primary transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
