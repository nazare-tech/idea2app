export type DevOnlyFeatureEnv = Partial<Pick<NodeJS.ProcessEnv, "NODE_ENV" | "VERCEL_ENV">>

export function isDevOnlyFeatureEnabled(env: DevOnlyFeatureEnv = process.env) {
  return env.NODE_ENV !== "production" && env.VERCEL_ENV !== "production"
}
