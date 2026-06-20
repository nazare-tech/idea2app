import { headers } from "next/headers"
import { notFound } from "next/navigation"

import { isDevOnlyFeatureEnabled } from "@/lib/dev-only"
import { animationLabFixtures } from "./fixtures"
import { ProjectAnimationLabClient } from "./project-animation-lab-client"

export const dynamic = "force-dynamic"

function getHostname(host: string | null) {
  if (!host) return ""
  if (host.startsWith("[")) {
    const endBracket = host.indexOf("]")
    return endBracket === -1 ? host : host.slice(1, endBracket)
  }
  return host.split(":")[0] ?? ""
}

function isLocalhostHost(host: string | null) {
  const hostname = getHostname(host).toLowerCase()
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
}

export default async function ProjectAnimationLabPage() {
  if (!isDevOnlyFeatureEnabled()) {
    notFound()
  }

  const requestHeaders = await headers()
  if (!isLocalhostHost(requestHeaders.get("host"))) {
    notFound()
  }

  return <ProjectAnimationLabClient fixtures={animationLabFixtures} />
}
