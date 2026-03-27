# Google OAuth Sign In / Sign Up Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire up Google OAuth end-to-end — configure external services, add a database trigger to initialize new users with free credits, fix the callback route safety net, and polish the Google button icon on both auth pages.

**Architecture:** Supabase handles the OAuth handshake entirely (Google Cloud Console → Supabase internal callback → `auth.users` insert → DB trigger creates `credits` row). The app's `/callback` route only finalizes the session cookie and adds a safety-net upsert. No OAuth credentials ever touch the app's env vars.

**Tech Stack:** Next.js 16 App Router, Supabase Auth (`@supabase/ssr`), PostgreSQL trigger (SECURITY DEFINER), TypeScript.

---

## Prerequisites (Manual — Do Before Any Code)

These cannot be automated. Complete both before running any tasks below.

### A. Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → select or create a project
2. APIs & Services → Credentials → **+ Create Credentials** → OAuth 2.0 Client ID
3. Application type: **Web application**, give it a name (e.g. "Idea2App")
4. **Authorized JavaScript origins** — add both:
   - `http://localhost:3000`
   - `https://yourdomain.com` (your production domain)
5. **Authorized redirect URIs** — add ONE (this goes to Supabase, not your app):
   - `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback`
   - (Find `<your-supabase-project-ref>` in Supabase Dashboard → Project Settings → General)
6. Click **Create** → copy the **Client ID** and **Client Secret** — you'll need them next

### B. Supabase Dashboard

1. Supabase Dashboard → **Authentication** → **Providers** → **Google** → toggle **Enable**
2. Paste **Client ID** and **Client Secret** from step A
3. Save
4. Still in Authentication → **URL Configuration** → **Redirect URLs** → add:
   - `http://localhost:3000/callback`
   - `https://yourdomain.com/callback`
5. Save

### C. Supabase Database Trigger (SQL Editor)

1. Supabase Dashboard → **SQL Editor** → **+ New query**
2. Paste and run this SQL:

```sql
-- Function: initialize every new user with 20 free credits
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.credits (user_id, balance)
  VALUES (NEW.id, 20)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger: fires after every INSERT on auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

3. Confirm: click **Run** — should return "Success. No rows returned"
4. Verify: Table Editor → `credits` — existing rows are unchanged; new users will get 20 credits on next sign-up

---

## Code Tasks

### Task 1: Save Google Logo SVG

**Files:**
- Create: `public/google-logo.svg`

**Step 1: Create the SVG file**

Create `public/google-logo.svg` with this content (sourced from Google's official Firebase UI CDN — `https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg`):

```xml
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="18px" height="18px" viewBox="0 0 118 120" version="1.1"
  xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
    <g id="google_buttn">
      <path d="M117.6,61.3636364 C117.6,57.1090909 117.218182,53.0181818 116.509091,49.0909091
        L60,49.0909091 L60,72.3 L92.2909091,72.3 C90.9,79.8 86.6727273,86.1545455
        80.3181818,90.4090909 L80.3181818,105.463636 L99.7090909,105.463636
        C111.054545,95.0181818 117.6,79.6363636 117.6,61.3636364 Z" fill="#4285F4"/>
      <path d="M60,120 C76.2,120 89.7818182,114.627273 99.7090909,105.463636
        L80.3181818,90.4090909 C74.9454545,94.0090909 68.0727273,96.1363636
        60,96.1363636 C44.3727273,96.1363636 31.1454545,85.5818182
        26.4272727,71.4 L6.38181818,71.4 L6.38181818,86.9454545
        C16.2545455,106.554545 36.5454545,120 60,120 Z" fill="#34A853"/>
      <path d="M26.4272727,71.4 C25.2272727,67.8 24.5454545,63.9545455
        24.5454545,60 C24.5454545,56.0454545 25.2272727,52.2
        26.4272727,48.6 L26.4272727,33.0545455 L6.38181818,33.0545455
        C2.31818182,41.1545455 0,50.3181818 0,60 C0,69.6818182
        2.31818182,78.8454545 6.38181818,86.9454545 L26.4272727,71.4 Z" fill="#FBBC05"/>
      <path d="M60,23.8636364 C68.8090909,23.8636364 76.7181818,26.8909091
        82.9363636,32.8363636 L100.145455,15.6272727 C89.7545455,5.94545455
        76.1727273,0 60,0 C36.5454545,0 16.2545455,13.4454545
        6.38181818,33.0545455 L26.4272727,48.6
        C31.1454545,34.4181818 44.3727273,23.8636364 60,23.8636364 Z" fill="#EA4335"/>
    </g>
  </g>
