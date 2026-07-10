import { type DevOnlyFeatureEnv, isDevOnlyFeatureEnabled } from "@/lib/dev-only"

/**
 * Motion Lab is a local-development-only workbench for animation and
 * generation-state experiments against the real workspace renderers.
 * It must never be reachable in production.
 */
export function isMotionLabEnabled(env: DevOnlyFeatureEnv = process.env) {
  return isDevOnlyFeatureEnabled(env)
}
