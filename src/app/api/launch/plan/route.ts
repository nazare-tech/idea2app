import { NextResponse } from "next/server"

export const maxDuration = 800

export async function POST(request: Request) {
  void request

  return NextResponse.json(
    {
      error: "Launch Plan generation is archived for projects. Use Prompt Lab in local development to experiment with the archived prompt.",
      archived: true,
      creditsConsumed: 0,
    },
    { status: 410 },
  )
}
