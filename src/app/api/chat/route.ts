import { NextResponse } from "next/server"

function disabledChatResponse() {
  return NextResponse.json(
    { error: "General chat is currently disabled. Use the project workspace documents instead." },
    { status: 410 },
  )
}

export async function GET() {
  return disabledChatResponse()
}

export async function POST() {
  return disabledChatResponse()
}
