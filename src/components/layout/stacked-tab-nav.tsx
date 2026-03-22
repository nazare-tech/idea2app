"use client"

import Link from "next/link"
import type { ElementType, ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface StackedTabNavItem {
  key: string
  label: string
  icon: ElementType
  description?: string
  href?: string
  disabled?: boolean
  trailing?: ReactNode
  onSelect?: () => void
}

interface StackedTabNavProps {
  items: StackedTabNavItem[]
  activeKey: string
  className?: string
  navClassName?: string
}

function getItemClasses(isActive: boolean, disabled: boolean, isLast: boolean) {
  return cn(
    "w-full flex items-center gap-3 px-6 py-3.5 text-left transition-colors",
    disabled && "cursor-not-allowed opacity-50 pointer-events-none",
    isActive
      ? "bg-background border-l-[3px] border-l-primary"
      : "border-b border-border hover:bg-muted/50",
    isLast && !isActive && "border-b-0"
  )
}

function StackedTabNavItemContent({
  item,
  isActive,
}: {
  item: StackedTabNavItem
  isActive: boolean
}) {
  const Icon = item.icon

  return (
    <>
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          isActive ? "text-primary" : "text-muted-foreground"
        )}
      />
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-[13px] truncate",
            isActive ? "font-semibold text-foreground" : "font-medium text-foreground"
          )}
        >
          {item.label}
        </p>
        {item.description && isActive && (
          <p className="text-[10px] text-muted-foreground font-mono">
            {item.description}
          </p>
        )}
      </div>
      {item.trailing}
    </>
  )
}

export function StackedTabNav({
  items,
  activeKey,
  className,
  navClassName,
}: StackedTabNavProps) {
  return (
    <div className={cn("flex h-full w-[280px] flex-col bg-card border-r border-border", className)}>
      <nav className={cn("flex-1 overflow-y-auto", navClassName)}>
        {items.map((item, index) => {
          const isActive = activeKey === item.key
          const isLast = index === items.length - 1
          const disabled = Boolean(item.disabled)
          const itemClasses = getItemClasses(isActive, disabled, isLast)

          if (item.href) {
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={itemClasses}
              >
                <StackedTabNavItemContent item={item} isActive={isActive} />
              </Link>
            )
          }

          return (
            <button
              key={item.key}
              type="button"
              onClick={item.onSelect}
              disabled={disabled}
              className={itemClasses}
            >
              <StackedTabNavItemContent item={item} isActive={isActive} />
            </button>
          )
        })}
      </nav>
    </div>
  )
}
