"use client"

import type { ComponentType } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { uiStylePresets } from "@/lib/ui-style-presets"

interface SettingsSectionCardProps {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
  children: React.ReactNode
  className?: string
}

export function SettingsSectionCard({
  icon: Icon,
  title,
  description,
  children,
  className,
}: SettingsSectionCardProps) {
  return (
    <Card className={className ?? uiStylePresets.settingsSurface}>
      <CardHeader>
        <div className="ui-row-gap-3">
          <div className={uiStylePresets.settingsIconBadge}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-[16px]">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}
