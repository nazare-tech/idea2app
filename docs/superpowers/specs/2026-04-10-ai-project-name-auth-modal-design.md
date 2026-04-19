# Design Spec: AI Project Name + Auth Modal

**Date:** 2026-04-10  
**Status:** Approved  

---

## Context

Two UX improvements to the Idea2App platform:

1. **AI Project Name**: Projects currently start as "Untitled" and require manual renaming. After the Prompt tab Q&A completes and the AI generates a summary, there is no automatic naming — a missed opportunity to reduce friction for new users.

2. **Auth Modal**: Sign In / Sign Up currently navigate to a full `/auth` page, breaking the landing page flow. A modal overlay keeps users in context and feels more modern.

---

## Feature 1: AI-Generated Project Name

### Behaviour

- When a new project is created (name = `"Untitled"`, no description), the header shows the name in grey with a `✦ AI naming` pill badge. The pencil edit icon is hidden and the rename button is non-interactive.
- After the full Prompt tab Q&A completes and the AI generates the idea summary, a second AI call (server-side, same request) extracts a short project name (3–6 words, title case) from the summary and saves it to `projects.name`.
- The name is streamed back to the frontend via the existing `done` event as a new `projectName` field.
- On receipt, the header name updates with a brief fade-in, the badge disappears, and the pencil icon reappears — editing is now enabled.
- If a user has already manually renamed the project (name ≠ `"Untitled"`), the AI name generation is skipped entirely.

### State Logic

In `project-workspace.tsx`:
- `isNameSet`: boolean, initialised as `project.name !== "Untitled" || !!project.description`.
  - The `|| !!project.description` check ensures existing "Untitled" projects that already have a description (went through Q&A previously) are never locked — only brand new projects with no description show the badge.
- Show locked state (badge, no pencil) when `!isNameSet`.
- Set `isNameSet = true` when: (a) AI name callback fires, or (b) user manually edits the name.

### Error Handling

If the server-side name generation call fails (network error, AI error): skip silently, do not save a name, emit the `done` event without a `projectName` field. The frontend will not receive `projectName`, so `isNameSet` stays `false` — but the badge is hidden and editing is unlocked so the user can rename manually. The project remains "Untitled" until they do.

### Files to Change

| File | Change |
|------|--------|
| `src/app/api/prompt-chat/route.ts` | When `stage === "summary"` and `project.name === "Untitled"`: after saving description, make a second AI call to generate a short name; save to `projects.name`; add `projectName` field to the `done` stream event |
| `src/components/chat/prompt-chat-interface.tsx` | Add `onProjectNameGenerated?: (name: string) => void` prop; call it when `done` event includes `projectName` |
| `src/components/layout/content-editor.tsx` | Add `onProjectNameGenerated` prop; pass it down to `PromptChatInterface` |
| `src/components/workspace/project-workspace.tsx` | Add `isNameSet` state; wire `onProjectNameGenerated` handler; update header render to show locked state when `!isNameSet`; add fade-in animation on name update |

### Server-side Name Generation Prompt

```
Given this business idea summary, generate a short project name (3–6 words, title case, no quotes, no punctuation). Return only the name, nothing else.

Summary:
{summary}
```

Use the same OpenRouter model already in use for the prompt-chat route (default model).

---

## Feature 2: Auth Modal

### Behaviour

- Sign In and Sign Up links on the landing page (`/`) set URL params (`?modal=auth&mode=signin` / `?modal=auth&mode=signup`) instead of navigating to `/auth`.
- A new `AuthModal` client component on the landing page reads these params and opens a Radix UI Dialog.
- Overlay: `rgba(0,0,0,0.65)` dark backdrop + `backdrop-filter: blur(4px)`.
- Modal card: centered, `background: #141414`, `border-radius: 14px`, close (×) button in top-right.
- Content: extracted `AuthFormContent` component shared between the modal and the existing `/auth` page. Includes email, password, Google OAuth, and mode-switching link.
- Pressing Escape or clicking the backdrop closes the modal; URL params are cleared.
- On successful auth: redirect to `/dashboard` (same as current page behaviour).
- `/auth/page.tsx` is **unchanged** — still used for email confirmation redirects and direct URL access.

### Files to Change

| File | Change |
|------|--------|
| `src/components/auth/auth-form-content.tsx` | **New file.** Extract the form JSX + handlers from `AuthScreen` into a reusable `AuthFormContent` component. Accepts `onSuccess: (redirectUrl: string) => void` and `initialMode: "signin" \| "signup"` props |
| `src/app/auth/page.tsx` | Refactor `AuthScreen` to use `AuthFormContent`; pass `onSuccess={(url) => router.push(url)}` |
| `src/components/auth/auth-modal.tsx` | **New file.** Client component. Reads `?modal=auth&mode=` search params. Renders Radix Dialog with dark overlay + blur. Renders `AuthFormContent` inside. On success or close: clears params and redirects if needed |
| `src/app/page.tsx` | Change Sign In / Sign Up `<Link href="/auth?mode=...">` to `<Link href="?modal=auth&mode=...">`. Add `<Suspense><AuthModal /></Suspense>` at the bottom of the page |

### Dependency

`@radix-ui/react-dialog` is already installed (`^1.1.15` in `package.json`). No new dependencies required.

---

## Verification

### Feature 1
1. Create a new project → header shows "Untitled" in grey with `✦ AI naming` badge, pencil hidden.
2. Complete the Prompt tab Q&A (answer the AI's questions).
3. When the summary generates, the project name in the header should update automatically (fade in) to a short AI-generated name. Pencil icon reappears.
4. Click the pencil — editing works normally.
5. Test with a project that already has a custom name — badge should never appear.

### Feature 2
1. Visit the landing page (`/`) and click "Sign In" — URL updates to `?modal=auth&mode=signin`, modal opens over a dark blurred background.
2. Click "Sign Up" link inside the modal — mode switches to signup, URL updates.
3. Press Escape or click outside the modal — modal closes, URL resets.
4. Complete sign in — redirected to `/dashboard`.
5. Visit `/auth?mode=signin` directly — full auth page renders as before (no modal).
6. Test email confirmation link (Supabase redirect) — still lands on `/auth` page correctly.
