"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, Trash2 } from "lucide-react"
import type { MouseEvent } from "react"

interface DashboardProjectCardProps {
  id: string
  name: string
  description: string | null
  href: string
  showDelete?: boolean
}

export function DashboardProjectCard({
  id,
  name,
  description,
  href,
  showDelete = false,
}: DashboardProjectCardProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (isDeleting) return

    const shouldDelete = window.confirm(`Delete ${name}?`)
    if (!shouldDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/projects/${id}`, { method: "DELETE" })

      if (!response.ok) {
        let message = "Unable to delete project"
        try {
          const result = await response.json()
          if (result?.error) message = result.error
        } catch {
          // Ignore parse errors
        }
        throw new Error(message)
      }

      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to delete project")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="group relative">
      <Link
        href={href}
        className="block rounded-2xl border border-[#E0E0E0] bg-[#1A1A1A] p-5 transition hover:bg-[#1f1f1f] min-h-[176px] max-h-[176px]"
      >
        <div className="space-y-4">
          <h2 className="text-[18px] leading-tight font-[700] tracking-[-0.4px] text-white line-clamp-1">
            {name}
          </h2>
          <p className="font-mono text-[12px] leading-[1.5] text-[#999999] line-clamp-2 overflow-hidden min-h-[36px]">
            {description || "No prompt captured yet."}
          </p>
          <div className="h-2" />
          <p className="inline-flex items-center gap-2 text-sm font-medium text-white">
            Open project <ArrowRight className="h-4 w-4" />
          </p>
        </div>
      </Link>

      {showDelete && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          aria-label={`Delete ${name}`}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#FF3B30]/90 text-white opacity-100 md:opacity-0 md:pointer-events-none md:group-hover:opacity-100 md:group-hover:pointer-events-auto"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
