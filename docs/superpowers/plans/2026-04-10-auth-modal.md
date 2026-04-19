# Auth Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace landing page Sign In / Sign Up navigation links with a modal overlay (dark backdrop + blur) that opens over the landing page, keeping `/auth` page intact for email confirmation redirects.

**Architecture:** Landing page links set `?modal=auth&mode=signin|signup` URL params. A new `AuthModal` client component (Radix UI Dialog) on the landing page reads these params and renders the auth form. A new `AuthFormContent` component is extracted from the existing `AuthScreen` and shared between the modal and the existing `/auth` page so auth logic isn't duplicated.

**Tech Stack:** Next.js App Router, `@radix-ui/react-dialog` (already installed v1.1.15), Supabase Auth, `useSearchParams` / `useRouter`, Tailwind CSS

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/components/auth/auth-form-content.tsx` | Create | Extracted auth form (state, handlers, JSX) — used by both modal and page |
| `src/app/auth/page.tsx` | Modify | Swap `AuthScreen` internals to use `AuthFormContent` |
| `src/components/auth/auth-modal.tsx` | Create | Radix Dialog wrapper reading URL params; renders `AuthFormContent` |
| `src/app/page.tsx` | Modify | Change Sign In/Up links to `?modal=auth&mode=...`; add `<AuthModal />` |

---

## Task 1: Extract `AuthFormContent`

**Files:**
- Create: `src/components/auth/auth-form-content.tsx`
- Modify: `src/app/auth/page.tsx` (used in Task 2)

`AuthFormContent` accepts:
- `initialMode: "signin" | "signup"` — sets the starting tab
- `redirectTo?: string` — where to send the user after auth (default `/dashboard`)
- `onSuccess: () => void` — called after successful sign in/up (caller handles navigation)
- `onModeChange?: (mode: "signin" | "signup") => void` — optional, lets the modal update the URL when switching modes

- [ ] **Step 1: Create `src/components/auth/auth-form-content.tsx`**

```tsx
"use client"

import Image from "next/image"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Check } from "lucide-react"
import { uiStylePresets } from "@/lib/ui-style-presets"
import { AuthField } from "@/components/auth/auth-field"
import { AuthPasswordField } from "@/components/auth/auth-password-field"

type AuthMode = "signin" | "signup"

const modeLabels: Record<
  AuthMode,
  {
    title: string
    subtitle: string
    submit: string
    loading: string
    alternateLine: string
    alternateAction: string
  }
> = {
  signin: {
    title: "Welcome back",
    subtitle: "Sign in to continue to Idea2App.",
    submit: "Sign in",
    loading: "Signing in...",
    alternateLine: "Don't have an account?",
    alternateAction: "Create account",
  },
  signup: {
    title: "Create account",
    subtitle: "Join Idea2App and start building.",
    submit: "Create account",
    loading: "Creating account...",
    alternateLine: "Already have an account?",
    alternateAction: "Sign in",
  },
}

interface AuthFormContentProps {
  initialMode: AuthMode
  redirectTo?: string
  onSuccess: () => void
  onModeChange?: (mode: AuthMode) => void
}

