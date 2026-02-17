"use client"

import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Folder, MoreHorizontal, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ProjectCardProps {
    project: {
        id: string
        name: string
        description?: string | null
        updated_at: string
        status?: string | null
    }
}

export function ProjectCard({ project }: ProjectCardProps) {
    return (
        <Link
            href={`/projects/${project.id}`}
            className="group relative flex flex-col justify-between rounded-xl border border-white/5 bg-white/5 p-6 hover:bg-white/10 hover:border-white/10 transition-all duration-200"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform duration-200">
                    <Folder className="h-5 w-5 text-blue-400" />
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground -mr-2"
                            onClick={(e) => e.preventDefault()}
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                            Edit Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-red-500 focus:text-red-500"
                            onClick={(e) => e.stopPropagation()}
                        >
                            Delete Project
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div>
                <h3 className="font-semibold text-lg text-foreground mb-1 group-hover:text-blue-400 transition-colors">
                    {project.name}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                    {project.description || "No description provided"}
                </p>
            </div>

            <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-white/5">
                <span>
                    Updated {formatDistanceToNow(new Date(project.updated_at))} ago
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-blue-400 font-medium">
                    Open <ArrowRight className="h-3 w-3" />
                </div>
            </div>
        </Link>
    )
}
