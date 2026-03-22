"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { uiStylePresets } from "@/lib/ui-style-presets"

interface AuthFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder: string
  disabled?: boolean
  required?: boolean
  minLength?: number
}

export function AuthField({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled = false,
  required = true,
  minLength,
}: AuthFieldProps) {
  return (
    <div className="ui-stack-2">
      <Label htmlFor={id} className={uiStylePresets.authFieldLabel}>
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        disabled={disabled}
        minLength={minLength}
        className={uiStylePresets.authFieldInput}
      />
    </div>
  )
}