export function AuthFormContent({
  initialMode,
  redirectTo = "/dashboard",
  onSuccess,
  onModeChange,
}: AuthFormContentProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const copy = modeLabels[mode]

  const switchMode = (next: AuthMode) => {
    setMode(next)
    setError(null)
    onModeChange?.(next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()

      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) { setError(error.message); return }
        onSuccess()
        return
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match.")
        return
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/callback?next=${redirectTo}`,
        },
      })

      if (error) { setError(error.message); return }
      setSuccess(true)
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    if (loading) return
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/callback?next=${redirectTo}`,
        },
      })
      if (error) setError(error.message)
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-bg">
          <Check className="h-6 w-6 text-success" />
        </div>
        <p className="text-xl font-semibold">Check your email</p>
        <p className="mt-2 ui-text-sm-muted">
          We&apos;ve sent a confirmation link to <strong>{email}</strong>.
          Open it to verify your account.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <CardHeader className="ui-stack-2 ui-px-8 pt-8">
        <CardTitle className="text-2xl tracking-[-0.02em]">{copy.title}</CardTitle>
        <p className="ui-text-sm-muted">{copy.subtitle}</p>
      </CardHeader>

      <div className="ui-px-8">
        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={loading}
          className={uiStylePresets.authSocialButton}
        >
          <Image src="/google-logo.svg" alt="Google" width={16} height={16} className="h-4 w-4" />
          Continue with Google
        </button>

        <div className="mt-5 flex items-center gap-4 text-xs text-muted-foreground">
          <span className={uiStylePresets.authDividerLine} />
          <span>OR</span>
          <span className={uiStylePresets.authDividerLine} />
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-5 ui-px-8 pt-3">
          {error && <p className={uiStylePresets.authErrorPill}>{error}</p>}

          {mode === "signup" && (
            <AuthField
              id="fullName"
              label="Full name"
              placeholder="John Doe"
              value={fullName}
              onChange={setFullName}
              disabled={loading}
            />
          )}

          <AuthField
            id="email"
            type="email"
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChange={setEmail}
            disabled={loading}
          />

          <AuthPasswordField
            id="password"
            label="Password"
            placeholder={mode === "signup" ? "Create a password" : "Enter your password"}
            value={password}
            onChange={setPassword}
            minLength={6}
            disabled={loading}
          />

          {mode === "signup" && (
            <AuthPasswordField
              id="confirmPassword"
              label="Confirm password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              minLength={6}
              disabled={loading}
            />
          )}

          <Button
            type="submit"
            className={uiStylePresets.authDestructiveButton}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner size="sm" />
                {copy.loading}
              </>
            ) : (
              copy.submit
            )}
          </Button>
        </CardContent>
      </form>

      <CardFooter className="ui-px-8 pb-8 pt-2">
        <p className="w-full text-center ui-text-sm-muted">
          {copy.alternateLine}{" "}
          <button
            type="button"
            onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
            className={uiStylePresets.authLinkUnderline}
          >
            {copy.alternateAction}
          </button>
        </p>
      </CardFooter>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/auth/auth-form-content.tsx
git commit -m "feat: extract AuthFormContent as reusable auth form component"
```

---

## Task 2: Refactor `/auth` page to use `AuthFormContent`

**Files:**
- Modify: `src/app/auth/page.tsx`

The goal is to keep the existing full-page layout (sidebar, `AuthHeader`, `Card`) but swap the form internals for `AuthFormContent`. The success/check-email state is handled inside `AuthFormContent` itself now, so remove it from `AuthScreen`.

- [ ] **Step 1: Replace `AuthScreen` form internals**

Open `src/app/auth/page.tsx`. The file currently has `AuthScreen` with inline state + handlers + JSX. Replace the entire `AuthScreen` function with:

```tsx
function AuthScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const redirect = searchParams.get("redirect") || "/dashboard"
  const queryError = searchParams.get("error")
  const queryMessage = searchParams.get("message")

  const defaultMode = useMemo<AuthMode>(() => {
    const rawMode = searchParams.get("mode")
    return rawMode === "signup" ? "signup" : "signin"
  }, [searchParams])

  const [externalError] = useState<string | null>(queryError || queryMessage)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="flex min-h-screen w-full flex-col">
        <main className="flex min-h-screen w-full overflow-hidden lg:flex-row-reverse">
          <aside className="hidden h-screen w-full max-w-[560px] bg-sidebar-bg px-14 py-14 text-sidebar-foreground lg:flex">
            <div className="flex h-full flex-col justify-between">
              <div>
                <h1 className="text-5xl ui-font-semibold leading-tight tracking-[-0.06em]">
                  Ship your next product faster.
                </h1>
                <p className="mt-6 max-w-sm text-sm leading-relaxed text-gray-400">
                  Create your Idea2App account to manage prompts, builds, and releases from
                  one workspace.
                </p>
              </div>
              <p className={uiStylePresets.authFormMeta}>Trusted by 3,000+ teams</p>
            </div>
          </aside>

          <div className="flex w-full flex-1">
            <div className="w-full lg:h-full lg:flex lg:flex-col">
              <header className="h-[104px] w-full ui-px-6 py-5">
                <BrandWordmark
                  className="h-full"
                  logoClassName={uiStylePresets.authIconCircle}
                  labelClassName="text-lg"
                />
              </header>

              <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5">
                {externalError && (
                  <p className={uiStylePresets.authErrorPill}>{externalError}</p>
                )}
                <Card className={uiStylePresets.authCardContainer}>
                  <AuthFormContent
                    initialMode={defaultMode}
                    redirectTo={redirect}
                    onSuccess={() => {
                      router.push(redirect)
                      router.refresh()
                    }}
                    onModeChange={(mode) => {
                      router.replace(`/auth?mode=${mode}&redirect=${encodeURIComponent(redirect)}`)
                    }}
                  />
                </Card>
              </div>
            </div>
          </div>
        </main>
      </section>
    </div>
  )
}
```

Remove unused imports (`useState`, `Link`, form-related hooks, `AuthField`, `AuthPasswordField`, `Check`, `Spinner`, `CardContent`, `CardFooter`, `CardTitle`) since those are now inside `AuthFormContent`. Add `import { AuthFormContent } from "@/components/auth/auth-form-content"`.

Keep: `Image`, `Suspense`, `useMemo`, `useState` (for `externalError`), `Link` is no longer needed for mode switching but keep `useRouter`, `useSearchParams`, `BrandWordmark`, `AuthHeader`, `Card`, `CardHeader`, `uiStylePresets`.

- [ ] **Step 2: Verify the page still builds**

```bash
cd d:/Github/idea2app-root-v2 && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to `auth/page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/app/auth/page.tsx
git commit -m "refactor: auth page uses AuthFormContent"
```