</svg>
```

**Step 2: Verify file is accessible**

Start dev server (`npm run dev`) and open `http://localhost:3000/google-logo.svg` in your browser — you should see the colored Google G logo.

**Step 3: Commit**

```bash
git add public/google-logo.svg
git commit -m "feat: add Google logo SVG for auth buttons"
```

---

### Task 2: Update Login Page — Google Logo

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`

**Context:** The current Google button (line 115–123) renders `<ArrowRight className="ui-icon-16" />` as its leading icon. Replace it with the Google logo image.

**Step 1: Remove ArrowRight from the import line**

In `src/app/(auth)/login/page.tsx`, line 12, find:
```ts
import { ArrowRight, Lightbulb } from "lucide-react"
```
Change to:
```ts
import { Lightbulb } from "lucide-react"
```

**Step 2: Replace the icon in the Google button**

Find this block (around line 115–123):
```tsx
<button
  type="button"
  onClick={handleGoogleLogin}
  disabled={loading}
  className={uiStylePresets.authSocialButton}
>
  <ArrowRight className="ui-icon-16" />
  Continue with Google
</button>
```
Replace with:
```tsx
<button
  type="button"
  onClick={handleGoogleLogin}
  disabled={loading}
  className={uiStylePresets.authSocialButton}
>
  <img src="/google-logo.svg" alt="Google" className="h-4 w-4" />
  Continue with Google
</button>
```

**Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

**Step 4: Visual check**

With dev server running, open `http://localhost:3000/login` — confirm the Google button now shows the colored G logo instead of an arrow.

**Step 5: Commit**

```bash
git add src/app/(auth)/login/page.tsx
git commit -m "feat: use Google G logo on login button"
```

---

### Task 3: Update Signup Page — Google Logo

**Files:**
- Modify: `src/app/(auth)/signup/page.tsx`

**Context:** Same change as Task 2 but for the signup page. The Google button is around line 153–161.

**Step 1: Remove ArrowRight from the import line**

In `src/app/(auth)/signup/page.tsx`, line 12, find:
```ts
import { Lightbulb, ArrowRight, Check } from "lucide-react"
```
Change to:
```ts
import { Lightbulb, Check } from "lucide-react"
```

**Step 2: Replace the icon in the Google button**

Find this block (around line 153–161):
```tsx
<button
  type="button"
  onClick={handleGoogleSignup}
  className={uiStylePresets.authSocialButton}
  disabled={loading}
>
  <ArrowRight className="ui-icon-16" />
  {loading ? "Connecting..." : socialText}
</button>
```
Replace with:
```tsx
<button
  type="button"
  onClick={handleGoogleSignup}
  className={uiStylePresets.authSocialButton}
  disabled={loading}
>
  <img src="/google-logo.svg" alt="Google" className="h-4 w-4" />
  {loading ? "Connecting..." : socialText}
</button>
```

**Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

**Step 4: Visual check**

Open `http://localhost:3000/signup` — confirm the Google button shows the colored G logo.

**Step 5: Commit**

```bash
git add src/app/(auth)/signup/page.tsx
git commit -m "feat: use Google G logo on signup button"
```

---

### Task 4: Fix Callback Route — Safety-Net Credits Upsert

**Files:**
- Modify: `src/app/(auth)/callback/route.ts`

