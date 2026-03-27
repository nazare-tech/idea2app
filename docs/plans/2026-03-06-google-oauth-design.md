# Google OAuth Sign In / Sign Up — Design

**Date**: 2026-03-06
**Status**: Approved
**Approach**: Supabase Database Trigger (Approach 1)

---

## Overview

Add fully functional Google OAuth sign-in and sign-up to Idea2App. The UI buttons already exist on both `/login` and `/signup` pages; the gaps are:

1. Google Cloud Console app not yet created
2. Supabase Google provider not yet enabled
3. New Google OAuth users never get a `credits` row initialized
4. Google button uses a generic icon instead of the Google G logo

---

## Authentication Flow

```
User clicks "Continue with Google"
        │
        ▼
supabase.auth.signInWithOAuth({ provider: "google" })
        │
        ▼
Browser → Google consent screen
        │
        ▼
Google → Supabase internal callback:
  https://<project-ref>.supabase.co/auth/v1/callback
  └── Supabase creates row in auth.users (if new user)
  └── DB trigger fires → INSERT into public.credits (20 free)
        │
        ▼
Supabase → app callback:
  https://yourdomain.com/callback?next=/dashboard
        │
        ▼
/callback/route.ts: exchangeCodeForSession() → sets auth cookie
  └── Safety-net upsert: credits row if somehow missing
  └── Dev-email special case (existing logic, unchanged)
        │
        ▼
User lands on /dashboard ✓
```

---

## Section 1 — External Setup (non-code)

### Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create or select a project
3. APIs & Services → Credentials → **Create Credentials** → OAuth 2.0 Client ID
4. Application type: **Web application**
5. Authorized JavaScript origins:
   - `http://localhost:3000` (dev)
   - `https://yourdomain.com` (prod)
6. Authorized redirect URIs:
   - `https://<supabase-project-ref>.supabase.co/auth/v1/callback`
7. Copy **Client ID** and **Client Secret**

### Supabase Dashboard

1. Authentication → Providers → **Google** → Enable
2. Paste Client ID and Client Secret
3. Authentication → URL Configuration → **Redirect URLs** — add:
   - `http://localhost:3000/callback`
   - `https://yourdomain.com/callback`
4. Save

> No changes to `.env.local` needed — Google OAuth credentials live entirely in Supabase, not your app.

---

## Section 2 — Database Trigger

Run once in Supabase SQL Editor (Dashboard → SQL Editor → New Query):

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

- `SECURITY DEFINER` — allows the function to write to `public.credits` from the `auth` schema context
- `ON CONFLICT DO NOTHING` — idempotent; safe if trigger ever fires twice
- Covers **all** auth methods: Google OAuth, email/password, any future providers

---

## Section 3 — Callback Route Fix

**File**: `src/app/(auth)/callback/route.ts`

After `exchangeCodeForSession` succeeds, add a safety-net upsert for all users before the redirect:

```ts
// Safety net: ensure credits row exists (trigger should have done this,
// but handles users who signed up before the trigger was added)
await supabase.from("credits").upsert(
  { user_id: user.id, balance: 20 },
  { onConflict: "user_id", ignoreDuplicates: true }
)
```

- `ignoreDuplicates: true` ensures existing users' balances are never overwritten
- Dev-email logic remains unchanged

---

## Section 4 — Google Logo

**Source**: Google's official Firebase UI CDN
`https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg`

Save as `/public/google-logo.svg` (local file — no runtime network dependency).

Update both login and signup pages:
- Replace `<ArrowRight className="ui-icon-16" />` with `<img src="/google-logo.svg" alt="Google" className="h-4 w-4" />`
- Remove unused `ArrowRight` import from each file

---

## Files Changed

| File | Change |
|------|--------|
| `public/google-logo.svg` | New — Google G logo SVG |
| `src/app/(auth)/callback/route.ts` | Add safety-net credits upsert for all users |
| `src/app/(auth)/login/page.tsx` | Swap ArrowRight → Google logo img |
| `src/app/(auth)/signup/page.tsx` | Swap ArrowRight → Google logo img |
| Supabase SQL Editor | Run trigger SQL once (documented above) |
| Supabase Dashboard | Enable Google provider + redirect URLs (documented above) |

---

## Error Handling

- If Google OAuth fails (user cancels, network error): Supabase returns an error object → `setError(error.message)` displays inline (already wired)
- If `/callback` code exchange fails: redirects to `/login?error=Could not authenticate` (existing behavior)
- Trigger failure: non-fatal — safety-net upsert in callback catches it

---

## Security Notes

- OAuth credentials (Client ID + Secret) stored only in Supabase — never in app environment variables or client-side code
- Redirect URL validation: Supabase only allows pre-whitelisted redirect URLs — prevents open redirect attacks
- The `next` param in `/callback` is already sanitized (must start with `/`, no `//`) — no open redirect risk
- `SECURITY DEFINER` function uses `SET search_path = public` to prevent search path injection
