"use client"

import { useState } from "react"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProjectSidebar } from "@/components/layout/project-sidebar"

interface DashboardShellProps {
    children: React.ReactNode
    projects: any[]
    user: any
}

export function DashboardShell({ children, projects, user }: DashboardShellProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* Desktop Sidebar */}
            <div className="hidden md:block h-full">
                <ProjectSidebar projects={projects} user={user} />
            </div>

            {/* Mobile Header & Content Wrapper */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Mobile Header */}
                <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar-bg text-sidebar-foreground">
                    <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
                            <span className="text-primary-foreground font-bold text-xs">P</span>
                        </div>
                        <span className="font-semibold text-sm">Idea2App</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-sidebar-foreground hover:bg-sidebar-hover p-1 h-8 w-8"
                        onClick={() => setIsMobileMenuOpen(true)}
                    >
                        <Menu className="h-5 w-5" />
                    </Button>
                </div>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />

                    {/* Sidebar Drawer */}
                    <div className="absolute top-0 left-0 bottom-0 w-[280px] bg-sidebar-bg border-r border-sidebar-border shadow-xl animate-in slide-in-from-left duration-300">
                        <div className="absolute top-2 right-2 z-50">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-sidebar-muted hover:text-sidebar-foreground h-8 w-8 p-0"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                        <ProjectSidebar projects={projects} user={user} />
                    </div>
                </div>
            )}
        </div>
    )
}
