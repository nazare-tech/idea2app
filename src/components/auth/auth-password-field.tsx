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
        className="absolute right-3 top-[38px] text-text-secondary hover:text-foreground"
        tabIndex={-1}
        aria-label={showPassword ? "Hide password" : "Show password"}
      >
        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}
