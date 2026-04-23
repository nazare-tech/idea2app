import { notFound } from "next/navigation"
import { PencilFrameView, loadTopLevelPenFrames } from "@/lib/pencil-preview"

export const dynamic = "force-static"

export async function generateStaticParams() {
  const frames = await loadTopLevelPenFrames()
  return frames
    .filter((frame): frame is typeof frame & { id: string } => typeof frame.id === "string")
    .map((frame) => ({ frameId: frame.id }))
}

export default async function PencilFramePage({
  params,
}: {
  params: Promise<{ frameId: string }>
}) {
  const { frameId } = await params
  const frames = await loadTopLevelPenFrames()
  const frame = frames.find((item) => item.id === frameId)

  if (!frame) notFound()

  return <PencilFrameView frame={frame} />
}
