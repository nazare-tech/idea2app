import test from "node:test"
import assert from "node:assert/strict"

import { MVP_PLAN_SYSTEM_PROMPT } from "./mvp-plan"

// Guards the platform recommendation contract: Cloudflare remains the
// repo-aware default, while browser builders receive stacks they can operate.
test("MVP plan prompt recommends Cloudflare when the selected build path supports it", () => {
  assert.match(MVP_PLAN_SYSTEM_PROMPT, /Cloudflare D1/)
  assert.match(MVP_PLAN_SYSTEM_PROMPT, /Cloudflare R2/)
  assert.match(MVP_PLAN_SYSTEM_PROMPT, /OpenNext/)
  assert.match(MVP_PLAN_SYSTEM_PROMPT, /better-auth/)
  assert.match(MVP_PLAN_SYSTEM_PROMPT, /selected build path targets Cloudflare/i)
})

test("MVP plan prompt keeps Lovable and v0 recommendations buildable in their native paths", () => {
  assert.match(MVP_PLAN_SYSTEM_PROMPT, /Lovable[\s\S]{0,300}Lovable Cloud or Supabase/i)
  assert.match(MVP_PLAN_SYSTEM_PROMPT, /v0[\s\S]{0,300}Supabase, Neon, or Upstash/i)
  assert.match(MVP_PLAN_SYSTEM_PROMPT, /choose the build tool and stack as one compatible decision/i)
  assert.match(MVP_PLAN_SYSTEM_PROMPT, /do not pair a browser builder with Cloudflare D1/i)
})

test("MVP plan prompt requires server-derived ownership checks for D1", () => {
  assert.match(MVP_PLAN_SYSTEM_PROMPT, /verified server session/i)
  assert.match(MVP_PLAN_SYSTEM_PROMPT, /never accept[^\n]*ownership authority[^\n]*request payload/i)
  assert.match(MVP_PLAN_SYSTEM_PROMPT, /cross-tenant denial/i)
})

