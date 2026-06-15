import { NextResponse } from "next/server"

function deprecatedPromptChatResponse() {
  return NextResponse.json(
    { error: "Prompt Chat has been deprecated. Use the project Overview instead." },
    { status: 410 },
  )
}

export async function GET() {
  return deprecatedPromptChatResponse()
}

export async function POST() {
  return deprecatedPromptChatResponse()
}
