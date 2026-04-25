"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { AuthField } from "@/components/auth/auth-field"

interface AuthPasswordFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  disabled?: boolean
  required?: boolean
  minLength?: number
}

export function AuthPasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  required = true,
  minLength,
}: AuthPasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="relative">
      <AuthField
        id={id}
        label={label}
        value={value}
        onChange={onChange}
        type={showPassword ? "text" : "password"}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        minLength={minLength}
      />
      <button
        type="button"
        onClick={() => setShowPassword((current) => !current)}
        disabled={disabled}
        className="absolute right-1 top-[26px] flex h-11 w-11 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-40"
        aria-label={showPassword ? "Hide password" : "Show password"}
        aria-pressed={showPassword}
      >
        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}
