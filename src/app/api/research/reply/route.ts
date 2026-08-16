import { NextResponse } from "next/server"
export async function POST() {
  return NextResponse.json(
    { error: "This endpoint moved to the standalone local Research Inbox server." },
    { status: 410 },
  )
}
