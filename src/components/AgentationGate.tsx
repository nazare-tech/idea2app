import { isDevOnlyFeatureEnabled } from "@/lib/dev-only"

export async function AgentationGate() {
  if (!isDevOnlyFeatureEnabled()) {
    return null
  }

  const { AgentationWrapper } = await import("@/components/AgentationWrapper")

  return <AgentationWrapper />
}
