import { createClient } from "@supabase/supabase-js"

/**
 * Creates a Supabase client using the service role key.
 * This client bypasses Row-Level Security (RLS) and should only
 * be used in server-side code for trusted operations like metrics tracking.
 *
 * Returns an untyped client intentionally — some tables (e.g. api_request_metrics)
 * may not yet be reflected in the generated Database types.
 *
 * NEVER expose this client or the service role key to the browser.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createServiceClient(): ReturnType<typeof createClient<any>> {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
}
