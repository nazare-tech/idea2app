"use client"

import { useRouter, useSearchParams } from "next/navigation"
import * as Dialog from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { AuthFormContent, type AuthMode } from "@/components/auth/auth-form-content"

export function AuthModal() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const modalParam = searchParams.get("modal")
  const modeParam = searchParams.get("mode")

  const isOpen = modalParam === "auth" && (modeParam === "signin" || modeParam === "signup")
  const mode: AuthMode = modeParam === "signup" ? "signup" : "signin"

  const closeModal = () => {
    router.replace("/", { scroll: false })
  }

  const handleModeChange = (nextMode: AuthMode) => {
    router.replace(`/?modal=auth&mode=${nextMode}`, { scroll: false })
  }

  const handleSuccess = () => {
    router.push("/dashboard")
    router.refresh()
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) closeModal() }}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-[4px]"
        />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-[14px] border border-border/40 bg-[#141414] shadow-2xl focus:outline-none"
        >
          <Dialog.Title className="sr-only">
            {mode === "signin" ? "Sign in to Idea2App" : "Create your Idea2App account"}
          </Dialog.Title>

          <Dialog.Close asChild>
            <button
              className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border border-border/40 bg-muted/40 text-text-secondary transition-colors hover:bg-muted hover:text-foreground focus:outline-none"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </Dialog.Close>

          <AuthFormContent
            initialMode={mode}
            redirectTo="/dashboard"
            onSuccess={handleSuccess}
            onModeChange={handleModeChange}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
