import { cache } from "react"

import { createClient } from "@/lib/supabase/server"

// One auth lookup per request, shared by layout and page code via React
// cache(). Returns the client it created so callers that also query the
// database make a single call instead of constructing a second client.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  return { user, error, supabase }
})