---

## Task 3: Create `AuthModal` component

**Files:**
- Create: `src/components/auth/auth-modal.tsx`

This component:
- Reads `?modal=auth&mode=signin|signup` from the URL
- Opens a Radix Dialog when both params are present
- Closes by clearing the params (using `router.replace`)
- On success: calls `router.push("/dashboard")` then `router.refresh()`

- [ ] **Step 1: Create `src/components/auth/auth-modal.tsx`**

```tsx
"use client"

import { useRouter, useSearchParams } from "next/navigation"
import * as Dialog from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { AuthFormContent } from "@/components/auth/auth-form-content"

export function AuthModal() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const modalParam = searchParams.get("modal")
  const modeParam = searchParams.get("mode")

  const isOpen = modalParam === "auth" && (modeParam === "signin" || modeParam === "signup")
  const mode = modeParam === "signup" ? "signup" : "signin"

  const closeModal = () => {
    router.replace("/", { scroll: false })
  }

  const handleModeChange = (nextMode: "signin" | "signup") => {
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
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-[4px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-[14px] border border-border/40 bg-[#141414] shadow-2xl focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/auth/auth-modal.tsx
git commit -m "feat: AuthModal component with Radix Dialog, dark overlay and blur"
```

---

## Task 4: Wire up landing page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add `AuthModal` import**

At the top of `src/app/page.tsx`, add:
```tsx
import { Suspense } from "react"
import { AuthModal } from "@/components/auth/auth-modal"
```

(If `Suspense` is already imported from React, don't duplicate it.)

- [ ] **Step 2: Change Sign In / Sign Up links**

Find all occurrences of Sign In / Sign Up links that navigate to `/auth`:

```tsx
<Link href="/auth?mode=signin">
```
Replace with:
```tsx
<Link href="/?modal=auth&mode=signin" scroll={false}>
```

```tsx
<Link href="/auth?mode=signup">
```
Replace with:
```tsx
<Link href="/?modal=auth&mode=signup" scroll={false}>
```

There are ~4 such links in `src/app/page.tsx` (lines 164, 175, 206, 355 approximately). Update all of them.

- [ ] **Step 3: Add `<AuthModal />` before the closing tag of the page's root element**

At the very end of the `return` in the landing page component, just before the final closing tag, add:
```tsx
      <Suspense>
        <AuthModal />
      </Suspense>
```

`AuthModal` uses `useSearchParams()` which requires a `Suspense` boundary in Next.js App Router.

- [ ] **Step 4: Verify build**

```bash
cd d:/Github/idea2app-root-v2 && npx tsc --noEmit 2>&1 | head -30
```

Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: landing page Sign In/Up open AuthModal instead of navigating"
```

---

## Verification

1. Visit the landing page (`/`) and click "Sign In" → URL updates to `/?modal=auth&mode=signin`, modal opens over dark blurred background.
2. Click "Create account" link inside the modal → switches to signup mode, URL updates to `/?modal=auth&mode=signup`.
3. Press Escape → modal closes, URL resets to `/`.
4. Click outside the modal (on the overlay) → modal closes.
5. Sign in successfully → redirected to `/dashboard`.
6. Visit `/auth?mode=signin` directly → full-page auth layout renders, no modal.
7. Test a Supabase email confirmation link (`/callback?...`) → does not break, still resolves via the existing callback route.