**Context:** The current callback route only creates credits for the dev email (`nazarework@gmail.com`). Regular Google OAuth users get no credits row. Add a safety-net upsert after the dev-email block that covers all users without touching existing balances.

**Step 1: Read the current callback route**

Open `src/app/(auth)/callback/route.ts` and locate the block starting at line 19:
```ts
if (user?.email === "nazarework@gmail.com") {
  // ... dev plan logic ...
}
```

**Step 2: Add safety-net upsert after the dev block**

After the closing `}` of the dev-email `if` block (after line ~43), add:

```ts
// Safety net: ensure every user has a credits row.
// The DB trigger handles new users; this covers users who signed up
// before the trigger was installed.
await supabase.from("credits").upsert(
  { user_id: user.id, balance: 20 },
  { onConflict: "user_id", ignoreDuplicates: true }
)
```

The full updated section should look like:

```ts
if (!error) {
  const { data: { user } } = await supabase.auth.getUser()

  if (user?.email === "nazarework@gmail.com") {
    const { data: devPlan } = await supabase
      .from("plans")
      .select("id")
      .eq("name", "Internal Dev")
      .single()

    if (devPlan) {
      await supabase.from("subscriptions").upsert({
        user_id: user.id,
        plan_id: devPlan.id,
        status: "active",
      }, { onConflict: "user_id" })

      await supabase.from("credits").upsert({
        user_id: user.id,
        balance: 999999,
      }, { onConflict: "user_id" })
    }
  }

  // Safety net: ensure every user has a credits row.
  // The DB trigger handles new users; this covers users who signed up
  // before the trigger was installed.
  if (user) {
    await supabase.from("credits").upsert(
      { user_id: user.id, balance: 20 },
      { onConflict: "user_id", ignoreDuplicates: true }
    )
  }

  const forwardedHost = request.headers.get("x-forwarded-host")
  // ... rest of redirect logic unchanged ...
```

**Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

**Step 4: Commit**

```bash
git add src/app/(auth)/callback/route.ts
git commit -m "fix: safety-net credits upsert for all OAuth users in callback"
```

---

### Task 5: Final Build Verification

**Step 1: Run full TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors.

**Step 2: Run lint**

```bash
npm run lint
```
Expected: no errors. If unused import warnings appear (ArrowRight), they should already be gone from Tasks 2 & 3.

**Step 3: Run production build**

```bash
npm run build
```
Expected: completes without errors. Watch for any TypeScript or import issues.

---

## Manual End-to-End Test Checklist

Once the Prerequisites (A, B, C) and all code tasks are done:

### New User (Google OAuth)
- [ ] Go to `http://localhost:3000/signup`
- [ ] Click "Continue with Google" — colored G logo should be visible
- [ ] Google consent screen appears
- [ ] After approving, you land on `/dashboard`
- [ ] In Supabase Table Editor → `credits` — a row exists for this user with `balance = 20`

### Existing User (Google OAuth)
- [ ] Sign out
- [ ] Go to `http://localhost:3000/login`
- [ ] Click "Continue with Google"
- [ ] Lands on `/dashboard` immediately (no re-consent if already granted)
- [ ] Credits balance is unchanged from before

### Error Case
- [ ] Click "Continue with Google" on login page
- [ ] Cancel the Google consent screen
- [ ] Returns to login page; confirm no crash (error message or silent return)

### Dev Email
- [ ] Sign in with `nazarework@gmail.com` via Google
- [ ] Credits should be `999999` (dev plan logic still runs correctly)

---

## Security Checklist

- [ ] No Google Client ID or Secret in `.env.local` or any source file
- [ ] Supabase redirect URLs whitelist only your exact domains (no wildcards)
- [ ] `next` param in `/callback` is validated to start with `/` and not `//` (already in place — line 9–12 of callback route)
- [ ] `SECURITY DEFINER` trigger function uses `SET search_path = public` (in the SQL above)
